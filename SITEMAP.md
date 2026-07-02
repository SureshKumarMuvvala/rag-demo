# Site map — Excel line items → where they show in the UI

How each monthly cost from the team's Excel model (`rag_tco_calculator.xlsx`, Saarthi
Phase‑3 pilot) maps onto the web app. The **default scenario is now tuned to the Excel**, so the
landing estimate lines up.

Excel figures are INR @ **95.32**; the app converts USD @ **95.1** (the "illustrative rate"
stamp), so ~0.2% of every line is just the rate.

**App monthly total ≈ ₹14,887**  vs  **Excel ₹15,007.63** (within 0.8%).

---

## 1. UI structure (the "site map")

The app is a **single page** (`Estimate`) with two panes:

```
RAG · TCO  (Hero)
└── Estimate
    ├── LEFT — config sections (INPUTS)
    │     1. Corpus            → documents, avg pages [more: tokens/page, chunk size,
    │                             overlap, duplicate chunks, new docs/mo, ingestion detail]
    │     2. Traffic           → requests/mo, output tokens [more: top‑K, pool, system
    │                             prompt, query tokens, sessions, conversation history,
    │                             Safety / moderation]
    │     3. Embedding model   → embedding model tile
    │     4. Vector database   → vector DB tile
    │     5. Reranking         → reranker tile (default: custom "Cohere Rerank v3")
    │     6. Generation model  → cheap tiles [+ premium disclosure] (default: custom "GPT‑4o mini")
    │     7. Prompt Caching    → cache TTL, prompt‑cache hit, semantic cache
    │     8. Network           → cloud provider [more: cross‑region / NAT / AZ]
    │     9. People, Tooling & Misc → team size, loaded cost/engineer, maintenance
    │                             fraction [more: Infrastructure/mo, misc lines]
    │
    └── RIGHT — "Live estimate" Summary panel (OUTPUT buckets)
          Monthly · / year · one‑time setup · 1 USD = ₹95.1
          Inference · Reranking · Vector DB · Embedding · Re‑indexing ·
          App & compute infra · Network · Engineering labor · Safety / moderation · Misc
```

Every Excel line lands in one **Summary bucket** (right) driven by inputs in a **section** (left).

---

## 2. Excel line → UI mapping (now matched)

| Excel line item | Excel ₹ | UI Summary bucket | Driven by (section) | UI ₹ | Match |
|---|---:|---|---|---:|:--:|
| Cloud Infrastructure Cost | 9,341.36 | **App & compute infra** | People… → Infrastructure/month = **$98** | 9,320 | ✅ |
| Vector DB Cost | 2,859.60 | **Vector DB** | Vector database (pgvector $30) | 2,853 | ✅ |
| Reranking Cost | 1,029.46 | **Reranking** | Reranking → custom **$1.80 / 1k** | 1,027 | ✅ |
| LLM Input + Output Cost | 894.70 | **Inference** | Generation → custom **$0.15 / $0.60** + Traffic + Caching | 849 | ✅≈ |
| Safety Moderation Cost | 781.36 | **Safety / moderation** | Traffic → Safety/moderation ($0.15/1M) | 738 | ≈ |
| Monthly New Docs Ingestion Cost | 89.72 | **Re‑indexing** | Corpus → new docs/mo + ingestion detail (re‑index frac = **0**) | 89.5 | ✅ |
| Monthly Query Embedding Cost | 11.44 | **Embedding** | Embedding model + Traffic query tokens | 11.4 | ✅ |
| *(one‑time)* corpus ingestion + embedding | — | **one‑time setup** (under the total) | Corpus | 4,475 | — |

The app shows **Inference** = **LLM Input + Output** in one bucket (the Excel splits them).

---

## 3. What was baked into the default to match the Excel

| Line | Change applied (all still editable) |
|---|---|
| Cloud Infrastructure $98 | `infraMonthly` default 90 → **98** |
| LLM pricing | default generation seeded to a **custom "GPT‑4o mini" ($0.15/$0.60)** override |
| Reranking | default reranker seeded to a **custom "Cohere Rerank v3" ($1.80/1k)** override |
| Re‑indexing | `reindexFreq` default → **0** (monthly = new‑docs ingestion only) |
| Cache write | `cacheTTL` default 1‑hour → **5‑min** (drops the large 1‑hour cache‑write surcharge) |
| Embedding | monthly **Embedding** bucket switched to **per‑query** embedding; the one‑time corpus embedding now lives only in **one‑time setup** (not amortized into monthly) — matches the Excel |

Every one of these is a normal editable input/tile, so choosing a real generation model, changing
the rerank rate, or editing infra reverts to the standard values.

---

## 4. The remaining ~0.8%

App ₹14,887 vs Excel ₹15,007.63 (−₹120). It's two small token‑count assumptions plus the rate:
- **Inference** −₹46 and **Moderation** −₹44: the Excel appears to count a few hundred more
  input/safety tokens per query than the app's `system prompt + retrieved + query + history`.
- **Rate** −₹30: 95.1 (app) vs 95.32 (Excel) across infra/vector/reranking.

These are within illustrative rounding. Paste the Excel's exact per‑query input‑token count and I
can align the last two lines too.
