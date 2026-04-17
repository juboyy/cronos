import type { Metadata } from 'next';
import { NavBar } from '@/components/NavBar';
import TickerTapeWrapper from '@/components/TickerTapeWrapper';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cronos 2.0 — Financial Intelligence Engine',
  description: 'Brazilian financial intelligence: real-time news, measurable impact, predictive simulation, deep search',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <TickerTapeWrapper />
        <NavBar />
        <main
          style={{
            maxWidth: '1400px',
            margin: '0 auto',
            padding: 'clamp(24px, 4vw, 48px) clamp(16px, 3vw, 40px)',
          }}
        >
          {children}
        </main>
      </body>
    </html>
  );
}
