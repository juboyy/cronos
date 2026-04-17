import { supabaseQuery } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

async function getData() {
  const patterns = await supabaseQuery('cronos_patterns', 'select=*&order=occurrences.desc&limit=50');

  const grouped: Record<string, any[]> = {};
  for (const p of patterns) {
    if (!grouped[p.ticker]) grouped[p.ticker] = [];
    grouped[p.ticker].push(p);
  }

  return { patterns, grouped };
}

const TYPE_ACCENTS: Record<string, string> = {
  dividend: 'hsl(155 65% 45%)',
  earnings: 'hsl(45 75% 50%)',
  acquisition: 'hsl(280 50% 55%)',
  regulatory: 'hsl(0 65% 50%)',
  macro: 'hsl(210 60% 55%)',
  governance: 'hsl(30 70% 50%)',
  operational: 'hsl(180 55% 45%)',
  market: 'hsl(330 60% 55%)',
  general: 'hsl(225 10% 40%)',
};

export default async function PatternsPage() {
  const { patterns, grouped } = await getData();

  const S = {
    label: { fontFamily: 'var(--font-mono)', fontSize: '0.5625rem' as const, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' as const },
    mono: { fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' as const },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', fontWeight: 400, color: 'var(--text-primary)', marginBottom: '8px' }}>Patterns</h1>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', maxWidth: '60ch' }}>
          Correlações recorrentes entre eventos de notícias e reações de preço.
          A confiança do padrão cresce com cada ocorrência confirmada.
        </p>
      </div>

      {Object.entries(grouped).map(([ticker, pats]) => (
        <section key={ticker}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <span style={{ ...S.mono, fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 600 }}>{ticker}</span>
            <span style={{ ...S.label }}>{pats.length} {pats.length === 1 ? 'pattern' : 'patterns'}</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {pats.map((p: any) => {
              const accentColor = TYPE_ACCENTS[p.pattern_type] || TYPE_ACCENTS.general;
              return (
                <div
                  key={p.id}
                  className="interactive"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '100px 1fr auto',
                    gap: '16px',
                    alignItems: 'start',
                    padding: '14px 16px',
                    borderLeft: `2px solid ${accentColor}`,
                    borderBottom: '1px solid var(--border-subtle)',
                  }}
                >
                  {/* Type + Occurrences */}
                  <div>
                    <span style={{ ...S.mono, fontSize: '0.6875rem', color: accentColor, display: 'block', marginBottom: '4px' }}>
                      {p.pattern_type}
                    </span>
                    <span style={{ ...S.label }}>{p.occurrences} events</span>
                  </div>

                  {/* Description + Samples */}
                  <div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '6px' }}>
                      {p.description}
                    </div>
                    {p.sample_articles?.slice(0, 2).map((sa: any, i: number) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.625rem' }}>→</span>
                        <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {sa.title}
                        </span>
                        {sa.delta != null && (
                          <span style={{ ...S.mono, fontSize: '0.625rem', color: sa.delta > 0 ? 'var(--signal-up)' : 'var(--signal-down)', flexShrink: 0 }}>
                            {sa.delta > 0 ? '+' : ''}{sa.delta.toFixed(2)}%
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Stats */}
                  <div style={{ textAlign: 'right', minWidth: '80px' }}>
                    <div style={{
                      ...S.mono,
                      fontSize: '1rem',
                      color: p.avg_impact > 0 ? 'var(--signal-up)' : p.avg_impact < 0 ? 'var(--signal-down)' : 'var(--text-secondary)',
                      fontWeight: 500,
                    }}>
                      {p.avg_impact > 0 ? '+' : ''}{p.avg_impact?.toFixed(2)}%
                    </div>
                    <div style={{ ...S.mono, fontSize: '0.625rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      σ {p.std_dev?.toFixed(2)}%
                    </div>
                    <div style={{ ...S.mono, fontSize: '0.625rem', color: 'var(--text-muted)' }}>
                      conf {(p.avg_confidence * 100)?.toFixed(0)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {patterns.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', marginBottom: '8px' }}>≈</div>
          <div style={{ fontSize: '0.8125rem' }}>Nenhum padrão detectado. Execute o scorer de impacto para construir dados de correlação.</div>
        </div>
      )}
    </div>
  );
}
