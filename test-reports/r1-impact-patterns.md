# Test + UX Audit: Cronos Impact + Patterns (Round 1)
Date: 2026-04-20
Status: **WARN** (Data hygiene and encoding issues)

---

## 1. Impact Page Analysis (`/impact`)

### Web Fetch Analysis
- **Status:** PASS (Functional)
- **Data Presence:** 40 correlations, ranking entities (PETR3, PETR4, BBAS3, etc.) and impact table are visible.
- **Encoding Issues:** 
    - **MAJOR:** "dividendos de R$ 8,1 bilhes" (instead of "bilhões").
    - **MAJOR:** "Operao resgata idoso em condies apontadas como anlogas  escravido" (multiple mojibake chars).
- **Missing Data Handling:** Several Δ 5d values are showing "—" (null handling works, but indicates sparse data).

### Source Code Analysis (`cronos/web/src/app/impact/page.tsx`)
- **Error Handling:** 
    - **MAJOR:** `getData()` uses `supabaseQuery` but lacks a `try/catch` block or a global error boundary check.
- **UX/Design:**
    - **Status:** PASS
    - Information density is high but structured.
    - `ImpactBar` provides good visual cues for score intensity.
- **Accessibility:** 
    - **MINOR:** Grid layout and interactive divs lack ARIA roles/labels for screen readers.
- **Missing States:** Loading state is handled by Next.js (likely `loading.tsx`), but if `impacts.length === 0`, it shows an empty state (PASS).

---

## 2. Patterns Page Analysis (`/patterns`)

### Web Fetch Analysis
- **Status:** FAIL (Data Hygiene)
- **Data Presence:** 50 patterns found across tickers.
- **Data Quality:**
    - **CRITICAL:** High noise in pattern-article correlation.
    - *Example:* `earnings` patterns for `RADL3` and `BBAS3` are linked to "BBB 26", "Netflix series", and "Exercise" articles. This indicates a failure in the news filtering/categorization pipeline.
    - **MAJOR:** Mojibake present: "Cremer obtm direito", "Vorcaro j usava".
- **Structural Issues:** "σ %" showing in several places, suggesting `std_dev` is undefined or null but the `%` symbol is hardcoded.

### Source Code Analysis (`cronos/web/src/app/patterns/page.tsx`)
- **Error Handling:** 
    - **MAJOR:** `getData()` lacks `try/catch`.
- **Logic Bugs:**
    - **MAJOR:** `std_dev?.toFixed(2)}%` results in `undefined%` or `null%` if value is missing. Rendered as "σ %" in UI.
- **UX/Design:**
    - **Score: 6/10**
    - Typography is consistent (Inter + Mono).
    - **MAJOR UX Issue:** The mismatch between pattern types (e.g., `acquisition`) and unrelated sample titles ("O que explica os ingressos caros da Copa") creates a "broken" feeling.

---

## 3. Combined Findings Summary

| Page | Status | UX Score | Critical Issues |
| :--- | :--- | :--- | :--- |
| `/impact` | **WARN** | 8/10 | Mojibake in article titles. |
| `/patterns`| **FAIL** | 5/10 | Data hallucination (unrelated news linked to patterns), mojibake, malformed stats display. |

### Severity: Critical
- **[Data Pipeline]** News-to-Pattern correlation is producing nonsensical results (BBB 26 linked to Earnings).
- **[Encoding]** Mojibake (``) across both pages in Brazilian Portuguese text.

### Severity: Major
- **[Patterns Page]** Missing standard deviation values show as "σ %".
- **[Error Handling]** Missing `try/catch` in data fetching logic.

---

## 4. Concrete Fixes

### File: `cronos/web/src/app/patterns/page.tsx`
- **Fix "σ %":** Change `{p.std_dev?.toFixed(2)}%` to `{p.std_dev != null ? `${p.std_dev.toFixed(2)}%` : '—'}`.
- **Fix Title Overflows:** The sample article titles use `whiteSpace: 'nowrap'`, which might overflow on small mobile screens even with `overflow: 'hidden'`.

### File: `cronos/web/src/app/impact/page.tsx`
- **Fix Null Deltas:** Ensure `Delta` component handles `undefined` explicitly (currently handles `null`).

### Global/Backend (Pipeline)
- **Fix Mojibake:** Ensure database connection or scraping layer uses `UTF-8`.
- **Fix Pattern Relevance:** Update the Scorer/Pattern detector to filter out "general" or non-financial news from specific categories like `earnings` or `acquisition`.
