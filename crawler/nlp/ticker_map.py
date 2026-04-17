"""Ticker → Company → CNPJ → Sector mapping for B3."""

TICKER_MAP = {
    'PETR4': {'company': 'Petrobras', 'cnpj': '33.000.167/0001-01', 'sector': 'Energia'},
    'PETR3': {'company': 'Petrobras', 'cnpj': '33.000.167/0001-01', 'sector': 'Energia'},
    'VALE3': {'company': 'Vale', 'cnpj': '33.592.510/0001-54', 'sector': 'Mineração'},
    'ITUB4': {'company': 'Itaú Unibanco', 'cnpj': '60.872.504/0001-23', 'sector': 'Bancos'},
    'BBDC4': {'company': 'Bradesco', 'cnpj': '60.746.948/0001-12', 'sector': 'Bancos'},
    'BBAS3': {'company': 'Banco do Brasil', 'cnpj': '00.000.000/0001-91', 'sector': 'Bancos'},
    'WEGE3': {'company': 'WEG', 'cnpj': '84.429.695/0001-11', 'sector': 'Indústria'},
    'RENT3': {'company': 'Localiza', 'cnpj': '16.670.085/0001-55', 'sector': 'Aluguel de Carros'},
    'ABEV3': {'company': 'Ambev', 'cnpj': '07.526.557/0001-00', 'sector': 'Bebidas'},
    'SUZB3': {'company': 'Suzano', 'cnpj': '16.404.287/0001-55', 'sector': 'Papel e Celulose'},
    'GGBR4': {'company': 'Gerdau', 'cnpj': '33.611.500/0001-19', 'sector': 'Siderurgia'},
    'LREN3': {'company': 'Lojas Renner', 'cnpj': '92.754.738/0001-62', 'sector': 'Varejo'},
    'MGLU3': {'company': 'Magazine Luiza', 'cnpj': '47.960.950/0001-21', 'sector': 'Varejo'},
    'HAPV3': {'company': 'Hapvida', 'cnpj': '63.554.067/0001-98', 'sector': 'Saúde'},
    'RADL3': {'company': 'Raia Drogasil', 'cnpj': '61.585.865/0001-51', 'sector': 'Varejo Farmacêutico'},
    'JBSS3': {'company': 'JBS', 'cnpj': '02.916.265/0001-60', 'sector': 'Alimentos'},
    'BEEF3': {'company': 'Minerva Foods', 'cnpj': '67.620.377/0001-14', 'sector': 'Alimentos'},
    'CSAN3': {'company': 'Cosan', 'cnpj': '50.746.577/0001-15', 'sector': 'Energia'},
    'EMBR3': {'company': 'Embraer', 'cnpj': '07.689.002/0001-89', 'sector': 'Aeronáutica'},
    'BPAC11': {'company': 'BTG Pactual', 'cnpj': '30.306.294/0001-45', 'sector': 'Bancos'},
    'ELET3': {'company': 'Eletrobras', 'cnpj': '00.001.180/0001-26', 'sector': 'Energia'},
    'ELET6': {'company': 'Eletrobras', 'cnpj': '00.001.180/0001-26', 'sector': 'Energia'},
    'TOTS3': {'company': 'TOTVS', 'cnpj': '53.113.791/0001-22', 'sector': 'Tecnologia'},
    'EQTL3': {'company': 'Equatorial', 'cnpj': '03.220.438/0001-73', 'sector': 'Energia'},
    'RAIL3': {'company': 'Rumo', 'cnpj': '02.387.241/0001-60', 'sector': 'Logística'},
    'KLBN11': {'company': 'Klabin', 'cnpj': '89.637.490/0001-45', 'sector': 'Papel e Celulose'},
    'FLRY3': {'company': 'Fleury', 'cnpj': '60.840.055/0001-31', 'sector': 'Saúde'},
    'ENEV3': {'company': 'Eneva', 'cnpj': '04.423.567/0001-21', 'sector': 'Energia'},
    'PRIO3': {'company': 'PetroRio', 'cnpj': '10.629.105/0001-68', 'sector': 'Energia'},
    'AZUL4': {'company': 'Azul', 'cnpj': '09.296.295/0001-60', 'sector': 'Aviação'},
    'COGN3': {'company': 'Cogna', 'cnpj': '02.800.026/0001-40', 'sector': 'Educação'},
    'CIEL3': {'company': 'Cielo', 'cnpj': '01.027.058/0001-91', 'sector': 'Pagamentos'},
    'IRBR3': {'company': 'IRB Brasil', 'cnpj': '33.376.989/0001-00', 'sector': 'Seguros'},
    'MRFG3': {'company': 'Marfrig', 'cnpj': '03.853.896/0001-40', 'sector': 'Alimentos'},
    'GOAU4': {'company': 'Metalúrgica Gerdau', 'cnpj': '92.690.783/0001-09', 'sector': 'Siderurgia'},
    'USIM5': {'company': 'Usiminas', 'cnpj': '60.894.730/0001-05', 'sector': 'Siderurgia'},
    'CSNA3': {'company': 'CSN', 'cnpj': '33.042.730/0001-04', 'sector': 'Siderurgia'},
    'BRKM5': {'company': 'Braskem', 'cnpj': '42.150.391/0001-70', 'sector': 'Petroquímica'},
    'CMIG4': {'company': 'CEMIG', 'cnpj': '17.155.730/0001-64', 'sector': 'Energia'},
    'SBSP3': {'company': 'Sabesp', 'cnpj': '43.776.517/0001-80', 'sector': 'Saneamento'},
    'CCRO3': {'company': 'CCR', 'cnpj': '02.846.056/0001-97', 'sector': 'Concessões'},
    'TAEE11': {'company': 'Taesa', 'cnpj': '07.859.971/0001-30', 'sector': 'Energia'},
    'YDUQ3': {'company': 'Yduqs', 'cnpj': '08.807.432/0001-10', 'sector': 'Educação'},
    'CRFB3': {'company': 'Carrefour Brasil', 'cnpj': '75.315.333/0001-09', 'sector': 'Varejo'},
    'MULT3': {'company': 'Multiplan', 'cnpj': '07.816.890/0001-53', 'sector': 'Shoppings'},
    'BRFS3': {'company': 'BRF', 'cnpj': '01.838.723/0001-27', 'sector': 'Alimentos'},
    'IGTI11': {'company': 'Iguatemi', 'cnpj': '51.218.147/0001-93', 'sector': 'Shoppings'},
    'NTCO3': {'company': 'Natura', 'cnpj': '71.673.990/0001-77', 'sector': 'Cosméticos'},
    'VIVT3': {'company': 'Vivo', 'cnpj': '02.558.157/0001-62', 'sector': 'Telecom'},
    'B3SA3': {'company': 'B3', 'cnpj': '09.346.601/0001-25', 'sector': 'Bolsa'},
}

