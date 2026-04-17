#!/usr/bin/env bash
# Cronos Crawler — cron wrapper for OpenClaw scheduler
# Runs the Python crawler pipeline with proper env
set -euo pipefail

cd /home/node/.openclaw/workspace/cronos/crawler
PYTHONUNBUFFERED=1 python3 run.py 2>&1 | tail -20
