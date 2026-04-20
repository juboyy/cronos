# UX/UI Audit: Cronos Impact & Patterns Pages (Round 1)

## Summary
The Cronos interface follows a high-density, terminal-inspired aesthetic. While functionally rich, there are several "last mile" UX issues related to data formatting, typographic hierarchy, and interactive visual cues.

---

## Page: Impact Analysis (`/impact`)
**UX Score: 7/10**

### Findings
1.  **Missing Data Representation:** The `delta_5d` column correctly uses a "—" for null values (as seen in the `Delta` component), but the text color is slightly too similar to background tokens in some conditions.
2.  **Color Overload:** The entity ranking cards use dynamic `hsl` backgrounds and borders. The logic `r.avgScore > 0.5 ? 0 : r.avgScore > 0.3 ? 45 : 150` creates high-contrast red/yellow/green alerts that might be too aggressive for a "cyberpunk" neutral aesthetic.
3.  **Typography:** The headers are using `var(--font-serif)` while data uses `var(--font-mono)`. The jump between 1.75rem serif and 0.625rem mono labels is sharp.
4.  **Table Scanability:** The headline text uses `text-overflow: ellipsis` but doesn't provide a tooltip or expandable row. Long headlines are cut off without a way to read them.

### Priority Fixes
| Category | Issue | Fix | Priority |
| :--- | :--- | :--- | :--- |
| **Typography** | Headlines in table are too truncated | Increase max-width or implement a subtle hover reveal. | Medium |
| **Visuals** | Ranking bar colors too "traffic-light" | Shift colors to a more sophisticated gold/amber/slate palette. | Low |
| **Interaction** | No sorting on table headers | Add `onClick` handlers to sort by Δ 1d, Δ 5d, or Score. | High |

---

## Page: Patterns (`/patterns`)
**UX Score: 6/10**

### Findings
1.  **Sample Article Quality:** Some patterns show sample articles with irrelevant news (e.g., Netflix series, BBB 26) correlating with financial assets. This is a data noise issue that reflects as a UX "trust" issue.
2.  **Layout Density:** The grid columns `100px 1fr auto` lead to text wrapping issues on smaller screens.
3.  **Visual Hierarchy:** The asset ticker (e.g., `RADL3`) is clearly separated, but the pattern types (e.g., `general`, `sentiment_direction`) use very small 0.5625rem text which is hard to read.
4.  **Empty Data:** The `σ %` in the stats column indicates missing values or division by zero in the logic (should show "—").

### Priority Fixes
| Category | Issue | Fix | Priority |
| :--- | :--- | :--- | :--- |
| **Data Viz** | Missing standard deviation shows `%` | Fix `p.std_dev?.toFixed(2)}%` to handle nulls in `PatternsPage`. | High |
| **Responsive** | Fixed grid widths | Change `100px 1fr auto` to a more flexible layout on mobile. | Medium |
| **Hierarchy** | Asset section separators | Increase padding and weight of the asset-level header. | Medium |

---

## Concrete Fix List

### 1. Fix Missing StdDev in `patterns/page.tsx`
**File:** `/home/node/.openclaw/workspace/cronos/web/src/app/patterns/page.tsx`
```tsx
// Change:
<div style={{ ...S.mono, fontSize: '0.625rem', color: 'var(--text-muted)', marginTop: '2px' }}>
  σ {p.std_dev?.toFixed(2)}%
</div>

// To:
<div style={{ ...S.mono, fontSize: '0.625rem', color: 'var(--text-muted)', marginTop: '2px' }}>
  σ {p.std_dev != null ? `${p.std_dev.toFixed(2)}%` : '—'}
</div>
```

### 2. Improve Header Scannability in `impact/page.tsx`
**File:** `/home/node/.openclaw/workspace/cronos/web/src/app/impact/page.tsx`
- Increase the visibility of the "Index of Exposure" labels.
- Add `cursor: pointer` to table rows to indicate they are interactive (even if they don't have detail views yet).

### 3. Polish "Traffic Light" colors
**File:** `/home/node/.openclaw/workspace/cronos/web/src/app/impact/page.tsx`
Modify the `hsl` logic to use the `Cronos` gold accent (`hsl(45 75% 50%)`) for high impact instead of pure red.
