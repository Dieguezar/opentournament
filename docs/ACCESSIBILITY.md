# Accessibility

## Standard

The web interface targets **WCAG 2.1 AA**. Accessibility is part of acceptance criteria, not a release-afterthought.

## Principles

1. **Perceivable:** AA contrast, meaningful alternatives, and no color-only meaning.
2. **Operable:** complete keyboard access, visible focus, and no keyboard traps.
3. **Understandable:** declared language, consistent navigation, and clear form errors.
4. **Robust:** semantic HTML first; ARIA only when native semantics are insufficient.

## Critical areas

### Brackets

- Provide an accessible ordered representation of rounds and matches.
- Keep the visual bracket horizontally scrollable inside a labeled focusable region.
- Preserve visible connector contrast in light and dark themes.
- Expose winner, loser, and match state in text, not color alone.
- Announce meaningful confirmed-result changes without overwhelming the user.

### Forms

- Associate every label through native `label`/input relationships.
- Connect help and errors with `aria-describedby`.
- Use inline errors and focus the first invalid field.
- Announce loading and successful completion when a visual update alone is insufficient.

### Live updates

- Use polite live regions for important SSE state changes.
- Respect `prefers-reduced-motion`.
- Do not communicate critical state through animation.

### PWA and responsive behavior

- Installation instructions and icons need accessible names.
- Read-cache behavior must not break keyboard navigation.
- Intentional bracket/tab overflow stays inside its own labeled region.
- The layout must remain usable from a 360 px viewport.

## Verification

- Automated `@axe-core/playwright` checks on representative public and authenticated routes.
- Browser keyboard traversal.
- Manual screen-reader smoke with NVDA on Windows or VoiceOver on macOS/iOS.
- Light, dark, forced-colors, and reduced-motion review when relevant.
- Lighthouse as a diagnostic aid, not the sole accessibility test.

## Pull request checklist

Every UI change should confirm:

- [ ] Keyboard path is complete.
- [ ] Focus is visible and returns sensibly after dialogs/actions.
- [ ] Labels, names, and error relationships are correct.
- [ ] Contrast meets AA.
- [ ] Live updates are understandable without motion.
- [ ] Spanish and English copy preserve the same accessible meaning.
