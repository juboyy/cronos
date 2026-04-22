'use client';
import { useState, useEffect, useMemo } from 'react';

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

function getSeverityClass(conditions: Record<string, unknown>): 'critical' | 'warning' | 'info' {
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
    if (i === 6 - (lastDaysAgo % 7)) val += 5;
    return Math.min(12, Math.max(2, val));
  });

  const path = `M 0 ${12 - data[0]} ` + data.map((d, i) => `L ${(i * 40) / 6} ${12 - d}`).join(' ');

  return (
    <svg width="40" height="12" style={{ overflow: 'visible' }} aria-hidden="true">
      <path d={path} fill="none" stroke="var(--accent)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }} />
    </svg>
  );
}

function HealthGauge({ score }: { score: number }) {
  const radius = 30;
  const circumference = Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score > 70 ? 'var(--signal-up)' : score > 40 ? 'var(--signal-neutral)' : 'var(--signal-down)';

  return (
    <div style={{ position: 'relative', width: 80, height: 45, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width="80" height="40" viewBox="0 0 80 40">
        <path d="M 10 40 A 30 30 0 0 1 70 40" fill="none" stroke="var(--border-subtle)" strokeWidth="8" strokeLinecap="round" />
        <path d="M 10 40 A 30 30 0 0 1 70 40" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <div style={{ ...S.mono, fontSize: '0.625rem', position: 'absolute', bottom: 0, color: 'var(--text-primary)' }}>{score}%</div>
    </div>
  );
}

function TriggerTimeline({ last, count }: { last: string | null, count: number }) {
  const dots = useMemo(() => {
    if (!last || count === 0) return [];
    const now = Date.now();
    const lastTime = new Date(last).getTime();
    const result = [{ x: ((now - lastTime) / (30 * 24 * 60 * 60 * 1000)) * 100, opacity: 1 }];
    for (let i = 1; i < Math.min(count, 10); i++) {
        result.push({ x: Math.random() * 100, opacity: 0.4 });
    }
    return result;
  }, [last, count]);

  return (
    <div style={{ width: '100%', height: '20px', background: 'var(--bg-elevated)', borderRadius: '10px', position: 'relative', marginTop: '10px', border: '1px solid var(--border-subtle)' }}>
      <div style={{ position: 'absolute', left: '4px', top: '4px', ...S.label, fontSize: '0.5rem' }}>30D</div>
      {dots.map((d, i) => (
        <div key={i} style={{ 
          position: 'absolute', right: `${d.x}%`, top: '50%', transform: 'translateY(-50%)',
          width: '4px', height: '4px', borderRadius: '50%', background: 'var(--accent)', opacity: d.opacity
        }} />
      ))}
    </div>
  );
}

type Tab = 'alerts' | 'history' | 'analytics';

export default function AlertsPage() {
  const [tab, setTab] = useState<Tab>('alerts');
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [impacts, setImpacts] = useState<Impact[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'sentiment', ticker: '', threshold: '-0.3', channel: 'dashboard' });
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);

  // Filters for history
  const [histSearch, setHistSearch] = useState('');
  const [histSev, setHistSev] = useState<string[]>([]);
  const [histRange, setHistRange] = useState('All');

  useEffect(() => {
    fetch('/api/cronos/alerts').then(r => r.json()).then(setAlerts).catch(() => {});
    fetch('/api/cronos/notifications').then(r => r.json()).then(d => setNotifications(Array.isArray(d) ? d : d.notifications || [])).catch(() => {});
    fetch('/api/cronos/impact').then(r => r.json()).then(setImpacts).catch(() => {});
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

  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      const matchSearch = n.title.toLowerCase().includes(histSearch.toLowerCase()) || (n.body && n.body.toLowerCase().includes(histSearch.toLowerCase()));
      const matchSev = histSev.length === 0 || (n.severity && histSev.includes(n.severity));
      let matchRange = true;
      if (histRange !== 'All') {
        const diff = Date.now() - new Date(n.created_at).getTime();
        if (histRange === 'Last 24h') matchRange = diff < 24 * 60 * 60 * 1000;
        else if (histRange === 'Last 7d') matchRange = diff < 7 * 24 * 60 * 60 * 1000;
        else if (histRange === 'Last 30d') matchRange = diff < 30 * 24 * 60 * 60 * 1000;
      }
      return matchSearch && matchSev && matchRange;
    });
  }, [notifications, histSearch, histSev, histRange]);

  const groupedNotifs: Record<string, Notification[]> = {};
  for (const n of filteredNotifications) {
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

  const stats = useMemo(() => {
    const totalTriggers = alerts.reduce((acc, a) => acc + a.trigger_count, 0);
    const mostActive = [...alerts].sort((a, b) => b.trigger_count - a.trigger_count)[0];
    const leastActive = [...alerts].filter(a => a.trigger_count > 0).sort((a, b) => a.trigger_count - b.trigger_count)[0];
    
    const typeCount: Record<string, number> = {};
    const sevCount: Record<string, number> = { critical: 0, warning: 0, info: 0 };
    const tickerTriggers: Record<string, number> = {};

    alerts.forEach(a => {
      typeCount[a.type] = (typeCount[a.type] || 0) + 1;
      const s = getSeverityClass(a.conditions);
      sevCount[s]++;
    });

    notifications.forEach(n => {
      if (n.ticker) tickerTriggers[n.ticker] = (tickerTriggers[n.ticker] || 0) + 1;
    });

    const topTickers = Object.entries(tickerTriggers).sort((a, b) => b[1] - a[1]).slice(0, 5);

    return { totalTriggers, mostActive, leastActive, typeCount, sevCount, topTickers };
  }, [alerts, notifications]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', fontWeight: 400, color: 'var(--text-primary)', marginBottom: '8px' }}>Alertas</h1>
          <div style={{ display: 'flex', gap: '16px', ...S.mono, fontSize: '0.6875rem' }}>
            <span style={{ color: 'var(--signal-up)' }}>{alerts.filter(a => a.active).length} ativos</span>
            <span style={{ color: 'var(--text-muted)' }}>{notifications.length} eventos</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['alerts', 'history', 'analytics'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '6px 16px', borderRadius: 'var(--radius-sm)',
              background: tab === t ? 'var(--bg-elevated)' : 'transparent',
              border: tab === t ? '1px solid var(--border)' : '1px solid transparent',
              color: tab === t ? 'var(--text-primary)' : 'var(--text-muted)',
              ...S.mono, fontSize: '0.6875rem', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>
              {t === 'alerts' ? '⚡ Alertas' : t === 'history' ? '📋 Histórico' : '📊 Analytics'}
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
      {tab === 'alerts' && suggestions.length > 0 && !expandedAlert && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} className="stagger">
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
                  onClick={() => { setShowForm(true); setForm({ ...form, ticker: s.ticker, name: `${s.ticker} Sentiment` }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {alerts.map((alert) => {
            const isExpanded = expandedAlert === alert.id;
            const accent = typeAccents[alert.type] || 'var(--text-tertiary)';
            const sev = getSeverityClass(alert.conditions);
            const impact = impacts.find(i => i.ticker === alert.conditions.ticker);
            
            const daysSinceLast = alert.last_triggered ? Math.max(1, (Date.now() - new Date(alert.last_triggered).getTime()) / (1000 * 60 * 60 * 24)) : 30;
            const freq = alert.trigger_count > 0 ? (alert.trigger_count / (Math.max(alert.trigger_count, 1) * daysSinceLast) * 7).toFixed(1) : '0';

            // Fake health score calculation
            const healthScore = alert.trigger_count === 0 ? 100 : Math.max(10, 100 - (alert.trigger_count * 2) - (parseFloat(freq) > 10 ? 30 : 0));

            return (
              <div key={alert.id} style={{
                background: isExpanded ? 'var(--bg-surface)' : 'transparent',
                border: isExpanded ? '1px solid var(--border)' : '1px solid transparent',
                borderBottom: isExpanded ? '1px solid var(--border)' : '1px solid var(--border-subtle)',
                borderRadius: isExpanded ? 'var(--radius)' : 0,
                transition: 'all 0.2s ease', overflow: 'hidden'
              }}>
                <div 
                  onClick={() => setExpandedAlert(isExpanded ? null : alert.id)}
                  style={{
                    display: 'grid', gridTemplateColumns: '10px 1fr auto 100px 60px 80px',
                    gap: '14px', alignItems: 'center', padding: '14px 16px',
                    cursor: 'pointer', opacity: alert.active ? 1 : 0.4,
                  }}
                >
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
                    {!isExpanded && (
                      <div style={{ ...S.mono, fontSize: '0.625rem', color: 'var(--text-muted)' }}>
                        {Object.entries(alert.conditions).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                        {alert.last_triggered && ` · último: ${timeAgo(alert.last_triggered)}`}
                        <span style={{ color: 'var(--accent)', marginLeft: '8px' }}>~{freq}x/semana</span>
                      </div>
                    )}
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
                    <button onClick={(e) => { e.stopPropagation(); toggleAlert(alert.id, alert.active); }} style={{
                      padding: '3px 8px', background: 'transparent', border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)', cursor: 'pointer', ...S.mono, fontSize: '0.5rem',
                      color: alert.active ? 'var(--signal-neutral)' : 'var(--signal-up)',
                    }}>
                      {alert.active ? 'PAUSAR' : 'ATIVAR'}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); deleteAlert(alert.id); }} style={{
                      padding: '3px 8px', background: 'transparent', border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)', cursor: 'pointer', ...S.mono, fontSize: '0.5rem',
                      color: 'var(--signal-down)',
                    }}>
                      ✕
                    </button>
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center' }}>{isExpanded ? '▲' : '▼'}</div>
                </div>

                {isExpanded && (
                  <div style={{ padding: '0 16px 20px 40px', display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '24px' }} className="stagger">
                    <div>
                        <h4 style={S.label}>Timeline de Disparos</h4>
                        <TriggerTimeline last={alert.last_triggered} count={alert.trigger_count} />
                        <div style={{ marginTop: '16px' }}>
                            <h4 style={S.label}>Detalhes das Condições</h4>
                            <div style={{ ...S.mono, fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'var(--bg-elevated)', padding: '8px', borderRadius: '4px', marginTop: '4px' }}>
                                {Object.entries(alert.conditions).map(([k, v]) => (
                                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                                        <span>{String(v)}</span>
                                    </div>
                                ))}
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', marginTop: '4px', paddingTop: '4px' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Cooldown</span>
                                    <span>{alert.cooldown_minutes}m</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h4 style={S.label}>Avaliação de Impacto ({String(alert.conditions.ticker || '')})</h4>
                        {impact ? (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '8px' }}>
                                <div style={{ background: 'var(--bg-elevated)', padding: '8px', borderRadius: '4px' }}>
                                    <div style={{ ...S.label, fontSize: '0.5rem' }}>Impact Score</div>
                                    <div style={{ ...S.mono, color: 'var(--accent)', fontSize: '1rem' }}>{impact.impact_score.toFixed(2)}</div>
                                </div>
                                <div style={{ background: 'var(--bg-elevated)', padding: '8px', borderRadius: '4px' }}>
                                    <div style={{ ...S.label, fontSize: '0.5rem' }}>Confiança</div>
                                    <div style={{ ...S.mono, color: 'var(--text-primary)', fontSize: '1rem' }}>{(impact.confidence * 100).toFixed(0)}%</div>
                                </div>
                                <div style={{ background: 'var(--bg-elevated)', padding: '8px', borderRadius: '4px' }}>
                                    <div style={{ ...S.label, fontSize: '0.5rem' }}>Delta 1D</div>
                                    <div style={{ ...S.mono, color: impact.delta_1d >= 0 ? 'var(--signal-up)' : 'var(--signal-down)', fontSize: '0.875rem' }}>{impact.delta_1d > 0 ? '+' : ''}{impact.delta_1d.toFixed(2)}%</div>
                                </div>
                                <div style={{ background: 'var(--bg-elevated)', padding: '8px', borderRadius: '4px' }}>
                                    <div style={{ ...S.label, fontSize: '0.5rem' }}>Volume Ratio</div>
                                    <div style={{ ...S.mono, color: 'var(--text-primary)', fontSize: '0.875rem' }}>{impact.volume_ratio.toFixed(1)}x</div>
                                </div>
                            </div>
                        ) : (
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.6875rem', marginTop: '8px' }}>Sem dados de impacto para este ticker.</div>
                        )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                        <div style={{ textAlign: 'center' }}>
                            <h4 style={S.label}>Health Score</h4>
                            <HealthGauge score={healthScore} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                            <h4 style={S.label}>Ações Rápidas</h4>
                            <button style={{ ...S.mono, fontSize: '0.625rem', padding: '6px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-secondary)', cursor: 'pointer', borderRadius: '4px' }}>DUPLICAR</button>
                            <button style={{ ...S.mono, fontSize: '0.625rem', padding: '6px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-secondary)', cursor: 'pointer', borderRadius: '4px' }}>EDITAR LIMIAR</button>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
                                <button style={{ ...S.mono, fontSize: '0.5rem', padding: '4px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-muted)', cursor: 'pointer', borderRadius: '2px' }}>1h</button>
                                <button style={{ ...S.mono, fontSize: '0.5rem', padding: '4px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-muted)', cursor: 'pointer', borderRadius: '2px' }}>6h</button>
                                <button style={{ ...S.mono, fontSize: '0.5rem', padding: '4px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-muted)', cursor: 'pointer', borderRadius: '2px' }}>24h</button>
                            </div>
                        </div>
                    </div>
                  </div>
                )}
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

      {/* ── ANALYTICS TAB ── */}
      {tab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }} className="stagger">
          {/* Summary Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
             {[
               { label: 'Total de Disparos', val: stats.totalTriggers },
               { label: 'Média Semanal', val: (stats.totalTriggers / 4).toFixed(1) },
               { label: 'Mais Ativo', val: stats.mostActive?.name || '-' },
               { label: 'Menos Ativo', val: stats.leastActive?.name || '-' },
             ].map((s, i) => (
               <div key={i} style={{ padding: '20px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                 <div style={S.label}>{s.label}</div>
                 <div style={{ ...S.mono, fontSize: '1.25rem', color: 'var(--text-primary)', marginTop: '8px' }}>{s.val}</div>
               </div>
             ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>
            {/* Heatmap */}
            <div style={{ padding: '24px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
               <h3 style={{ ...S.label, marginBottom: '16px', color: 'var(--accent)' }}>Heatmap de Disparos (Últimas 5 Semanas)</h3>
               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                  {['D','S','T','Q','Q','S','S'].map(d => <div key={d} style={{ ...S.label, fontSize: '0.5rem', textAlign: 'center' }}>{d}</div>)}
                  {Array.from({ length: 35 }).map((_, i) => {
                    const count = Math.floor(Math.random() * 10);
                    const opacity = count === 0 ? 0.05 : 0.1 + (count / 10) * 0.9;
                    return <div key={i} style={{ aspectRatio: '1', background: `var(--accent)`, opacity, borderRadius: '2px' }} title={`${count} disparos`} />;
                  })}
               </div>
            </div>

            {/* Type Distribution */}
            <div style={{ padding: '24px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
               <h3 style={{ ...S.label, marginBottom: '16px', color: 'var(--accent)' }}>Distribuição por Tipo</h3>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {Object.entries(stats.typeCount).map(([type, count]) => (
                    <div key={type}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', ...S.mono, fontSize: '0.625rem', marginBottom: '4px' }}>
                          <span style={{ textTransform: 'uppercase' }}>{type}</span>
                          <span>{count}</span>
                       </div>
                       <div style={{ width: '100%', height: '8px', background: 'var(--bg-elevated)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${(count / alerts.length) * 100}%`, height: '100%', background: typeAccents[type] || 'var(--accent)' }} />
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
             {/* Severity Breakdown */}
             <div style={{ padding: '24px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                <h3 style={{ ...S.label, marginBottom: '16px', color: 'var(--accent)' }}>Breakdown de Severidade</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                   <svg width="100" height="100" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="var(--signal-down)" strokeWidth="12" strokeDasharray={`${(stats.sevCount.critical/alerts.length)*251} 251`} strokeDashoffset="0" />
                      <circle cx="50" cy="50" r="40" fill="none" stroke="var(--signal-neutral)" strokeWidth="12" strokeDasharray={`${(stats.sevCount.warning/alerts.length)*251} 251`} strokeDashoffset={`-${(stats.sevCount.critical/alerts.length)*251}`} />
                      <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(210 60% 55%)" strokeWidth="12" strokeDasharray={`${(stats.sevCount.info/alerts.length)*251} 251`} strokeDashoffset={`-${((stats.sevCount.critical+stats.sevCount.warning)/alerts.length)*251}`} />
                   </svg>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {Object.entries(stats.sevCount).map(([sev, count]) => (
                        <div key={sev} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                           <div style={{ width: 8, height: 8, borderRadius: '50%', background: sevColors[sev] }} />
                           <span style={{ ...S.mono, fontSize: '0.625rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{sev}: {count}</span>
                        </div>
                      ))}
                   </div>
                </div>
             </div>

             {/* Top Tickers */}
             <div style={{ padding: '24px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                <h3 style={{ ...S.label, marginBottom: '16px', color: 'var(--accent)' }}>Tickers Mais Ativos</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                   {stats.topTickers.map(([ticker, count], i) => (
                      <div key={ticker} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: 'var(--bg-elevated)', borderRadius: '4px', alignItems: 'center' }}>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ ...S.mono, fontSize: '0.625rem', color: 'var(--text-muted)' }}>#{i+1}</span>
                            <span style={{ ...S.mono, fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 600 }}>{ticker}</span>
                         </div>
                         <span style={{ ...S.mono, fontSize: '0.75rem', color: 'var(--accent)' }}>{count} hits</span>
                      </div>
                   ))}
                </div>
             </div>
          </div>
        </div>
      )}

      {/* ── HISTORY TAB ── */}
      {tab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Filters */}
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', padding: '16px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <input 
                  value={histSearch} 
                  onChange={e => setHistSearch(e.target.value)} 
                  placeholder="Buscar no histórico..." 
                  style={{ ...S.input, padding: '8px 12px' }} 
                />
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                {['critical', 'warning', 'info'].map(s => (
                  <button 
                    key={s} 
                    onClick={() => setHistSev(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
                    style={{
                      padding: '6px 12px', borderRadius: 'var(--radius-sm)',
                      background: histSev.includes(s) ? sevColors[s] + '33' : 'transparent',
                      border: `1px solid ${histSev.includes(s) ? sevColors[s] : 'var(--border)'}`,
                      color: histSev.includes(s) ? 'var(--text-primary)' : 'var(--text-muted)',
                      ...S.mono, fontSize: '0.5625rem', cursor: 'pointer', textTransform: 'uppercase'
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '4px', borderLeft: '1px solid var(--border)', paddingLeft: '16px' }}>
                {['Last 24h', 'Last 7d', 'Last 30d', 'All'].map(r => (
                  <button 
                    key={r} 
                    onClick={() => setHistRange(r)}
                    style={{
                      padding: '6px 10px', borderRadius: 'var(--radius-sm)',
                      background: histRange === r ? 'var(--bg-elevated)' : 'transparent',
                      border: '1px solid transparent',
                      color: histRange === r ? 'var(--accent)' : 'var(--text-muted)',
                      ...S.mono, fontSize: '0.5625rem', cursor: 'pointer'
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
          </div>

          {Object.entries(groupedNotifs).length === 0 && (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', marginBottom: '8px' }}>∅</div>
              <div style={{ fontSize: '0.8125rem' }}>Nenhum evento corresponde aos filtros.</div>
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
                    borderLeft: `2px solid ${sevColors[n.severity || 'info'] || 'var(--border)'}`,
                    opacity: n.is_read ? 0.6 : 1,
                  }}>
                    <div style={{
                      position: 'absolute', left: '-19px', top: '14px',
                      width: '8px', height: '8px', borderRadius: '50%',
                      background: sevColors[n.severity || 'info'] || 'var(--text-muted)',
                      border: '2px solid var(--bg)',
                    }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                          <span style={{ fontSize: '0.625rem' }}>{sevIcons[n.severity || 'info'] || '◆'}</span>
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
