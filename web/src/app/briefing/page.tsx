import { supabaseQuery } from '@/lib/supabase';
import { Article, Macro, Impact, Sentiment, Alert, Price } from '@/lib/types';

export const dynamic = 'force-dynamic';

async function getBriefingData() {
  const [articles, macro, impacts, sentiments, alerts, prices] = await Promise.all([
    supabaseQuery('cronos_articles', 'select=id,title,source,summary,published_at,url,cronos_sentiment(score,label)&order=published_at.desc.nullslast&limit=10') as Promise<Article[]>,
    supabaseQuery('cronos_macro', 'select=indicator,value,date&order=date.desc&limit=8') as Promise<Macro[]>,
    supabaseQuery('cronos_impacts', 'select=ticker,impact_score,delta_1d,delta_5d,volume_anomaly&order=impact_score.desc&limit=10') as Promise<Impact[]>,
    supabaseQuery('cronos_sentiment', 'select=score,label&limit=200') as Promise<Sentiment[]>,
    supabaseQuery('cronos_alerts', 'select=id,name,type,active,trigger_count,last_triggered&active=eq.true&limit=10') as Promise<Alert[]>,
    supabaseQuery('cronos_prices', 'select=ticker,date,close,volume&order=date.desc&limit=200') as Promise<Price[]>,
  ]);

  // Aggregate sentiment
  const scores = sentiments.map((s) => s.score).filter(Boolean);
  const avgSent = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const posPct = scores.length > 0 ? Math.round(scores.filter((s) => s > 0.05).length / scores.length * 100) : 0;
  const negPct = scores.length > 0 ? Math.round(scores.filter((s) => s < -0.05).length / scores.length * 100) : 0;

  // Deduplicate macro
  const macroMap: Record<string, Macro> = {};
  for (const m of macro) { if (!macroMap[m.indicator]) macroMap[m.indicator] = m; }

  // Price movers: top delta tickers
  const priceByTicker: Record<string, Price[]> = {};
  for (const p of prices) { if (!priceByTicker[p.ticker]) priceByTicker[p.ticker] = []; priceByTicker[p.ticker].push(p); }

  const movers = Object.entries(priceByTicker)
    .map(([ticker, pts]) => {
      if (pts.length < 2) return null;
      const sorted = pts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const latest = sorted[0].close;
      const prev = sorted[1].close;
      const delta = ((latest - prev) / prev) * 100;
      return { ticker, latest, delta, sparkData: sorted.slice(0, 10).reverse() };
    })
    .filter((m): m is { ticker: string; latest: number; delta: number; sparkData: Price[] } => m !== null)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 8);

  // Riscos: negative delta or volume anomaly
  const riscos = impacts.filter((imp) => (imp.delta_1d !== null && imp.delta_1d < -1) || imp.volume_anomaly);

  // Oportunidades: positive momentum
  const oportunidades = impacts.filter((imp) => imp.delta_1d !== null && imp.delta_1d > 1);

  // Narrativas: count entity mentions in article titles
  const entityMentions: Record<string, { name: string; count: number; sentSum: number }> = {};
  const tickerSet = new Set(impacts.map((imp) => imp.ticker?.toUpperCase()));
  for (const art of articles) {
    const title = (art.title || '').toUpperCase();
    const score = art.cronos_sentiment?.[0]?.score ?? 0;
    for (const ticker of tickerSet) {
      if (ticker && title.includes(ticker)) {
        if (!entityMentions[ticker]) entityMentions[ticker] = { name: ticker, count: 0, sentSum: 0 };
        entityMentions[ticker].count++;
        entityMentions[ticker].sentSum += score;
      }
    }
  }
  const narrativas = Object.values(entityMentions)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map(n => ({ ...n, avgSent: n.sentSum / (n.count || 1) }));

  return { articles, macroMap, impacts, avgSent, posPct, negPct, sentimentCount: scores.length, alerts, movers, riscos, oportunidades, narrativas };
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
  const { articles, macroMap, impacts, avgSent, posPct, negPct, sentimentCount, alerts, movers, riscos, oportunidades, narrativas } = await getBriefingData();

  const macroEntries = Object.entries(macroMap) as [string, Macro][];
  const macroLabels: Record<string, string> = { selic: 'Selic', ipca: 'IPCA', usdbrl: 'USD/BRL', cdi: 'CDI' };
  const macroFormats: Record<string, (v: number) => string> = {
    selic: (v) => `${v.toFixed(2)}%`,
    ipca: (v) => `${v.toFixed(2)}%`,
    usdbrl: (v) => `R$${v.toFixed(4)}`,
    cdi: (v) => `${(v * 100).toFixed(4)}%`,
  };

  const now = new Date();
  const timeLabel = now.getUTCHours() < 12 ? 'Manhã' : now.getUTCHours() < 18 ? 'Tarde' : 'Noite';

  const heroHue = avgSent > 0.05 ? 155 : avgSent < -0.05 ? 0 : 45;
  const heroTint = `hsl(${heroHue} 40% 8%)`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>

      {/* ━━ HERO ━━ */}
      <div style={{
        background: `linear-gradient(135deg, ${heroTint}, var(--bg))`,
        borderRadius: 'var(--radius-lg)',
        padding: '48px 40px',
        border: '1px solid var(--border-subtle)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes pulseRing {
            0% { transform: scale(0.95); opacity: 0.7; }
            50% { transform: scale(1.15); opacity: 0.2; }
            100% { transform: scale(0.95); opacity: 0.7; }
          }
        ` }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          {/* Pulse ring */}
          <div style={{ position: 'relative', width: '80px', height: '80px', flexShrink: 0 }}>
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              border: `2px solid hsl(${heroHue} 60% 50%)`,
              animation: 'pulseRing 2.5s ease-in-out infinite',
            }} />
            <div style={{
              position: 'absolute', inset: '8px', borderRadius: '50%',
              border: `1px solid hsl(${heroHue} 40% 40%)`,
              animation: 'pulseRing 2.5s ease-in-out infinite 0.3s',
            }} />
            <div style={{
              position: 'absolute', inset: '20px', borderRadius: '50%',
              background: `hsl(${heroHue} 50% 15%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: `hsl(${heroHue} 60% 60%)`, fontWeight: 600 }}>◈</span>
            </div>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>
              Pulso do Mercado · {timeLabel}
            </div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '2.5rem', fontWeight: 400, color: 'var(--text-primary)', lineHeight: 1 }}>
              {now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', marginTop: '12px' }}>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: '3rem', fontWeight: 500,
                color: avgSent > 0.05 ? 'var(--signal-up)' : avgSent < -0.05 ? 'var(--signal-down)' : 'var(--signal-neutral)',
                fontVariantNumeric: 'tabular-nums', lineHeight: 1,
              }}>
                {avgSent > 0 ? '+' : ''}{avgSent.toFixed(3)}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                {posPct}% pos · {negPct}% neg · {sentimentCount} análises
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ━━ RISCOS / OPORTUNIDADES / NARRATIVAS ━━ */}
      <div className="entity-two-col" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2px' }}>
        {/* Riscos Ativos */}
        <section style={{ padding: '24px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'var(--signal-down)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '16px' }}>
            ⚠ Riscos Ativos ({riscos.length})
          </div>
          {riscos.length > 0 ? riscos.slice(0, 4).map((r, i: number) => (
            <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '3px', height: '24px', background: 'var(--signal-down)', borderRadius: '2px', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-primary)', fontWeight: 600 }}>{r.ticker}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--signal-down)', marginLeft: '8px' }}>
                  {r.delta_1d != null ? `${r.delta_1d > 0 ? '+' : ''}${r.delta_1d.toFixed(2)}%` : ''}
                </span>
                {r.volume_anomaly && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--signal-down)', marginLeft: '6px', background: 'hsla(0,60%,50%,0.15)', padding: '1px 5px', borderRadius: '4px' }}>VOL</span>}
              </div>
            </div>
          )) : <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Nenhum risco ativo</div>}
        </section>

        {/* Oportunidades */}
        <section style={{ padding: '24px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'var(--signal-up)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '16px' }}>
            ▲ Oportunidades ({oportunidades.length})
          </div>
          {oportunidades.length > 0 ? oportunidades.slice(0, 4).map((o, i: number) => (
            <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '3px', height: '24px', background: 'var(--signal-up)', borderRadius: '2px', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-primary)', fontWeight: 600 }}>{o.ticker}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--signal-up)', marginLeft: '8px' }}>
                  +{o.delta_1d?.toFixed(2)}%
                </span>
              </div>
            </div>
          )) : <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Nenhuma oportunidade detectada</div>}
        </section>

        {/* Narrativas Dominantes */}
        <section style={{ padding: '24px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '16px' }}>
            ◈ Narrativas Dominantes
          </div>
          {narrativas.length > 0 ? narrativas.map((n, i: number) => (
            <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <SentimentDot score={n.avgSent} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--text-primary)', fontWeight: 600 }}>{n.name}</span>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-muted)' }}>{n.count} menções</span>
            </div>
          )) : <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Dados insuficientes</div>}
        </section>
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
          {movers.map((m) => (
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
      <div className="entity-two-col" style={{ alignItems: 'start' }}>

        {/* Key Headlines */}
        <section>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '14px' }}>
            Principais Notícias
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
            {articles.map((a) => {
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
              {alerts.map((al) => (
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
              {impacts.slice(0, 5).map((imp, i: number) => (
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
