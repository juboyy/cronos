import type { Metadata } from 'next';
import { NavBar } from '@/components/NavBar';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cronos — Financial Intelligence',
  description: 'Brazilian financial intelligence engine: real-time news, impact analysis, predictive simulation',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
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
