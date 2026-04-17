"""Cronos Engine API — Flask server exposing MiroFish + BettaFish engines.

Endpoints:
  POST /api/simulate         — Run MiroFish swarm prediction
  GET  /api/simulate/<id>    — Get simulation status/result
  POST /api/analyze          — Run BettaFish article analysis
  POST /api/deep-analysis    — Run BettaFish deep opinion synthesis
  GET  /api/health           — Health check
  GET  /api/simulations      — List all simulations
"""
import sys
import os
import json
import threading
import uuid
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, request, jsonify
from flask_cors import CORS
from config import ENGINE_HOST, ENGINE_PORT, SIMULATION_PRESETS
from mirofish_engine import run_simulation
from bettafish_engine import analyze_article, deep_opinion_analysis

app = Flask(__name__)
CORS(app)

# In-memory store for simulation results (persisted to disk)
SIMULATIONS = {}
DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
os.makedirs(DATA_DIR, exist_ok=True)


def _save_simulation(sim_id: str, data: dict):
    """Persist simulation to disk."""
    path = os.path.join(DATA_DIR, f'{sim_id}.json')
    with open(path, 'w') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    SIMULATIONS[sim_id] = data


def _load_simulations():
    """Load all simulations from disk on startup."""
    for fname in os.listdir(DATA_DIR):
        if fname.endswith('.json') and fname.startswith('sim_'):
            path = os.path.join(DATA_DIR, fname)
            try:
                with open(path) as f:
                    data = json.load(f)
                SIMULATIONS[data.get('simulation_id', fname[:-5])] = data
            except Exception:
                pass


@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'engines': ['mirofish', 'bettafish'],
        'simulations_count': len(SIMULATIONS),
        'presets': {k: {'label': v['label'], 'description': v['description']} for k, v in SIMULATION_PRESETS.items()},
        'timestamp': datetime.utcnow().isoformat(),
    })


@app.route('/api/presets', methods=['GET'])
def list_presets():
    """List available simulation presets with full configuration details."""
    return jsonify({
        k: {
            'label': v['label'],
            'description': v['description'],
            'agent_count': v['agent_count'],
            'max_rounds': v['max_rounds'],
            'model': v['model'],
            'temperature': v['temperature'],
            'convergence_threshold': v['convergence_threshold'],
            'early_exit': v['early_exit'],
            'archetypes': v['archetypes'],
        }
        for k, v in SIMULATION_PRESETS.items()
    })


@app.route('/api/simulate', methods=['POST'])
def simulate():
    """Start a new MiroFish swarm simulation.
    
    Accepts:
      - preset: 'quick' | 'standard' | 'deep' (default: 'standard')
      - config: {} override individual settings
      - scenario: required
      - context, tickers, market_data: optional
    """
    data = request.get_json(force=True)
    
    scenario = data.get('scenario')
    if not scenario:
        return jsonify({'error': 'scenario is required'}), 400
    
    context = data.get('context', '')
    tickers = data.get('tickers', [])
    preset = data.get('preset', 'standard')
    config = data.get('config', {})
    market_data = data.get('market_data', '')
    
    # Legacy compat: if agents/rounds passed at top level
    agent_count = data.get('agent_count')
    max_rounds = data.get('max_rounds')
    
    # Create placeholder
    sim_id = f'sim_{uuid.uuid4().hex[:12]}'
    placeholder = {
        'simulation_id': sim_id,
        'scenario': scenario,
        'tickers': tickers,
        'preset': preset,
        'status': 'running',
        'progress': {'phase': 'queued', 'current': 0, 'total': 0},
        'created_at': datetime.utcnow().isoformat(),
    }
    SIMULATIONS[sim_id] = placeholder
    _save_simulation(sim_id, placeholder)
    
    # Run in background thread
    def _run():
        def progress_cb(phase, current, total):
            SIMULATIONS[sim_id]['progress'] = {
                'phase': phase, 'current': current, 'total': total
            }
            SIMULATIONS[sim_id]['status'] = 'running'
        
        try:
            result = run_simulation(
                scenario=scenario,
                context=context,
                tickers=tickers,
                agent_count=agent_count,
                max_rounds=max_rounds,
                market_data=market_data,
                progress_callback=progress_cb,
                preset=preset,
                config=config,
            )
            result['simulation_id'] = sim_id
            _save_simulation(sim_id, result)
        except Exception as e:
            SIMULATIONS[sim_id]['status'] = 'error'
            SIMULATIONS[sim_id]['error'] = str(e)
            _save_simulation(sim_id, SIMULATIONS[sim_id])
    
    thread = threading.Thread(target=_run, daemon=True)
    thread.start()
    
    return jsonify({
        'simulation_id': sim_id,
        'preset': preset,
        'status': 'running',
        'message': f'Simulation started with preset "{preset}"',
    }), 202


@app.route('/api/simulate/<sim_id>', methods=['GET'])
def get_simulation(sim_id):
    """Get simulation status and results."""
    sim = SIMULATIONS.get(sim_id)
    if not sim:
        # Try loading from disk
        path = os.path.join(DATA_DIR, f'{sim_id}.json')
        if os.path.exists(path):
            with open(path) as f:
                sim = json.load(f)
            SIMULATIONS[sim_id] = sim
        else:
            return jsonify({'error': 'Simulation not found'}), 404
    return jsonify(sim)


@app.route('/api/simulations', methods=['GET'])
def list_simulations():
    """List all simulations."""
    sims = []
    for sid, data in sorted(SIMULATIONS.items(), key=lambda x: x[1].get('created_at', ''), reverse=True):
        sims.append({
            'simulation_id': sid,
            'scenario': data.get('scenario', ''),
            'status': data.get('status', ''),
            'tickers': data.get('tickers', []),
            'created_at': data.get('created_at', ''),
            'duration_seconds': data.get('duration_seconds'),
            'progress': data.get('progress'),
        })
    return jsonify(sims)


@app.route('/api/analyze', methods=['POST'])
def analyze():
    """Run BettaFish multi-perspective analysis on an article."""
    data = request.get_json(force=True)
    
    title = data.get('title')
    content = data.get('content', '')
    if not title:
        return jsonify({'error': 'title is required'}), 400
    
    entities = data.get('entities', [])
    market_context = data.get('market_context', '')
    
    result = analyze_article(title, content, entities, market_context)
    return jsonify(result)


@app.route('/api/deep-analysis', methods=['POST'])
def deep_analysis():
    """Run BettaFish deep opinion synthesis across multiple articles."""
    data = request.get_json(force=True)
    
    topic = data.get('topic')
    articles = data.get('articles', [])
    
    if not topic:
        return jsonify({'error': 'topic is required'}), 400
    if not articles:
        return jsonify({'error': 'articles array is required'}), 400
    
    market_data = data.get('market_data', '')
    
    result = deep_opinion_analysis(topic, articles, market_data)
    return jsonify(result)


if __name__ == '__main__':
    print(f'🐟 Cronos Engine API starting on {ENGINE_HOST}:{ENGINE_PORT}')
    print(f'   MiroFish: Swarm prediction engine')
    print(f'   BettaFish: Multi-perspective opinion analysis')
    _load_simulations()
    print(f'   Loaded {len(SIMULATIONS)} existing simulations')
    app.run(host=ENGINE_HOST, port=ENGINE_PORT, debug=False)
