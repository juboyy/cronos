"""Fetch price data from Yahoo Finance and BCB SGS API."""
import json
import csv
import os
import sys
import urllib.request
import urllib.error
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import SUPABASE_URL, SUPABASE_SERVICE_KEY
from nlp.ticker_map import TICKER_MAP, b3_to_yahoo

# Top tickers to track
TOP_TICKERS = list(TICKER_MAP.keys())[:40]

# BCB SGS series codes
BCB_SERIES = {
    'selic': 432,       # Selic meta
    'ipca': 433,        # IPCA mensal
    'usdbrl': 1,        # USD/BRL (PTAX)
    'cdi': 12,          # CDI diário
}

def _headers(extra=None):
    h = {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
        'Content-Type': 'application/json',
    }
    if extra:
        h.update(extra)
    return h


def _upsert(table, data, on_conflict=None):
    """Upsert rows into Supabase."""
    body = json.dumps(data if isinstance(data, list) else [data]).encode()
    url = f'{SUPABASE_URL}/rest/v1/{table}'
    if on_conflict:
        url += f'?on_conflict={on_conflict}'
    req = urllib.request.Request(
        url,
        data=body,
        headers=_headers({'Prefer': 'resolution=merge-duplicates,return=minimal'}),
    )
    resp = urllib.request.urlopen(req, timeout=15)
    return resp.status


def fetch_yahoo_prices(ticker, days=30):
    """Fetch recent price data from Yahoo Finance via chart API."""
    symbol = b3_to_yahoo(ticker)
    
    period2 = int(datetime.now().timestamp())
    period1 = int((datetime.now() - timedelta(days=days)).timestamp())
    
    url = (f'https://query1.finance.yahoo.com/v8/finance/chart/{symbol}'
           f'?period1={period1}&period2={period2}&interval=1d')
    
    req = urllib.request.Request(url, headers={
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
    })
    
    resp = urllib.request.urlopen(req, timeout=10)
    data = json.loads(resp.read())
    result = data['chart']['result'][0]
    timestamps = result['timestamp']
    quotes = result['indicators']['quote'][0]
    
    prices = []
    for i, ts in enumerate(timestamps):
        dt = datetime.fromtimestamp(ts)
        if quotes['close'][i] is None:
            continue
        prices.append({
            'ticker': ticker,
            'date': dt.strftime('%Y-%m-%d'),
            'open': round(quotes['open'][i], 2) if quotes['open'][i] else None,
            'high': round(quotes['high'][i], 2) if quotes['high'][i] else None,
            'low': round(quotes['low'][i], 2) if quotes['low'][i] else None,
            'close': round(quotes['close'][i], 2),
            'volume': int(quotes['volume'][i]) if quotes['volume'][i] else 0,
            'source': 'yahoo',
        })
    return prices


def fetch_bcb_sgs(series_code, indicator, days=90):
    """Fetch macro data from BCB SGS API."""
    end = datetime.now()
    start = end - timedelta(days=days)
    
    url = (f'https://api.bcb.gov.br/dados/serie/bcdata.sgs.{series_code}'
           f'/dados?formato=json'
           f'&dataInicial={start.strftime("%d/%m/%Y")}'
           f'&dataFinal={end.strftime("%d/%m/%Y")}')
    
    req = urllib.request.Request(url, headers={
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json',
    })
    resp = urllib.request.urlopen(req, timeout=10)
    data = json.loads(resp.read())
    
    records = []
    for item in data:
        dt = datetime.strptime(item['data'], '%d/%m/%Y')
        records.append({
            'indicator': indicator,
            'date': dt.strftime('%Y-%m-%d'),
            'value': float(item['valor']),
            'source': 'bcb',
        })
    return records


def load_b3_csv(csv_path):
    """Load historical B3 data from CSV into cronos_prices format."""
    records = []
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            dt = datetime.strptime(row['date'].strip(), '%Y%m%d')
            records.append({
                'ticker': row['ticker'].strip(),
                'date': dt.strftime('%Y-%m-%d'),
                'open': float(row['open']) if row.get('open') else None,
                'high': float(row['high']) if row.get('high') else None,
                'low': float(row['low']) if row.get('low') else None,
                'close': float(row['close']),
                'volume': int(float(row.get('volume_shares', 0) or 0)),
                'volume_brl': float(row.get('volume_brl', 0) or 0),
                'trades': int(float(row.get('trades', 0) or 0)),
                'source': 'b3',
            })
    return records


def run_price_pipeline(days=30, load_history=False, history_path=None):
    """Main pipeline: fetch prices + macro → upsert to Supabase."""
    stats = {'prices': 0, 'macro': 0, 'errors': 0}
    
    # 1) Historical B3 data (one-time load)
    if load_history and history_path and os.path.exists(history_path):
        print(f'[B3-CSV] Loading historical data from {history_path}...')
        records = load_b3_csv(history_path)
        print(f'  Parsed {len(records)} price records')
        
        # Batch upsert (500 at a time)
        batch_size = 500
        for i in range(0, len(records), batch_size):
            batch = records[i:i + batch_size]
            status = _upsert('cronos_prices', batch, on_conflict='ticker,date,source')
            if status and status < 300:
                stats['prices'] += len(batch)
            else:
                stats['errors'] += 1
            print(f'  Batch {i // batch_size + 1}: {len(batch)} records → {status}')
        
        print(f'  [B3-CSV] Done: {stats["prices"]} loaded')
    
    # 2) Yahoo Finance (recent prices for top tickers)
    print(f'\n[YAHOO] Fetching {len(TOP_TICKERS)} tickers ({days}d)...')
    for ticker in TOP_TICKERS:
        prices = fetch_yahoo_prices(ticker, days)
        if prices:
            status = _upsert('cronos_prices', prices, on_conflict='ticker,date,source')
            if status and status < 300:
                stats['prices'] += len(prices)
                print(f'  {ticker}: {len(prices)} days ✓')
            else:
                stats['errors'] += 1
        else:
            stats['errors'] += 1
    
    # 3) BCB SGS macro data
    print(f'\n[BCB] Fetching macro indicators...')
    for indicator, series in BCB_SERIES.items():
        records = fetch_bcb_sgs(series, indicator, days=90)
        if records:
            status = _upsert('cronos_macro', records, on_conflict='indicator,date')
            if status and status < 300:
                stats['macro'] += len(records)
                print(f'  {indicator}: {len(records)} records ✓')
            else:
                stats['errors'] += 1
        else:
            stats['errors'] += 1
    
    print(f'\n{"=" * 40}')
    print(f'Price Pipeline Complete!')
    print(f'  Prices: {stats["prices"]}')
    print(f'  Macro:  {stats["macro"]}')
    print(f'  Errors: {stats["errors"]}')
    return stats


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--days', type=int, default=30)
    parser.add_argument('--load-history', action='store_true')
    parser.add_argument('--history-path', default=os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        'data', 'b3-historico', 'b3_ultimo_ano.csv'))
    args = parser.parse_args()
    run_price_pipeline(args.days, args.load_history, args.history_path)
