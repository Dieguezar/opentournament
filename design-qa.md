# OpenTournament visual identity — Design QA

## Comparison target

- Source visual truth:
  - `design/openpencil/OpenTournament-Brand-System.fig`
  - `design/openpencil/preview-navigation.png` — 1440 × 1420 px
  - `design/openpencil/preview-buttons.png` — 1440 × 1600 px
  - `design/openpencil/preview-fields-badges.png` — 1440 × 1750 px
  - `design/openpencil/preview-cards.png` — 1440 × 1500 px
  - `design/openpencil/preview-match-cards.png` — 1440 × 1700 px
- Rendered implementation:
  - `artifacts/brand-implementation-desktop-light.png` — 1440 × 999 px
  - `artifacts/brand-implementation-desktop-dark-final.png` — 1440 × 999 px
  - `artifacts/brand-implementation-login-light-final.png` — 1440 × 999 px
  - `artifacts/brand-implementation-login-dark-focus.png` — 1440 × 999 px
  - `artifacts/brand-implementation-mobile-light-final.png` — 390 × 844 px
- Combined comparison evidence:
  - `artifacts/brand-design-qa-comparison.png`
  - `artifacts/brand-design-qa-header-focused.png`

## Viewport and state

- Desktop CSS viewport: 1440 × 1000 px; browser DPR 1.1. Browser screenshots were normalized to the CSS width and saved at 1440 × 999 px.
- Mobile CSS viewport: 390 × 845 px; final screenshot is 390 × 844 px.
- States checked: guest navigation, API-unavailable badge, Spanish copy, light theme, dark theme, login form, keyboard focus styling, and responsive guest navigation.
- The source is a component specification rather than a full product screen. Comparisons therefore use matching component state, dimensions, color theme, and density instead of judging unrelated page composition or dynamic copy.

## Full-view comparison evidence

- The combined board/product comparison confirms Inter hierarchy, the official O + bracket asset, palette, restrained radii, 1 px borders, 24 px panel padding, primary/secondary actions, and 44 px form controls.
- Light and dark product captures use the approved canvas, surface, border, text, primary, semantic status, and control tokens.
- Real OpenPencil exports are used for the logo and app icons. No CSS drawing, emoji, text glyph, inline SVG, or approximate replacement is present.
- App-specific copy remains functional and coherent. Differences from the component board—language/theme controls, API status, and actual authentication labels—are intentional product content, not visual drift.

## Focused comparison evidence

- `artifacts/brand-design-qa-header-focused.png` compares the 1296 × 88 px light guest header directly. The implementation renders a 1296 px inner frame, 88.9 px header, 82 × 40 px symbol, 18 px wordmark, and 18 px logo-to-wordmark gap.
- Rendered control measurements:
  - Header small actions: 32 px high, 5 px radius, 13 px semibold.
  - Primary buttons: 40 px high, 5 px radius, 14 px semibold.
  - Inputs: 44 px high, 5 px radius, 14 px text.
  - Focus: 2 px primary outline with visible separation.
  - Badges: 28 px high, 4 px radius, 12 px semibold.
  - Cards and match cards: 6 px radius with 1 px semantic border.
- Focused dark-form evidence confirms the approved dark control background and blue focus treatment without clipping or halo artifacts.

## Findings

No actionable P0, P1, or P2 visual differences remain.

- P3 test gap: authenticated navigation and data-populated tournament/match screens could not be opened with live data because the local API was unavailable. Their shared tokens and component CSS were audited and aligned, but a future end-to-end pass with a seeded session would add runtime evidence for those dynamic states.
- Development-only Next.js tooling appears in preview screenshots; it is not part of the application UI.

## Comparison history

### Iteration 1

- [P1] Mobile navigation overflowed horizontally.
  - Evidence: `artifacts/brand-implementation-mobile-light.png` rendered a 570 px document inside a 390 px viewport.
  - Fix: made the action group occupy the available width and wrap while preserving 32 px controls and the compact symbol.
  - Post-fix evidence: `artifacts/brand-implementation-mobile-light-final.png` renders document and body widths at exactly 390 px with no horizontal overflow.
- [P2] Focused authentication forms were too wide and lost the compact field rhythm from the source.
  - Evidence: `artifacts/brand-implementation-login-light.png` rendered the initial login card at 1200 px.
  - Fix: applied the existing 760 px narrow content container to login, registration, verification, organization, and team forms.
  - Post-fix evidence: `artifacts/brand-implementation-login-light-final.png` renders a 760 px main container and 720 px card while retaining 44 px controls.

### Iteration 2

- Rechecked desktop light, desktop dark, mobile light, and dark focused-input states.
- Confirmed no overflow, no console errors, correct theme-specific logo variant, and exact shared component geometry.
- No actionable P0/P1/P2 findings remained.

## Verification

- Web tests: 16 files, 90 tests passed.
- TypeScript: passed.
- ESLint: passed.
- Browser console: no warnings or errors in the checked flows.
- Build intentionally not run, per project instruction.

final result: passed

## OBS broadcast implementation — 2026-09-05

- Reference: approved `exec-cbede236-67ff-443e-8250-8ff8290df595.png` (1672 x 941, 16:9), interpreted on the required 1920 x 1080 OBS canvas.
- Browser evidence: in-app browser at 1920 x 1080; full-frame screenshots and DOM readback of cocodemo scoreboard, Up Next, Champion empty state, and Copa Nexo completed state. Source and implementation were visually inspected in the task; screenshots are retained in the conversation, not saved as local evidence files.
- Typography: Inter-based bold names and tabular score digits; smaller round/status labels. Brand symbol uses the original project PNG, not the generated imitation.
- Layout: mirrored top scoreboard, center tournament context, bottom-right next match. Fixed canvas required for OBS, not a responsive website. Slanted panel treatments preserve the selected direction.
- Colors: explicit OpenTournament blue/white/charcoal independent of website light mode. No pink/violet leftovers.
- Content: real names and public match state replace illustrative data. The API does not expose best-of or semifinal labels, so these are not fabricated. Null scores show a dash; scheduled matches are not labeled live. Champion remains a compatible optional route, not a newly implemented intermission state machine.
- Transparency: computed HTML/body/wrapper/canvas backgrounds all rgba(0,0,0,0). Next development indicator is hidden only on OBS routes. No user match data was mutated.
- P3 visual follow-up: perimeter texture and elaborate corner trim from the mock are simplified/omitted. A generated decorative asset had baked-in opaque checkerboard and was rejected rather than compromising alpha.
- Checks: 14 focused overlay/live-controller tests passed; web typecheck and scoped ESLint passed. Native OBS playback/reconnection was not rerun in this design pass.

final result: passed
