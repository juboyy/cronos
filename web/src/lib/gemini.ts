/**
 * Gemini API client for Cronos engine routes.
 * Supports two backends:
 * 1. Cloud Code Assist (OAuth) — free, no rate limits (primary)
 * 2. Google AI Studio (API key) — free tier with rate limits (fallback)
 */

// Cloud Code Assist config (Antigravity OAuth)
const CCA_ENDPOINT = 'https://daily-cloudcode-pa.sandbox.googleapis.com';
const CCA_FALLBACK = 'https://cloudcode-pa.googleapis.com';
const CCA_REFRESH_TOKEN = process.env.GOOGLE_OAUTH_REFRESH_TOKEN || '';
const CCA_CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID || '';
const CCA_CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET || '';
const CCA_PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID || '';

// Google AI Studio config (fallback)
const GEMINI_KEY = process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY || '';
const AI_STUDIO_BASE = 'https://generativelanguage.googleapis.com/v1beta';

/** Sleep helper */
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/** In-memory token cache */
let cachedToken: { token: string; expiresAt: number } | null = null;

/** Refresh OAuth access token for Cloud Code Assist */
async function getAccessToken(): Promise<string | null> {
  if (!CCA_REFRESH_TOKEN || !CCA_CLIENT_ID || !CCA_CLIENT_SECRET) return null;
  
  // Return cached token if valid (with 60s buffer)
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) {
    return cachedToken.token;
  }

  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CCA_CLIENT_ID,
        client_secret: CCA_CLIENT_SECRET,
        refresh_token: CCA_REFRESH_TOKEN,
        grant_type: 'refresh_token',
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
    };
    return cachedToken.token;
  } catch {
    return null;
  }
}

/** Call Gemini via Cloud Code Assist (v1internal API) */
async function callCloudCodeAssist(
  prompt: string,
  opts: { temperature?: number; maxTokens?: number; model?: string; json?: boolean },
  token: string,
): Promise<{ ok: boolean; text?: string; data?: unknown; error?: string }> {
  const model = opts.model || 'gemini-2.0-flash';

  const requestBody = {
    project: CCA_PROJECT_ID,
    model,
    request: {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: opts.temperature ?? 0.5,
        maxOutputTokens: opts.maxTokens ?? 8192,
        ...(opts.json ? { responseMimeType: 'application/json' } : {}),
      },
    },
    userAgent: 'cronos-engine',
    requestId: `cronos-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  };

  const endpoints = [CCA_ENDPOINT, CCA_FALLBACK];
  
  for (const endpoint of endpoints) {
    try {
      const res = await fetch(`${endpoint}/v1internal:streamGenerateContent?alt=sse`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          'User-Agent': 'antigravity/1.22.2 linux/x64',
        },
        body: JSON.stringify(requestBody),
      });

      if (res.status === 403 || res.status === 404) continue; // Try next endpoint
      if (!res.ok) {
        const errText = await res.text();
        return { ok: false, error: `CCA ${res.status}: ${errText.slice(0, 300)}` };
      }

      // Parse SSE stream to extract text
      const body = await res.text();
      let fullText = '';
      for (const line of body.split('\n')) {
        if (!line.startsWith('data:')) continue;
        const jsonStr = line.slice(5).trim();
        if (!jsonStr) continue;
        try {
          const chunk = JSON.parse(jsonStr);
          const parts = chunk?.response?.candidates?.[0]?.content?.parts;
          if (parts) {
            for (const part of parts) {
              if (part.text) fullText += part.text;
            }
          }
        } catch { /* skip unparseable chunks */ }
      }

      if (!fullText) {
        return { ok: false, error: 'CCA returned empty response' };
      }

      if (opts.json) {
        return parseJsonResponse(fullText);
      }
      return { ok: true, text: fullText };
    } catch (e) {
      // Try next endpoint on network error
      continue;
    }
  }
  
  return { ok: false, error: 'All Cloud Code Assist endpoints failed' };
}

/** Call Gemini via Google AI Studio (API key) */
async function callAIStudio(
  prompt: string,
  opts: { temperature?: number; maxTokens?: number; model?: string; json?: boolean },
): Promise<{ ok: boolean; text?: string; data?: unknown; error?: string; status?: number }> {
  const model = opts.model || 'gemini-2.0-flash';
  const url = `${AI_STUDIO_BASE}/models/${model}:generateContent?key=${GEMINI_KEY}`;

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
      return parseJsonResponse(text);
    }
    return { ok: true, text };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

/** Parse JSON from model output, handling markdown fences and control chars */
function parseJsonResponse(text: string): { ok: boolean; text?: string; data?: unknown; error?: string } {
  try {
    let cleaned = text;
    if (cleaned.includes('```json')) cleaned = cleaned.split('```json')[1].split('```')[0].trim();
    else if (cleaned.includes('```')) cleaned = cleaned.split('```')[1].split('```')[0].trim();
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

/**
 * Primary entry point: tries Cloud Code Assist first (free, no rate limit),
 * falls back to AI Studio with retry on 429.
 */
export async function geminiGenerate(
  prompt: string,
  opts: { temperature?: number; maxTokens?: number; model?: string; json?: boolean } = {},
): Promise<{ ok: boolean; text?: string; data?: unknown; error?: string }> {
  
  // Try Cloud Code Assist first
  const token = await getAccessToken();
  if (token && CCA_PROJECT_ID) {
    const ccaResult = await callCloudCodeAssist(prompt, opts, token);
    if (ccaResult.ok) return ccaResult;
    // Log CCA failure but continue to fallback
    console.log(`[gemini] CCA failed: ${ccaResult.error?.slice(0, 100)}, falling back to AI Studio`);
  }

  // Fallback: AI Studio with retry on 429
  if (!GEMINI_KEY) {
    return { ok: false, error: 'No Gemini API credentials configured' };
  }

  const delays = [2000, 5000, 10000];
  let lastResult = await callAIStudio(prompt, opts);
  
  for (let i = 0; i < delays.length; i++) {
    if (lastResult.ok || lastResult.status !== 429) break;
    console.log(`[gemini] 429 rate limit, retry ${i + 1}/${delays.length} in ${delays[i]}ms...`);
    await sleep(delays[i]);
    lastResult = await callAIStudio(prompt, opts);
  }
  
  const { status: _, ...result } = lastResult;
  return result;
}
