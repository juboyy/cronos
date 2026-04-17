# Cronos — Visão do Produto

## Uma frase
Motor de inteligência informacional que transforma notícias em impacto financeiro mensurável e simulações preditivas.

## O que é
Paganini News → Cronos. De um feed passivo para um **sistema ativo de inteligência**:

```
Notícia publicada
    ↓
Crawling + NLP (BettaFish engine)
    ↓
Entidade identificada (PETR4, Petrobras, CNPJ)
    ↓
Impacto mensurado (hora, dia, mês)
    ↓
Cenário simulado (MiroFish engine)
    ↓
Entregue via API ou UI
```

## 4 Pilares

### 1. Feed de Inteligência
- Crawling contínuo de 30+ fontes (redes sociais, portais financeiros, governo)
- Cada notícia é taggeada com entidades: ticker, CNPJ, nome da empresa, setor
- Sentimento classificado (positivo/negativo/neutro) com score de confiança
- Timeline visual: o que aconteceu e quando

### 2. Impacto Mensurável
- Correlação notícia → variação de preço
- Granularidade: **hora**, **dia**, **mês**
- Score de impacto: quanto essa notícia moveu o mercado
- Histórico: "toda vez que X acontece, Y reage assim"

### 3. Simulação Preditiva
- Motor MiroFish: milhares de agentes simulam cenários
- Perguntas tipo: "Se o governo aumentar CSLL, qual impacto em PETR4?"
- "O que acontece com bancos se Selic subir 0.5%?"
- Relatório com probabilidades e trajetórias alternativas

### 4. Busca Profunda
- Por **palavra-chave**: "dividendos extraordinários"
- Por **ticker**: PETR4, VALE3, ITUB4
- Por **CNPJ**: 33.000.167/0001-01 (Petrobras)
- Por **nome**: "Petrobras", "Banco do Brasil"
- Por **setor**: "energia", "mineração", "bancos"
- Resultado: todas as notícias, impactos, simulações relacionadas

## Entrega

### API REST
```
GET  /api/v1/feed?ticker=PETR4&period=7d
GET  /api/v1/impact?ticker=PETR4&granularity=hour
GET  /api/v1/search?q=dividendos+petrobras&from=2026-01-01
POST /api/v1/simulate  { "scenario": "CSLL +2%", "tickers": ["PETR4", "VALE3"] }
GET  /api/v1/entity/{cnpj_or_ticker}
```

### Interface Web
- Dashboard com feed real-time
- Gráficos de impacto (hora/dia/mês)
- Simulador interativo de cenários
- Busca unificada (ticker, CNPJ, nome, keyword)
- Estética diferenciada — não é Bloomberg genérico

## Stack
- **BettaFish** → Crawling, NLP, sentimento, relatórios
- **MiroFish** → Simulação preditiva multi-agente
- **Supabase** → Armazenamento, busca full-text, pgvector
- **Next.js** → Interface web
- **Python** → Engines de análise e simulação
- **API REST** → Consumo externo

## Diferencial
Não é um terminal financeiro. Não é um agregador de notícias.
É um **motor que responde**: "o que essa informação significa pro meu portfólio?"
