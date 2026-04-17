# Cronos

> Multi-agent intelligence engine for public opinion analysis and predictive simulation.

Cronos combines two core engines into a unified pipeline:

- **[BettaFish](https://github.com/666ghj/BettaFish)** — Multi-agent public opinion analysis system. AI-driven monitoring across 30+ social platforms, composite analysis (LLM + fine-tuned models + statistical models), multimodal content understanding, and Agent "Forum" collaboration for collective intelligence.

- **[MiroFish](https://github.com/666ghj/MiroFish)** — Swarm intelligence prediction engine. Constructs high-fidelity parallel digital worlds from seed information (news, signals, reports), runs thousands of autonomous agents with independent personalities and memory through social simulation, and produces predictive reports.

## Pipeline

```
Data Collection → Sentiment Analysis → Opinion Mapping → Predictive Simulation → Decision Report
   (BettaFish)      (BettaFish)         (BettaFish)         (MiroFish)           (MiroFish)
```

## Architecture

```
cronos/
├── engines/
│   ├── bettafish/          # Opinion analysis engine (submodule)
│   └── mirofish/           # Prediction engine (submodule)
├── cronos/
│   ├── orchestrator.py     # Pipeline orchestrator
│   ├── config.py           # Unified configuration
│   └── integrations/       # Custom integrations & adapters
├── api/                    # REST API layer
├── dashboard/              # Web UI
├── docs/                   # Documentation
└── tests/                  # Test suite
```

## Status

🚧 **Early development** — Core engines identified, integration architecture being designed.

## License

MIT
