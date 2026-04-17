'use client';
import { useState, useEffect } from 'react';

interface Alert { id: string; name: string; type: string; conditions: Record<string, any>; channels: string[]; active: boolean; last_triggered: string | null; trigger_count: number; cooldown_minutes: number; }

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'sentiment', ticker: '', threshold: '-0.3' });

  useEffect(() => {
    fetch('/api/cronos/alerts').then(r => r.json()).then(setAlerts).catch(() => {});
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const conditions: Record<string, any> = { ticker: form.ticker };
    if (form.type === 'sentiment') conditions.sentiment_below = parseFloat(form.threshold);
    if (form.type === 'volume') conditions.volume_above = parseFloat(form.threshold);
    if (form.type === 'price') conditions.delta_above = parseFloat(form.threshold);

    await fetch('/api/cronos/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, type: form.type, conditions, channels: ['dashboard', 'telegram'] }),
    });

    setAlerts(await fetch('/api/cronos/alerts').then(r => r.json()));
    setShowForm(false);
    setForm({ name: '', type: 'sentiment', ticker: '', threshold: '-0.3' });
  };

  const S = {
    label: { fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' as const },
    mono: { fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' as const },
    input: {
      width: '100%',
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding: '10px 14px',
      color: 'var(--text-primary)',
      fontFamily: 'var(--font-display)',
      fontSize: '0.8125rem',
      outline: 'none',
    },
  };

  const typeAccents: Record<string, string> = {
    sentiment: 'hsl(280 50% 55%)',
    volume: 'hsl(45 75% 50%)',
    price: 'hsl(0 65% 50%)',
    pattern: 'hsl(210 60% 55%)',
    composite: 'hsl(150 60% 45%)',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', fontWeight: 400, color: 'var(--text-primary)', marginBottom: '8px' }}>Alerts</h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
            {alerts.filter(a => a.active).length} active monitors
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: '8px 20px',
            background: showForm ? 'var(--bg-elevated)' : 'var(--accent)',
            color: showForm ? 'var(--text-secondary)' : 'hsl(225 15% 4%)',
            border: showForm ? '1px solid var(--border)' : 'none',
            borderRadius: 'var(--radius)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.6875rem',
            fontWeight: 600,
            letterSpacing: '0.04em',
            cursor: 'pointer',
            textTransform: 'uppercase',
          }}
        >
          {showForm ? 'Cancel' : '+ New Alert'}
        </button>
      </div>

      {/* ── CREATE FORM ── */}
      {showForm && (
        <form
          onSubmit={create}
          className="stagger"
          style={{
            padding: '24px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
          }}
        >
          <div>
            <label style={{ ...S.label, display: 'block', marginBottom: '6px' }}>Name</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="PETR4 Sentiment Drop" style={S.input} />
          </div>
          <div>
            <label style={{ ...S.label, display: 'block', marginBottom: '6px' }}>Type</label>
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} style={{ ...S.input, fontFamily: 'var(--font-mono)' }}>
              <option value="sentiment">Sentiment</option>
              <option value="volume">Volume Spike</option>
              <option value="price">Price Delta</option>
              <option value="pattern">Pattern Match</option>
            </select>
          </div>
          <div>
            <label style={{ ...S.label, display: 'block', marginBottom: '6px' }}>Ticker</label>
            <input value={form.ticker} onChange={e => setForm({ ...form, ticker: e.target.value })} placeholder="PETR4" style={{ ...S.input, fontFamily: 'var(--font-mono)' }} />
          </div>
          <div>
            <label style={{ ...S.label, display: 'block', marginBottom: '6px' }}>Threshold</label>
            <input value={form.threshold} onChange={e => setForm({ ...form, threshold: e.target.value })} placeholder="-0.3" style={{ ...S.input, fontFamily: 'var(--font-mono)' }} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <button
              type="submit"
              style={{
                padding: '10px 28px',
                background: 'var(--accent)',
                color: 'hsl(225 15% 4%)',
                border: 'none',
                borderRadius: 'var(--radius)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                textTransform: 'uppercase',
              }}
            >
              Create Alert
            </button>
          </div>
        </form>
      )}

      {/* ── ALERT LIST ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {alerts.map((alert) => {
          const accent = typeAccents[alert.type] || 'var(--text-tertiary)';
          return (
            <div
              key={alert.id}
              className="interactive"
              style={{
                display: 'grid',
                gridTemplateColumns: '10px 1fr 120px 80px',
                gap: '16px',
                alignItems: 'center',
                padding: '14px 16px',
                borderBottom: '1px solid var(--border-subtle)',
                opacity: alert.active ? 1 : 0.4,
              }}
            >
              {/* Status indicator */}
              <span
                className={alert.active ? 'pulse' : ''}
                style={{
                  width: 6, height: 6,
                  borderRadius: '50%',
                  background: alert.active ? 'var(--signal-up)' : 'var(--text-muted)',
                }}
              />

              {/* Info */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 500 }}>{alert.name}</span>
                  <span style={{ ...S.mono, fontSize: '0.5625rem', color: accent, padding: '1px 6px', border: `1px solid ${accent}33`, borderRadius: 'var(--radius-sm)' }}>
                    {alert.type}
                  </span>
                </div>
                <div style={{ ...S.mono, fontSize: '0.625rem', color: 'var(--text-muted)' }}>
                  {Object.entries(alert.conditions).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                </div>
              </div>

              {/* Channels */}
              <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                {alert.channels?.map(ch => (
                  <span key={ch} style={{ ...S.mono, fontSize: '0.5625rem', color: 'var(--text-tertiary)', padding: '1px 5px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
                    {ch}
                  </span>
                ))}
              </div>

              {/* Trigger count */}
              <div style={{ textAlign: 'right' }}>
                <span style={{ ...S.mono, fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{alert.trigger_count}</span>
                <span style={{ ...S.mono, fontSize: '0.5625rem', color: 'var(--text-muted)', marginLeft: '4px' }}>triggers</span>
              </div>
            </div>
          );
        })}

        {alerts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', marginBottom: '8px' }}>◇</div>
            <div style={{ fontSize: '0.8125rem' }}>No alerts configured. Create one to start monitoring.</div>
          </div>
        )}
      </div>
    </div>
  );
}
