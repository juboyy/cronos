import { supabaseQuery } from '@/lib/supabase';
import { IntelligenceDashboard } from '@/components/IntelligenceDashboard';

export const dynamic = 'force-dynamic';

async function getData() {
  const [correlations, clusters, briefings] = await Promise.all([
    supabaseQuery('cronos_correlations', 'select=*&order=signal_strength.desc&limit=15').catch(() => []),
    supabaseQuery('cronos_clusters', 'select=*&order=created_at.desc&limit=15').catch(() => []),
    supabaseQuery('cronos_briefings', 'select=*&order=date.desc&limit=3').catch(() => []),
  ]);
  return { correlations, clusters, briefings };
}

export default async function IntelligencePage() {
  const data = await getData();
  return <IntelligenceDashboard {...data} />;
}
