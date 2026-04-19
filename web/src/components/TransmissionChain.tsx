'use client';

import { useState, useMemo } from 'react';

interface ChainEvent {
  title: string;
  source: string;
  date: string;
  sentiment: number | null;
  delta: number | null;
  impactScore: number;
  ticker?: string;
}

const S = {
  label: { fontFamily: 'var(--font-mono)', fontSize: '0.5rem' as const, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' as const },
  mono: { fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' as const },
};

function sentColor(s: number | null) {
  if (s == null) return 'var(--text-muted)';
  return s > 0.05 ? 'var(--signal-up)' : s < -0.05 ? 'var(--signal-down)' : 'var(--signal-neutral)';
}

function deltaColor(d: number | null) {
  if (d == null) return 'var(--text-muted)';
  return d > 0 ? 'var(--signal-up)' : d < 0 ? 'var(--signal-down)' : 'var(--text-secondary)';
}

type ImpactFilter = 'all' | 'high' | 'medium' | 'low';

export function TransmissionChain({ events }: { events: ChainEvent[] }) {
  const [filter, setFilter] = useState<ImpactFilter>('all');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(20);

  const filtered = useMemo(() => {
    let result = events;

    // Impact filter
    if (filter === 'high') result = result.filter(e => e.impactScore > 0.7);
    else if (filter === 'medium') result = result.filter(e => e.impactScore > 0.4 && e.impactScore <= 0.7);
    else if (filter === 'low') result = result.filter(e => e.impactScore <= 0.4);

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(e =>
        e.title.toLowerCase().includes(q) ||
        e.source.toLowerCase().includes(q) ||
        (e.ticker && e.ticker.toLowerCase().includes(q))
      );
    }

    return result;
  }, [events, filter, search]);

  const visible = filtered.slice(0, visibleCount);

  if (events.length === 0) return (
    <section style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', marginBottom: '6px' }}>∅</div>
      <div style={{ fontSize: '0.75rem' }}>Sem dados de impacto para construir a cadeia de transmissão.</div>
      <div style={{ ...S.label, marginTop: '4px' }}>Execute o scorer de impacto para gerar correlações.</div>
    </section>
  );

  const filterButtons: { label: string; value: ImpactFilter; color: string }[] = [
    { label: 'Todos', value: 'all', color: 'var(--text-secondary)' },
    { label: 'Alto', value: 'high', color: 'var(--signal-down)' },
    { label: 'Médio', value: 'medium', color: 'var(--signal-neutral)' },
    { label: 'Baixo', value: 'low', color: 'var(--text-muted)' },
  ];

  return (
    <section>
      <style>{`
        @keyframes chainFade {
          from { opacity: 0; transform: translateX(-12px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes chainLine {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
        .chain-row {
          animation: chainFade 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .chain-connector {
          animation: chainLine 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
          transform-origin: left center;
        }
        .chain-row:hover {
          background: var(--bg-hover) !important;
        }
        .chain-expanded {
          background: var(--bg-elevated) !important;
          border-left-width: 3px !important;
        }
        .chain-filter-btn {
          background: none;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          padding: 3px 8px;
          cursor: pointer;
          transition: all 150ms;
        }
        .chain-filter-btn:hover {
          border-color: var(--border);
        }
        .chain-filter-btn.active {
          border-color: var(--accent-dim);
          background: var(--accent-bg);
        }
        .chain-search {
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          padding: 4px 10px;
          color: var(--text-secondary);
          font-family: var(--font-mono);
          font-size: 0.625rem;
          outline: none;
          transition: border-color 150ms;
          width: 160px;
        }
        .chain-search:focus {
          border-color: var(--border-focus);
        }
        .chain-search::placeholder {
          color: var(--text-muted);
        }
        @media (max-width: 768px) {
          .chain-grid {
            grid-template-columns: 1fr !important;
            gap: 8px !important;
          }
          .chain-arrow { display: none !important; }
          .chain-metrics {
            display: flex !important;
            flex-direction: row !important;
            gap: 12px !important;
            padding-top: 6px !important;
          }
        }
      `}</style>

      {/* Header + Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Cadeia de Transmissão
          </h2>
          <span style={{ ...S.label }}>{filtered.length} de {events.length} eventos</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="text"
            className="chain-search"
            placeholder="Filtrar..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {filterButtons.map(fb => (
            <button
              key={fb.value}
              className={`chain-filter-btn ${filter === fb.value ? 'active' : ''}`}
              onClick={() => setFilter(fb.value)}
              style={{ ...S.label, color: filter === fb.value ? fb.color : 'var(--text-muted)' }}
            >
              {fb.label}
            </button>
          ))}
        </div>
      </div>

      {/* Flow header */}
      <div className="chain-grid" style={{
        display: 'grid',
        gridTemplateColumns: '1fr 24px 100px 24px 90px 24px 90px',
        gap: '0',
        padding: '0 16px 10px',
        borderBottom: '1px solid var(--border)',
      }}>
        {['EVENTO', '', 'SENTIMENTO', '', 'REAÇÃO', '', 'IMPACTO'].map((h, i) =>
          i % 2 === 1 ? (
            <span key={i} className="chain-arrow" style={{ color: 'var(--border)', textAlign: 'center', fontSize: '0.625rem', lineHeight: '14px' }}>→</span>
          ) : (
            <span key={i} style={{ ...S.label }}>{h}</span>
          )
        )}
      </div>

      {/* Rows */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {visible.map((ev, i) => {
          const sc = sentColor(ev.sentiment);
          const dc = deltaColor(ev.delta);
          const level = ev.impactScore > 0.7 ? 'ALTO' : ev.impactScore > 0.4 ? 'MÉDIO' : 'BAIXO';
          const levelColor = ev.impactScore > 0.7 ? 'var(--signal-down)' : ev.impactScore > 0.4 ? 'var(--signal-neutral)' : 'var(--text-muted)';
          const barWidth = Math.min(Math.abs(ev.sentiment ?? 0) * 200, 100);
          const isExpanded = expanded === i;

          return (
            <div key={i}>
              <div
                className={`chain-row ${isExpanded ? 'chain-expanded' : ''}`}
                onClick={() => setExpanded(isExpanded ? null : i)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 24px 100px 24px 90px 24px 90px',
                  gap: '0',
                  padding: '14px 16px',
                  borderBottom: '1px solid var(--border-subtle)',
                  animationDelay: `${i * 0.04}s`,
                  cursor: 'pointer',
                  transition: 'background 150ms',
                  borderLeft: `2px solid ${levelColor}`,
                }}
              >
                {/* EVENT */}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: isExpanded ? 'normal' : 'nowrap' }}>
                    {ev.title}
                  </div>
                  <div style={{ ...S.mono, fontSize: '0.5625rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                    {ev.source} · {new Date(ev.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                    {ev.ticker && <> · <span style={{ color: 'var(--accent)' }}>{ev.ticker}</span></>}
                  </div>
                </div>

                {/* Arrow */}
                <div className="chain-arrow" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div className="chain-connector" style={{ width: '16px', height: '1px', background: 'var(--border)', animationDelay: `${i * 0.04 + 0.15}s` }} />
                </div>

                {/* SENTIMENT */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', justifyContent: 'center' }}>
                  <div style={{ width: '100%', height: '4px', background: 'var(--border-subtle)', borderRadius: '2px', overflow: 'hidden', position: 'relative' }}>
                    <div style={{
                      position: 'absolute',
                      left: (ev.sentiment ?? 0) >= 0 ? '50%' : `${50 - barWidth / 2}%`,
                      width: `${barWidth / 2}%`,
                      height: '100%',
                      background: sc,
                      borderRadius: '2px',
                      transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                    }} />
                    {/* Center tick */}
                    <div style={{ position: 'absolute', left: '50%', top: '-1px', width: '1px', height: '6px', background: 'var(--text-muted)', opacity: 0.3 }} />
                  </div>
                  <span style={{ ...S.mono, fontSize: '0.625rem', color: sc, textAlign: 'center' }}>
                    {ev.sentiment != null ? (ev.sentiment > 0 ? '+' : '') + ev.sentiment.toFixed(2) : '—'}
                  </span>
                </div>

                {/* Arrow */}
                <div className="chain-arrow" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div className="chain-connector" style={{ width: '16px', height: '1px', background: 'var(--border)', animationDelay: `${i * 0.04 + 0.25}s` }} />
                </div>

                {/* PRICE REACTION */}
                <div className="chain-metrics" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                  <span style={{ ...S.mono, fontSize: '0.875rem', color: dc, fontWeight: 500 }}>
                    {ev.delta != null
                      ? `${ev.delta > 0 ? '↑' : ev.delta < 0 ? '↓' : '→'} ${Math.abs(ev.delta).toFixed(2)}%`
                      : '—'}
                  </span>
                  <span style={{ ...S.label, fontSize: '0.4375rem' }}>Δ1D</span>
                </div>

                {/* Arrow */}
                <div className="chain-arrow" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div className="chain-connector" style={{ width: '16px', height: '1px', background: 'var(--border)', animationDelay: `${i * 0.04 + 0.35}s` }} />
                </div>

                {/* IMPACT SCORE */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                  <span style={{ ...S.mono, fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                    {ev.impactScore.toFixed(2)}
                  </span>
                  <span style={{ ...S.label, fontSize: '0.4375rem', color: levelColor }}>{level}</span>
                </div>
              </div>

              {/* Expanded detail panel */}
              {isExpanded && (
                <div style={{
                  padding: '12px 16px 12px 20px',
                  background: 'var(--bg-elevated)',
                  borderBottom: '1px solid var(--border)',
                  borderLeft: `3px solid ${levelColor}`,
                  animation: 'chainFade 0.3s ease both',
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
                    <div>
                      <div style={{ ...S.label, marginBottom: '4px' }}>Sentimento</div>
                      <div style={{ ...S.mono, fontSize: '0.875rem', color: sc }}>
                        {ev.sentiment != null ? ev.sentiment.toFixed(4) : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div style={{ ...S.label, marginBottom: '4px' }}>Δ Preço</div>
                      <div style={{ ...S.mono, fontSize: '0.875rem', color: dc }}>
                        {ev.delta != null ? `${ev.delta > 0 ? '+' : ''}${ev.delta.toFixed(4)}%` : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div style={{ ...S.label, marginBottom: '4px' }}>Score</div>
                      <div style={{ ...S.mono, fontSize: '0.875rem', color: levelColor }}>
                        {ev.impactScore.toFixed(4)} ({level})
                      </div>
                    </div>
                    <div>
                      <div style={{ ...S.label, marginBottom: '4px' }}>Fonte</div>
                      <div style={{ ...S.mono, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        {ev.source} · {new Date(ev.date).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: '10px', fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {ev.title}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Load more */}
      {filtered.length > visibleCount && (
        <button
          onClick={() => setVisibleCount(v => v + 20)}
          style={{
            display: 'block',
            margin: '16px auto',
            padding: '8px 24px',
            background: 'none',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius)',
            color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.625rem',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            transition: 'all 150ms',
          }}
          onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = 'var(--border)'; (e.target as HTMLElement).style.color = 'var(--text-secondary)'; }}
          onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = 'var(--border-subtle)'; (e.target as HTMLElement).style.color = 'var(--text-tertiary)'; }}
        >
          Carregar mais ({filtered.length - visibleCount} restantes)
        </button>
      )}
    </section>
  );
}
