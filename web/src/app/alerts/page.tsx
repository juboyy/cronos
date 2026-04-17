'use client';
import { useState, useEffect } from 'react';
import type { Alert } from '@/lib/types';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'sentiment', ticker: '', threshold: '-0.3' });

  useEffect(() => {
    fetch('/api/cronos/alerts').then(r => r.json()).then(setAlerts).catch(console.error);
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const conditions: Record<string, any> = { ticker: form.ticker };
    
    if (form.type === 'sentiment') conditions.sentiment_below = parseFloat(form.threshold);
    if (form.type === 'volume') conditions.volume_above = parseFloat(form.threshold);
    if (form.type === 'price') conditions.delta_above = parseFloat(form.threshold);

    await fetch('/api/cronos/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        type: form.type,
        conditions,
        channels: ['dashboard', 'telegram'],
      }),
    });

    const res = await fetch('/api/cronos/alerts');
    setAlerts(await res.json());
    setShowForm(false);
    setForm({ name: '', type: 'sentiment', ticker: '', threshold: '-0.3' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-gray-200 tracking-tight">Alertas</h1>
          <span className="text-[10px] text-red-600 border border-red-800/50 rounded px-1.5 py-0.5">
            {alerts.filter(a => a.active).length} ativos
          </span>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-1.5 bg-cyan-800 hover:bg-cyan-700 rounded text-xs text-white transition-colors"
        >
          + Novo Alerta
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="border border-gray-800/60 rounded-lg p-4 bg-[#0d0d14] space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1">Nome</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                className="w-full bg-gray-900 border border-gray-800 rounded px-3 py-2 text-sm text-gray-200 focus:border-cyan-700 focus:outline-none"
                placeholder="PETR4 Sentimento Negativo" />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1">Tipo</label>
              <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}
                className="w-full bg-gray-900 border border-gray-800 rounded px-3 py-2 text-sm text-gray-200 focus:border-cyan-700 focus:outline-none">
                <option value="sentiment">Sentimento</option>
                <option value="volume">Volume</option>
                <option value="price">Variação Preço</option>
                <option value="pattern">Padrão</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1">Ticker</label>
              <input value={form.ticker} onChange={e => setForm({...form, ticker: e.target.value})}
                className="w-full bg-gray-900 border border-gray-800 rounded px-3 py-2 text-sm text-gray-200 focus:border-cyan-700 focus:outline-none"
                placeholder="PETR4" />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1">Threshold</label>
              <input value={form.threshold} onChange={e => setForm({...form, threshold: e.target.value})}
                className="w-full bg-gray-900 border border-gray-800 rounded px-3 py-2 text-sm text-gray-200 focus:border-cyan-700 focus:outline-none"
                placeholder="-0.3" />
            </div>
          </div>
          <button type="submit" className="px-4 py-2 bg-cyan-700 hover:bg-cyan-600 rounded text-sm text-white transition-colors">
            Criar Alerta
          </button>
        </form>
      )}

      <div className="space-y-3">
        {alerts.map(alert => (
          <div key={alert.id} className={`border rounded-lg p-4 bg-[#0d0d14] ${alert.active ? 'border-gray-800/60' : 'border-gray-800/30 opacity-50'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${alert.active ? 'bg-emerald-500' : 'bg-gray-600'}`} />
                <span className="text-sm text-gray-200 font-medium">{alert.name}</span>
                <span className="text-[10px] text-cyan-600 bg-cyan-900/20 rounded px-1.5 py-0.5">{alert.type}</span>
              </div>
              <span className="text-[10px] text-gray-600">disparado {alert.trigger_count}x</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>Condições: {JSON.stringify(alert.conditions)}</span>
              <span>Canais: {alert.channels?.join(', ')}</span>
              <span>Cooldown: {alert.cooldown_minutes}min</span>
            </div>
          </div>
        ))}
        {alerts.length === 0 && (
          <div className="text-center py-12 text-gray-600">
            <p className="text-4xl mb-3">🔔</p>
            <p>Nenhum alerta configurado. Crie seu primeiro acima.</p>
          </div>
        )}
      </div>
    </div>
  );
}
