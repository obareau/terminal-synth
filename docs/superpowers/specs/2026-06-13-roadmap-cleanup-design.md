# ROADMAP cleanup — Design

**Date**: 2026-06-13
**Status**: Approved

## Goal

`ROADMAP.md` is out of date: it references the Sequencer and MIDI Learn
(removed from the app), plans for v1.3/v1.4 that were never pursued, and a
"Long-term Vision" / "Contributing" section that contradicts the current
**feature freeze** (declared at v1.9.0-stable, see `.claude/CLAUDE.md`).

This is a documentation-only change: rewrite `ROADMAP.md` to reflect reality
and archive the per-version roadmap specs that are now historical.

## New ROADMAP.md structure

1. **Header** — Status badge: `🔒 FEATURE FREEZE — v1.9.0-stable`. One-line
   philosophy: solo live performer, autoplay-driven, debug/maintenance only
   from here on.
2. **Version history** (condensed, not a full changelog — CHANGELOG.md
   remains the detailed record):
   - v0.1 → v1.0.1-delta: foundations (generators/effects; Sequencer + MIDI
     Learn shipped here — *since removed*)
   - v1.2.0: Master Brightness
   - v1.5.0: Nightcall Mountains, Light/Dark theme
   - v1.6.0: Adaptive Autoplay + Music Analysis
   - v1.7.x: Industrial Mode (20 generators, dither post-process, 4 palettes)
   - v1.7.4: Auto-Perf graduated degrade, audio/mire fixes
   - v1.9.0: Stage Cap, extended HUD, Master Brightness rework → **freeze**
3. **Abandoned attempt** — v1.8 Remote Control (WebSocket server + PWA
   tablet UI): briefly describe intent, note it caused an unresolved
   startup crash, and was fully reverted (`git reset --hard` to the
   pre-v1.8 commit, force-pushed). Code no longer exists in the repo.
4. **Current policy** — Feature freeze / debug-only, matching the wording
   already agreed in `.claude/CLAUDE.md`. No "planned features" section.

## Removed content

- "Planned Features" for v1.3.0/v1.4.0 (sequencer expansion, MIDI feedback,
  OSC/DMX, custom shader editor, etc.) — never built, contradicts freeze.
- "Long-term Vision" (professional VJ tool, 2027 roadmap).
- "Contributing — Easy Issues for Contributors" section.

## File reorganization

- Create `docs/archive/`.
- Move `ROADMAP_v1.7.md` → `docs/archive/ROADMAP_v1.7.md` (historical record
  of a shipped feature).
- Move `ROADMAP_v1.8.md` → `docs/archive/ROADMAP_v1.8.md` (historical record
  of an abandoned/reverted feature).
- `ROADMAP.md` stays at repo root, rewritten per above.

## Testing

None — documentation only. No build/test impact.
