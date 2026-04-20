import { supabaseQuery } from '@/lib/supabase';
import { Article, Entity, Sentiment, Impact, Price, ArticleEntity } from '@/lib/types';
import EntityCharts from '@/components/EntityCharts';
import { TransmissionChain } from '@/components/TransmissionChain';
import { SentimentHeatmap } from '@/components/SentimentHeatmap';

export const dynamic = 'force-dynamic';

async function getEntity(id: string): Promise<Entity | null> {
  const entities = await supabaseQuery('cronos_entities', `id=eq.${id}&limit=1`) as Entity[];
  return entities[0] || null;
}

async function getLinkedArticles(entityId: string, entityValue: string, entityType: string): Promise<ArticleEntity[]> {
  // First try direct entity link
  let articles = await supabaseQuery(
    'cronos_article_entities',
    `entity_id=eq.${entityId}&select=relevance,context,cronos_articles(id,title,source,url,summary,published_at,cronos_sentiment(score,label))&order=cronos_articles(published_at).desc&limit=30`
  ) as ArticleEntity[];
  
  // If no results and this is a ticker, also search for the company entity
  if (articles.length === 0 && entityType === 'ticker') {
    // Find related entities (company with same canonical_name)
    const relatedEntities = await supabaseQuery(
      'cronos_entities',
      `type=eq.company&canonical_name=not.is.null&select=id,canonical_name`
    ) as Entity[];
    
    // Search for entity links from ALL related entities
    for (const rel of relatedEntities) {
      const relArticles = await supabaseQuery(
        'cronos_article_entities',
        `entity_id=eq.${rel.id}&select=relevance,context,cronos_articles(id,title,source,url,summary,published_at,cronos_sentiment(score,label))&order=cronos_articles(published_at).desc&limit=30`
      ) as ArticleEntity[];
      if (relArticles.length > 0 && 
          rel.canonical_name?.toLowerCase().includes(entityValue?.toLowerCase()?.replace(/\d+/g, ''))) {
        articles = relArticles;
        break;
      }
    }
    
    // Fallback: search articles by ticker mention in title
    if (articles.length === 0) {
      const fallback = await supabaseQuery(
        'cronos_articles',
        `title=ilike.*${entityValue}*&select=id,title,source,url,summary,published_at,cronos_sentiment(score,label)&order=published_at.desc&limit=30`
      ) as Article[];
      articles = fallback.map((a) => ({ relevance: 0.5, context: 'title mention', cronos_articles: a, article_id: a.id, entity_id: entityId }));
    }
  }
  
  return articles;
}

async function getPrices(ticker: string): Promise<Price[]> {
  return supabaseQuery('cronos_prices', `ticker=eq.${ticker}&select=date,close,volume&order=date.desc&limit=365`) as Promise<Price[]>;
}

async function getImpacts(ticker: string): Promise<Impact[]> {
  return supabaseQuery('cronos_impacts', `ticker=eq.${ticker}&select=*,cronos_articles(title,source,published_at)&order=impact_score.desc&limit=20`) as Promise<Impact[]>;
}

function SentimentDot({ score }: { score: number }) {
  const hue = score > 0.05 ? 155 : score < -0.05 ? 0 : 45;
  const sat = Math.min(Math.abs(score) * 800, 80);
  return (
    <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: `hsl(${hue} ${sat}% 50%)`, flexShrink: 0 }} />
  );
}

function Sparkline({ data, width = 200, height = 48 }: { data: { date: string; close: number }[]; width?: number; height?: number }) {
  if (data.length < 2) return null;
  const sorted = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const closes = sorted.map(d => d.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;
  const padX = 2; const padY = 4;
  const iW = width - padX * 2; const iH = height - padY * 2;
  const pts = closes.map((v, i) => `${(padX + (i / (closes.length - 1)) * iW).toFixed(1)},${(padY + iH - ((v - min) / range) * iH).toFixed(1)}`).join(' ');
  const delta = ((closes[closes.length - 1] - closes[0]) / closes[0]) * 100;
  const color = delta >= 0 ? 'var(--signal-up)' : 'var(--signal-down)';
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }} aria-hidden="true">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
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

