#!/usr/bin/env bash
# Cronos crawler cron — full pipeline with post-processing
# Runs: crawl → NLP → sentiment → impact → patterns → alerts

set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Cronos pipeline starting..."

cd "$DIR"

# 1. Crawl + NLP + Sentiment
python3 run.py --full 2>&1

# 2. Price update (daily close + macro)
python3 price_fetcher.py 2>&1 || echo "[WARN] Price fetcher failed"

# 3. Impact scoring (news→price correlation)
python3 nlp/impact_scorer.py 2>&1 || echo "[WARN] Impact scorer failed"

# 4. Pattern detection (recurring correlations)
python3 nlp/pattern_detector.py 2>&1 || echo "[WARN] Pattern detector failed"

# 5. Alert evaluation (check conditions → fire notifications)
python3 alert_evaluator.py 2>&1 || echo "[WARN] Alert evaluator failed"

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Cronos pipeline done."
