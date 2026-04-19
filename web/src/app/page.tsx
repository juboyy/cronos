import { supabaseQuery } from '@/lib/supabase';
import { ArticleFeed } from '@/components/ArticleFeed';

export const dynamic = 'force-dynamic';

async function getData() {
  const [articles, entities, sentiments, macro, impacts, prices] = await Promise.all([
    supabaseQuery('cronos_articles', 'select=id,title,source,summary,published_at,url,cronos_sentiment(score,label)&order=published_at.desc.nullslast&limit=25'),
    supabaseQuery('cronos_entities', 'select=id,type,value,canonical_name,sector&type=eq.ticker&limit=15'),
    supabaseQuery('cronos_sentiment', 'select=score,label&limit=200'),
    supabaseQuery('cronos_macro', 'select=indicator,value,date&order=date.desc&limit=30'),
    supabaseQuery('cronos_impacts', 'select=ticker,impact_score,delta_1d,volume_anomaly&order=impact_score.desc&limit=8'),
    supabaseQuery('cronos_prices', 'select=ticker,date,close,volume&order=date.desc&limit=60'),
  ]);

  // Aggregate sentiment
  const scores = sentiments.map((s: any) => s.score).filter(Boolean);
  const avgSent = scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0;
  const posPct = scores.length > 0 ? Math.round(scores.filter((s: number) => s > 0.05).length / scores.length * 100) : 0;
  const negPct = scores.length > 0 ? Math.round(scores.filter((s: number) => s < -0.05).length / scores.length * 100) : 0;

  // Deduplicate macro by indicator
  const macroMap: Record<string, any> = {};
  for (const m of macro) { if (!macroMap[m.indicator]) macroMap[m.indicator] = m; }

  // Price deltas by ticker
  const priceMap: Record<string, any[]> = {};
  for (const p of prices) { if (!priceMap[p.ticker]) priceMap[p.ticker] = []; priceMap[p.ticker].push(p); }

  // Get total article count
  let totalArticles = articles.length;
  try {
    const countUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://apkflemxmsbdltziouls.supabase.co'}/rest/v1/cronos_articles?select=id&head=true`;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const cRes = await fetch(countUrl, {
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Prefer': 'count=exact' },
      next: { revalidate: 60 },
    });
    totalArticles = parseInt(cRes.headers.get('content-range')?.split('/')[1] || '0', 10) || articles.length;
  } catch { /* fallback */ }

  return { articles, entities, avgSent, posPct, negPct, sentimentCount: scores.length, macroMap, impacts, priceMap, totalArticles };
}

