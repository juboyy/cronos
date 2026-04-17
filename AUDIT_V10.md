# Cronos v10 — Audit de Visão vs Realidade

> Documento gerado em 2026-04-17 14:10 UTC
> Referência: VISION.md (4 pilares originais)

---

## VEREDICTO: Entregamos o esqueleto. Falta a alma.

O sistema funciona end-to-end (crawl → NLP → DB → API → UI) mas está 
operando como um **feed inteligente com extras**, não como o 
**motor de inteligência informacional** que a visão descreve.

A promessa era: "o que essa informação significa pro meu portfólio?"
O que entregamos: "aqui estão as notícias com um score de sentimento."

---

## Pilar 1: Feed de Inteligência — 55% entregue

### ✅ O que funciona
- 322 artigos de 4 fontes (Valor, BCB, Reuters, InfoMoney)
- 319/322 com sentimento classificado (99% coverage)
- 78 entidades extraídas (50 tickers, 18 empresas, 10 CNPJs)
- Feed real-time com sentiment dots, source colors, timestamps

### ❌ O que falta (visão: "30+ fontes")
- **4 fontes** vs **30+ prometidas** — faltam redes sociais, governo, B3 direto
- **Zero fontes do paganini-news** (NewsNow API: 财联社, 雪球, 微博, Hacker News)
- Sem timeline visual ("o que aconteceu e quando")
- Sem drill-down real: notícia → entidade → impacto (UI é flat, não funil)
- Sem atualização automática via cron confiável (crawler timeout freq.)
- Crawler sem paralelismo — fontes sequenciais, lento

### Gap score: MODERADO
O feed existe e funciona, mas é **raso**. 4 fontes não fazem inteligência.

---

## Pilar 2: Impacto Mensurável — 15% entregue

### ✅ O que funciona
- Schema correto (delta_1h, 4h, 1d, 5d, volume_ratio, confidence)
- 11.231 preços históricos + 216 indicadores macro
- Algoritmo de scoring funcional

### ❌ O que falta
- **2 impactos computados** em 322 artigos — 0.6% coverage
- Granularidade hora e mês: **zero** (apenas 1d e 5d parciais)
- delta_1h e delta_4h sempre `null` — dados intraday não existem
- Volume anomaly detection: trivial (ratio > 2x), não probabilístico
- Zero gráficos de impacto (visão: "hora/dia/mês")
- Sem histórico de padrões ("toda vez que X acontece, Y reage assim")
- Pattern matcher: **0 patterns** detectados

### Gap score: CRÍTICO
Este é o pilar que diferencia Cronos de um feed. Está vazio.

---

## Pilar 3: Simulação Preditiva — 5% entregue

### ✅ O que funciona
- 1 simulação criada (status: pending)
- UI de criação e visualização existe
- Schema correto no DB

### ❌ O que falta
- **MiroFish real: ZERO integração** — adapter é um wrapper de Gemini Flash
- Nenhuma simulação completou (todas pending ou error)
- Zero agentes autônomos rodando — é um prompt engineering, não swarm
- BettaFish real: ZERO integração — mesmo problema
- Sem agent timelines, debate logs, prediction reports
- Sem resultados para exibir na UI (tudo mockado)
- Engines reais (Flask + OASIS + camel-ai) não estão deployados

### Gap score: INEXISTENTE
O pilar mais diferenciador do produto não existe funcionalmente.

---

## Pilar 4: Busca Profunda — 40% entregue

### ✅ O que funciona
- Busca por keyword funciona (FTS no Supabase)
- Busca por ticker funciona
- Retorna artigos + entidades relacionadas
- API REST operacional

### ❌ O que falta
- Busca por CNPJ: não implementada
- Busca por setor: parcial
- Graph navigation (entidade → relações → impactos): stub
- Sem "todas as notícias, impactos, simulações relacionadas" — busca 
  retorna apenas artigos, impacts/patterns/related sempre vazios
- Sem semantic search (embeddings) — apenas lexical

### Gap score: MODERADO
Funciona para o básico, mas não é "profunda".

---

## UI/Exposição dos dados — 45% entregue

### ✅ O que funciona
- Design system sofisticado (Space Grotesk + Instrument Serif + IBM Plex)
- Macro ribbon com indicadores reais
- Feed editorial com sentiment dots
- Impact table com entity ranking
- 7 páginas + 12 API endpoints

### ❌ O que falta
- **Zero interatividade real** — tudo é server-rendered estático
- Sem drill-down (notícia → ativo → impacto → simulação)
- Sem gráficos de preço (apenas números)
- Sem timeline de eventos
- Sem filtros por período, ticker, setor
- Sem estado de loading/empty/error diferenciados
- Sem feedback interativo sobre proposições (João pediu explicitamente)
- Sem real-time updates (polling ou WebSocket)
- Mobile: grid quebra (hardcoded columns)

---

## Resumo Executivo

| Pilar | Visão | Realidade | Gap |
|-------|-------|-----------|-----|
| Feed de Inteligência | 30+ fontes, timeline, drill-down | 4 fontes, flat list | 55% |
| Impacto Mensurável | hora/dia/mês, padrões | 2 impactos, zero patterns | 15% |
| Simulação Preditiva | MiroFish swarm, BettaFish opinion | Gemini prompt wrapper | 5% |
| Busca Profunda | CNPJ, graph, semântica | FTS básico | 40% |
| UI/Exposição | Drill-down, gráficos, interativo | Estático editorial | 45% |

**Nota geral: 32/100**

O sistema é tecnicamente funcional mas esteticamente enganoso — parece 
sofisticado na superfície enquanto os dados por trás são rasos.

---

## Plano de Ação — Cronos v10

### Sprint A: Data Foundation (sem isso nada mais importa)
1. Expandir crawler: +10 fontes (NewsNow API, B3 API, CVM, Twitter/X)
2. Rodar impact scorer em batch (322 artigos → todos com deltas)
3. Dados intraday via Yahoo Finance (intervalo 1h para top 20 tickers)
4. Corrigir cron do crawler (paralelismo, retry, health check)

### Sprint B: Engines Reais
5. Deploy BettaFish no Vultr (Flask, PostgreSQL, lite mode sem torch)
6. Deploy MiroFish no Vultr (Flask, OASIS lite, 50 agents max)
7. Reescrever adapters como HTTP clients → engines reais
8. Pipeline: artigo novo → BettaFish analisa → MiroFish simula

### Sprint C: UI Interativa
9. Drill-down: artigo → entidade → impacto → simulação (SPA routing)
10. Gráficos de preço com overlay de eventos (canvas/SVG)
11. Filtros: período, ticker, setor, score mínimo
12. Real-time: polling a cada 60s no feed
13. Feedback interativo em proposições (upvote/downvote, comentários)

### Sprint D: Busca e Exposição
14. Semantic search com embeddings (Gemini embedding + pgvector)
15. Busca por CNPJ e setor
16. Graph navigation visual (entidade → relações)
17. Morning briefing como página dedicada (não só API)
18. Mobile responsive (container queries)

Prioridade máxima: **Sprint A**. Sem dados densos, tudo é teatro.
