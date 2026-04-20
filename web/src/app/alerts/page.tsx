'use client';
import { useState, useEffect } from 'react';

import { Alert, Notification, Impact } from '@/lib/types';
import { timeAgo } from '@/lib/utils';

const S = {
  label: { fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' as const },
  mono: { fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' as const },
  input: {
    width: '100%', background: 'var(--bg-surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: '10px 14px', color: 'var(--text-primary)',
    fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', outline: 'none',
  },
};

const typeAccents: Record<string, string> = {
  sentiment: 'hsl(280 50% 55%)', volume: 'hsl(45 75% 50%)', price: 'hsl(0 65% 50%)',
  pattern: 'hsl(210 60% 55%)', composite: 'hsl(150 60% 45%)',
};

const sevColors: Record<string, string> = {
  critical: 'var(--signal-down)', warning: 'var(--signal-neutral)', info: 'hsl(210 60% 55%)',
};

const sevIcons: Record<string, string> = {
  critical: '🔴', warning: '🟡', info: '🔵',
};



function getSeverityClass(conditions: Record<string, unknown>): string {
  if (typeof conditions.sentiment_below === 'number' && (conditions.sentiment_below < -0.5) || (typeof conditions.delta_above === 'number' && conditions.delta_above > 5)) return 'critical';
  if (typeof conditions.sentiment_below === 'number' && (conditions.sentiment_below < -0.3) || (typeof conditions.delta_above === 'number' && conditions.delta_above > 2)) return 'warning';
  return 'info';
}

function Sparkline({ count, last }: { count: number, last: string | null }) {
  if (!count) return <div style={{ width: 40, height: 12, borderBottom: '1px dashed var(--border-subtle)' }} />;
  
  const points = [2, 5, 3, 8, 4, 6, 9];
  const lastDaysAgo = last ? Math.floor((Date.now() - new Date(last).getTime()) / (1000 * 60 * 60 * 24)) : 30;
  
  const data = points.map((p, i) => {
    let val = p * (count / 10);
    if (i === 6 - (lastDaysAgo % 7)) val += 5; // spike near last trigger
    return Math.min(12, Math.max(2, val));
  });

  const path = `M 0 ${12 - data[0]} ` + data.map((d, i) => `L ${(i * 40) / 6} ${12 - d}`).join(' ');

  return (
    <svg width="40" height="12" style={{ overflow: 'visible' }} aria-hidden="true">
      <path d={path} fill="none" stroke="var(--accent)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }} />
    </svg>
  );
}

type Tab = 'alerts' | 'history';

export default function AlertsPage() {
  const [tab, setTab] = useState<Tab>('alerts');
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [impacts, setImpacts] = useState<Impact[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'sentiment', ticker: '', threshold: '-0.3', channel: 'dashboard' });

  useEffect(() => {
    fetch('/api/cronos/alerts').then(r => r.json()).then(setAlerts).catch(() => {});
    fetch('/api/cronos/notifications').then(r => r.json()).then(d => setNotifications(Array.isArray(d) ? d : d.notifications || [])).catch(() => {});
    fetch('/api/cronos/impacts').then(r => r.json()).then(setImpacts).catch(() => {});
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const conditions: Record<string, string | number> = { ticker: form.ticker };
    if (form.type === 'sentiment') conditions.sentiment_below = parseFloat(form.threshold);
    if (form.type === 'volume') conditions.volume_above = parseFloat(form.threshold);
    if (form.type === 'price') conditions.delta_above = parseFloat(form.threshold);
    if (form.type === 'pattern') conditions.pattern = form.threshold;

    await fetch('/api/cronos/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, type: form.type, conditions, channels: [form.channel] }),
    });
    setAlerts(await fetch('/api/cronos/alerts').then(r => r.json()));
    setShowForm(false);
    setForm({ name: '', type: 'sentiment', ticker: '', threshold: '-0.3', channel: 'dashboard' });
  };

  const toggleAlert = async (id: string, active: boolean) => {
    await fetch('/api/cronos/alerts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, active: !active }),
    });
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, active: !active } : a));
  };

  const deleteAlert = async (id: string) => {
    await fetch(`/api/cronos/alerts?id=${id}`, { method: 'DELETE' });
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const groupedNotifs: Record<string, Notification[]> = {};
  for (const n of notifications) {
    const day = new Date(n.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    if (!groupedNotifs[day]) groupedNotifs[day] = [];
    groupedNotifs[day].push(n);
  }

  const suggestions = impacts
    .filter(imp => imp.impact_score > 0.5)
    .slice(0, 3)
    .map(imp => ({
      title: `Criar alerta para ${imp.ticker}?`,
      desc: `Impacto alto detectado (${imp.impact_score.toFixed(2)})`,
      ticker: imp.ticker
    }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', fontWeight: 400, color: 'var(--text-primary)', marginBottom: '8px' }}>Alerts</h1>
          <div style={{ display: 'flex', gap: '16px', ...S.mono, fontSize: '0.6875rem' }}>
            <span style={{ color: 'var(--signal-up)' }}>{alerts.filter(a => a.active).length} ativos</span>
            <span style={{ color: 'var(--text-muted)' }}>{notifications.length} eventos</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['alerts', 'history'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '6px 16px', borderRadius: 'var(--radius-sm)',
              background: tab === t ? 'var(--bg-elevated)' : 'transparent',
              border: tab === t ? '1px solid var(--border)' : '1px solid transparent',
              color: tab === t ? 'var(--text-primary)' : 'var(--text-muted)',
              ...S.mono, fontSize: '0.6875rem', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>
              {t === 'alerts' ? '⚡ Alertas' : '📋 Histórico'}
            </button>
          ))}
          {tab === 'alerts' && (
            <button onClick={() => setShowForm(!showForm)} style={{
              padding: '6px 20px',
              background: showForm ? 'var(--bg-elevated)' : 'var(--accent)',
              color: showForm ? 'var(--text-secondary)' : 'hsl(225 15% 4%)',
              border: showForm ? '1px solid var(--border)' : 'none',
              borderRadius: 'var(--radius)', ...S.mono, fontSize: '0.6875rem', fontWeight: 600,
              cursor: 'pointer', textTransform: 'uppercase',
            }}>
              {showForm ? 'Cancelar' : '+ Novo'}
            </button>
          )}
        </div>
      </div>

      {/* Sugestões Inteligentes */}
      {tab === 'alerts' && suggestions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h2 style={{ ...S.label, color: 'var(--accent)' }}>💡 Sugestões Inteligentes</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
            {suggestions.map((s, i) => (
              <div key={i} style={{ 
                padding: '16px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', 
                borderRadius: 'var(--radius)', display: 'flex', flexDirection: 'column', gap: '8px'
              }}>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', fontWeight: 500 }}>{s.title}</div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>{s.desc}</div>
                <button 
                  onClick={() => { setShowForm(true); setForm({ ...form, ticker: s.ticker, name: `${s.ticker} Sentiment` }); }}
                  style={{
                    alignSelf: 'flex-start', marginTop: '4px', padding: '4px 10px', background: 'transparent',
                    border: '1px solid var(--accent)', color: 'var(--accent)', borderRadius: 'var(--radius-sm)',
                    ...S.mono, fontSize: '0.625rem', cursor: 'pointer'
                  }}
                >
                  CONFIGURAR
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CREATE FORM ── */}
      {tab === 'alerts' && showForm && (
        <form onSubmit={create} className="stagger" style={{
          padding: '24px', background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '16px',
        }}>
          <div>
            <label style={{ ...S.label, display: 'block', marginBottom: '6px' }}>Nome</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="PETR4 Sentiment Drop" style={S.input} required />
          </div>
          <div>
            <label style={{ ...S.label, display: 'block', marginBottom: '6px' }}>Tipo</label>
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} style={{ ...S.input, fontFamily: 'var(--font-mono)' }}>
              <option value="sentiment">Sentimento</option>
              <option value="volume">Volume Spike</option>
              <option value="price">Variação Preço</option>
              <option value="pattern">Padrão</option>
            </select>
          </div>
          <div>
            <label style={{ ...S.label, display: 'block', marginBottom: '6px' }}>Canal</label>
            <select value={form.channel} onChange={e => setForm({ ...form, channel: e.target.value })} style={{ ...S.input, fontFamily: 'var(--font-mono)' }}>
              <option value="dashboard">Dashboard</option>
              <option value="telegram">Telegram</option>
              <option value="email">E-mail</option>
            </select>
          </div>
          <div>
            <label style={{ ...S.label, display: 'block', marginBottom: '6px' }}>Ticker</label>
            <input value={form.ticker} onChange={e => setForm({ ...form, ticker: e.target.value })} placeholder="PETR4" style={{ ...S.input, fontFamily: 'var(--font-mono)' }} />
          </div>
          <div>
            <label style={{ ...S.label, display: 'block', marginBottom: '6px' }}>Limiar</label>
            <input value={form.threshold} onChange={e => setForm({ ...form, threshold: e.target.value })} placeholder="-0.3" style={{ ...S.input, fontFamily: 'var(--font-mono)' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button type="submit" style={{
              padding: '10px 28px', background: 'var(--accent)', color: 'hsl(225 15% 4%)',
              border: 'none', borderRadius: 'var(--radius)', ...S.mono, fontSize: '0.75rem',
              fontWeight: 600, cursor: 'pointer', textTransform: 'uppercase', width: '100%',
            }}>
              Criar Alerta
            </button>
          </div>
        </form>
      )}

      {/* ── ALERTS TAB ── */}
      {tab === 'alerts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {alerts.map((alert) => {
            const accent = typeAccents[alert.type] || 'var(--text-tertiary)';
            const sev = getSeverityClass(alert.conditions);
            
            const daysSinceLast = alert.last_triggered ? Math.max(1, (Date.now() - new Date(alert.last_triggered).getTime()) / (1000 * 60 * 60 * 24)) : 30;
            const freq = alert.trigger_count > 0 ? (alert.trigger_count / (Math.max(alert.trigger_count, 1) * daysSinceLast) * 7).toFixed(1) : '0';

            return (
              <div key={alert.id} style={{
                display: 'grid', gridTemplateColumns: '10px 1fr auto 100px 60px 80px',
                gap: '14px', alignItems: 'center', padding: '14px 16px',
                borderBottom: '1px solid var(--border-subtle)', opacity: alert.active ? 1 : 0.4,
              }}>
                <span className={alert.active ? 'pulse' : ''} style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: alert.active ? 'var(--signal-up)' : 'var(--text-muted)',
                }} />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 500 }}>{alert.name}</span>
                    <span style={{ ...S.mono, fontSize: '0.5625rem', color: sevColors[sev], padding: '1px 6px', border: `1px solid ${sevColors[sev]}33`, borderRadius: 'var(--radius-sm)', textTransform: 'uppercase' }}>
                      {sev}
                    </span>
                    <span style={{ ...S.mono, fontSize: '0.5625rem', color: accent, padding: '1px 6px', border: `1px solid ${accent}33`, borderRadius: 'var(--radius-sm)' }}>
                      {alert.type}
                    </span>
                  </div>
                  <div style={{ ...S.mono, fontSize: '0.625rem', color: 'var(--text-muted)' }}>
                    {Object.entries(alert.conditions).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                    {alert.last_triggered && ` · último: ${timeAgo(alert.last_triggered)}`}
                    <span style={{ color: 'var(--accent)', marginLeft: '8px' }}>~{freq}x/semana</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {alert.channels?.map(ch => (
                    <span key={ch} style={{ ...S.mono, fontSize: '0.5625rem', color: 'var(--text-tertiary)', padding: '1px 5px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
                      {ch}
                    </span>
                  ))}
                </div>
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ ...S.mono, fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{alert.trigger_count}</span>
                    <span style={{ ...S.mono, fontSize: '0.5rem', color: 'var(--text-muted)' }}>hits</span>
                  </div>
                  <Sparkline count={alert.trigger_count} last={alert.last_triggered} />
                </div>
                <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                  <button onClick={() => toggleAlert(alert.id, alert.active)} style={{
                    padding: '3px 8px', background: 'transparent', border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)', cursor: 'pointer', ...S.mono, fontSize: '0.5rem',
                    color: alert.active ? 'var(--signal-neutral)' : 'var(--signal-up)',
                  }}>
                    {alert.active ? 'PAUSAR' : 'ATIVAR'}
                  </button>
                  <button onClick={() => deleteAlert(alert.id)} style={{
                    padding: '3px 8px', background: 'transparent', border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)', cursor: 'pointer', ...S.mono, fontSize: '0.5rem',
                    color: 'var(--signal-down)',
                  }}>
                    ✕
                  </button>
                </div>
              </div>
            );
          })}

          {alerts.length === 0 && (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', marginBottom: '8px' }}>◇</div>
              <div style={{ fontSize: '0.8125rem' }}>Nenhum alerta configurado.</div>
            </div>
          )}
        </div>
      )}

      {/* ── HISTORY TAB ── */}
      {tab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {Object.entries(groupedNotifs).length === 0 && (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', marginBottom: '8px' }}>∅</div>
              <div style={{ fontSize: '0.8125rem' }}>Nenhum evento registrado.</div>
            </div>
          )}

          {Object.entries(groupedNotifs).map(([day, notifs]) => (
            <div key={day}>
              <div style={{
                ...S.label, fontSize: '0.625rem', color: 'var(--text-tertiary)',
                marginBottom: '8px', paddingBottom: '6px', borderBottom: '1px solid var(--border-subtle)',
              }}>
                {day}
              </div>
              <div style={{ position: 'relative', paddingLeft: '20px' }}>
                <div style={{
                  position: 'absolute', left: '5px', top: 0, bottom: 0,
                  width: '1px', background: 'var(--border-subtle)',
                }} />
                {notifs.map((n) => (
                  <div key={n.id} className="stagger" style={{
                    position: 'relative', padding: '10px 14px', marginBottom: '4px',
                    background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    borderLeft: `2px solid ${sevColors[n.severity] || 'var(--border)'}`,
                    opacity: n.is_read ? 0.6 : 1,
                  }}>
                    <div style={{
                      position: 'absolute', left: '-19px', top: '14px',
                      width: '8px', height: '8px', borderRadius: '50%',
                      background: sevColors[n.severity] || 'var(--text-muted)',
                      border: '2px solid var(--bg)',
                    }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                          <span style={{ fontSize: '0.625rem' }}>{sevIcons[n.severity] || '◆'}</span>
                          <span style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', fontWeight: 500 }}>{n.title}</span>
                        </div>
                        {n.body && (
                          <div style={{ ...S.mono, fontSize: '0.6875rem', color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
                            {n.body}
                          </div>
                        )}
                        {n.ticker && (
                          <span style={{
                            ...S.mono, fontSize: '0.5rem', color: 'var(--accent)', marginTop: '4px',
                            display: 'inline-block', padding: '1px 5px',
                            background: 'var(--accent-bg)', borderRadius: '2px',
                          }}>
                            {n.ticker}
                          </span>
                        )}
                      </div>
                      <div style={{ ...S.mono, fontSize: '0.5625rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                        {new Date(n.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
