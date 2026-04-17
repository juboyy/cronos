"""Cronos pipeline runner."""
import sys
import os
import argparse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from pipeline import run_pipeline


def main():
    parser = argparse.ArgumentParser(description='Cronos Intelligence Pipeline')
    parser.add_argument('--sources', nargs='+', default=None, help='Sources to crawl')
    parser.add_argument('--dry-run', action='store_true', help='Preview only')
    parser.add_argument('--full', action='store_true', help='Run full pipeline with impact, patterns, alerts')
    parser.add_argument('--impact', action='store_true', help='Run impact scoring')
    parser.add_argument('--patterns', action='store_true', help='Run pattern matching')
    parser.add_argument('--alerts', action='store_true', help='Run alert engine')
    parser.add_argument('--prices', action='store_true', help='Run price fetcher')
    args = parser.parse_args()

    if args.prices:
        from price_fetcher import run_price_pipeline
        run_price_pipeline(days=30)
        return

    do_impact = args.impact or args.full
    do_patterns = args.patterns or args.full
    do_alerts = args.alerts or args.full

    run_pipeline(
        sources=args.sources,
        dry_run=args.dry_run,
        run_impact=do_impact,
        run_patterns=do_patterns,
        run_alerts=do_alerts,
    )


if __name__ == '__main__':
    main()
