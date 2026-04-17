"""Sentiment analysis via Claude Opus (Antigravity) or Gemini Flash fallback."""
import json
import urllib.request
import urllib.error
from config import GEMINI_API_KEY, OPENAI_API_KEY

# Antigravity provides OpenAI-compatible API
OPENAI_URL = 'https://api.openai.com/v1/chat/completions'
GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

SENTIMENT_PROMPT = (
    'Analyze the financial market sentiment of this Brazilian news headline. '
    'Return ONLY a valid JSON object (no markdown, no explanation) with exactly these fields: '
    '"score" (float from -1.0 very bearish to 1.0 very bullish), '
    '"label" (one of: "positive", "negative", "neutral"), '
    '"confidence" (float 0.0 to 1.0). '
    'Headline: {text}'
)


def _parse_result(text_resp):
    """Parse JSON from LLM response, stripping markdown if needed."""
    text_resp = text_resp.strip()
    if text_resp.startswith('```'):
        text_resp = text_resp.split('\n', 1)[1] if '\n' in text_resp else text_resp[3:]
        if text_resp.endswith('```'):
            text_resp = text_resp[:-3]
        text_resp = text_resp.strip()

    result = json.loads(text_resp)
    score = max(-1.0, min(1.0, float(result.get('score', 0))))
    label = result.get('label', 'neutral')
    if label not in ('positive', 'negative', 'neutral'):
        label = 'positive' if score > 0.1 else ('negative' if score < -0.1 else 'neutral')
    confidence = float(result.get('confidence', 0.5))
    return {'score': score, 'label': label, 'confidence': confidence}


def _analyze_opus(text):
    """Analyze via Claude Opus through Antigravity (OpenAI-compatible)."""
    import os
    api_key = os.environ.get('OPENAI_API_KEY', OPENAI_API_KEY)
    if not api_key:
        return None

    payload = {
        'model': 'claude-opus-4-6-thinking',
        'messages': [{'role': 'user', 'content': SENTIMENT_PROMPT.format(text=text[:500])}],
        'max_tokens': 100,
        'temperature': 0.1,
    }

    req = urllib.request.Request(
        OPENAI_URL,
        data=json.dumps(payload).encode(),
        headers={
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {api_key}',
        },
    )

    try:
        resp = urllib.request.urlopen(req, timeout=30)
        data = json.loads(resp.read())
        text_resp = data['choices'][0]['message']['content']
        result = _parse_result(text_resp)
        result['model'] = 'claude-opus-4-6'
        return result
    except Exception as e:
        print(f'  Opus error: {e}')
        return None


def _analyze_gemini(text):
    """Analyze via Gemini Flash (fallback)."""
    if not GEMINI_API_KEY:
        return None

    payload = {
        'contents': [{'parts': [{'text': SENTIMENT_PROMPT.format(text=text[:500])}]}],
        'generationConfig': {'temperature': 0.1, 'maxOutputTokens': 100},
    }

    req = urllib.request.Request(
        f'{GEMINI_URL}?key={GEMINI_API_KEY}',
        data=json.dumps(payload).encode(),
        headers={'Content-Type': 'application/json'},
    )

    try:
        resp = urllib.request.urlopen(req, timeout=15)
        data = json.loads(resp.read())
        text_resp = data['candidates'][0]['content']['parts'][0]['text']
        result = _parse_result(text_resp)
        result['model'] = 'gemini-flash'
        return result
    except Exception as e:
        print(f'  Gemini error: {e}')
        return None


def analyze_sentiment(title, summary=None):
    """Analyze financial sentiment. Tries Opus first, falls back to Gemini Flash."""
    text = title
    if summary:
        text += f'. {summary}'

    # Try Opus first (free via Antigravity)
    result = _analyze_opus(text)
    if result:
        return result

    # Fallback to Gemini Flash
    result = _analyze_gemini(text)
    if result:
        return result

    print('  [WARN] No sentiment model available')
    return None
