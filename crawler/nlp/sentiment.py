"""Sentiment analysis: Gemini Flash primary, keyword fallback on 429."""
import json
import time
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

# Rate limiting state
_last_call = 0
_min_interval = 1.5  # seconds between Gemini calls
_consecutive_429s = 0

# Portuguese keyword lexicon for fast fallback
_POSITIVE = {
    'alta','altas','sobe','subiu','subiram','avança','cresce','crescimento','lucro','lucros',
    'recorde','supera','superam','otimismo','otimista','positivo','positiva','valoriza',
    'valorização','recupera','recuperação','ganho','ganhos','dividendo','dividendos',
    'forte','aquecido','aceleração','melhora','aprovação','expansão','investimento',
    'captação','ipo','aquisição','compra','upgrade','recomendação','outperform','buy',
}
_NEGATIVE = {
    'queda','cai','caiu','caíram','recua','tombo','perde','perda','perdas','prejuízo',
    'prejuízos','baixa','desvaloriza','desvalorização','pessimismo','pessimista','negativo',
    'negativa','risco','riscos','crise','inflação','recessão','desemprego','dívida',
    'multa','fraude','investigação','calote','default','downgrade','sell','corte',
    'demissão','demissões','falência','condenação','embargo','sanção','queda','dólar sobe',
    'selic alta','juros altos','estouro','colapso','fuga',
}


def _keyword_sentiment(title, summary=None):
    """Fast keyword-based sentiment (no API call)."""
    text = (title + ' ' + (summary or '')).lower()
    words = set(text.split())

    pos = len(words & _POSITIVE)
    neg = len(words & _NEGATIVE)
    total = pos + neg

    if total == 0:
        return {'score': 0.0, 'label': 'neutral', 'confidence': 0.3, 'model': 'keyword'}

    score = (pos - neg) / total
    label = 'positive' if score > 0.1 else ('negative' if score < -0.1 else 'neutral')
    confidence = min(0.6, 0.3 + (total * 0.1))

    return {'score': round(score, 4), 'label': label, 'confidence': round(confidence, 3), 'model': 'keyword'}


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
    """Analyze financial sentiment: Gemini primary, keyword fallback on 429."""
    global _last_call, _consecutive_429s

    if not GEMINI_API_KEY or _consecutive_429s >= 3:
        # Fallback to keyword when API exhausted
        return _keyword_sentiment(title, summary)

    # Rate limit
    elapsed = time.time() - _last_call
    if elapsed < _min_interval:
        time.sleep(_min_interval - elapsed)

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
        _last_call = time.time()
        resp = urllib.request.urlopen(req, timeout=15)
        data = json.loads(resp.read())
        text_resp = data['candidates'][0]['content']['parts'][0]['text']
        result = _parse_result(text_resp)
        result['model'] = 'gemini-flash'
        _consecutive_429s = 0  # Reset on success
        return result
    except urllib.error.HTTPError as e:
        if e.code == 429:
            _consecutive_429s += 1
            if _consecutive_429s >= 3:
                print(f'  [SENTIMENT] Gemini exhausted after {_consecutive_429s} 429s — switching to keyword fallback')
            return _keyword_sentiment(title, summary)
        body = e.read().decode()[:200]
        print(f'  Gemini error: {e.code} — {body}')
        return _keyword_sentiment(title, summary)
    except (json.JSONDecodeError, KeyError, ValueError) as e:
        print(f'  Gemini parse error: {e}')
        return _keyword_sentiment(title, summary)
    except Exception as e:
        print(f'  Gemini error: {e}')
        return _keyword_sentiment(title, summary)
