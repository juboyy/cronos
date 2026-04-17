#!/usr/bin/env bash
# Cronos crawler cron — full pipeline with post-processing
# Runs: crawl → NLP → sentiment → impact → patterns → alerts

set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Cronos pipeline starting..."

cd "$DIR"
python3 run.py --full 2>&1

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Cronos pipeline done."
