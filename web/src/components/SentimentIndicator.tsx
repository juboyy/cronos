'use client';

export function SentimentDot({ score, label }: { score: number; label: string }) {
  const color =
    label === 'positive' ? 'bg-emerald-500 shadow-emerald-500/50' :
    label === 'negative' ? 'bg-red-500 shadow-red-500/50' :
    'bg-yellow-500 shadow-yellow-500/50';

  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span className={`w-2 h-2 rounded-full ${color} shadow-sm`} />
      <span className="text-gray-500">{score > 0 ? '+' : ''}{score.toFixed(2)}</span>
    </span>
  );
}

export function SentimentBar({ score }: { score: number }) {
  // score: -1 to +1, map to 0-100%
  const pct = ((score + 1) / 2) * 100;
  const color = score > 0.1 ? '#10b981' : score < -0.1 ? '#ef4444' : '#eab308';

  return (
    <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}
