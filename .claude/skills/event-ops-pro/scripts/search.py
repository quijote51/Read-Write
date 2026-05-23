#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Event Ops Pro Search
Usage:
  python3 search.py "<query>" [--domain <domain>] [-n <max>]
  python3 search.py "<query>" --full-brief
  python3 search.py --list-domains

Domains: eventos, marketing, personal, inventario, ventas, workflows, integraciones
"""

import argparse
import sys
import io
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from core import CSV_CONFIG, search, search_all, MAX_RESULTS

if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
if sys.stderr.encoding and sys.stderr.encoding.lower() != 'utf-8':
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

DOMAIN_ICONS = {
    'eventos':       '📅',
    'marketing':     '📣',
    'personal':      '👥',
    'inventario':    '📦',
    'ventas':        '💶',
    'workflows':     '⚙️',
    'integraciones': '🔗',
}


def fmt_result(result):
    out = []
    if 'error' in result:
        return f"❌ Error: {result['error']}"

    domain = result.get('domain', '?')
    icon = DOMAIN_ICONS.get(domain, '•')
    out.append(f"## {icon} Event Ops Pro — {domain.upper()}")
    out.append(f"**Query:** {result['query']} | **Resultados:** {result['count']}\n")

    for i, row in enumerate(result['results'], 1):
        out.append(f"### Resultado {i}")
        for k, v in row.items():
            v_str = str(v).strip()
            if not v_str or v_str == k:
                continue
            if len(v_str) > 400:
                v_str = v_str[:400] + '…'
            out.append(f"- **{k}:** {v_str}")
        out.append("")

    return "\n".join(out)


def fmt_full_brief(query, all_results):
    out = [f"# Event Ops Pro — Brief Completo", f"**Consulta:** {query}\n"]
    for domain, results in all_results.items():
        icon = DOMAIN_ICONS.get(domain, '•')
        out.append(f"## {icon} {domain.upper()}")
        for i, row in enumerate(results, 1):
            # Print top 3 most informative columns
            cols = list(row.items())
            top_cols = cols[1:6]  # skip No column, take next 5
            for k, v in top_cols:
                v_str = str(v).strip()
                if v_str and len(v_str) > 2:
                    out.append(f"- **{k}:** {v_str[:250]}")
            out.append("")
    return "\n".join(out)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Event Ops Pro Search')
    parser.add_argument('query', nargs='?', help='Search query')
    parser.add_argument('--domain', '-d', choices=list(CSV_CONFIG.keys()), help='Domain to search')
    parser.add_argument('--full-brief', action='store_true', help='Search all domains and return brief')
    parser.add_argument('--list-domains', action='store_true', help='List available domains')
    parser.add_argument('-n', '--max-results', type=int, default=MAX_RESULTS)
    args = parser.parse_args()

    if args.list_domains:
        print("## Event Ops Pro — Dominios disponibles\n")
        for d, cfg in CSV_CONFIG.items():
            print(f"- **{d}** ({DOMAIN_ICONS.get(d,'')}) → {cfg['file']}")
        sys.exit(0)

    if not args.query:
        parser.print_help()
        sys.exit(1)

    if args.full_brief:
        all_r = search_all(args.query, max_per_domain=2)
        print(fmt_full_brief(args.query, all_r))
    elif args.domain:
        r = search(args.query, args.domain, max_results=args.max_results)
        print(fmt_result(r))
    else:
        # Search top 2 most relevant domains
        all_r = search_all(args.query, max_per_domain=3)
        if all_r:
            for domain, results in list(all_r.items())[:3]:
                r = {'domain': domain, 'query': args.query, 'file': CSV_CONFIG[domain]['file'],
                     'count': len(results), 'results': results}
                print(fmt_result(r))
        else:
            print(f"Sin resultados para: {args.query}")