KNOWN_TICKERS = set(TICKER_MAP.keys())

# Build reverse lookup: company name → ticker(s)
COMPANY_TO_TICKERS = {}
for ticker, info in TICKER_MAP.items():
    name = info['company'].lower()
    COMPANY_TO_TICKERS.setdefault(name, []).append(ticker)

# Company names for text matching (lowercase)
COMPANY_NAMES = set(info['company'].lower() for info in TICKER_MAP.values())

# Also match common variations
COMPANY_ALIASES = {
    'petrobras': 'Petrobras',
    'petrobrás': 'Petrobras',
    'vale': 'Vale',
    'itaú': 'Itaú Unibanco',
    'itau': 'Itaú Unibanco',
    'bradesco': 'Bradesco',
    'banco do brasil': 'Banco do Brasil',
    'bb': 'Banco do Brasil',
    'weg': 'WEG',
    'localiza': 'Localiza',
    'ambev': 'Ambev',
    'suzano': 'Suzano',
    'gerdau': 'Gerdau',
    'magazine luiza': 'Magazine Luiza',
    'magalu': 'Magazine Luiza',
    'jbs': 'JBS',
    'embraer': 'Embraer',
    'btg': 'BTG Pactual',
    'btg pactual': 'BTG Pactual',
    'eletrobras': 'Eletrobras',
    'eletrobrás': 'Eletrobras',
    'totvs': 'TOTVS',
    'natura': 'Natura',
    'cielo': 'Cielo',
    'azul': 'Azul',
    'sabesp': 'Sabesp',
    'cemig': 'CEMIG',
    'braskem': 'Braskem',
    'usiminas': 'Usiminas',
    'csn': 'CSN',
    'brf': 'BRF',
    'vivo': 'Vivo',
    'telefônica': 'Vivo',
    'telefonica': 'Vivo',
    'b3': 'B3',
    'hapvida': 'Hapvida',
    'fleury': 'Fleury',
    'cogna': 'Cogna',
    'rumo': 'Rumo',
    'cosan': 'Cosan',
    'marfrig': 'Marfrig',
    'irb': 'IRB Brasil',
    'klabin': 'Klabin',
    'ccr': 'CCR',
    'multiplan': 'Multiplan',
    'iguatemi': 'Iguatemi',
    'taesa': 'Taesa',
    'eneva': 'Eneva',
    'petrorio': 'PetroRio',
    'prio': 'PetroRio',
    'equatorial': 'Equatorial',
    'raia drogasil': 'Raia Drogasil',
    'rd': 'Raia Drogasil',
}


def find_entities_in_text(text):
    """Scan text for known tickers, companies, and CNPJs. Returns list of dicts."""
    import re
    if not text:
        return []

    results = []
    seen = set()

    # 1. Find tickers (PETR4, VALE3, etc.)
    for match in re.finditer(r'\b([A-Z]{4}\d{1,2})\b', text):
        ticker = match.group(1)
        if ticker in KNOWN_TICKERS and ticker not in seen:
            seen.add(ticker)
            info = TICKER_MAP[ticker]
            ctx_start = max(0, match.start() - 50)
            ctx_end = min(len(text), match.end() + 50)
            results.append({
                'type': 'ticker',
                'value': ticker,
                'canonical_name': info['company'],
                'sector': info['sector'],
                'relevance': 0.9,
                'context': text[ctx_start:ctx_end].strip(),
            })

    # 2. Find CNPJs
    for match in re.finditer(r'\b(\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2})\b', text):
        cnpj = match.group(1)
        if cnpj not in seen:
            seen.add(cnpj)
            ctx_start = max(0, match.start() - 50)
            ctx_end = min(len(text), match.end() + 50)
            results.append({
                'type': 'cnpj',
                'value': cnpj,
                'relevance': 0.7,
                'context': text[ctx_start:ctx_end].strip(),
            })

    # 3. Find company names
    text_lower = text.lower()
    for alias, canonical in COMPANY_ALIASES.items():
        if alias in text_lower and canonical not in seen:
            seen.add(canonical)
            idx = text_lower.index(alias)
            ctx_start = max(0, idx - 50)
            ctx_end = min(len(text), idx + len(alias) + 50)
            # Find the primary ticker
            tickers = COMPANY_TO_TICKERS.get(canonical.lower(), [])
            sector = TICKER_MAP[tickers[0]]['sector'] if tickers else None
            results.append({
                'type': 'company',
                'value': canonical,
                'canonical_name': canonical,
                'sector': sector,
                'relevance': 0.7,
                'context': text[ctx_start:ctx_end].strip(),
            })

    return results
