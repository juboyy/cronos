"""MiroFish Lite — Swarm prediction engine.

Generates agent personas, runs multi-round debate simulation,
and produces a prediction report with probability trajectories.
Supports presets: quick, standard, deep.
"""
import json
import uuid
import time
from datetime import datetime
from typing import List, Dict, Optional
from config import (
    DEFAULT_AGENT_COUNT, MAX_SIMULATION_ROUNDS, AGENT_ARCHETYPES,
    CONVERGENCE_THRESHOLD, MIN_ROUNDS_BEFORE_EXIT,
    SIMULATION_PRESETS, get_preset, resolve_model,
)
from llm import generate_json, generate


def generate_agent_profiles(scenario: str, context: str, count: int = DEFAULT_AGENT_COUNT, archetypes: List[str] = None, model: str = '') -> List[Dict]:
    """Generate diverse agent personas for the simulation."""
    active_archetypes = (archetypes or AGENT_ARCHETYPES)[:count]
    prompt = f"""You are creating {count} diverse financial market agent personas for a prediction simulation.

SCENARIO: {scenario}

MARKET CONTEXT:
{context}

Generate exactly {count} agents with these archetypes: {json.dumps(active_archetypes)}

For each agent, provide:
- id: unique identifier (agent_01, agent_02, etc.)
- archetype: from the list above
- name: realistic Portuguese name
- bias: "bullish", "bearish", or "neutral"
- confidence: 0.0-1.0 (how confident in their initial position)
- reasoning: 1-2 sentences explaining their initial stance on the scenario
- risk_tolerance: "conservative", "moderate", "aggressive"

Return JSON array. Brazilian market perspective. Portuguese language for reasoning."""
    
    result = generate_json(prompt, temperature=0.8, model=model)
    if not result['ok']:
        profiles = []
        for i, arch in enumerate(active_archetypes):
            profiles.append({
                'id': f'agent_{i+1:02d}',
                'archetype': arch,
                'name': f'Analista {i+1}',
                'bias': ['bullish', 'bearish', 'neutral'][i % 3],
                'confidence': 0.5,
                'reasoning': f'Posição neutra aguardando dados ({arch})',
                'risk_tolerance': 'moderate',
            })
        return profiles
    return result['data']


def run_debate_round(
    scenario: str,
    agents: List[Dict],
    round_num: int,
    previous_actions: List[Dict] = None,
    market_data: str = '',
    max_rounds: int = MAX_SIMULATION_ROUNDS,
    temperature: float = 0.6,
    model: str = '',
) -> Dict:
    """Run a single debate round where agents interact and update positions."""
    agent_summary = '\n'.join([
        f"- {a['name']} ({a['archetype']}): {a['bias']} (conf: {a['confidence']:.1f}) — {a['reasoning']}"
        for a in agents
    ])
    
    prev_context = ''
    if previous_actions:
        prev_context = '\nPREVIOUS ROUND ACTIONS:\n' + json.dumps(previous_actions[-5:], ensure_ascii=False, indent=2)
    
    prompt = f"""SIMULATION ROUND {round_num}/{max_rounds}

SCENARIO: {scenario}

CURRENT AGENT POSITIONS:
{agent_summary}
{prev_context}

{f"MARKET DATA: {market_data}" if market_data else ""}

Simulate round {round_num} of debate. Each agent:
1. Reads other agents' positions
2. May challenge, agree, or provide new evidence
3. Updates their confidence and bias based on the debate

Return JSON with:
{{
  "round": {round_num},
  "interactions": [
    {{
      "agent_id": "agent_01",
      "action": "challenge" | "agree" | "provide_evidence" | "change_position",
      "target_agent": "agent_02" | null,
      "statement": "Portuguese statement",
      "new_bias": "bullish" | "bearish" | "neutral",
      "new_confidence": 0.0-1.0,
      "key_argument": "1 sentence"
    }}
  ],
  "consensus_direction": "bullish" | "bearish" | "neutral",
  "consensus_strength": 0.0-1.0,
  "key_tension": "Main point of disagreement"
}}

Be realistic. Not all agents change positions each round. Debate should converge gradually."""

    result = generate_json(prompt, temperature=temperature, model=model)
    if not result['ok']:
        return {
            'round': round_num,
            'interactions': [],
            'consensus_direction': 'neutral',
            'consensus_strength': 0.3,
            'key_tension': 'Falha na geração do round',
            'error': result.get('error'),
        }
    return result['data']


