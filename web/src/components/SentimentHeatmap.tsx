'use client';

interface DayData {
  date: string;
  count: number;
  avgSentiment: number;
}

export function SentimentHeatmap({ articles }: { articles: { published_at: string; sentiment?: number }[] }) {
  // Build 90-day grid
  const today = new Date();
  const days: DayData[] = [];
  const dayMap: Record<string, { count: number; sentSum: number }> = {};

  for (const a of articles) {
    if (!a.published_at) continue;
    const d = a.published_at.slice(0, 10);
    if (!dayMap[d]) dayMap[d] = { count: 0, sentSum: 0 };
    dayMap[d].count++;
    dayMap[d].sentSum += a.sentiment ?? 0;
  }

  for (let i = 89; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const entry = dayMap[key];
    days.push({
      date: key,
      count: entry?.count ?? 0,
      avgSentiment: entry ? entry.sentSum / entry.count : 0,
    });
  }

  // Grid: 7 rows (days) x 13 cols (weeks)
  const weeks: DayData[][] = [];
  // Pad start to align with correct day of week
  const startDayOfWeek = new Date(days[0].date).getDay(); // 0=Sun
  const padded = [...Array(startDayOfWeek).fill(null), ...days];

  for (let w = 0; w < Math.ceil(padded.length / 7); w++) {
    weeks.push(padded.slice(w * 7, (w + 1) * 7));
  }

  const maxCount = Math.max(...days.map(d => d.count), 1);
  const dayLabels = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  function cellColor(d: DayData | null): string {
    if (!d || d.count === 0) return 'var(--border-subtle)';
    const s = d.avgSentiment;
    if (s > 0.1) return `hsl(155 ${Math.min(70, 30 + s * 100)}% ${40 + Math.min(d.count / maxCount, 1) * 15}%)`;
    if (s < -0.1) return `hsl(0 ${Math.min(70, 30 + Math.abs(s) * 100)}% ${40 + Math.min(d.count / maxCount, 1) * 15}%)`;
    return `hsl(45 ${20 + Math.min(d.count / maxCount, 1) * 30}% ${35 + Math.min(d.count / maxCount, 1) * 15}%)`;
  }

  function cellOpacity(d: DayData | null): number {
    if (!d || d.count === 0) return 0.15;
    return 0.3 + Math.min(d.count / maxCount, 1) * 0.7;
  }

  const S = {
    label: { fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' as const },
  };

  // Month labels
  const monthLabels: { label: string; col: number }[] = [];
  let lastMonth = -1;
  for (let w = 0; w < weeks.length; w++) {
    const firstDay = weeks[w].find(d => d != null);
    if (firstDay) {
      const m = new Date(firstDay.date).getMonth();
      if (m !== lastMonth) {
        monthLabels.push({ label: new Date(firstDay.date).toLocaleDateString('pt-BR', { month: 'short' }), col: w });
        lastMonth = m;
      }
    }
  }

  return (
    <section>
      <style>{`
        .heatmap-cell {
          transition: transform 150ms, box-shadow 150ms;
          cursor: default;
        }
        .heatmap-cell:hover {
          transform: scale(1.8);
          z-index: 10;
          box-shadow: 0 0 8px rgba(0,0,0,0.5);
        }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', marginBottom: '14px' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Cobertura
        </h2>
        <span style={{ ...S.label }}>{articles.length} artigos · {Object.keys(dayMap).length} dias ativos</span>
      </div>

      {/* Month labels */}
      <div style={{ display: 'flex', gap: '1px', marginLeft: '20px', marginBottom: '4px' }}>
        {weeks.map((_, w) => {
          const ml = monthLabels.find(m => m.col === w);
          return (
            <div key={w} style={{ width: '11px', textAlign: 'left' }}>
              {ml && <span style={{ ...S.label, fontSize: '0.4375rem', whiteSpace: 'nowrap' }}>{ml.label}</span>}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: '2px' }}>
        {/* Day labels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', paddingTop: '0' }}>
          {dayLabels.map((label, i) => (
            <div key={i} style={{ height: '11px', width: '16px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '4px' }}>
              {i % 2 === 1 && <span style={{ ...S.label, fontSize: '0.375rem', lineHeight: 1 }}>{label}</span>}
            </div>
          ))}
        </div>

        {/* Grid */}
        {weeks.map((week, w) => (
          <div key={w} style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
            {Array.from({ length: 7 }).map((_, d) => {
              const day = week[d] ?? null;
              return (
                <div
                  key={d}
                  className="heatmap-cell"
                  title={day ? `${day.date}: ${day.count} artigo${day.count !== 1 ? 's' : ''}, sent: ${day.avgSentiment.toFixed(2)}` : ''}
                  style={{
                    width: '11px',
                    height: '11px',
                    borderRadius: '2px',
                    background: cellColor(day),
                    opacity: cellOpacity(day),
                    position: 'relative',
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '16px', marginTop: '10px', marginLeft: '20px', alignItems: 'center' }}>
        <span style={{ ...S.label, fontSize: '0.4375rem' }}>Sentimento:</span>
        <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
          <span style={{ ...S.label, fontSize: '0.375rem' }}>neg</span>
          {[-0.5, -0.2, 0, 0.2, 0.5].map((s, i) => (
            <div key={i} style={{
              width: '10px', height: '10px', borderRadius: '2px',
              background: s > 0.1 ? `hsl(155 50% 45%)` : s < -0.1 ? `hsl(0 50% 45%)` : `hsl(45 30% 40%)`,
              opacity: 0.4 + Math.abs(s) * 1.2,
            }} />
          ))}
          <span style={{ ...S.label, fontSize: '0.375rem' }}>pos</span>
        </div>
        <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
          <span style={{ ...S.label, fontSize: '0.375rem' }}>vol:</span>
          {[0.15, 0.4, 0.7, 1].map((o, i) => (
            <div key={i} style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--text-muted)', opacity: o }} />
          ))}
        </div>
      </div>
    </section>
  );
}
