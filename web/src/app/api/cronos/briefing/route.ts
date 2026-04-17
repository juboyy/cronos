import { SUPABASE_URL, SUPABASE_KEY } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

// Morning briefing generator
export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get('ticker');
  const tickers = ticker ? [ticker] : ['PETR4', 'VALE3', 'ITUB4', 'BBDC4', 'WEGE3'];

  const briefing: any = {
    generated_at: new Date().toISOString(),
    market_date: new Date().toLocaleDateString('pt-BR'),
    sections: [],
  };

  // 1. Market overview (macro)
  const macro = await fetch(`${SUPABASE_URL}/rest/v1/cronos_macro?order=date.desc&limit=8&select=indicator,date,value`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  }).then(r => r.json());

  const macroMap: Record<string, any> = {};
  for (const m of macro) {
    if (!macroMap[m.indicator]) macroMap[m.indicator] = m;
  }

  briefing.sections.push({
    title: 'Macro',
    items: Object.entries(macroMap).map(([k, v]: [string, any]) => ({
      indicator: k,
      value: v.value,
      date: v.date,
    })),
  });

  // 2. Top news (sentiment-sorted)
  const articles = await fetch(
    `${SUPABASE_URL}/rest/v1/cronos_articles?select=title,source,published_at,cronos_sentiment(score,label)&order=published_at.desc&limit=10`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
  ).then(r => r.json());

  briefing.sections.push({
    title: 'Top Notícias',
    items: articles.map((a: any) => ({
      title: a.title,
      source: a.source,
      sentiment: a.cronos_sentiment?.[0]?.label || 'unknown',
      score: a.cronos_sentiment?.[0]?.score || 0,
    })),
  });

  // 3. Price snapshot
  const priceItems = [];
  for (const t of tickers) {
    const prices = await fetch(
      `${SUPABASE_URL}/rest/v1/cronos_prices?ticker=eq.${t}&order=date.desc&limit=2&select=date,close,volume`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
    ).then(r => r.json());

    if (prices.length >= 2) {
      const delta = ((prices[0].close - prices[1].close) / prices[1].close) * 100;
      priceItems.push({
        ticker: t,
        price: prices[0].close,
        delta: parseFloat(delta.toFixed(2)),
        volume: prices[0].volume,
      });
    } else if (prices.length === 1) {
      priceItems.push({ ticker: t, price: prices[0].close, delta: 0, volume: prices[0].volume });
    }
  }

  briefing.sections.push({ title: 'Preços', items: priceItems });

  // 4. Top impacts
  const impacts = await fetch(
    `${SUPABASE_URL}/rest/v1/cronos_impacts?select=ticker,impact_score,delta_1d,volume_anomaly,cronos_articles(title)&order=impact_score.desc&limit=5`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
  ).then(r => r.json());

  briefing.sections.push({
    title: 'Top Impactos',
    items: impacts.map((i: any) => ({
      ticker: i.ticker,
      score: i.impact_score,
      delta: i.delta_1d,
      volume_alert: i.volume_anomaly,
      headline: i.cronos_articles?.title,
    })),
  });

  // 5. Active alerts
  const alerts = await fetch(
    `${SUPABASE_URL}/rest/v1/cronos_alert_events?select=*,cronos_alerts(name,type)&order=triggered_at.desc&limit=5`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
  ).then(r => r.json());

  if (alerts.length > 0) {
    briefing.sections.push({
      title: 'Alertas Recentes',
      items: alerts.map((a: any) => ({
        alert: a.cronos_alerts?.name,
        type: a.cronos_alerts?.type,
        triggered: a.triggered_at,
      })),
    });
  }

  // Generate text summary
  const lines = [`📊 **CRONOS BRIEFING — ${briefing.market_date}**\n`];

  // Macro
  lines.push('**🏛️ Macro:**');
  for (const m of briefing.sections[0].items) {
    lines.push(`  ${m.indicator.toUpperCase()}: ${m.value} (${m.date})`);
  }

  // Prices
  lines.push('\n**📈 Mercado:**');
  for (const p of priceItems) {
    const arrow = p.delta > 0 ? '↑' : p.delta < 0 ? '↓' : '→';
    lines.push(`  ${p.ticker}: R$${p.price} ${arrow} ${p.delta > 0 ? '+' : ''}${p.delta}%`);
  }

  // News
  lines.push('\n**📰 Destaques:**');
  for (const n of briefing.sections[1].items.slice(0, 5)) {
    const emoji = n.sentiment === 'positive' ? '🟢' : n.sentiment === 'negative' ? '🔴' : '🟡';
    lines.push(`  ${emoji} [${n.source}] ${n.title}`);
  }

  briefing.text_summary = lines.join('\n');

  return NextResponse.json(briefing);
}
