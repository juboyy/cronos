'use client';

import React, { useState, useEffect } from 'react';
import { Article, Macro, Impact, Sentiment, Alert, Price } from '@/lib/types';
import { timeAgo } from '@/lib/utils';

// --- SVGs & Components ---

const SentimentGauge = ({ score, count }: { score: number; count: number }) => {
  // Normalize score from -1..1 to 0..180 degrees
  // -1 = 0deg (Red), 0 = 90deg (Yellow), 1 = 180deg (Green)
  const angle = ((score + 1) / 2) * 180;
  
  return (
    <div className="flex flex-col items-center justify-center p-6 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)]">
      <div className="relative w-64 h-32 overflow-hidden">
        <svg viewBox="0 0 100 50" className="w-full h-full">
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--signal-down)" />
              <stop offset="50%" stopColor="var(--signal-neutral)" />
              <stop offset="100%" stopColor="var(--signal-up)" />
            </linearGradient>
          </defs>
          {/* Background Track */}
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke="var(--border-subtle)"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Active Track */}
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray="125.6"
            strokeDashoffset={125.6 * (1 - (score + 1) / 2)}
            style={{ transition: 'stroke-dashoffset 1.5s ease-out' }}
          />
          {/* Needle */}
          <g style={{ 
            transform: `rotate(${angle}deg)`, 
            transformOrigin: '50% 50%',
            transition: 'transform 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)' 
          }}>
            <line x1="10" y1="50" x2="25" y2="50" stroke="var(--text-primary)" strokeWidth="2" strokeLinecap="round" />
          </g>
        </svg>
        <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2 text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider">
          <span>Bearish</span>
          <span>Neutral</span>
          <span>Bullish</span>
        </div>
      </div>
      <div className="mt-4 text-center">
        <div className="font-mono text-3xl font-medium" style={{ color: score > 0.05 ? 'var(--signal-up)' : score < -0.05 ? 'var(--signal-down)' : 'var(--signal-neutral)' }}>
          {score > 0 ? '+' : ''}{score.toFixed(3)}
        </div>
        <div className="font-mono text-[10px] text-[var(--text-muted)] uppercase mt-1">
          Baseado em {count} análises de sentimento
        </div>
      </div>
    </div>
  );
};

