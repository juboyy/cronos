/**
 * Gemini API client for Cronos engine routes.
 * Runs server-side only (Next.js API routes / server components).
 */

const GEMINI_KEY = process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY || '';
const BASE = 'https://generativelanguage.googleapis.com/v1beta';

/** Sleep helper for retry backoff */
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/** Single Gemini API call (no retry) */
async function geminiCallOnce(
  prompt: string,
  opts: { temperature?: number; maxTokens?: number; model?: string; json?: boolean },
): Promise<{ ok: boolean; text?: string; data?: unknown; error?: string; status?: number }> {
  const model = opts.model || 'gemini-2.0-flash';
  const url = `${BASE}/models/${model}:generateContent?key=${GEMINI_KEY}`;

  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: opts.temperature ?? 0.5,
      maxOutputTokens: opts.maxTokens ?? 8192,
      ...(opts.json ? { responseMimeType: 'application/json' } : {}),
    },
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errText = await res.text();
      return { ok: false, error: `Gemini ${res.status}: ${errText.slice(0, 300)}`, status: res.status };
    }
    const json = await res.json();
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (opts.json) {
      try {
        let cleaned = text;
        if (cleaned.includes('```json')) cleaned = cleaned.split('```json')[1].split('```')[0].trim();
        else if (cleaned.includes('```')) cleaned = cleaned.split('```')[1].split('```')[0].trim();
        // Strip control characters that Gemini sometimes injects
        cleaned = cleaned.replace(/[\x00-\x1f\x7f]/g, (ch: string) => {
          if (ch === '\n' || ch === '\r' || ch === '\t') return ' ';
          return '';
        });
        const parsed = JSON.parse(cleaned);
        return { ok: true, data: parsed, text: cleaned };
      } catch (e) {
        return { ok: false, error: `JSON parse: ${e}`, text };
      }
    }
    return { ok: true, text };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

/**
 * Call Gemini with automatic retry on 429 (rate limit) errors.
 * Retries up to 3 times with exponential backoff (2s, 5s, 10s).
 */
export async function geminiGenerate(
  prompt: string,
  opts: { temperature?: number; maxTokens?: number; model?: string; json?: boolean } = {},
): Promise<{ ok: boolean; text?: string; data?: unknown; error?: string }> {
  const delays = [2000, 5000, 10000];
  let lastResult = await geminiCallOnce(prompt, opts);
  
  for (let i = 0; i < delays.length; i++) {
    if (lastResult.ok || lastResult.status !== 429) break;
    console.log(`[gemini] 429 rate limit, retry ${i + 1}/${delays.length} in ${delays[i]}ms...`);
    await sleep(delays[i]);
    lastResult = await geminiCallOnce(prompt, opts);
  }
  
  // Strip internal status field before returning
  const { status: _, ...result } = lastResult;
  return result;
}
