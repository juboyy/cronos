'use client';
import { useState, useEffect } from 'react';

interface Alert {
  id: string; name: string; type: string; conditions: Record<string, any>;
  channels: string[]; active: boolean; last_triggered: string | null;
  trigger_count: number; cooldown_minutes: number;
}

interface Notification {
  id: string; type: string; title: string; body?: string; ticker?: string;
  severity: string; is_read: boolean; created_at: string; article_id?: string;
}

const S = {
  label: { fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' as const },
  mono: { fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' as const },
  input: {
    width: '100%', background: 'var(--bg-surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: '10px 14px', color: 'var(--text-primary)',
    fontFamily: 'var(--font-display)', fontSize: '0.8125rem', outline: 'none',
  },
};

const typeAccents: Record<string, string> = {
  sentiment: 'hsl(280 50% 55%)', volume: 'hsl(45 75% 50%)', price: 'hsl(0 65% 50%)',
  pattern: 'hsl(210 60% 55%)', composite: 'hsl(150 60% 45%)',
};

const sevColors: Record<string, string> = {
  critical: 'var(--signal-down)', warning: 'var(--signal-neutral)', info: 'var(--signal-info)',
};

const sevIcons: Record<string, string> = {
  critical: '🔴', warning: '🟡', info: '🔵',
};

function timeAgo(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffM = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffM < 1) return 'agora';
  if (diffM < 60) return `${diffM}m`;
  const diffH = Math.floor(diffM / 60);
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d`;
}

type Tab = 'alerts' | 'history';

export default function AlertsPage() {
  const [tab, setTab] = useState<Tab>('alerts');
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'sentiment', ticker: '', threshold: '-0.3', channel: 'dashboard' });

  useEffect(() => {
    fetch('/api/cronos/alerts').then(r => r.json()).then(setAlerts).catch(() => {});
    fetch('/api/cronos/notifications').then(r => r.json()).then(d => setNotifications(Array.isArray(d) ? d : d.notifications || [])).catch(() => {});
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const conditions: Record<string, any> = { ticker: form.ticker };
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

  // Group notifications by date
  const groupedNotifs: Record<string, Notification[]> = {};
  for (const n of notifications) {
    const day = new Date(n.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    if (!groupedNotifs[day]) groupedNotifs[day] = [];
    groupedNotifs[day].push(n);
  }

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
          {/* Tabs */}
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

      {/* ── CREATE FORM ── */}
      {tab === 'alerts' && showForm && (
        <form onSubmit={create} className="stagger" style={{
          padding: '24px', background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
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
            return (
              <div key={alert.id} style={{
                display: 'grid', gridTemplateColumns: '10px 1fr auto 100px 80px',
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
                    <span style={{ ...S.mono, fontSize: '0.5625rem', color: accent, padding: '1px 6px', border: `1px solid ${accent}33`, borderRadius: 'var(--radius-sm)' }}>
                      {alert.type}
                    </span>
                  </div>
                  <div style={{ ...S.mono, fontSize: '0.625rem', color: 'var(--text-muted)' }}>
                    {Object.entries(alert.conditions).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                    {alert.last_triggered && ` · último: ${timeAgo(alert.last_triggered)}`}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {alert.channels?.map(ch => (
                    <span key={ch} style={{ ...S.mono, fontSize: '0.5625rem', color: 'var(--text-tertiary)', padding: '1px 5px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
                      {ch}
                    </span>
                  ))}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ ...S.mono, fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{alert.trigger_count}</span>
                  <span style={{ ...S.mono, fontSize: '0.5rem', color: 'var(--text-muted)', marginLeft: '3px' }}>disparos</span>
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

      {/* ── HISTORY TAB — notification timeline ── */}
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
              {/* Day header */}
              <div style={{
                ...S.label, fontSize: '0.625rem', color: 'var(--text-tertiary)',
                marginBottom: '8px', paddingBottom: '6px', borderBottom: '1px solid var(--border-subtle)',
              }}>
                {day}
              </div>

              {/* Timeline */}
              <div style={{ position: 'relative', paddingLeft: '20px' }}>
                {/* Vertical line */}
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
                    {/* Timeline dot */}
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
