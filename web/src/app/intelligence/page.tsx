'use client';

import { supabaseQuery } from '@/lib/supabase';
import { IntelligenceDashboard } from '@/components/IntelligenceDashboard';
import { useState, useEffect } from 'react';

export const dynamic = 'force-dynamic';

async function getInitialData() {
  try {
    const [correlations, clusters, briefings] = await Promise.all([
      supabaseQuery('cronos_correlations', 'select=*&order=signal_strength.desc&limit=15').catch(() => []),
      supabaseQuery('cronos_clusters', 'select=*&order=created_at.desc&limit=15').catch(() => []),
      supabaseQuery('cronos_briefings', 'select=*&order=date.desc&limit=3').catch(() => []),
    ]);
    return { correlations, clusters, briefings };
  } catch (e) {
    return { correlations: [], clusters: [], briefings: [] };
  }
}

export default function IntelligencePage() {
  const [data, setData] = useState<any>(null);
  const [searchResult, setSearchResult] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    getInitialData().then(setData);
  }, []);

  const handleSearch = async (q: string) => {
    setQuery(q);
    if (!q.trim()) {
      setSearchResult(null);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(`/api/cronos/search?q=${encodeURIComponent(q)}`);
      const json = await res.json();
      setSearchResult(json);
    } catch (e) {
      console.error('Search failed', e);
    } finally {
      setIsSearching(false);
    }
  };

  if (!data) return <div style={{ background: 'hsl(225 15% 3.5%)', minHeight: '100vh' }} />;

  return (
    <main style={{ 
      background: 'hsl(225 15% 3.5%)', 
      minHeight: '100vh',
      color: 'hsl(0 0% 100%)',
      fontFamily: 'var(--font-display)'
    }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px' }}>
        {/* Unified Search Bar */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Search ticker, company or CNPJ (e.g. PETR4)..."
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '16px 20px',
                paddingLeft: '48px',
                background: 'hsl(225 12% 6%)',
                border: '1px solid hsl(225 10% 15%)',
                borderRadius: '12px',
                color: 'white',
                fontSize: '1rem',
                fontFamily: 'var(--font-mono)',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'hsl(150 85% 44%)')}
              onBlur={(e) => (e.target.style.borderColor = 'hsl(225 10% 15%)')}
            />
            <div style={{ position: 'absolute', left: '16px', opacity: 0.5 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
              </svg>
            </div>
            {isSearching && (
              <div style={{ position: 'absolute', right: '16px' }}>
                <div style={{ 
                  width: '16px', height: '16px', 
                  border: '2px solid hsl(150 85% 44%)', 
                  borderTopColor: 'transparent', 
                  borderRadius: '50%', 
                  animation: 'spin 1s linear infinite' 
                }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            )}
          </div>
        </div>

        <IntelligenceDashboard 
          {...data} 
          searchResult={searchResult} 
          isSearching={isSearching}
        />
      </div>
    </main>
  );
}
