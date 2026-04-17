# Cronos Sprint 1 — Arquitetura Técnica
# Feed Inteligente + Busca Profunda

## Visão da Sprint
Uma sprint. Um produto funcional: feed de notícias financeiras BR com extração de entidades,
sentimento e busca por ticker/CNPJ/empresa. API + UI com drill-down.

## Arquitetura

```
┌─────────────────────────────────────────────────────┐
│                    CRONOS UI                         │
│              (Next.js 15 + Tailwind)                 │
│  Feed ──drill──▶ Ações ──drill──▶ Notícias/Sentimento│
└────────────────────┬────────────────────────────────┘
                     │ fetch
┌────────────────────▼────────────────────────────────┐
│                  CRONOS API                          │
│               (Next.js API Routes)                   │
│  GET /api/feed     — feed paginado                   │
│  GET /api/search   — busca full-text + entidades     │
│  GET /api/entity/:id — drill-down por ticker/CNPJ    │
│  GET /api/trending — entidades mais mencionadas      │
└────────────────────┬────────────────────────────────┘
                     │ query
┌────────────────────▼────────────────────────────────┐
│              SUPABASE (PostgreSQL)                    │
│                                                      │
│  articles        — notícias crawleadas               │
│  entities        — tickers, CNPJs, empresas          │
│  article_entities — N:N com relevance score          │
│  sentiment_scores — sentimento por artigo            │
│  entity_metadata  — dados estáticos (setor, nome)    │
└────────────────────▲────────────────────────────────┘
                     │ insert
┌────────────────────┴────────────────────────────────┐
│              CRAWLER + NLP (Python)                   │
│                                                      │
│  crawlers/        — 1 arquivo por fonte              │
│    infomoney.py   — RSS + scraping                   │
│    valor.py       — RSS                              │
│    b3_news.py     — API B3                           │
│    reuters_br.py  — RSS                              │
│    gov_br.py      — Diário Oficial / BCB             │
│                                                      │
│  nlp/                                                │
│    entity_extractor.py — spaCy/regex → ticker, CNPJ  │
│    sentiment.py        — FinBERT ou Gemini Flash     │
│    pipeline.py         — orquestra crawl → NLP → DB  │
│                                                      │
│  Execução: cron a cada 15 min no Vultr               │
└─────────────────────────────────────────────────────┘
```

## Schema SQL

```sql
-- Supabase: projeto apkflemxmsbdltziouls

CREATE TABLE cronos_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,           -- 'infomoney', 'valor', 'b3', etc.
  url TEXT UNIQUE NOT NULL,       -- dedup key
  title TEXT NOT NULL,
  summary TEXT,
  content TEXT,
  published_at TIMESTAMPTZ,
  crawled_at TIMESTAMPTZ DEFAULT NOW(),
  image_url TEXT,
  metadata JSONB DEFAULT '{}'
);

CREATE TABLE cronos_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,             -- 'ticker', 'cnpj', 'company', 'sector', 'person'
  value TEXT NOT NULL,            -- 'PETR4', '33.000.167/0001-01', 'Petrobras'
  canonical_name TEXT,            -- nome normalizado
  sector TEXT,
  metadata JSONB DEFAULT '{}',
  UNIQUE(type, value)
);

CREATE TABLE cronos_article_entities (
  article_id UUID REFERENCES cronos_articles(id) ON DELETE CASCADE,
  entity_id UUID REFERENCES cronos_entities(id) ON DELETE CASCADE,
  relevance FLOAT DEFAULT 0.5,   -- 0-1, quanto a entidade é central na notícia
  context TEXT,                   -- trecho onde a entidade aparece
  PRIMARY KEY (article_id, entity_id)
);

CREATE TABLE cronos_sentiment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES cronos_articles(id) ON DELETE CASCADE,
  score FLOAT NOT NULL,           -- -1 (bearish) a +1 (bullish)
  label TEXT NOT NULL,             -- 'positive', 'negative', 'neutral'
  confidence FLOAT DEFAULT 0.5,
  model TEXT DEFAULT 'gemini-flash',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para busca rápida
CREATE INDEX idx_articles_published ON cronos_articles(published_at DESC);
CREATE INDEX idx_articles_source ON cronos_articles(source);
CREATE INDEX idx_entities_type_value ON cronos_entities(type, value);
CREATE INDEX idx_entities_sector ON cronos_entities(sector);
CREATE INDEX idx_sentiment_article ON cronos_sentiment(article_id);
CREATE INDEX idx_sentiment_score ON cronos_sentiment(score);

-- Full-text search
ALTER TABLE cronos_articles ADD COLUMN fts tsvector
  GENERATED ALWAYS AS (to_tsvector('portuguese', coalesce(title,'') || ' ' || coalesce(summary,'') || ' ' || coalesce(content,''))) STORED;
CREATE INDEX idx_articles_fts ON cronos_articles USING GIN(fts);

-- RLS (público por enquanto, sem tenant isolation)
ALTER TABLE cronos_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cronos_articles_read" ON cronos_articles FOR SELECT USING (true);
ALTER TABLE cronos_entities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cronos_entities_read" ON cronos_entities FOR SELECT USING (true);
ALTER TABLE cronos_article_entities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cronos_ae_read" ON cronos_article_entities FOR SELECT USING (true);
ALTER TABLE cronos_sentiment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cronos_sentiment_read" ON cronos_sentiment FOR SELECT USING (true);
```