const ConvictionMatrix = ({ impacts }: { impacts: Impact[] }) => {
  // We need sentiment_score and volume_ratio which might come from the API
  // In the types, impact_score is usually a combo.
  // For the 2x2, we'll use impact_score as Y (Volume/Conviction) and delta_1d (or simulated sentiment) as X
  
  return (
    <div className="p-6 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <span className="font-mono text-[10px] text-[var(--text-tertiary)] uppercase tracking-widest">Matriz de Convicção</span>
      </div>
      <div className="relative w-full aspect-square border-l border-b border-[var(--border-subtle)]">
        {/* Quadrant Labels */}
        <div className="absolute top-2 left-2 font-mono text-[9px] text-[var(--signal-down)] opacity-50 uppercase">Quiet Fear</div>
        <div className="absolute top-2 right-2 font-mono text-[9px] text-[var(--signal-up)] opacity-50 uppercase">Euphoria</div>
        <div className="absolute bottom-2 left-2 font-mono text-[9px] text-[var(--signal-down)] font-bold uppercase">Panic Selling</div>
        <div className="absolute bottom-2 right-2 font-mono text-[9px] text-[var(--signal-up)] font-bold uppercase">Steady Growth</div>
        
        {/* Axis Labels */}
        <div className="absolute -left-8 top-1/2 -rotate-90 font-mono text-[8px] text-[var(--text-muted)] uppercase">Volume/Impacto</div>
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 font-mono text-[8px] text-[var(--text-muted)] uppercase">Sentimento (1D %)</div>

        {/* Crosshair */}
        <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-[var(--border-subtle)] opacity-50"></div>
        <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-[var(--border-subtle)] opacity-50"></div>

        {/* Data Points */}
        {impacts.slice(0, 12).map((imp, i) => {
          const x = Math.max(5, Math.min(95, 50 + (imp.delta_1d || 0) * 5));
          const y = Math.max(5, Math.min(95, 100 - (imp.impact_score * 100)));
          return (
            <div 
              key={i}
              className="absolute w-2 h-2 rounded-full border border-[var(--bg-surface)] shadow-sm group cursor-help transition-all hover:scale-150"
              style={{ 
                left: `${x}%`, 
                top: `${y}%`, 
                background: (imp.delta_1d || 0) > 0 ? 'var(--signal-up)' : 'var(--signal-down)',
                transform: 'translate(-50%, -50%)'
              }}
            >
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[var(--bg-elevated)] border border-[var(--border)] rounded text-[9px] font-mono whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10 transition-opacity">
                {imp.ticker}: {imp.delta_1d?.toFixed(2)}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Sparkline = ({ data, width = 80, height = 30, color = 'var(--accent)' }: { data: number[]; width?: number; height?: number; color?: string }) => {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((d - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};

const SentimentDot = ({ score }: { score: number }) => {
  const hue = score > 0.05 ? 155 : score < -0.05 ? 0 : 45;
  const sat = Math.min(Math.abs(score) * 800, 80);
  return (
    <span
      className="inline-block w-2 h-2 rounded-full flex-shrink-0"
      style={{ background: `hsl(${hue} ${sat}% 50%)` }}
    />
  );
};

// --- Main Page Component ---

export default function BriefingPage() {
  const [data, setData] = useState<{
    articles: Article[];
    macroMap: Record<string, Macro & { history: number[] }>;
    impacts: Impact[];
    avgSent: number;
    posPct: number;
    negPct: number;
    sentimentCount: number;
    alerts: Alert[];
    movers: (Impact & { sparkData: number[] })[];
    riscos: Impact[];
    oportunidades: Impact[];
    narrativas: { name: string; count: number; avgSent: number }[];
    loading: boolean;
  }>({
    articles: [],
    macroMap: {},
    impacts: [],
    avgSent: 0,
    posPct: 0,
    negPct: 0,
    sentimentCount: 0,
    alerts: [],
    movers: [],
    riscos: [],
    oportunidades: [],
    narrativas: [],
    loading: true,
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const [resArticles, resMacro, resImpacts, resSentiment, resAlerts, resPrices] = await Promise.all([
          fetch('/api/cronos/articles?limit=10').then(r => r.json()),
          fetch('/api/cronos/macro').then(r => r.json()),
          fetch('/api/cronos/impacts').then(r => r.json()),
          fetch('/api/cronos/sentiment').then(r => r.json()),
          fetch('/api/cronos/alerts').then(r => r.json()),
          fetch('/api/cronos/prices').then(r => r.json())
        ]);

        // Aggregate sentiment
        const scores = resSentiment.map((s: Sentiment) => s.score).filter(Boolean);
        const avgSent = scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0;
        const posPct = scores.length > 0 ? Math.round(scores.filter((s: number) => s > 0.05).length / scores.length * 100) : 0;
        const negPct = scores.length > 0 ? Math.round(scores.filter((s: number) => s < -0.05).length / scores.length * 100) : 0;

        // Macro with history for sparklines
        const macroHistory: Record<string, number[]> = {};
        const macroMap: Record<string, Macro & { history: number[] }> = {};
        resMacro.forEach((m: Macro) => {
          if (!macroHistory[m.indicator]) macroHistory[m.indicator] = [];
          macroHistory[m.indicator].push(m.value);
        });
        Object.keys(macroHistory).forEach(k => {
          const latest = resMacro.find((m: Macro) => m.indicator === k);
          macroMap[k] = { ...latest, history: macroHistory[k].slice(0, 7).reverse() };
        });

        // Price movers with 10-pt charts
        const priceByTicker: Record<string, number[]> = {};
        resPrices.forEach((p: Price) => {
          if (!priceByTicker[p.ticker]) priceByTicker[p.ticker] = [];
          priceByTicker[p.ticker].push(p.close);
        });

        const movers = resImpacts
          .slice(0, 8)
          .map((imp: Impact) => ({
            ...imp,
            sparkData: priceByTicker[imp.ticker]?.slice(0, 10).reverse() || []
          }));

        // Riscos & Oportunidades
        const riscos = resImpacts.filter((imp: Impact) => (imp.delta_1d !== null && imp.delta_1d < -1) || imp.volume_anomaly);
        const oportunidades = resImpacts.filter((imp: Impact) => imp.delta_1d !== null && imp.delta_1d > 1);

        // Narrativas
        const entityMentions: Record<string, { name: string; count: number; sentSum: number }> = {};
        const tickers = resImpacts.map((imp: Impact) => imp.ticker);
        resArticles.forEach((art: Article) => {
          const title = (art.title || '').toUpperCase();
          const score = art.cronos_sentiment?.[0]?.score ?? 0;
          tickers.forEach((ticker: string) => {
            if (ticker && title.includes(ticker.toUpperCase())) {
              if (!entityMentions[ticker]) entityMentions[ticker] = { name: ticker, count: 0, sentSum: 0 };
              entityMentions[ticker].count++;
              entityMentions[ticker].sentSum += score;
            }
          });
        });
        const narrativas = Object.values(entityMentions)
          .sort((a, b) => b.count - a.count)
          .slice(0, 3)
          .map(n => ({ name: n.name, count: n.count, avgSent: n.sentSum / (n.count || 1) }));

        setData({
          articles: resArticles,
          macroMap,
          impacts: resImpacts,
          avgSent,
          posPct,
          negPct,
          sentimentCount: scores.length,
          alerts: resAlerts,
          movers,
          riscos,
          oportunidades,
          narrativas,
          loading: false
        });
      } catch (error) {
        console.error('Failed to fetch briefing data', error);
        setData(prev => ({ ...prev, loading: false }));
      }
    }

    fetchData();
  }, []);

  if (data.loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] font-mono text-[var(--text-muted)] animate-pulse">
        Sincronizando terminais...
      </div>
    );
  }

  const macroLabels: Record<string, string> = { selic: 'Selic', ipca: 'IPCA', usdbrl: 'USD/BRL', cdi: 'CDI' };
  const macroFormats: Record<string, (v: number) => string> = {
    selic: (v) => `${v.toFixed(2)}%`,
    ipca: (v) => `${v.toFixed(2)}%`,
    usdbrl: (v) => `R$${v.toFixed(4)}`,
    cdi: (v) => `${(v * 100).toFixed(4)}%`,
  };

  const now = new Date();
  const timeLabel = now.getHours() < 12 ? 'Manhã' : now.getHours() < 18 ? 'Tarde' : 'Noite';
  const heroHue = data.avgSent > 0.05 ? 155 : data.avgSent < -0.05 ? 0 : 45;

  return (
    <div className="flex flex-col gap-12 max-w-7xl mx-auto pb-20">
      
      {/* ━━ HERO ━━ */}
      <div 
        className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-subtle)] p-12"
        style={{ background: `linear-gradient(135deg, hsl(${heroHue} 40% 8%), var(--bg))` }}
      >
        <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16">
          {/* Pulse ring animation container */}
          <div className="relative w-24 h-24 flex-shrink-0">
            <div className="absolute inset-0 rounded-full border-2 border-[hsl(var(--heroHue),60%,50%)] animate-[pulse_2.5s_ease-in-out_infinite]" style={{ borderColor: `hsl(${heroHue} 60% 50%)` }} />
            <div className="absolute inset-2 rounded-full border border-[hsl(var(--heroHue),40%,40%)] animate-[pulse_2.5s_ease-in-out_infinite_0.3s]" style={{ borderColor: `hsl(${heroHue} 40% 40%)` }} />
            <div className="absolute inset-6 rounded-full bg-[hsl(var(--heroHue),50%,15%)] flex items-center justify-center" style={{ backgroundColor: `hsl(${heroHue} 50% 15%)` }}>
              <span className="font-mono text-xs font-bold" style={{ color: `hsl(${heroHue} 60% 60%)` }}>◈</span>
            </div>
          </div>

          <div className="text-center md:text-left">
            <div className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-[0.2em] mb-3">
              Market Intelligence Terminal · {timeLabel}
            </div>
            <h1 className="font-serif text-5xl text-[var(--text-primary)] leading-none mb-4">
              {now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h1>
            <div className="flex flex-col md:flex-row items-center md:items-baseline gap-4 md:gap-8 mt-6">
              <span className="font-mono text-6xl font-medium tabular-nums leading-none" style={{ color: data.avgSent > 0.05 ? 'var(--signal-up)' : data.avgSent < -0.05 ? 'var(--signal-down)' : 'var(--signal-neutral)' }}>
                {data.avgSent > 0 ? '+' : ''}{data.avgSent.toFixed(3)}
              </span>
              <div className="font-mono text-xs text-[var(--text-muted)] leading-relaxed">
                {data.posPct}% Positivo · {data.negPct}% Negativo<br />
                Delta de Sentimento Agregado
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ━━ TOP ANALYTICS GRID ━━ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SentimentGauge score={data.avgSent} count={data.sentimentCount} />
        <ConvictionMatrix impacts={data.impacts} />
      </div>

      {/* ━━ RISCOS / OPORTUNIDADES / NARRATIVAS ━━ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[var(--border-subtle)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] overflow-hidden">
        {/* Riscos Ativos */}
        <section className="p-6 bg-[var(--bg-surface)]">
          <div className="font-mono text-[10px] text-[var(--signal-down)] uppercase tracking-wider mb-6 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--signal-down)] animate-pulse" />
            ⚠ Riscos Ativos ({data.riscos.length})
          </div>
          <div className="space-y-4">
            {data.riscos.length > 0 ? data.riscos.slice(0, 4).map((r, i) => (
              <div key={i} className="flex items-center gap-4 group">
                <div className="w-1 h-8 bg-[var(--signal-down)] rounded-full" />
                <div className="flex-1">
                  <div className="font-mono text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--signal-down)] transition-colors">{r.ticker}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-[10px] text-[var(--signal-down)]">
                      {r.delta_1d != null ? `${r.delta_1d > 0 ? '+' : ''}${r.delta_1d.toFixed(2)}%` : ''}
                    </span>
                    {r.volume_anomaly && <span className="font-mono text-[8px] text-[var(--signal-down)] bg-[var(--signal-down)]/10 px-1.5 py-0.5 rounded uppercase">Anomalia Vol</span>}
                  </div>
                </div>
              </div>
            )) : <div className="text-xs text-[var(--text-muted)] font-mono">Monitoramento nominal...</div>}
          </div>
        </section>

        {/* Oportunidades */}
        <section className="p-6 bg-[var(--bg-surface)]">
          <div className="font-mono text-[10px] text-[var(--signal-up)] uppercase tracking-wider mb-6 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--signal-up)]" />
            ▲ Oportunidades ({data.oportunidades.length})
          </div>
          <div className="space-y-4">
            {data.oportunidades.length > 0 ? data.oportunidades.slice(0, 4).map((o, i) => (
              <div key={i} className="flex items-center gap-4 group">
                <div className="w-1 h-8 bg-[var(--signal-up)] rounded-full" />
                <div className="flex-1">
                  <div className="font-mono text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--signal-up)] transition-colors">{o.ticker}</div>
                  <div className="font-mono text-[10px] text-[var(--signal-up)] mt-0.5">
                    +{o.delta_1d?.toFixed(2)}% Momentum
                  </div>
                </div>
              </div>
            )) : <div className="text-xs text-[var(--text-muted)] font-mono">Buscando alpha...</div>}
          </div>
        </section>

        {/* Narrativas Dominantes */}
        <section className="p-6 bg-[var(--bg-surface)]">
          <div className="font-mono text-[10px] text-[var(--accent)] uppercase tracking-wider mb-6">
            ◈ Narrativas Dominantes
          </div>
          <div className="space-y-4">
            {data.narrativas.length > 0 ? data.narrativas.map((n, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-[var(--border-subtle)] last:border-0">
                <div className="flex items-center gap-3">
                  <SentimentDot score={n.avgSent} />
                  <span className="font-mono text-sm font-bold text-[var(--text-primary)]">{n.name}</span>
                </div>
                <span className="font-mono text-[10px] text-[var(--text-muted)]">{n.count} menções</span>
              </div>
            )) : <div className="text-xs text-[var(--text-muted)] font-mono">Processando fluxos...</div>}
          </div>
        </section>
      </div>

      {/* ━━ MACRO DASHBOARD ━━ */}
      <section>
        <div className="font-mono text-[10px] text-[var(--text-tertiary)] uppercase tracking-[0.2em] mb-4">
          Indicadores Macroeconômicos
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[var(--border-subtle)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] overflow-hidden">
          {Object.entries(data.macroMap).map(([key, m]) => {
            const isRising = m.history.length > 1 && m.history[m.history.length - 1] > m.history[m.history.length - 2];
            return (
              <div key={key} className="p-6 bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <span className="font-mono text-[10px] text-[var(--text-tertiary)] uppercase">{macroLabels[key] || key}</span>
                  <Sparkline 
                    data={m.history} 
                    color={isRising ? 'var(--signal-up)' : 'var(--signal-down)'} 
                    width={50} 
                    height={20} 
                  />
                </div>
                <div className="font-mono text-2xl font-medium tabular-nums text-[var(--text-primary)]">
                  {macroFormats[key] ? macroFormats[key](m.value) : m.value}
                </div>
                <div className="font-mono text-[9px] text-[var(--text-muted)] mt-2 uppercase">
                  Atualizado em {new Date(m.date).toLocaleDateString('pt-BR')}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ━━ MARKET MOVERS ━━ */}
      <section>
        <div className="font-mono text-[10px] text-[var(--text-tertiary)] uppercase tracking-[0.2em] mb-4">
          Market Movers & Trend Lines
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {data.movers.map((m) => (
            <div key={m.ticker} className="p-5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius)] hover:border-[var(--accent)] transition-all group">
              <div className="flex justify-between items-center mb-4">
                <span className="font-mono text-base font-bold text-[var(--text-primary)]">{m.ticker}</span>
                <span className={`font-mono text-xs tabular-nums ${m.delta_1d && m.delta_1d > 0 ? 'text-[var(--signal-up)]' : 'text-[var(--signal-down)]'}`}>
                  {m.delta_1d && m.delta_1d > 0 ? '+' : ''}{m.delta_1d?.toFixed(2)}%
                </span>
              </div>
              <div className="flex items-end justify-between gap-4">
                <div className="font-mono text-sm text-[var(--text-secondary)]">
                  <span className="text-[10px] text-[var(--text-muted)] mr-1">SCORE</span>
                  {m.impact_score.toFixed(2)}
                </div>
                <Sparkline 
                  data={m.sparkData} 
                  color={m.delta_1d && m.delta_1d > 0 ? 'var(--signal-up)' : 'var(--signal-down)'}
                  width={80}
                  height={30}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ━━ MAIN FEED & ALERTS ━━ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
        
        {/* News Feed */}
        <div className="lg:col-span-2">
          <div className="font-mono text-[10px] text-[var(--text-tertiary)] uppercase tracking-[0.2em] mb-6 flex justify-between">
            <span>Terminal Headlines</span>
            <span>Real-time Feed</span>
          </div>
          <div className="space-y-px bg-[var(--border-subtle)] border-t border-b border-[var(--border-subtle)]">
            {data.articles.map((a) => {
              const score = a.cronos_sentiment?.[0]?.score ?? 0;
              return (
                <a
                  key={a.id}
                  href={a.url}
                  target="_blank"
                  rel="noopener"
                  className="grid grid-cols-[auto_1fr_auto] gap-6 p-6 bg-[var(--bg)] hover:bg-[var(--bg-surface)] transition-all group"
                >
                  <div className="pt-1">
                    <SentimentDot score={score} />
                  </div>
                  <div>
                    <h3 className="text-base text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors leading-snug mb-2">
                      {a.title}
                    </h3>
                    <div className="flex items-center gap-3 font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
                      <span className="text-[var(--text-tertiary)]">{a.source}</span>
                      <span>•</span>
                      <span>{timeAgo(a.published_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center font-mono text-[10px] text-[var(--text-muted)]">
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </a>
              );
            })}
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-12 sticky top-8">
          {/* Alerts */}
          <div>
            <div className="font-mono text-[10px] text-[var(--text-tertiary)] uppercase tracking-[0.2em] mb-6">
              Sinalização Ativa
            </div>
            <div className="space-y-3">
              {data.alerts.length > 0 ? data.alerts.map((al) => (
                <div key={al.id} className="p-4 bg-[var(--bg-surface)] border-l-2 border-[var(--signal-up)] rounded-r-[var(--radius-sm)] flex items-center gap-4">
                  <div className="w-2 h-2 rounded-full bg-[var(--signal-up)] animate-pulse" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-[var(--text-primary)] truncate">{al.name}</div>
                    <div className="font-mono text-[9px] text-[var(--text-muted)] mt-1 uppercase">
                      {al.type} · {al.trigger_count} Triggers
                    </div>
                  </div>
                </div>
              )) : (
                <div className="p-8 border border-dashed border-[var(--border-subtle)] rounded-[var(--radius)] text-center">
                  <div className="font-mono text-[10px] text-[var(--text-muted)] uppercase">Escaneando Perímetros...</div>
                </div>
              )}
            </div>
          </div>

          {/* Impact Leaderboard */}
          <div>
            <div className="font-mono text-[10px] text-[var(--text-tertiary)] uppercase tracking-[0.2em] mb-6">
              Impact Momentum
            </div>
            <div className="space-y-5">
              {data.impacts.slice(0, 6).map((imp, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between items-center font-mono text-[11px]">
                    <span className="font-bold text-[var(--text-primary)]">{imp.ticker}</span>
                    <span className="text-[var(--text-muted)]">{imp.impact_score.toFixed(2)}</span>
                  </div>
                  <div className="h-1 bg-[var(--border-subtle)] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[var(--accent)] transition-all duration-1000" 
                      style={{ width: `${Math.min(imp.impact_score * 100, 100)}%` }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

      </div>
    </div>
  );
}
