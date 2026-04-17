import { supabaseQuery } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

async function getBriefingData() {
  const [articles, macro, impacts, sentiments, alerts, prices] = await Promise.all([
    supabaseQuery('cronos_articles', 'select=id,title,source,summary,published_at,url,cronos_sentiment(score,label)&order=published_at.desc.nullslast&limit=10'),
    supabaseQuery('cronos_macro', 'select=indicator,value,date&order=date.desc&limit=8'),
    supabaseQuery('cronos_impacts', 'select=ticker,impact_score,delta_1d,delta_5d,volume_anomaly&order=impact_score.desc&limit=10'),
    supabaseQuery('cronos_sentiment', 'select=score,label&limit=200'),
    supabaseQuery('cronos_alerts', 'select=id,name,type,active,trigger_count,last_triggered&active=eq.true&limit=10'),
    supabaseQuery('cronos_prices', 'select=ticker,date,close,volume&order=date.desc&limit=200'),
  ]);

  // Aggregate sentiment
  const scores = sentiments.map((s: any) => s.score).filter(Boolean);
  const avgSent = scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0;
  const posPct = scores.length > 0 ? Math.round(scores.filter((s: number) => s > 0.05).length / scores.length * 100) : 0;
  const negPct = scores.length > 0 ? Math.round(scores.filter((s: number) => s < -0.05).length / scores.length * 100) : 0;

  // Deduplicate macro
  const macroMap: Record<string, any> = {};
  for (const m of macro) { if (!macroMap[m.indicator]) macroMap[m.indicator] = m; }

  // Price movers: top delta tickers
  const priceByTicker: Record<string, any[]> = {};
  for (const p of prices) { if (!priceByTicker[p.ticker]) priceByTicker[p.ticker] = []; priceByTicker[p.ticker].push(p); }

  const movers = Object.entries(priceByTicker)
    .map(([ticker, pts]) => {
      if (pts.length < 2) return null;
      const sorted = pts.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const latest = sorted[0].close;
      const prev = sorted[1].close;
      const delta = ((latest - prev) / prev) * 100;
      return { ticker, latest, delta, sparkData: sorted.slice(0, 10).reverse() };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 8) as any[];

  return { articles, macroMap, impacts, avgSent, posPct, negPct, sentimentCount: scores.length, alerts, movers };
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

export default async function BriefingPage() {
  const { articles, macroMap, impacts, avgSent, posPct, negPct, sentimentCount, alerts, movers } = await getBriefingData();

  const macroEntries = Object.entries(macroMap) as [string, any][];
  const macroLabels: Record<string, string> = { selic: 'Selic', ipca: 'IPCA', usdbrl: 'USD/BRL', cdi: 'CDI' };
  const macroFormats: Record<string, (v: number) => string> = {
    selic: (v) => `${v.toFixed(2)}%`,
    ipca: (v) => `${v.toFixed(2)}%`,
    usdbrl: (v) => `R$${v.toFixed(4)}`,
    cdi: (v) => `${(v * 100).toFixed(4)}%`,
  };

  const now = new Date();
  const timeLabel = now.getUTCHours() < 12 ? 'Manhã' : now.getUTCHours() < 18 ? 'Tarde' : 'Noite';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>

      {/* ━━ HEADER ━━ */}
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', marginBottom: '4px' }}>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', fontWeight: 400, color: 'var(--text-primary)' }}>
            Briefing
          </h1>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--accent)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {timeLabel}
          </span>
        </div>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
          {now.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* ━━ MACRO OVERVIEW ━━ */}
      <section>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '14px' }}>
          Macro
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '2px' }}>
          {macroEntries.map(([key, m]) => (
            <div key={key} className="stagger" style={{ padding: '16px 20px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-tertiary)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px' }}>
                {macroLabels[key] || key}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.25rem', color: 'var(--text-primary)', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                {macroFormats[key] ? macroFormats[key](m.value) : m.value}
              </div>
            </div>
          ))}

          {/* Sentiment summary */}
          <div className="stagger" style={{ padding: '16px 20px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-tertiary)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px' }}>
              Sentimento Geral
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.25rem', color: avgSent > 0.05 ? 'var(--signal-up)' : avgSent < -0.05 ? 'var(--signal-down)' : 'var(--signal-neutral)', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
              {avgSent > 0 ? '+' : ''}{avgSent.toFixed(3)}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              {posPct}% pos · {negPct}% neg · {sentimentCount} artigos
            </div>
          </div>
        </div>
      </section>

      {/* ━━ MARKET MOVERS ━━ */}
      <section>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '14px' }}>
          Movers
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '2px' }}>
          {movers.map((m: any) => (
            <div key={m.ticker} className="stagger interactive" style={{ padding: '14px 16px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--text-primary)', fontWeight: 600 }}>{m.ticker}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: m.delta > 0 ? 'var(--signal-up)' : m.delta < 0 ? 'var(--signal-down)' : 'var(--text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>
                  {m.delta > 0 ? '+' : ''}{m.delta.toFixed(2)}%
                </span>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                R${m.latest.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ━━ TWO-COLUMN: Headlines + Alerts ━━ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr clamp(240px, 22vw, 320px)', gap: '40px', alignItems: 'start' }}>

        {/* Key Headlines */}
        <section>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '14px' }}>
            Principais Notícias
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
            {articles.map((a: any) => {
              const sent = a.cronos_sentiment?.[0];
              const score = sent?.score ?? 0;
              return (
                <a
                  key={a.id}
                  href={a.url}
                  target="_blank"
                  rel="noopener"
                  className="interactive stagger"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '8px 1fr auto',
                    gap: '14px',
                    alignItems: 'start',
                    padding: '12px 14px',
                    borderBottom: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ paddingTop: '5px' }}>
                    <SentimentDot score={score} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', lineHeight: 1.45 }}>
                      {a.title}
                    </div>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {a.source}
                  </div>
                </a>
              );
            })}
          </div>
        </section>

        {/* Active Alerts */}
        <aside style={{ position: 'sticky', top: '68px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '14px' }}>
            Alertas Ativos
          </div>
          {alerts.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {alerts.map((al: any) => (
                <a key={al.id} href="/alerts" className="interactive" style={{ padding: '10px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="pulse" style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--signal-up)', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{al.name}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'var(--text-muted)' }}>{al.type} · {al.trigger_count} triggers</div>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
              Nenhum alerta ativo.
            </div>
          )}

          {/* Top Impacts summary */}
          {impacts.length > 0 && (
            <div style={{ marginTop: '28px' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px' }}>
                Top Impact
              </div>
              {impacts.slice(0, 5).map((imp: any, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--text-primary)', fontWeight: 500, width: '50px' }}>{imp.ticker}</span>
                  <div style={{ flex: 1, height: '2px', background: 'var(--border-subtle)', borderRadius: '1px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(imp.impact_score * 100, 100)}%`, height: '100%', background: 'var(--accent)', borderRadius: '1px' }} />
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'var(--text-tertiary)', fontVariantNumeric: 'tabular-nums', width: '30px', textAlign: 'right' }}>{imp.impact_score.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
