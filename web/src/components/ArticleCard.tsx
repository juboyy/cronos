'use client';

import { SentimentDot } from './SentimentIndicator';

interface ArticleCardProps {
  title: string;
  source: string;
  url: string;
  summary: string | null;
  published_at: string | null;
  sentiment?: { score: number; label: string } | null;
  entities?: { type: string; value: string; id: string }[];
}

const SOURCE_COLORS: Record<string, string> = {
  infomoney: 'text-green-500',
  valor: 'text-blue-400',
  b3: 'text-yellow-400',
  bcb: 'text-purple-400',
  reuters: 'text-orange-400',
};

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function ArticleCard({ title, source, url, summary, published_at, sentiment, entities }: ArticleCardProps) {
  return (
    <article className="group border border-gray-800/60 rounded-lg p-4 hover:border-cyan-800/50 transition-all bg-[#0d0d14] hover:bg-[#0f0f18]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${SOURCE_COLORS[source] || 'text-gray-500'}`}>
              {source}
            </span>
            {published_at && (
              <span className="text-[10px] text-gray-600">{timeAgo(published_at)}</span>
            )}
            {sentiment && <SentimentDot score={sentiment.score} label={sentiment.label} />}
          </div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-gray-200 hover:text-cyan-400 transition-colors leading-snug block"
          >
            {title}
          </a>
          {summary && (
            <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">{summary}</p>
          )}
        </div>
      </div>
      {entities && entities.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {entities.slice(0, 5).map((e) => (
            <a key={e.id} href={`/entity/${e.id}`}
              className="text-[10px] border border-cyan-900/50 text-cyan-600 rounded px-1.5 py-0.5 hover:border-cyan-600 transition-colors">
              ${e.value}
            </a>
          ))}
        </div>
      )}
    </article>
  );
}
