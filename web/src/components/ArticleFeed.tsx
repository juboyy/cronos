'use client';

import { useState } from 'react';
import { ArticleAnalysis } from './ArticleAnalysis';
import { ArticleModal } from './ArticleModal';

interface FeedArticle {
  id: string;
  title: string;
  source: string;
  summary?: string;
  published_at?: string;
  url: string;
  cronos_sentiment?: { score: number; label: string }[];
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

const sourceColors: Record<string, string> = {
  infomoney: 'hsl(25 80% 55%)', valor: 'hsl(210 60% 55%)', reuters: 'hsl(0 70% 55%)',
  bcb: 'hsl(150 50% 45%)', b3: 'hsl(45 70% 50%)', moneytimes: 'hsl(280 50% 55%)',
  investing_br: 'hsl(200 70% 50%)', exame: 'hsl(330 60% 55%)', estadao: 'hsl(220 40% 50%)',
  folha: 'hsl(175 50% 45%)', seudinheiro: 'hsl(40 60% 50%)',
};

const PAGE_SIZE = 25;

export function ArticleFeed({ articles, totalCount }: { articles: FeedArticle[]; totalCount?: number }) {
  const [modalId, setModalId] = useState<string | null>(null);
  const [extraArticles, setExtraArticles] = useState<FeedArticle[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);

  const allArticles = [...articles, ...extraArticles];
  const total = totalCount ?? allArticles.length;
  const hasMore = allArticles.length < total;

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    const offset = nextPage * PAGE_SIZE - PAGE_SIZE;
    try {
      const res = await fetch(`/api/cronos/articles?offset=${offset}&limit=${PAGE_SIZE}`);
      if (res.ok) {
        const data = await res.json();
        setExtraArticles(prev => [...prev, ...data.articles]);
        setPage(nextPage);
      }
    } catch { /* silent */ }
    setLoadingMore(false);
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
        {allArticles.map((a) => {
          const sent = a.cronos_sentiment?.[0];
          const score = sent?.score ?? 0;
          return (
            <div
              key={a.id}
              className="stagger"
              style={{
                padding: '14px 16px',
                borderBottom: '1px solid var(--border-subtle)',
                cursor: 'pointer',
              }}
              onClick={() => setModalId(a.id)}
            >
              <div style={{
                display: 'grid',
                gridTemplateColumns: '8px 1fr auto',
                gap: '14px',
                alignItems: 'start',
              }}>
                {/* Sentiment indicator */}
                <div style={{ paddingTop: '6px' }}>
                  <SentimentDot score={score} />
                </div>

                {/* Content */}
                <div>
                  <div
                    className="interactive"
                    style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.45, marginBottom: '4px', display: 'block' }}
                  >
                    {a.title}
                  </div>
                  {a.summary && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginTop: '4px' }}>
                      {a.summary}
                    </div>
                  )}
                </div>

                {/* Meta */}
                <div style={{ textAlign: 'right', flexShrink: 0, paddingTop: '2px' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: sourceColors[a.source] || 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {a.source}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                    {formatTime(a.published_at || null)}
                  </div>
                </div>
              </div>

              {/* BettaFish Analysis */}
              <div style={{ marginTop: '8px', paddingLeft: '22px' }}>
                <ArticleAnalysis
                  article={{ id: a.id, title: a.title, source: a.source, url: a.url, summary: a.summary }}
                  compact
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Load More */}
      {hasMore && (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <button
            onClick={loadMore}
            disabled={loadingMore}
            style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--accent)',
              background: 'var(--accent-bg)', border: '1px solid var(--accent-dim)',
              borderRadius: 'var(--radius-sm)', padding: '8px 24px', cursor: loadingMore ? 'wait' : 'pointer',
              letterSpacing: '0.04em', textTransform: 'uppercase',
            }}
          >
            {loadingMore ? '◈ Carregando...' : `Carregar mais artigos`}
          </button>
        </div>
      )}

      {/* Modal */}
      {modalId && (
        <ArticleModal articleId={modalId} onClose={() => setModalId(null)} />
      )}
    </>
  );
}
