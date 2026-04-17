"""LLM client for Cronos engines — wraps Gemini API."""
import json
import urllib.request
import urllib.error
from config import LLM_API_KEY, LLM_MODEL, LLM_BASE_URL


def generate(prompt: str, system: str = '', temperature: float = 0.7, max_tokens: int = 4096, model: str = '') -> dict:
    """Call Gemini API and return parsed response."""
    active_model = model or LLM_MODEL
    url = f'{LLM_BASE_URL}/models/{active_model}:generateContent?key={LLM_API_KEY}'
    
    contents = []
    if system:
        contents.append({
            'role': 'user',
            'parts': [{'text': f'[SYSTEM INSTRUCTION]\n{system}\n[END SYSTEM INSTRUCTION]\n\n{prompt}'}]
        })
    else:
        contents.append({'role': 'user', 'parts': [{'text': prompt}]})
    
    body = json.dumps({
        'contents': contents,
        'generationConfig': {
            'temperature': temperature,
            'maxOutputTokens': max_tokens,
        }
    }).encode()
    
    req = urllib.request.Request(url, data=body, headers={'Content-Type': 'application/json'})
    
    try:
        resp = urllib.request.urlopen(req, timeout=120)
        data = json.loads(resp.read())
        text = data['candidates'][0]['content']['parts'][0]['text']
        return {'ok': True, 'text': text}
    except urllib.error.HTTPError as e:
        err = e.read().decode()[:500]
        return {'ok': False, 'error': f'HTTP {e.code}: {err}'}
    except Exception as e:
        return {'ok': False, 'error': str(e)}


def generate_json(prompt: str, system: str = '', temperature: float = 0.3, model: str = '') -> dict:
    """Generate and parse JSON response."""
    result = generate(prompt, system, temperature, model=model)
    if not result['ok']:
        return result
    
    text = result['text']
    # Try to extract JSON from markdown code blocks
    if '```json' in text:
        text = text.split('```json')[1].split('```')[0].strip()
    elif '```' in text:
        text = text.split('```')[1].split('```')[0].strip()
    
    try:
        parsed = json.loads(text)
        return {'ok': True, 'data': parsed, 'raw': result['text']}
    except json.JSONDecodeError as e:
        return {'ok': False, 'error': f'JSON parse error: {e}', 'raw': result['text']}