export default async function EntityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const entity = await getEntity(id);

  if (!entity) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0', color: 'var(--text-muted)' }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: '3rem', marginBottom: '12px' }}>∅</div>
        <div style={{ fontSize: '0.875rem' }}>Entidade não encontrada</div>
        <a href="/" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--accent)', marginTop: '12px', display: 'inline-block' }}>← Feed</a>
      </div>
    );
  }

  const [links, prices, impacts] = await Promise.all([
    getLinkedArticles(id, entity.value, entity.type),
    entity.type === 'ticker' ? getPrices(entity.value) : Promise.resolve([]),
    entity.type === 'ticker' ? getImpacts(entity.value) : Promise.resolve([]),
  ]);

  const articles = links
    .map((l) => ({ ...l.cronos_articles, relevance: l.relevance, context: l.context } as Article & { relevance: number; context: string | null }))
    .filter((a) => a?.title);

  const sentiments = articles.map((a) => a.cronos_sentiment?.[0]?.score).filter((s): s is number => s != null);
  const avgSentiment = sentiments.length > 0 ? sentiments.reduce((a: number, b: number) => a + b, 0) / sentiments.length : 0;

  const typeColors: Record<string, string> = {
    ticker: 'hsl(190 70% 50%)', company: 'hsl(270 50% 55%)', cnpj: 'hsl(35 75% 50%)', sector: 'hsl(150 60% 45%)',
  };
  const accentColor = typeColors[entity.type] || 'var(--text-tertiary)';

  const latestPrice = prices.length > 0 ? prices[0].close : null;
  const prevPrice = prices.length > 1 ? prices[1].close : null;
  const priceDelta = latestPrice && prevPrice ? ((latestPrice - prevPrice) / prevPrice) * 100 : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '36px', maxWidth: '1000px', margin: '0 auto' }}>

      {/* Breadcrumb */}
      <a href="/" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>← Intelligence Feed</a>

      {/* ━━ ENTITY HEADER ━━ */}
      <section className="stagger" style={{ padding: '24px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderLeft: `3px solid ${accentColor}`, borderRadius: 'var(--radius)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: accentColor, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '1px 6px', border: `1px solid ${accentColor}33`, borderRadius: 'var(--radius-sm)' }}>
                {entity.type}
              </span>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                {entity.value}
              </h1>
            </div>
            {entity.canonical_name && (
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>{entity.canonical_name}</div>
            )}
            {entity.sector && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-muted)' }}>Setor: {entity.sector}</div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '24px', alignItems: 'start' }}>
            {/* Sentiment */}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>Sentimento</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', color: avgSentiment > 0.05 ? 'var(--signal-up)' : avgSentiment < -0.05 ? 'var(--signal-down)' : 'var(--signal-neutral)', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                {avgSentiment > 0 ? '+' : ''}{avgSentiment.toFixed(3)}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                {articles.length} menções · {sentiments.length} scored
              </div>
            </div>

            {/* Price (if ticker) */}
            {latestPrice != null && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>Preço</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', color: 'var(--text-primary)', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                  R${latestPrice.toFixed(2)}
                </div>
                {priceDelta != null && (
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: priceDelta > 0 ? 'var(--signal-up)' : priceDelta < 0 ? 'var(--signal-down)' : 'var(--text-tertiary)', fontVariantNumeric: 'tabular-nums', marginTop: '2px' }}>
                    {priceDelta > 0 ? '+' : ''}{priceDelta.toFixed(2)}%
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sparkline */}
        {prices.length >= 2 && (
          <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
            <Sparkline data={prices} width={600} height={56} />
          </div>
        )}
      </section>

      {/* ━━ INTERACTIVE CHART ━━ */}
      {entity.type === 'ticker' && (
        <section className="stagger">
          <EntityCharts ticker={entity.value} prices={prices} events={
            articles
              .filter((a) => a.cronos_sentiment?.[0]?.score != null)
              .map((a) => ({
                time: a.published_at || '',
                score: a.cronos_sentiment![0].score,
                title: a.title || '',
              }))
          } />
        </section>
      )}

      {/* ━━ TWO-COLUMN ━━ */}

      {/* ━━ TRANSMISSION CHAIN ━━ */}
      {entity.type === 'ticker' && (
        <section className="stagger" style={{ padding: '24px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius)' }}>
          <TransmissionChain events={
            impacts.map((imp) => ({
              title: imp.cronos_articles?.title || 'Artigo sem título',
              source: imp.cronos_articles?.source || 'desconhecido',
              date: imp.cronos_articles?.published_at || '',
              sentiment: imp.sentiment_score ?? null,
              delta: imp.delta_1d ?? null,
              impactScore: imp.impact_score ?? 0,
            }))
          } />
        </section>
      )}

      {/* ━━ SENTIMENT HEATMAP ━━ */}
      <section className="stagger" style={{ padding: '24px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius)' }}>
        <SentimentHeatmap articles={
          articles.map((a) => ({
            published_at: a.published_at || '',
            sentiment: a.cronos_sentiment?.[0]?.score ?? undefined,
          }))
        } />
      </section>

      <div className="entity-two-col">

        {/* ── ARTICLES ── */}
        <section>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '16px' }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', fontWeight: 400, color: 'var(--text-primary)' }}>Notícias</h2>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'var(--text-muted)' }}>{articles.length} artigos</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
            {articles.map((a) => {
              const score = a.cronos_sentiment?.[0]?.score ?? 0;
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
                    gap: '12px',
                    alignItems: 'start',
                    padding: '12px 14px',
                    borderBottom: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ paddingTop: '5px' }}><SentimentDot score={score} /></div>
                  <div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', lineHeight: 1.45, marginBottom: '3px' }}>{a.title}</div>
                    {a.summary && (
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{a.summary}</div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, paddingTop: '2px' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{a.source}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--text-muted)', marginTop: '2px' }}>{formatTime(a.published_at)}</div>
                  </div>
                </a>
              );
            })}
          </div>

          {articles.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', marginBottom: '8px' }}>∅</div>
              <div style={{ fontSize: '0.8125rem' }}>Nenhuma notícia vinculada a esta entidade.</div>
            </div>
          )}
        </section>

        {/* ── SIDEBAR: Impacts + Actions ── */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '28px', position: 'sticky', top: '68px' }}>

          {/* Impact History */}
          {impacts.length > 0 && (
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px' }}>
                Histórico de Impacto
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {impacts.slice(0, 8).map((imp, i: number) => (
                  <div key={i} style={{ padding: '8px 10px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                        {(imp.impact_score || 0).toFixed(3)}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: (imp.delta_1d || 0) > 0 ? 'var(--signal-up)' : (imp.delta_1d || 0) < 0 ? 'var(--signal-down)' : 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                        {imp.delta_1d != null ? `${imp.delta_1d > 0 ? '+' : ''}${imp.delta_1d.toFixed(2)}%` : '—'}
                      </span>
                    </div>
                    {imp.cronos_articles?.title && (
                      <div style={{ fontSize: '0.5625rem', color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {imp.cronos_articles.title}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px' }}>
              Ações
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <a href={`/simulate`} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border-subtle)', transition: 'all 150ms' }} className="interactive">
                <span style={{ fontSize: '0.875rem' }}>◇</span>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>Simular cenário</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--text-muted)' }}>MiroFish Swarm</div>
                </div>
              </a>
              <a href={`/impact`} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border-subtle)', transition: 'all 150ms' }} className="interactive">
                <span style={{ fontSize: '0.875rem' }}>◈</span>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>Ver correlações</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--text-muted)' }}>Impact Analysis</div>
                </div>
              </a>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
