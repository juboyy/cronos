/**
 * Cronos Engine Client — proxies requests to MiroFish/BettaFish Flask API
 * running on Vultr VPS.
 */

const ENGINE_URL = process.env.CRONOS_ENGINE_URL || 'http://216.238.124.248:5050';

export async function engineRequest<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${ENGINE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Engine error ${res.status}: ${text}`);
  }

  return res.json();
}

export { ENGINE_URL };
