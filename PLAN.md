# Production Audit Plan

## Phase 1: Bug Fixes & Safety
1. Fix `filterKols` — sorting mutates input array (spread before sort)
2. Fix graph traversal — use `Set<string>` instead of `Array.includes()`
3. Fix `wrapLabel` line-break logic bug
4. Guard against zero/negative dimensions in EventGraph
5. Clamp engagement rate visualization in KolNode

## Phase 2: Code Organization — Split Large Files
6. Split `utils/index.ts` (651 lines) → `utils/layout.ts`, `utils/graph.ts`, `utils/format.ts`, `utils/filter.ts`, `utils/emoji.ts`
7. Split `hooks/index.ts` (490 lines) → `hooks/useAnimation.ts`, `hooks/usePanZoom.ts`, `hooks/useFilters.ts`, `hooks/useSelection.ts`, `hooks/useGraphData.ts`, `hooks/useApi.ts`
8. Re-export from barrel `utils/index.ts` and `hooks/index.ts` — public API unchanged

## Phase 3: Constants & Configuration
9. Extract all magic numbers into named constants at file tops
10. Move hardcoded colors from components (AnchorNode, NarrativeNode, SvgPrimitives, CuiBonoPanel) into theme
11. Extract layout constants (HEADER_HEIGHT, FILTER_HEIGHT, etc.) into LayoutConfig

## Phase 4: Accessibility & Animations
12. Add `prefers-reduced-motion` support — disable SVG animations when user prefers
13. Add missing ARIA attributes on SVG interactive elements
14. Add `aria-pressed` to filter toggle buttons in TopBars

## Phase 5: API Client Hardening
15. Fix dynamic type imports → proper top-level imports
16. Add request deduplication for concurrent identical requests
17. Make cache config (size, TTL) part of ApiConfig

## Phase 6: CI/CD & Developer Experience
18. Add GitHub Actions workflow: lint + typecheck + test + build
19. Add eslint-plugin-react-hooks rules
20. Update AUDIT.md with findings

## Non-goals (out of scope)
- Storybook / visual regression (separate initiative)
- i18n / localization
- Adding new features
