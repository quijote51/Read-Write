#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Event Ops Pro — Core BM25 search engine
"""

import csv
import math
import os
import re
from collections import Counter

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, 'data')

CSV_CONFIG = {
    'eventos':      {'file': 'eventos.csv',      'weight_cols': ['Categoria','Tipo_Evento','Descripcion','Checklist_Preevento','Mejores_Practicas']},
    'marketing':    {'file': 'marketing.csv',     'weight_cols': ['Canal','Momento','Asunto_Template','Cuerpo_Template','Objetivo']},
    'personal':     {'file': 'personal.csv',      'weight_cols': ['Situacion','Rol','Accion_Requerida','Proceso','Comunicacion']},
    'inventario':   {'file': 'inventario.csv',    'weight_cols': ['Categoria','Item','Accion','Formula_Calculo','Proceso_Reposicion']},
    'ventas':       {'file': 'ventas.csv',         'weight_cols': ['Escenario','Tipo_Cliente','Estrategia','Argumentos_Venta','Upsell']},
    'workflows':    {'file': 'workflows.csv',      'weight_cols': ['Flujo','Trigger','Paso','Responsable','Output']},
    'integraciones':{'file': 'integraciones.csv', 'weight_cols': ['Modulo_Origen','Modulo_Destino','Tipo_Conexion','Datos_Compartidos','Impacto']},
}

MAX_RESULTS = 5
K1 = 1.5
B = 0.75


def tokenize(text):
    text = str(text).lower()
    text = re.sub(r'[^\w\s]', ' ', text)
    return [t for t in text.split() if len(t) > 2]


def load_csv(domain):
    cfg = CSV_CONFIG.get(domain)
    if not cfg:
        return None, None
    path = os.path.join(DATA_DIR, cfg['file'])
    if not os.path.exists(path):
        return None, None
    rows = []
    with open(path, encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)
    return rows, cfg


def bm25_score(query_tokens, doc_tokens, avg_dl, n_docs, df):
    score = 0.0
    dl = len(doc_tokens)
    tf_map = Counter(doc_tokens)
    for qt in query_tokens:
        if qt not in df:
            continue
        tf = tf_map.get(qt, 0)
        idf = math.log((n_docs - df[qt] + 0.5) / (df[qt] + 0.5) + 1)
        tf_norm = (tf * (K1 + 1)) / (tf + K1 * (1 - B + B * dl / max(avg_dl, 1)))
        score += idf * tf_norm
    return score


def search(query, domain, max_results=MAX_RESULTS):
    rows, cfg = load_csv(domain)
    if not rows:
        return {'error': f'Domain "{domain}" not found or empty', 'domain': domain}

    weight_cols = cfg['weight_cols']
    query_tokens = tokenize(query)

    # Build document corpus (weighted: weight cols repeated 2x)
    corpus = []
    for row in rows:
        weighted_text = []
        for col, val in row.items():
            tokens = tokenize(val)
            if col in weight_cols:
                weighted_text.extend(tokens * 2)
            else:
                weighted_text.extend(tokens)
        corpus.append(weighted_text)

    if not corpus:
        return {'error': 'No data', 'domain': domain, 'results': []}

    avg_dl = sum(len(d) for d in corpus) / len(corpus)
    n_docs = len(corpus)
    df = {}
    for doc in corpus:
        for t in set(doc):
            df[t] = df.get(t, 0) + 1

    scores = [bm25_score(query_tokens, doc, avg_dl, n_docs, df) for doc in corpus]
    ranked = sorted(enumerate(scores), key=lambda x: x[1], reverse=True)
    top = [(rows[i], s) for i, s in ranked[:max_results] if s > 0]

    if not top:
        # Fallback: return first results if no BM25 match
        top = [(rows[i], 0) for i in range(min(3, len(rows)))]

    return {
        'domain': domain,
        'query': query,
        'file': cfg['file'],
        'count': len(top),
        'results': [r for r, _ in top]
    }


def search_all(query, max_per_domain=2):
    all_results = {}
    for domain in CSV_CONFIG:
        r = search(query, domain, max_results=max_per_domain)
        if 'results' in r and r['results']:
            all_results[domain] = r['results']
    return all_results
