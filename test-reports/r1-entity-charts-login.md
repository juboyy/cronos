# Audit Report: Entity, Charts, & Login Pages (Round 1)
Date: 2026-04-20
Status: Mixed (PASS/WARN)

## 1. Summary Table

| Page | Route | Status | UX Score | Key Findings |
| :--- | :--- | :--- | :--- | :--- |
| **Entity Page** | `/entity/[id]` | **WARN** | 8/10 | Robust data fetching, good visuals (Sparklines/Heatmap), but missing aria-labels and uses inline styles. |
| **Charts Page** | `/charts` | **PASS** | 9/10 | Clean implementation of TradingView, responsive quick-select. Minor SSR hydration risk (handled with dynamic). |
| **Login Page** | `/login` | **WARN** | 7/10 | Functional auth flow, but lacks form accessibility (labels not linked to inputs) and basic UI feedback for loading. |

---

## 2. Page Analysis

### Entity Page (`/entity/[id]/page.tsx`)
**Status:** **WARN** | **UX Score:** 8/10

#### Checklist Results:
- **Data Presence:** PASS. Fetches articles, prices, and impacts in parallel. Handles "Not Found" state.
- **Portuguese Encoding:** PASS. Uses `pt-BR` locale for date formatting and correctly handles PT characters in UI text.
- **Error Handling:** PASS. Explicit check for `!entity` with a recovery link.
- **Loading States:** WARN. It's a server component (`force-dynamic`), but there is no `loading.tsx` visible in the directory structure for this route.
- **Accessibility:** FAIL. `SentimentDot` and `Sparkline` (SVG) lack `role="img"` or `aria-label`.
- **Layout/Mobile:** PASS. Uses `flex-wrap: wrap` and `max-width`.
- **UX:** Excellent typography and spacing. Use of `hsl` for dynamic sentiment coloring is a nice touch.

#### Issues:
1. **[LOW] Accessibility:** SVGs and sentiment indicators are decorative only to screen readers.
2. **[LOW] Maintenance:** Heavy use of inline styles instead of Tailwind/CSS modules.

#### Concrete Fixes:
- **Path:** `/cronos/web/src/app/entity/[id]/page.tsx`
- **Change:** Add `aria-label` to the Sparkline SVG and `aria-hidden="true"` to decorative dots.
- **Change:** Implement a `loading.tsx` in the same directory to handle the dynamic fetch period.

---

### Charts Page (`/charts/page.tsx`)
**Status:** **PASS** | **UX Score:** 9/10

#### Checklist Results:
- **Data Presence:** PASS. Real-time data via TradingView.
- **SSR Issues:** PASS. Correctly uses `dynamic(() => ..., { ssr: false })` for the widget.
- **Layout/Mobile:** PASS. Grid/Flex wrap handles the quick-select buttons well.
- **UX:** Simple, focused. The `POPULAR_TICKERS` list provides immediate value.

#### Issues:
1. **[LOW] Feedback:** Form submission doesn't provide visual feedback if a ticker is invalid (though TradingView widget usually handles the "not found" state internally).

---

### Login Page (`/login/page.tsx`)
**Status:** **WARN** | **UX Score:** 7/10

#### Checklist Results:
- **Auth Flow:** PASS. Handles both login and signup modes with a shared API endpoint.
- **Error Handling:** PASS. Catches fetch errors and displays them in a styled div.
- **Accessibility:** FAIL. Labels are just `<div>` or `<label>` without `htmlFor`. Inputs lack unique IDs. Screen readers won't associate labels with inputs.
- **UX:** Contrast is good, but "loading" state is just `...` which is a bit minimal.

#### Issues:
1. **[MEDIUM] Accessibility:** Fix label association.
2. **[LOW] UX:** Add a proper spinner or disable inputs during `loading`.

#### Concrete Fixes:
- **Path:** `/cronos/web/src/app/login/page.tsx`
- **Change:**
```tsx
// From:
<label style={S.label}>Email</label>
<input type="email" ... />

// To:
<label htmlFor="email" style={S.label}>Email</label>
<input id="email" type="email" ... />
```

---

## 3. Recommended Global Fixes

1. **Accessibility Audit:** Run a global scan for `aria-label` on all SVG components.
2. **Style Consolidation:** Move the `S` object in `login/page.tsx` to a CSS module or use Tailwind to reduce component size and improve performance.
3. **Skeleton Screens:** Add `loading.tsx` for `/entity/[id]` to improve perceived performance.
