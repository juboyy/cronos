import { supabaseQuery } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

async function getData() {
  const [impacts, prices] = await Promise.all([
    supabaseQuery('cronos_impacts', 'select=*,cronos_articles(title,source,published_at)&order=impact_score.desc&limit=40'),
    supabaseQuery('cronos_prices', 'select=ticker,date,close,volume&order=date.desc&limit=100'),
  ]);

  // Aggregate by ticker
  const tickerAgg: Record<string, { count: number; totalScore: number; totalDelta: number; volAnomalies: number }> = {};
  for (const imp of impacts) {
    if (!tickerAgg[imp.ticker]) tickerAgg[imp.ticker] = { count: 0, totalScore: 0, totalDelta: 0, volAnomalies: 0 };
    tickerAgg[imp.ticker].count++;
    tickerAgg[imp.ticker].totalScore += imp.impact_score || 0;
    tickerAgg[imp.ticker].totalDelta += imp.delta_1d || 0;
    if (imp.volume_anomaly) tickerAgg[imp.ticker].volAnomalies++;
  }

  const ranked = Object.entries(tickerAgg)
    .map(([ticker, d]) => ({ ticker, ...d, avgScore: d.totalScore / d.count, avgDelta: d.totalDelta / d.count }))
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, 15);

  return { impacts, ranked };
}

function ImpactBar({ score }: { score: number }) {
  const w = Math.min(score * 100, 100);
  const color = score > 0.6 ? 'var(--signal-down)' : score > 0.35 ? 'var(--signal-neutral)' : 'var(--accent)';
  return (
    <div style={{ width: '80px', height: '3px', background: 'var(--border-subtle)', borderRadius: '2px', overflow: 'hidden' }}>
      <div style={{ width: `${w}%`, height: '100%', background: color, borderRadius: '2px', transition: 'width 0.6s ease' }} />
    </div>
  );
}

function Delta({ value }: { value: number | null }) {
  if (value === null || value === undefined) return <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>—</span>;
  const color = value > 0 ? 'var(--signal-up)' : value < 0 ? 'var(--signal-down)' : 'var(--text-tertiary)';
  return (
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color, fontVariantNumeric: 'tabular-nums' }}>
      {value > 0 ? '+' : ''}{value.toFixed(2)}%
    </span>
  );
}

export default async function ImpactPage() {
  const { impacts, ranked } = await getData();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px' }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', fontWeight: 400 }}>Análise de Impacto</h1>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-muted)' }}>
          {impacts.length} correlações computadas
        </span>
      </div>

      {/* ── ENTITY IMPACT RANKING ── */}
      {ranked.length > 0 && (
        <section>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '16px' }}>
            Ranking de Ativos — Índice de Exposição
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '2px' }}>
            {ranked.map((r, i) => {
              const intensity = Math.min(r.avgScore * 1.2, 1);
              const barH = Math.max(20, Math.min(intensity * 80, 80));
              return (
                <div
                  key={r.ticker}
                  className="stagger interactive"
                  style={{
                    padding: '16px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderTop: `2px solid hsl(${r.avgScore > 0.5 ? 0 : r.avgScore > 0.3 ? 45 : 150} ${intensity * 70 + 20}% 50%)`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--text-primary)', fontWeight: 600 }}>{r.ticker}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>{r.avgScore.toFixed(3)}</span>
                  </div>

                  {/* Mini bar viz */}
                  <div style={{ height: '3px', background: 'var(--border-subtle)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${intensity * 100}%`, height: '100%', background: `hsl(${r.avgScore > 0.5 ? 0 : r.avgScore > 0.3 ? 45 : 150} 60% 50%)`, transition: 'width 0.6s ease' }} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'var(--text-muted)' }}>
                    <span>{r.count} eventos</span>
                    {r.volAnomalies > 0 && <span style={{ color: 'var(--signal-down)' }}>{r.volAnomalies} alertas vol</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── IMPACT TABLE ── */}
      <section>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '16px' }}>
          Evento → Correlação de Preço
        </div>

        {/* Table header */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '60px 1fr 70px 70px 50px 80px 50px',
            gap: '12px',
            padding: '8px 16px',
            borderBottom: '1px solid var(--border)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.5625rem',
            color: 'var(--text-muted)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          <span>Ativo</span>
          <span>Manchete</span>
          <span style={{ textAlign: 'right' }}>Δ 1d</span>
          <span style={{ textAlign: 'right' }}>Δ 5d</span>
          <span style={{ textAlign: 'right' }}>Vol</span>
          <span>Score</span>
          <span style={{ textAlign: 'right' }}>Conf</span>
        </div>

        {impacts.map((imp: any, i: number) => (
          <div
            key={imp.id}
            className="interactive stagger"
            style={{
              display: 'grid',
              gridTemplateColumns: '60px 1fr 70px 70px 50px 80px 50px',
              gap: '12px',
              padding: '10px 16px',
              borderBottom: '1px solid var(--border-subtle)',
              alignItems: 'center',
            }}
          >
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-primary)', fontWeight: 500 }}>
              {imp.ticker}
            </span>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {imp.cronos_articles?.title || '—'}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                {imp.cronos_articles?.source} · {imp.cronos_articles?.published_at ? new Date(imp.cronos_articles.published_at).toLocaleDateString('pt-BR') : ''}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}><Delta value={imp.delta_1d} /></div>
            <div style={{ textAlign: 'right' }}><Delta value={imp.delta_5d} /></div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: imp.volume_anomaly ? 'var(--signal-down)' : 'var(--text-tertiary)' }}>
                {imp.volume_ratio?.toFixed(1)}x
              </span>
            </div>
            <ImpactBar score={imp.impact_score} />
            <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>
              {(imp.confidence * 100).toFixed(0)}%
            </div>
          </div>
        ))}

        {impacts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', marginBottom: '8px' }}>∅</div>
            <div style={{ fontSize: '0.8125rem' }}>Nenhum impacto calculado. Execute o pipeline com --impact.</div>
          </div>
        )}
      </section>
    </div>
  );
}
