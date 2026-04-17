'use client';

interface PricePoint {
  date: string;
  close: number;
}

interface PriceSparklineProps {
  data: PricePoint[];
  width?: number;
  height?: number;
  color?: string;
  showDelta?: boolean;
  showLatestPrice?: boolean;
}

export function PriceSparkline({
  data,
  width = 120,
  height = 36,
  color,
  showDelta = true,
  showLatestPrice = false,
}: PriceSparklineProps) {
  if (!data || data.length < 2) return null;

  // Sort ascending by date
  const sorted = [...data].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const closes = sorted.map((d) => d.close);
  const minVal = Math.min(...closes);
  const maxVal = Math.max(...closes);
  const range = maxVal - minVal || 1;

  const padX = 2;
  const padY = 4;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  const points = closes.map((v, i) => {
    const x = padX + (i / (closes.length - 1)) * innerW;
    const y = padY + innerH - ((v - minVal) / range) * innerH;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const polyline = points.join(' ');

  const latest = closes[closes.length - 1];
  const first = closes[0];
  const delta = ((latest - first) / first) * 100;
  const isUp = delta >= 0;

  const lineColor = color || (isUp ? 'var(--signal-up)' : 'var(--signal-down)');
  const fillId = `grad-${Math.random().toString(36).slice(2, 7)}`;

  // Close the path for gradient fill area
  const lastPt = points[points.length - 1].split(',');
  const firstPt = points[0].split(',');
  const fillPath = `M ${firstPt[0]},${(padY + innerH).toFixed(1)} L ${polyline} L ${lastPt[0]},${(padY + innerH).toFixed(1)} Z`;

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ overflow: 'visible', flexShrink: 0 }}
      >
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.18" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Gradient fill area */}
        <path d={fillPath} fill={`url(#${fillId})`} />
        {/* Main sparkline */}
        <polyline
          points={polyline}
          fill="none"
          stroke={lineColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Last point dot */}
        {lastPt && (
          <circle
            cx={parseFloat(lastPt[0])}
            cy={parseFloat(lastPt[1])}
            r="2"
            fill={lineColor}
          />
        )}
      </svg>

      {(showDelta || showLatestPrice) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
          {showLatestPrice && (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.6875rem',
                color: 'var(--text-primary)',
                fontVariantNumeric: 'tabular-nums',
                fontWeight: 500,
              }}
            >
              R${latest.toFixed(2)}
            </span>
          )}
          {showDelta && (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.5625rem',
                color: isUp ? 'var(--signal-up)' : 'var(--signal-down)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {isUp ? '+' : ''}{delta.toFixed(2)}%
            </span>
          )}
        </div>
      )}
    </div>
  );
}
