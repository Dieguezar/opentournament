# Archive Report: tournament-experience-v1-2

## Outcome

- **Status:** Complete
- **Archived on:** 2026-09-05
- **Artifact store:** OpenSpec (repo-local)
- **Archived path:** `openspec/changes/archive/2026-09-05-tournament-experience-v1-2/`
- **Candidate product/evidence HEAD:** `c11606aa61160b13810d890110c7899a0f6f08ca`
- **Tasks:** 19/19 complete; no unchecked implementation task remained
- **Critical issues:** None
- **Final verification verdict:** PASS WITH WARNINGS at archive time; all recorded quality warnings were resolved immediately afterward

The native pre-mutation status was refreshed with `gentle-ai sdd-status tournament-experience-v1-2 --cwd . --json --instructions`. It reported `artifactStore: openspec`, `actionContext.mode: repo-local`, the repository as the allowed edit root, `dependencies.archive: ready`, `nextRecommended: archive`, and no blocked reasons.

The requested `openspec/config.yaml` was not present in the workspace, so no project-specific `rules.archive` entries could be read. No configuration file was created or inferred; native status and the OpenSpec archive convention governed this mechanical archive.

## Specs Synced

The change contained four full specs and no existing main-spec files were present. Each delta was copied with Git's native `cp.exe`, checked with recursive `diff -r`, and moved into the corresponding main-spec path:

| Domain | Action | Result |
|---|---|---|
| `public-media-delivery` | Created | `openspec/specs/public-media-delivery/spec.md` |
| `public-obs-overlays` | Created | `openspec/specs/public-obs-overlays/spec.md` |
| `public-player-profiles` | Created | `openspec/specs/public-player-profiles/spec.md` |
| `tournament-appearance` | Created | `openspec/specs/tournament-appearance/spec.md` |

### Verbatim spec-sync `diff -r` readbacks

Each command exited `0`; every output below is empty (the `(empty)` marker is an explicit rendering of zero-byte command output).

- `public-media-delivery`, delta → temporary: output empty; delta → main: output empty.
- `public-obs-overlays`, delta → temporary: output empty; delta → main: output empty.
- `public-player-profiles`, delta → temporary: output empty; delta → main: output empty.
- `tournament-appearance`, delta → temporary: output empty; delta → main: output empty.

## Mechanical Archive Move

A recursive pre-move snapshot was created before moving the complete change directory. The destination did not exist. `git mv` moved the source to the dated archive path, and the active source directory was absent afterward.

### Verbatim archive `diff -r` readback

Command: `diff -r <pre-move-snapshot>/source openspec/changes/archive/2026-09-05-tournament-experience-v1-2`

Exit code: `0`

```text
```

The archived tree matched the pre-move snapshot byte-for-byte. The archive report itself was written afterward and is additive to that snapshot comparison.

## Verification Evidence at Close

The archived `verify-report.md` records the final admitted evidence:

- Evidence revision: `sha256:0ba85ec50b989f0b1848db70c3a3679f1e0aa7cc0a3a428bf1c77c6d314058f7`
- Report SHA-256: `90e48133ddfbe459e2eaff5509df3096d8b2f9b149d7b3614a371c34866bf202`
- Requirements: 12/12
- Scenarios: 24/24
- `pnpm test`: exit 0; output SHA-256 `3f38f0494b0139729a069aaf4cc5d443750041c2de8cb8616496e03adea63cd7`
- `pnpm build`: exit 0; output SHA-256 `bccab9415f1e2b5f3976d0b3b88adc1d200c011222b5f81a1df40cadcbf8abd4`
- WU6c retained OBS/CEF reconnect evidence manifest SHA-256: `52bbb346477e11190905f0b0d85d0c2ac9d948fae04abe055046a41142736937`
- Retained reconnect evidence SHA-256: `2363b898f0c34d254824f20660d0a26ae2e32b30a00bbd3272a170f90cd461c8`

The final evidence includes actual OBS/CEF Browser Source bootstrap, three-view rendering, refresh, reconnect, and reload proof. The prior Next development server was left stopped as authorized; no OBS, Docker E2E, Playwright, user service, or test/build suite was started by archive.

## Post-Archive Quality Cleanup

The non-critical warnings recorded by `verify-report.md` were resolved in commit `5fa8b84` without changing production behavior:

1. `packages/database/src/schema.test.ts` now uses an explicit runtime guard so TypeScript can safely narrow the optional Drizzle query chunk.
2. Unused imports were removed from `apps/api/src/services/profile-media.ts` and `apps/api/src/services/tournament-media.ts`.

A fresh final quality run after that commit passed every ordinary workspace gate:

- `pnpm lint`: exit 0; 10/10 tasks successful
- `pnpm typecheck`: exit 0; 10/10 tasks successful
- `pnpm test`: exit 0; 328 tests passed, 14 integration-dependent tests skipped by design
- `pnpm build`: exit 0; 2/2 tasks successful and 13 static pages generated
- `git diff --check`: exit 0

The archived `verify-report.md` remains the immutable record of the admitted SDD verification at its original candidate. This terminal report records the later warning-only cleanup and the fresh passing quality evidence.

## Archive Integrity Checklist

- [x] Main specs created from delta specs with shell-native copies
- [x] Every spec copy had an empty recursive `diff -r` readback
- [x] Pre-move recursive snapshot created
- [x] Archive destination collision checked before move
- [x] Archive move completed with `git mv`
- [x] Archived tree had an empty recursive `diff -r` readback
- [x] Archived tasks contain 19/19 checked implementation tasks
- [x] Active change directory no longer exists
- [x] Proposal, research, specs, design, state, tasks, apply-progress, verify-report, and verification evidence retained
- [x] Unrelated modified `.gitignore`, untracked `artifacts/a11y-audit/`, and pre-existing stashes were not intentionally changed

## Source of Truth

The synced main specs are now the source of truth. The dated archive is the immutable audit trail for the completed change.