function formatTime(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffH = Math.floor((now.getTime() - d.getTime()) / 3600000);
  if (diffH < 1) return 'agora';
  if (diffH < 24) return `${diffH}h`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function SentimentDot({ score }: { score: number }) {
  const hue = score > 0.05 ? 155 : score < -0.05 ? 0 : 45;
  const sat = Math.min(Math.abs(score) * 800, 80);
  return (
    <span
      style={{
        display: 'inline-block',
        width: 8, height: 8,
        borderRadius: '50%',
        background: `hsl(${hue} ${sat}% 50%)`,
        flexShrink: 0,
      }}
    />
  );
}

export default async function IntelligencePage() {
  const { articles, entities, avgSent, posPct, negPct, sentimentCount, macroMap, impacts, priceMap, totalArticles } = await getData();

  const macroEntries = Object.entries(macroMap) as [string, any][];
  const macroLabels: Record<string, string> = { selic: 'Selic', ipca: 'IPCA', usdbrl: 'USD/BRL', cdi: 'CDI', ibov: 'Ibovespa', dxy: 'DXY' };
  const macroFormats: Record<string, (v: number) => string> = {
    selic: (v) => `${v.toFixed(2)}%`,
    ipca: (v) => `${v.toFixed(2)}%`,
    usdbrl: (v) => `R$${v.toFixed(4)}`,
    cdi: (v) => `${(v * 100).toFixed(4)}%`,
    ibov: (v) => v.toLocaleString('pt-BR', { maximumFractionDigits: 0 }),
    dxy: (v) => v.toFixed(2),
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>

      {/* ━━ MACRO RIBBON ━━ */}
      <section className="macro-ribbon" style={{ display: 'flex', gap: '2px', flexWrap: 'wrap' }}>
        {macroEntries.map(([key, m], i) => (
          <div
            key={key}
            className="stagger"
            style={{
              flex: '1 1 140px',
              padding: '16px 20px',
              background: 'var(--bg-surface)',
              borderLeft: i === 0 ? '2px solid var(--accent-dim)' : '1px solid var(--border-subtle)',
              borderRight: '1px solid var(--border-subtle)',
              borderTop: '1px solid var(--border-subtle)',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-tertiary)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px' }}>
              {macroLabels[key] || key}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.125rem', color: 'var(--text-primary)', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
              {macroFormats[key] ? macroFormats[key](m.value) : m.value}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              {new Date(m.date).toLocaleDateString('pt-BR')}
            </div>
          </div>
        ))}

        {/* Sentiment gauge */}
        <div
          className="stagger"
          style={{
            flex: '1 1 200px',
            padding: '16px 20px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-tertiary)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px' }}>
            Sentimento ({sentimentCount})
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.125rem', color: avgSent > 0.05 ? 'var(--signal-up)' : avgSent < -0.05 ? 'var(--signal-down)' : 'var(--signal-neutral)', fontWeight: 500 }}>
              {avgSent > 0 ? '+' : ''}{avgSent.toFixed(3)}
            </div>
            <div style={{ flex: 1, display: 'flex', gap: '1px', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${posPct}%`, background: 'var(--signal-up)', transition: 'width 0.6s ease' }} />
              <div style={{ width: `${100 - posPct - negPct}%`, background: 'var(--text-muted)', transition: 'width 0.6s ease' }} />
              <div style={{ width: `${negPct}%`, background: 'var(--signal-down)', transition: 'width 0.6s ease' }} />
            </div>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'var(--text-muted)', marginTop: '6px', display: 'flex', justifyContent: 'space-between' }}>
            <span>{posPct}% positivo</span>
            <span>{negPct}% negativo</span>
          </div>
        </div>
      </section>

      {/* ━━ MAIN GRID ━━ */}
      <div className="main-grid" style={{ display: 'grid', gridTemplateColumns: '1fr clamp(240px, 22vw, 320px)', gap: '40px', alignItems: 'start' }}>

        {/* ── FEED COLUMN ── */}
        <section>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '24px' }}>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', fontWeight: 400 }}>Intelligence Feed</h1>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-muted)' }}>{articles.length} artigos</span>
          </div>

          <ArticleFeed articles={articles} totalCount={totalArticles} />

          {articles.length === 0 && (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', marginBottom: '8px' }}>∅</div>
              <div style={{ fontSize: '0.8125rem' }}>Nenhum artigo. Execute o pipeline.</div>
            </div>
          )}
        </section>

        {/* ── SIDEBAR ── */}
        <aside className="sidebar-sticky" style={{ display: 'flex', flexDirection: 'column', gap: '28px', position: 'sticky', top: '68px' }}>

          {/* Top Impacts */}
          {impacts.length > 0 && (
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px' }}>
                Top Impact
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {impacts.slice(0, 6).map((imp: any, i: number) => {
                  const barW = Math.min(imp.impact_score * 100, 100);
                  return (
                    <a
                      key={i}
                      href={`/impact?ticker=${imp.ticker}`}
                      className="interactive"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-primary)', fontWeight: 500, width: '50px' }}>
                        {imp.ticker}
                      </span>
                      <div style={{ flex: 1, height: '3px', background: 'var(--border-subtle)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${barW}%`,
                            height: '100%',
                            background: imp.impact_score > 0.6 ? 'var(--signal-down)' : imp.impact_score > 0.35 ? 'var(--signal-neutral)' : 'var(--accent)',
                            borderRadius: '2px',
                            transition: 'width 0.5s ease',
                          }}
                        />
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-tertiary)', fontVariantNumeric: 'tabular-nums', width: '35px', textAlign: 'right' }}>
                        {imp.impact_score.toFixed(2)}
                      </span>
                      {imp.volume_anomaly && (
                        <span style={{ fontSize: '0.5rem', color: 'var(--signal-down)', lineHeight: 1 }}>●</span>
                      )}
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* Entities */}
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px' }}>
              Tracked Entities
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {entities.map((e: any) => {
                const prices = priceMap[e.value];
                let delta = 0;
                if (prices && prices.length >= 2) {
                  delta = ((prices[0].close - prices[1].close) / prices[1].close) * 100;
                }
                return (
                  <a
                    key={e.id}
                    href={`/entity/${e.id}`}
                    className="interactive"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '5px 10px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                      background: 'transparent',
                    }}
                  >
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                      {e.value}
                    </span>
                    {prices && prices.length >= 2 && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: delta > 0 ? 'var(--signal-up)' : delta < 0 ? 'var(--signal-down)' : 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                        {delta > 0 ? '+' : ''}{delta.toFixed(1)}%
                      </span>
                    )}
                  </a>
                );
              })}
            </div>
          </div>

          {/* Sources */}
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px' }}>
              Sources
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[
                { name: 'InfoMoney', color: 'hsl(25 80% 55%)' },
                { name: 'Valor Econômico', color: 'hsl(210 60% 55%)' },
                { name: 'B3', color: 'hsl(45 70% 50%)' },
                { name: 'Banco Central', color: 'hsl(150 50% 45%)' },
                { name: 'Reuters Brasil', color: 'hsl(0 70% 55%)' },
              ].map((s) => (
                <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '3px', height: '12px', background: s.color, borderRadius: '1px', flexShrink: 0 }} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-tertiary)' }}>{s.name}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
