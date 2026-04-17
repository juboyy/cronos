'use client';

interface ChainEvent {
  title: string;
  source: string;
  date: string;
  sentiment: number | null;
  delta: number | null;
  impactScore: number;
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

export function TransmissionChain({ events }: { events: ChainEvent[] }) {
  if (events.length === 0) return (
    <section style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', marginBottom: '6px' }}>∅</div>
      <div style={{ fontSize: '0.75rem' }}>Sem dados de impacto para construir a cadeia de transmissão.</div>
      <div style={{ ...S.label, marginTop: '4px' }}>Execute o scorer de impacto para gerar correlações.</div>
    </section>
  );

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
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', marginBottom: '16px' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Cadeia de Transmissão
        </h2>
        <span style={{ ...S.label }}>{events.length} eventos rastreados</span>
      </div>

      {/* Flow header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 24px 100px 24px 90px 24px 90px',
        gap: '0',
        padding: '0 16px 10px',
        borderBottom: '1px solid var(--border)',
      }}>
        {['EVENTO', '', 'SENTIMENTO', '', 'REAÇÃO', '', 'IMPACTO'].map((h, i) =>
          i % 2 === 1 ? (
            <span key={i} style={{ color: 'var(--border)', textAlign: 'center', fontSize: '0.625rem', lineHeight: '14px' }}>→</span>
          ) : (
            <span key={i} style={{ ...S.label }}>{h}</span>
          )
        )}
      </div>

      {/* Rows */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {events.map((ev, i) => {
          const sc = sentColor(ev.sentiment);
          const dc = deltaColor(ev.delta);
          const level = ev.impactScore > 0.7 ? 'ALTO' : ev.impactScore > 0.4 ? 'MÉDIO' : 'BAIXO';
          const levelColor = ev.impactScore > 0.7 ? 'var(--signal-down)' : ev.impactScore > 0.4 ? 'var(--signal-neutral)' : 'var(--text-muted)';
          const barWidth = Math.min(Math.abs(ev.sentiment ?? 0) * 200, 100);

          return (
            <div
              key={i}
              className="chain-row"
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 24px 100px 24px 90px 24px 90px',
                gap: '0',
                padding: '14px 16px',
                borderBottom: '1px solid var(--border-subtle)',
                animationDelay: `${i * 0.08}s`,
                cursor: 'default',
                transition: 'background 150ms',
                borderLeft: `2px solid ${levelColor}`,
              }}
            >
              {/* EVENT */}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {ev.title}
                </div>
                <div style={{ ...S.mono, fontSize: '0.5625rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                  {ev.source} · {new Date(ev.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                </div>
              </div>

              {/* Arrow */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="chain-connector" style={{ width: '16px', height: '1px', background: 'var(--border)', animationDelay: `${i * 0.08 + 0.15}s` }} />
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="chain-connector" style={{ width: '16px', height: '1px', background: 'var(--border)', animationDelay: `${i * 0.08 + 0.25}s` }} />
              </div>

              {/* PRICE REACTION */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                <span style={{ ...S.mono, fontSize: '0.875rem', color: dc, fontWeight: 500 }}>
                  {ev.delta != null
                    ? `${ev.delta > 0 ? '↑' : ev.delta < 0 ? '↓' : '→'} ${Math.abs(ev.delta).toFixed(2)}%`
                    : '—'}
                </span>
                <span style={{ ...S.label, fontSize: '0.4375rem' }}>Δ1D</span>
              </div>

              {/* Arrow */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="chain-connector" style={{ width: '16px', height: '1px', background: 'var(--border)', animationDelay: `${i * 0.08 + 0.35}s` }} />
              </div>

              {/* IMPACT SCORE */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                <span style={{ ...S.mono, fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                  {ev.impactScore.toFixed(2)}
                </span>
                <span style={{ ...S.label, fontSize: '0.4375rem', color: levelColor }}>{level}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
