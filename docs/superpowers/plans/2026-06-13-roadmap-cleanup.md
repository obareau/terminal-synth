# ROADMAP Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the outdated `ROADMAP.md` with a version that reflects the current feature-freeze state (v1.9.0-stable), and archive the v1.7/v1.8 per-version roadmap specs as historical records.

**Architecture:** Pure documentation change. Two file moves (`git mv`) plus one file rewrite. No code, no tests, no build impact.

**Tech Stack:** Markdown, git.

---

### Task 1: Archive old per-version roadmaps

**Files:**
- Move: `ROADMAP_v1.7.md` → `docs/archive/ROADMAP_v1.7.md`
- Move: `ROADMAP_v1.8.md` → `docs/archive/ROADMAP_v1.8.md`

- [ ] **Step 1: Create the archive directory and move both files with git mv**

```bash
mkdir -p docs/archive
git mv ROADMAP_v1.7.md docs/archive/ROADMAP_v1.7.md
git mv ROADMAP_v1.8.md docs/archive/ROADMAP_v1.8.md
```

- [ ] **Step 2: Verify the moves**

Run: `git status`
Expected: both files show as renamed (R) from root to `docs/archive/`.

- [ ] **Step 3: Commit**

```bash
git add docs/archive/ROADMAP_v1.7.md docs/archive/ROADMAP_v1.8.md
git commit -m "$(cat <<'EOF'
docs: archive v1.7/v1.8 per-version roadmap specs

v1.7 (Industrial Mode) shipped in v1.9.0; v1.8 (Remote Control) was
fully reverted after an unresolved startup crash. Both are now
historical records, moved out of the repo root.

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Rewrite ROADMAP.md

**Files:**
- Modify: `ROADMAP.md` (full rewrite — replace entire file contents)

- [ ] **Step 1: Replace the full contents of `ROADMAP.md`**

```markdown
# Terminal-Synth Roadmap

## 🔒 Status: Feature Freeze (v1.9.0-stable)

Terminal-Synth is feature-complete for its core mission: a dark industrial
visual synthesizer for **solo live performance**, driven by **Adaptive
Autoplay** (music-reactive evolution) with the performer supervising and
biasing. No sequencer, no MIDI Learn — these were deliberately removed.

**From v1.9.0 onward, development is debug/maintenance only.** No new
features are planned. Work focuses on bug fixes, performance, and
stability. See `.claude/CLAUDE.md` for the full project policy.

---

## Version History

### v1.0.1-delta — Foundations
- 91 generators with audio reactivity, effects/disruptors chain
- Sequencer + MIDI Learn (16-step automation, CC mapping) — **since removed**
  in favor of Adaptive Autoplay

### v1.2.0 — Master Brightness
- Audio-reactive fade-to-black via CSS filter, exponential moving average
  smoothing, slider-controlled amplification

### v1.5.0 — Nightcall Mountains + Theming
- Nightcall Mountains generator (32 hexagonal pyramids, 3D projection)
- Light/Dark theme toggle with localStorage persistence
- 91 generators / 31 effects / 23 disruptors, Linux `.deb` packaging

### v1.6.0 — Adaptive Autoplay + Music Analysis
- Real-time BPM detection (adaptive bass-peak threshold) and energy/style
  classification (calm/driving/chaotic/peak)
- Autoplay parameters scale dynamically with music energy
- Tap tempo (`Shift+T`), MIRE ORTF startup screen

### v1.7.x — Industrial Mode
- 20 Industrial generators (monochrome, glitch-driven)
- Post-process N&B with IGN dither, 4 palettes (B&W / Phosphor / Blueprint /
  Sepia)
- 12 Industrial disruptors
- Autoplay can be restricted to the Industrial pool

### v1.7.4 — Performance Pass
- Auto-Perf: graduated degrade (stage cap squeeze, then render scale
  reduction) when FPS drops below 50 for 5s, recovers when FPS ≥ 58 for 10s
- Audio capture and MIRE startup fixes

### v1.9.0 — Stage Cap, HUD, Master Brightness Rework → **Freeze**
- Stage Cap slider (1–12, default 6) limits simultaneous effects+disruptors
- Extended HUD: FPS, frame time, resolution, audio bands, version overlay
- Master Brightness slider now controls the floor (0 = identity, 1 =
  aggressive fade-to-black), fixing the previous always-black bug
- **Feature freeze declared** — tagged `v1.9.0-stable`

---

## Abandoned Attempt: v1.8 Remote Control

A WebSocket server (port 7777) + PWA tablet UI was built to allow
Performance/Director/Spectator control modes from a phone/tablet over the
local network, with a JSON-schema-driven adaptive UI and QR pairing.

After implementation, the app crashed ~5–9 seconds after startup and the
root cause could not be identified (candidates: an unhandled exception in
the remote-state push loop, the WebSocketServer interfering with the
Electron `BrowserWindow` lifecycle, or the QR/schema-builder integration).
Given the low tolerance for a broken live-performance tool, the entire
effort was reverted via `git reset --hard` to the last known-good commit
and force-pushed.

**The v1.8 code no longer exists in this repository.** The original design
is preserved at `docs/archive/ROADMAP_v1.8.md` for reference if remote
control is ever revisited — any future attempt should start by instrumenting
`main.ts` for uncaught exceptions and `render-process-gone` events before
porting any of the old code.

---

## Current Policy

- **Debug/maintenance only.** Fix bugs, improve performance, polish UX.
- **No new major features** (Remote Control, Director Mode, etc. stay
  shelved).
- Workflow: reproduce → minimal fix → `npm test` → commit → push.
- If a change breaks app startup, prefer reverting immediately over
  incremental in-place debugging (see v1.8 postmortem above).
```

- [ ] **Step 2: Verify the file looks correct**

Run: `head -20 ROADMAP.md`
Expected: starts with `# Terminal-Synth Roadmap` and the `🔒 Status: Feature
Freeze (v1.9.0-stable)` section.

- [ ] **Step 3: Commit**

```bash
git add ROADMAP.md
git commit -m "$(cat <<'EOF'
docs: rewrite ROADMAP.md for v1.9.0 feature freeze

Replace stale v1.3/v1.4 plans, sequencer/MIDI-Learn references, and
"Long-term Vision"/Contributing sections (all contradicted by the
current freeze) with a condensed version history, the v1.8 Remote
Control postmortem, and the current debug-only policy.

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Push

- [ ] **Step 1: Push both commits**

```bash
git push
```

Expected: `main` updated on `origin` with the two new commits.
