'use client';

import { useState } from 'react';

interface SearchResult {
  articles: any[];
  entities: any[];
  impacts: any[];
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult>({ articles: [], entities: [], impacts: [] });
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [tab, setTab] = useState<'articles' | 'entities' | 'impacts'>('articles');

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);

    try {
      const [articlesRes, entitiesRes, impactsRes] = await Promise.all([
        fetch(`/api/search?q=${encodeURIComponent(query)}&limit=30`).then(r => r.json()),
        fetch(`/api/cronos/search?type=entities&q=${encodeURIComponent(query)}`).then(r => r.json()).catch(() => []),
        fetch(`/api/cronos/search?type=impacts&q=${encodeURIComponent(query)}`).then(r => r.json()).catch(() => []),
      ]);
      setResults({
        articles: articlesRes.articles || [],
        entities: Array.isArray(entitiesRes) ? entitiesRes : entitiesRes.entities || [],
        impacts: Array.isArray(impactsRes) ? impactsRes : impactsRes.impacts || [],
      });
    } catch {
      setResults({ articles: [], entities: [], impacts: [] });
    } finally {
      setLoading(false);
    }
  }

  const S = {
    label: { fontFamily: 'var(--font-mono)', fontSize: '0.5625rem' as const, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' as const },
    mono: { fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' as const },
  };

  const totalResults = results.articles.length + results.entities.length + results.impacts.length;

  const tabs = [
    { key: 'articles' as const, label: 'Artigos', count: results.articles.length },
    { key: 'entities' as const, label: 'Entidades', count: results.entities.length },
    { key: 'impacts' as const, label: 'Impactos', count: results.impacts.length },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '900px', margin: '0 auto' }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', fontWeight: 400, color: 'var(--text-primary)', marginBottom: '8px' }}>Busca Profunda</h1>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
          Full-text search em todas as notícias, entidades e impactos financeiros
        </p>
      </div>

      {/* Search input */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Pesquisar por ticker, empresa, setor, tema..."
          style={{
            flex: 1,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '12px 16px',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8125rem',
            outline: 'none',
            transition: 'border-color 150ms',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--accent-dim)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '12px 24px',
            background: loading ? 'var(--bg-elevated)' : 'var(--accent)',
            color: loading ? 'var(--text-muted)' : 'hsl(225 15% 4%)',
            border: 'none',
            borderRadius: 'var(--radius)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
            fontWeight: 600,
            letterSpacing: '0.04em',
            cursor: loading ? 'wait' : 'pointer',
            textTransform: 'uppercase',
          }}
        >
          {loading ? '...' : 'Buscar'}
        </button>
      </form>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <div className="pulse" style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', marginBottom: '8px' }}>◈</div>
          <div style={{ fontSize: '0.8125rem' }}>Pesquisando...</div>
        </div>
      )}

      {/* Results */}
      {!loading && searched && (
        <>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '2px', borderBottom: '1px solid var(--border-subtle)' }}>
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.6875rem',
                  color: tab === t.key ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  padding: '8px 16px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: tab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 150ms',
                }}
              >
                {t.label}
                <span style={{ ...S.mono, fontSize: '0.5625rem', color: 'var(--text-muted)', marginLeft: '6px' }}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          {totalResults === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '0.8125rem' }}>Nenhum resultado para &quot;{query}&quot;</div>
            </div>
          )}

          {/* Articles tab */}
          {tab === 'articles' && results.articles.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
              {results.articles.map((a: any) => {
                const sent = a.cronos_sentiment?.[0];
                const score = sent?.score ?? 0;
                const hue = score > 0.05 ? 155 : score < -0.05 ? 0 : 45;
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
                    <div style={{ paddingTop: '6px' }}>
                      <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: `hsl(${hue} ${Math.min(Math.abs(score) * 800, 80)}% 50%)` }} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', lineHeight: 1.45, marginBottom: '3px' }}>{a.title}</div>
                      {a.summary && (
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{a.summary}</div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, paddingTop: '2px' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{a.source}</div>
                    </div>
                  </a>
                );
              })}
            </div>
          )}

          {/* Entities tab */}
          {tab === 'entities' && results.entities.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '4px' }}>
              {results.entities.map((e: any) => {
                const typeColors: Record<string, string> = {
                  ticker: 'hsl(190 70% 50%)',
                  company: 'hsl(270 50% 55%)',
                  cnpj: 'hsl(35 75% 50%)',
                  sector: 'hsl(150 60% 45%)',
                };
                return (
                  <a
                    key={e.id}
                    href={`/entity/${e.id}`}
                    className="interactive stagger"
                    style={{
                      padding: '14px 16px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      borderLeft: `2px solid ${typeColors[e.type] || 'var(--text-muted)'}`,
                      borderRadius: 'var(--radius)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--text-primary)', fontWeight: 600 }}>{e.value}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: typeColors[e.type] || 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{e.type}</span>
                    </div>
                    {e.canonical_name && (
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>{e.canonical_name}</div>
                    )}
                    {e.sector && (
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'var(--text-muted)' }}>{e.sector}</div>
                    )}
                  </a>
                );
              })}
            </div>
          )}

          {/* Impacts tab */}
          {tab === 'impacts' && results.impacts.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
              {results.impacts.map((imp: any, i: number) => (
                <div
                  key={i}
                  className="interactive stagger"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '60px 1fr 70px 80px',
                    gap: '14px',
                    alignItems: 'center',
                    padding: '10px 14px',
                    borderBottom: '1px solid var(--border-subtle)',
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-primary)', fontWeight: 500 }}>{imp.ticker}</span>
                  <div style={{ height: '3px', background: 'var(--border-subtle)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min((imp.impact_score || 0) * 100, 100)}%`, height: '100%', background: 'var(--accent)', borderRadius: '2px' }} />
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: (imp.delta_1d || 0) > 0 ? 'var(--signal-up)' : (imp.delta_1d || 0) < 0 ? 'var(--signal-down)' : 'var(--text-tertiary)', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
                    {imp.delta_1d != null ? `${imp.delta_1d > 0 ? '+' : ''}${imp.delta_1d.toFixed(2)}%` : '—'}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                    score {(imp.impact_score || 0).toFixed(3)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {!searched && !loading && (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '3rem', marginBottom: '12px', color: 'var(--text-tertiary)' }}>◈</div>
          <div style={{ fontSize: '0.8125rem', marginBottom: '4px' }}>Tickers · Empresas · Setores · Temas</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-muted)' }}>
            Busca integrada em artigos, entidades e correlações de impacto
          </div>
        </div>
      )}
    </div>
  );
}