## Estrutura do Projeto

```
cronos/
├── README.md
├── VISION.md
├── NOTES.md
├── crawler/                    # Python — Agent: CODE
│   ├── requirements.txt
│   ├── config.py               # URLs, credenciais, intervalos
│   ├── crawlers/
│   │   ├── __init__.py
│   │   ├── base.py             # classe base com retry, rate limit
│   │   ├── infomoney.py
│   │   ├── valor.py
│   │   ├── b3_news.py
│   │   ├── reuters_br.py
│   │   └── gov_br.py
│   ├── nlp/
│   │   ├── __init__.py
│   │   ├── entity_extractor.py # spaCy + regex para tickers/CNPJ
│   │   ├── sentiment.py        # Gemini Flash API
│   │   └── ticker_map.py       # PETR4 → Petrobras → 33.000.167/0001-01
│   ├── pipeline.py             # crawl → extract → sentiment → insert
│   ├── db.py                   # Supabase client
│   └── run.py                  # entrypoint (cron)
│
├── web/                        # Next.js — Agent: CODE
│   ├── package.json
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx        # Feed principal
│   │   │   ├── search/
│   │   │   │   └── page.tsx    # Busca
│   │   │   ├── entity/
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx # Drill-down de entidade
│   │   │   └── api/
│   │   │       ├── feed/route.ts
│   │   │       ├── search/route.ts
│   │   │       ├── entity/[id]/route.ts
│   │   │       └── trending/route.ts
│   │   ├── components/
│   │   │   ├── ArticleCard.tsx
│   │   │   ├── EntityBadge.tsx
│   │   │   ├── SentimentIndicator.tsx
│   │   │   ├── DrillDownPanel.tsx
│   │   │   ├── SearchBar.tsx
│   │   │   └── TrendingEntities.tsx
│   │   └── lib/
│   │       ├── supabase.ts
│   │       └── types.ts
│   └── public/
│
├── supabase/
│   └── migrations/
│       └── 001_cronos_schema.sql
│
└── docs/
    └── ARCHITECTURE.md         # este arquivo
```

## Tasks para Subagentes

### Task 1: Database Schema (INFRA)
- Executar migration SQL no Supabase
- Criar tabelas, índices, RLS
- Popular `entity_metadata` com top 50 tickers B3 + CNPJs
- **Entregável:** Schema live no Supabase

### Task 2: Crawler Engine (CODE)
- Implementar 5 crawlers (RSS + scraping)
- Pipeline: crawl → NLP → Supabase
- Entity extraction: regex para tickers (A-Z]{4}[0-9]{1,2}), CNPJ, nomes de empresa
- Sentimento via Gemini Flash API (batch)
- Ticker map: associação ticker ↔ empresa ↔ CNPJ ↔ setor
- **Entregável:** `python run.py` funcional, inserindo artigos reais

### Task 3: API Layer (CODE)
- 4 endpoints Next.js: /feed, /search, /entity/:id, /trending
- Queries otimizadas com joins
- Paginação, filtros por source/date/sentiment
- Full-text search em português
- **Entregável:** API respondendo com dados reais

### Task 4: Frontend UI (CODE)
- Feed page com ArticleCards (título, source, sentimento, entidades)
- Search page com SearchBar + resultados
- Entity page com drill-down (todas as notícias + sentimento agregado)
- Trending sidebar (entidades mais mencionadas 24h)
- Estética futurística alinhada com BettaFish/MiroFish
- **Entregável:** UI navegável com dados reais

### Task 5: Deploy + Integração (INFRA)
- Crawler como cron no Vultr (a cada 15 min)
- Web no Vercel
- Variáveis de ambiente configuradas
- Health check
- **Entregável:** Cronos live em produção
