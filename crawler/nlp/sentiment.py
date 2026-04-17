"""Sentiment analysis via Gemini Flash (free, reliable)."""
import json
import urllib.request
import urllib.error
from config import GEMINI_API_KEY

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


def analyze_sentiment(title, summary=None):
    """Analyze financial sentiment using Gemini Flash."""
    if not GEMINI_API_KEY:
        print('  [WARN] No Gemini API key — skipping sentiment')
        return None

    text = title
    if summary:
        text += f'. {summary}'

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
    except urllib.error.HTTPError as e:
        body = e.read().decode()[:200]
        print(f'  Gemini error: {e.code} — {body}')
        return None
    except (json.JSONDecodeError, KeyError, ValueError) as e:
        print(f'  Gemini parse error: {e}')
        return None
    except Exception as e:
        print(f'  Gemini error: {e}')
        return None
