'use client';

import dynamic from 'next/dynamic';

const TickerTape = dynamic(() => import('@/components/TickerTape'), { ssr: false });

export default function TickerTapeWrapper() {
  return <TickerTape />;
}
