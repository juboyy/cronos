# Round 1 — Consolidated Findings

## Scores
| Page | Test | UX | Key Issues |
|------|------|----|------------|
| Home/Feed | WARN | 8/10 | Encoding (CRITICAL), favicon 404 |
| Search | PASS | 7/10 | Mobile graph scaling, no autofocus |
| Briefing | WARN | — | Data presence OK, encoding in content |
| Intelligence | PASS | 8.5/10 | Card overflow, TimeAgo duplication |
| Alerts | PASS | 7/10 | Form responsiveness, font inconsistency |
| Impact | WARN | 7/10 | Red/green off-theme, headline truncation |
| Patterns | WARN | 6/10 | Null std_dev display ("σ %"), noisy correlations |
| Entity | WARN | 8/10 | Missing loading.tsx, SVG accessibility |
| Charts | PASS | 9/10 | Minor: no invalid ticker feedback |
| Login | WARN | 7/10 | Label accessibility, minimal loading state |
| MiroFish | WARN | 7/10 | API root 404 (fixed), no-cors false positive (fixed) |
| BettaFish | FAIL | 4/10 | Port 8001 timeout, tab routing |
| Simulate | PASS | 9/10 | Clean implementation |

## Critical Fixes (Round 2)
1. ✅ **Encoding** — crawler base.py fixed (charset detection + latin-1 fallback)
2. ✅ **MiroFish page** — health check + status dashboard refactored
3. **Null handling** — patterns std_dev, impact delta_5d
4. **Accessibility** — login labels, SVG aria-labels, sentiment dots
5. **Color theme** — red/green → gold/slate/amber on impact
6. **Responsive** — alerts form, search graph
7. **Loading states** — entity loading.tsx, login spinner
8. **Shared TimeAgo** — extract from intel + alerts
9. **Favicon** — add to public/
10. **BettaFish tabs** — map to real sub-engine paths

## Already Fixed During R1
- ✅ Crawler encoding (base.py)
- ✅ MiroFish page.tsx (health check + status)
- ✅ Type consolidation (~25 `any` removed)
- ✅ AI slop cleanup (~12 files)
