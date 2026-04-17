# Cronos

> Plataforma de inteligência financeira brasileira — Feed + Busca + Sentimento em tempo real.

**Live:** [web-revenue-os.vercel.app](https://web-revenue-os.vercel.app)

## O que é

Cronos transforma notícias financeiras brutas em inteligência acionável. Crawlea 5 fontes brasileiras, extrai entidades (tickers B3, CNPJs, empresas), analisa sentimento via IA, e serve tudo via API + interface web com drill-down.

```
Notícia → Entidades → Sentimento → Feed + Busca + Drill-down
```

## Stack

| Camada | Tech |
|--------|------|
| **Crawler** | Python, Jina Reader API (fallback), regex NLP |
| **Sentimento** | Google Gemini Flash (classificação -1.0 a +1.0) |
| **Backend** | Next.js 15 API Routes, Supabase (PostgreSQL) |
| **Frontend** | Next.js 15, Tailwind v4, estética futurística (dark/cyan) |
| **Deploy** | Vercel (web), OpenClaw cron (crawler ~30min) |

## Fontes

| Fonte | Método | Status |
|-------|--------|--------|
| InfoMoney | RSS | ✅ |
| Valor Econômico | RSS | ✅ |
| BCB (Banco Central) | API + endpoints alternativos | ✅ |
| Reuters/Google News | Google News RSS | ✅ |
| B3 | API + Jina fallback | ⚠️ Bloqueado (anti-bot) |

## Estrutura

```
cronos/
├── crawler/                # Python — Engine de coleta + NLP
│   ├── crawlers/           # 5 crawlers especializados
│   │   ├── infomoney.py    # RSS
│   │   ├── valor.py        # RSS
│   │   ├── b3_news.py      # API + Jina fallback
│   │   ├── bcb.py          # API + endpoints alternativos
│   │   └── reuters_br.py   # Google News RSS + Jina fallback
│   ├── nlp/
│   │   ├── entity_extractor.py  # Regex: tickers, CNPJ, empresas
│   │   ├── sentiment.py         # Gemini Flash
│   │   └── ticker_map.py        # B3: PETR4 → Petrobras → setor
│   ├── pipeline.py         # Orquestrador: crawl → NLP → DB
│   ├── db.py               # Client Supabase REST
│   ├── run.py              # Entrypoint CLI
│   └── cron.sh             # Wrapper para cron
│
├── web/                    # Next.js 15 — Interface + API
│   └── src/
│       ├── app/
│       │   ├── page.tsx           # Feed principal
│       │   ├── search/page.tsx    # Busca full-text (PT-BR)
│       │   ├── entity/[id]/       # Drill-down por entidade
│       │   └── api/               # 4 rotas: feed, search, entity, trending
│       ├── components/            # ArticleCard, EntityBadge, SentimentIndicator
│       └── lib/                   # Supabase client, types
│
├── supabase/migrations/    # Schema SQL
├── docs/ARCHITECTURE.md    # Arquitetura detalhada
├── VISION.md               # Visão do produto (4 pilares)
└── NOTES.md                # Stack e estratégia
```

## Banco de Dados

4 tabelas no Supabase com RLS:
- `cronos_articles` — notícias (FTS em português via tsvector)
- `cronos_entities` — tickers, CNPJs, empresas, setores
- `cronos_article_entities` — relação N:N com relevance score
- `cronos_sentiment` — sentimento por artigo (-1.0 a +1.0)

## Rodar o Crawler

```bash
cd crawler
pip install -r requirements.txt  # (opcional, usa só stdlib + urllib)
python run.py                    # todas as fontes
python run.py --source infomoney # fonte específica
```

Requer: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY` no ambiente ou em `~/.openclaw/openclaw.json`.

## Rodar a Web

```bash
cd web
npm install
npm run dev
```

Requer: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

## Visão (Sprint 2+)

Cronos evolui para 4 pilares:
1. **Intelligence Feed** — Tagging de entidades + sentimento (Sprint 1 ✅)
2. **Measurable Impact** — Correlação preço × notícia (horária/diária/mensal)
3. **Predictive Simulation** — MiroFish (swarm intelligence)
4. **Deep Search** — Busca semântica cross-source

Engines futuras:
- **[BettaFish](https://github.com/666ghj/BettaFish)** — Análise multi-agente de opinião pública
- **[MiroFish](https://github.com/666ghj/MiroFish)** — Simulação preditiva via inteligência de enxame

## License

MIT
