/**
 * Formata o tempo decorrido desde uma data ISO.
 */
export function timeAgo(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const now = new Date();
  const diffM = Math.floor((now.getTime() - d.getTime()) / 60000);
  
  if (diffM < 1) return 'agora';
  if (diffM < 60) return `${diffM}m`;
  
  const diffH = Math.floor(diffM / 60);
  if (diffH < 24) return `${diffH}h`;
  
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d`;
}
