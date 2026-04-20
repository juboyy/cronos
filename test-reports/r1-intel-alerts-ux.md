# UX/UI Audit: Cronos Intelligence + Alerts Pages (Round 1)

**Date:** 2026-04-20
**Scope:** Intelligence and Alerts pages of Cronos 2.0.
**Theme:** Dark (Navy/Black), Gold/Amber accents, Monospace fonts, Terminal aesthetic.

---

## 1. Intelligence Page (`/intelligence`)
**UX Score: 8.5/10**

### Checklist Evaluation:
- **Color Contrast:** 🟢 High. Uses `hsl(60 10% 92%)` for primary text on `hsl(225 15% 3.5%)` background (~16:1 ratio), well above WCAG AA 4.5:1.
- **Typography Hierarchy:** 🟢 Strong. Uses `Instrument Serif` for headers and `IBM Plex Mono` for data. Clear distinction between entity types, signal strengths, and metadata.
- **Data Visualization:** 🟡 Mixed. 
    - `SignalBar` is clear and color-coded.
    - `SentimentDot` uses icons (▲/▼/●) + numbers, which is scannable.
    - *Issue:* Correlation cards can become very long when expanded if there are many sources, potentially breaking page flow.
- **Information Density:** 🟢 Excellent. High density (tabular feel) without feeling cluttered.
- **Loading/Empty States:** 🟢 Handled. Specific messages for 0 correlations/clusters/briefings.

### Issues & Fixes:
| Category | Issue | Fix |
| :--- | :--- | :--- |
| **Interactive** | Expanded source list has no max-height or scroll, can push content too far down. | In `IntelligenceDashboard.tsx`, wrap source list in a div with `max-height: 200px` and `overflow-y: auto`. |
| **Visual** | `SignalBar` uses hardcoded colors (`var(--red)`, `var(--accent)`) instead of global tokens consistently. | Change `color` logic in `SignalBar` to use `--signal-up`, `--signal-down`, or `--accent`. |
| **Mobile** | Cards use fixed gap `24px` which might be too wide for small screens. | Update `display: flex` gap to use `clamp(12px, 2vw, 24px)`. |

---

## 2. Alerts Page (`/alerts`)
**UX Score: 7.0/10**

### Checklist Evaluation:
- **Color Contrast:** 🟢 High. Consistency with the global theme.
- **Typography Hierarchy:** 🟡 Good, but the Create Form uses `var(--font-display)` (Space Grotesk) which contrasts slightly with the mono-heavy list view below it.
- **Data Visualization:** 🟢 Excellent. `Sparkline` component adds high-value temporal context in a very small space (40px width).
- **Information Density:** 🟢 High. The grid layout `10px 1fr auto 100px 60px 80px` is very efficient for desktop.
- **Loading/Empty States:** 🟢 Handled with themed empty states.
- **Interactive Affordances:** 🔴 Major Issue. The "Create Form" uses `grid-template-columns: 1fr 1fr 1fr` without a media query, which will break on mobile devices.

### Issues & Fixes:
| Category | Issue | Fix |
| :--- | :--- | :--- |
| **Responsiveness** | `form` uses fixed 3-column grid. | Change to `grid-template-columns: repeat(auto-fit, minmax(200px, 1fr))`. |
| **Consistency** | Form inputs use `Space Grotesk` while data uses `IBM Plex Mono`. | Set `font-family: var(--font-mono)` on form inputs to match the terminal aesthetic. |
| **Visual** | `Sparkline` uses a hardcoded spike logic that might misrepresent data if not carefully bound to actual history. | (Design) Ensure sparkline paths are generated from normalized data arrays rather than random offsets. |
| **UX** | "Sinal" and "Consenso" in Intelligence use different color logic than "Sentiment" in Alerts. | Unify signal colors (`var(--signal-up/down)`) across both dashboards. |

---

## 3. Component Consistency
**Score: 8/10**

- **Shared Tokens:** Both pages leverage `globals.css` tokens effectively.
- **Tab Pattern:** Consistent use of the underline-tab pattern for sub-navigation.
- **Interaction:** Hover states on cards are consistent (border color change).

**Recommendation:** Unify the "TimeAgo" logic. `IntelligenceDashboard.tsx` and `AlertsPage` (in `page.tsx`) have separate implementations of time formatting. Move to a shared utility `lib/utils.ts`.

---

## 4. Summary of Concrete Fixes (Tailwind/CSS)

### File: `IntelligenceDashboard.tsx`
- **Source List Scroll:**
  ```tsx
  // Around line 105
  <div style={{ marginTop: '12px', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', maxHeight: '200px', overflowY: 'auto' }}>
  ```

### File: `alerts/page.tsx`
- **Responsive Form:**
  ```tsx
  // Around line 185
  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  ```
- **Input Font:**
  ```tsx
  // In S.input (line 12)
  fontFamily: 'var(--font-mono)', // Change from var(--font-display)
  ```
