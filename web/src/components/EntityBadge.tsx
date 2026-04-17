'use client';

export function EntityBadge({ type, value, id }: { type: string; value: string; id?: string }) {
  const colors: Record<string, string> = {
    ticker: 'border-cyan-700 text-cyan-400 bg-cyan-950/40',
    company: 'border-violet-700 text-violet-400 bg-violet-950/40',
    cnpj: 'border-amber-700 text-amber-400 bg-amber-950/40',
    sector: 'border-emerald-700 text-emerald-400 bg-emerald-950/40',
  };

  const cls = colors[type] || 'border-gray-700 text-gray-400 bg-gray-950/40';

  const badge = (
    <span className={`inline-flex items-center gap-1 text-xs border rounded px-2 py-0.5 font-medium ${cls}`}>
      <span className="text-[10px] opacity-60 uppercase">{type === 'ticker' ? '$' : type[0]}</span>
      {value}
    </span>
  );

  if (id) {
    return <a href={`/entity/${id}`} className="hover:opacity-80 transition-opacity">{badge}</a>;
  }
  return badge;
}
