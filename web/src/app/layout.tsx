import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cronos — Financial Intelligence Engine',
  description: 'Real-time Brazilian financial intelligence, impact analysis, and predictive simulation',
};

const NAV = [
  { href: '/', label: 'Feed' },
  { href: '/impact', label: 'Impacto' },
  { href: '/simulate', label: 'Simulação' },
  { href: '/patterns', label: 'Padrões' },
  { href: '/alerts', label: 'Alertas' },
  { href: '/search', label: 'Busca' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="min-h-screen bg-[#0a0a0f] text-gray-100 font-mono antialiased">
        <nav className="border-b border-cyan-900/30 bg-[#0a0a0f]/95 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2">
              <span className="text-cyan-400 text-xl font-bold tracking-tighter">◈ CRONOS</span>
              <span className="text-[10px] text-cyan-600 border border-cyan-800 rounded px-1.5 py-0.5 uppercase tracking-widest">v2</span>
            </a>
            <div className="flex items-center gap-5 text-sm">
              {NAV.map((n) => (
                <a key={n.href} href={n.href} className="text-gray-400 hover:text-cyan-400 transition-colors">
                  {n.label}
                </a>
              ))}
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
        <footer className="border-t border-cyan-900/20 mt-12 py-6 text-center text-xs text-gray-600">
          <span className="text-cyan-800">CRONOS</span> — Financial Intelligence Engine — Sprint 2-4
        </footer>
      </body>
    </html>
  );
}