def generate_prediction_report(
    scenario: str,
    agents: List[Dict],
    rounds: List[Dict],
    context: str = '',
    model: str = '',
) -> Dict:
    """Generate final prediction report from simulation results."""
    rounds_summary = '\n'.join([
        f"Round {r.get('round', '?')}: consensus={r.get('consensus_direction', '?')} "
        f"(strength={r.get('consensus_strength', '?')}), tension: {r.get('key_tension', '?')}"
        for r in rounds
    ])
    
    final_positions = '\n'.join([
        f"- {a['name']} ({a['archetype']}): {a['bias']} (conf: {a['confidence']:.1f})"
        for a in agents
    ])
    
    prompt = f"""Generate a comprehensive prediction report based on this swarm intelligence simulation.

SCENARIO: {scenario}

CONTEXT: {context}

SIMULATION RESULTS ({len(rounds)} rounds):
{rounds_summary}

FINAL AGENT POSITIONS:
{final_positions}

Generate a report in JSON:
{{
  "prediction": {{
    "direction": "bullish" | "bearish" | "neutral",
    "confidence": 0.0-1.0,
    "probability_up": 0.0-1.0,
    "probability_down": 0.0-1.0,
    "probability_neutral": 0.0-1.0,
    "time_horizon": "curto prazo (1-5 dias)" | "médio prazo (1-4 semanas)" | "longo prazo (1-3 meses)",
    "expected_magnitude": "low (<1%)" | "moderate (1-3%)" | "high (3-5%)" | "extreme (>5%)"
  }},
  "consensus_trajectory": [
    {{"round": 1, "direction": "...", "strength": 0.0-1.0}}
  ],
  "key_factors": ["factor1", "factor2", "factor3"],
  "risk_factors": ["risk1", "risk2"],
  "dissenting_views": ["view1", "view2"],
  "executive_summary": "2-3 paragraph summary in Portuguese",
  "actionable_insight": "1 sentence takeaway in Portuguese"
}}"""

    result = generate_json(prompt, temperature=0.3, model=model)
    if not result['ok']:
        return {
            'prediction': {'direction': 'neutral', 'confidence': 0.3},
            'executive_summary': 'Falha na geração do relatório.',
            'error': result.get('error'),
        }
    return result['data']


def run_simulation(
    scenario: str,
    context: str = '',
    tickers: List[str] = None,
    market_data: str = '',
    progress_callback=None,
    preset: str = 'standard',
    config: Dict = None,
) -> Dict:
    """Run complete MiroFish simulation pipeline.
    
    Args:
        preset: 'quick', 'standard', or 'deep'
        config: Override individual settings (merged on top of preset)
    """
    p = get_preset(preset)
    if config:
        p.update({k: v for k, v in config.items() if v is not None})
    
    active_model = resolve_model(p.get('model', 'flash'))
    active_agent_count = min(p.get('agent_count', DEFAULT_AGENT_COUNT), 30)
    active_max_rounds = min(p.get('max_rounds', MAX_SIMULATION_ROUNDS), 15)
    active_temperature = p.get('temperature', 0.6)
    active_convergence = p.get('convergence_threshold', CONVERGENCE_THRESHOLD)
    active_min_rounds = p.get('min_rounds', MIN_ROUNDS_BEFORE_EXIT)
    active_early_exit = p.get('early_exit', True)
    active_archetypes = p.get('archetypes', AGENT_ARCHETYPES)
    
    simulation_id = f'sim_{uuid.uuid4().hex[:12]}'
    start_time = time.time()
    
    result = {
        'simulation_id': simulation_id,
        'scenario': scenario,
        'tickers': tickers or [],
        'preset': preset,
        'config': {
            'agent_count': active_agent_count,
            'max_rounds': active_max_rounds,
            'model': active_model,
            'temperature': active_temperature,
            'convergence_threshold': active_convergence,
            'early_exit': active_early_exit,
        },
        'status': 'running',
        'created_at': datetime.utcnow().isoformat(),
        'agents': [],
        'rounds': [],
        'report': None,
    }
    
    if progress_callback:
        progress_callback('generating_agents', 0, active_max_rounds)
    
    agents = generate_agent_profiles(
        scenario, context, active_agent_count,
        archetypes=active_archetypes, model=active_model,
    )
    result['agents'] = agents
    
    all_actions = []
    for round_num in range(1, active_max_rounds + 1):
        if progress_callback:
            progress_callback('simulating', round_num, active_max_rounds)
        
        round_result = run_debate_round(
            scenario, agents, round_num, all_actions, market_data,
            max_rounds=active_max_rounds,
            temperature=active_temperature,
            model=active_model,
        )
        result['rounds'].append(round_result)
        
        interactions = round_result.get('interactions', [])
        for interaction in interactions:
            agent_id = interaction.get('agent_id')
            for agent in agents:
                if agent['id'] == agent_id:
                    if 'new_bias' in interaction:
                        agent['bias'] = interaction['new_bias']
                    if 'new_confidence' in interaction:
                        agent['confidence'] = interaction['new_confidence']
                    break
        
        all_actions.extend(interactions)
        
        if active_early_exit and round_num >= active_min_rounds:
            consensus = round_result.get('consensus_strength', 0)
            if consensus > active_convergence:
                break
        
        time.sleep(0.3)
    
    if progress_callback:
        progress_callback('generating_report', active_max_rounds, active_max_rounds)
    
    report = generate_prediction_report(
        scenario, agents, result['rounds'], context, model=active_model,
    )
    result['report'] = report
    result['status'] = 'completed'
    result['duration_seconds'] = round(time.time() - start_time, 1)
    
    return result
