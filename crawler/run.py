#!/usr/bin/env python3
"""Cronos Crawler — CLI entrypoint."""
import argparse
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from pipeline import run_pipeline, ALL_CRAWLERS


def main():
    parser = argparse.ArgumentParser(description='Cronos Financial News Crawler')
    parser.add_argument('--source', '-s', choices=list(ALL_CRAWLERS.keys()),
                       help='Run specific source only')
    parser.add_argument('--dry-run', action='store_true',
                       help='Crawl without inserting into DB')
    args = parser.parse_args()

    sources = [args.source] if args.source else None
    stats = run_pipeline(sources=sources, dry_run=args.dry_run)

    sys.exit(1 if stats['errors'] > 0 and stats['new'] == 0 else 0)


if __name__ == '__main__':
    main()
