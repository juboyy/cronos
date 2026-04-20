# UX/UI Audit: Cronos Home + Search Pages (Round 1)

## 1. Page: Home / Intelligence Feed (`/`)
**Overall UX Score: 8/10**

### Audit Checklist Results
- [x] **Color Contrast:** Navy/Black background with high-contrast text (`#ebf0e6` approx) is excellent for readability. Signal colors (Green/Red) are well-saturated.
- [x] **Typography Hierarchy:** Uses a mix of Serif (Instrument Serif) for headings and Mono (IBM Plex Mono) for data/labels. Clear distinction.
- [x] **Spacing Consistency:** 40px gaps between major sections; 16-20px padding in cards. Very consistent.
- [x] **Component Alignment:** Grid-based layout with a clear 1fr + clamp sidebar.
- [x] **Empty States:** Graceful handling of empty feed with a "∅" icon and instruction.
- [x] **Loading States:** Uses entrance animations (`stagger` class) to mask data fetching.
- [x] **Responsive Behavior:** CSS includes a comprehensive `@media (max-width: 768px)` block that handles grid collapse.
- [x] **Visual Noise:** Cyberpunk/Terminal aesthetic is clean. Minimal use of borders; mostly background-color elevation.
- [x] **Information Density:** High, but scannable due to mono-labels and visual dots.
- [x] **Interaction Affordances:** Links have `interactive` class with hover states.

### Issues & Improvements
| Category | Severity | Issue | Specific Fix |
| :--- | :--- | :--- | :--- |
| Accessibility | Low | Inline styles for sentiment dots lack ARIA labels | Add `aria-label` or `title` to the `SentimentDot` span. |
| Interaction | Medium | Sticky sidebar can overlap footer | Ensure the sidebar container has a `max-height` or use a more robust `sticky` implementation. |
| Performance | Low | Dynamic fetch on every load | Implement `revalidate` strategy more aggressively for macro ribbon data. |

### Concrete Changes Needed
- **File:** `src/app/page.tsx`
  - Wrap `SentimentDot` in a `div` with a tooltip or add `title={score}` to the dot itself.
  - Update `sidebar-sticky` class in `globals.css` to include `max-height: calc(100vh - 100px); overflow-y: auto;`.

---

## 2. Page: Search (`/search`)
**Overall UX Score: 7/10**

### Audit Checklist Results
- [x] **Color Contrast:** Consistent with design system.
- [x] **Typography Hierarchy:** Search input uses Mono; results use a mix. Clear.
- [x] **Spacing Consistency:** Consistent with home page.
- [x] **Component Alignment:** Result tabs are well-aligned.
- [x] **Empty States:** Integrated "◈" icon for landing state.
- [x] **Loading States:** "◈" pulse animation used.
- [ ] **Responsive Behavior:** The Entity Graph (SVG) might have issues on very small screens (fixed 800x500 viewBox).
- [x] **Visual Noise:** Graph view is clean but can become busy with 50+ nodes.
- [x] **Information Density:** Good use of tabs to manage density.
- [x] **Interaction Affordances:** Buttons have clear active states (accent color underline).

### Issues & Improvements
| Category | Severity | Issue | Specific Fix |
| :--- | :--- | :--- | :--- |
| Mobile | High | Entity Graph SVG fixed aspect ratio | Use a more responsive SVG container or disable graph on mobile. |
| Navigation | Medium | Search input doesn't auto-focus | Add `autoFocus` attribute to the input element. |
| Visual | Medium | Graph node text can be small | Increase label font size in the hovered state overlay. |

### Concrete CSS/Component Changes Needed
- **File:** `src/app/search/page.tsx`
  - Add `autoFocus` to the search `<input>`.
  - Update `EntityGraph` to use a relative width or handle resize events.
  - In `globals.css`, add:
    ```css
    @media (max-width: 640px) {
      .graph-container { display: none; } /* Fallback to list view */
    }
    ```

---

## Priority-Ordered Fix List
1. **[High]** Fix Search SVG responsiveness/mobile fallback.
2. **[Medium]** Add `autoFocus` to Search input.
3. **[Medium]** Add tooltips/ARIA labels to Sentiment dots on Home.
4. **[Low]** Refine sticky sidebar height constraints to prevent footer overlap.
5. **[Low]** Increase graph label font sizes for better readability.
