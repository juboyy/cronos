# Cronos — Project Notes

## Core Engines
- **BettaFish**: Multi-agent public opinion analysis (crawling 30+ platforms, sentiment analysis, multimodal, Forum collaboration, report generation)
- **MiroFish**: Swarm intelligence prediction (parallel digital world simulation, thousands of agents, GraphRAG, temporal memory)

## Pipeline Vision
Raw data → BettaFish (analysis) → MiroFish (prediction) → Decision reports

## Tech Stack (from engines)
- Python ≥3.11 (backends)
- Node.js 18+ (MiroFish frontend)
- Flask (BettaFish web layer)
- SQLAlchemy (database)
- OpenAI-compatible LLM APIs
- Zep Cloud (agent memory - MiroFish)
- Docker Compose support

## Key Decisions
- TBD: Integration strategy (submodules vs fork vs wrapper)
- TBD: Unified API layer
- TBD: Which LLM providers to target
