import { supabaseQuery } from '@/lib/supabase';
import ProjectsClient from './ProjectsClient';

export const dynamic = 'force-dynamic';

async function getData() {
  const [projects, links] = await Promise.all([
    supabaseQuery('cronos_projects', 'select=*').catch(() => []),
    supabaseQuery('project_links', 'select=*').catch(() => []),
  ]);
  
  return { projects, links };
}

export default async function ProjectsPage() {
  const data = await getData();
  return <ProjectsClient {...data} />;
}
