# ROADMAP — v1.8 — Remote Control

> **Goal**: Drive Terminal-Synth from a tablet/phone over the local network. UI is generated on-the-fly from a JSON schema describing only the currently active controls — adaptive, zero-config, zero-install.

**Status**: Planning
**Target release**: v1.8.0
**Predecessor**: v1.7.x (Industrial Mode)

---

## 1. Use Cases

TS keeps running on the laptop/PC; the operator uses a tablet (iPad/Android) or phone as a wireless control surface during a live performance.

### Three operating modes (switchable)

| Mode | Audience | What the tablet shows |
|------|----------|------------------------|
| **Performance** | Low-level operator | All sliders/knobs of the active generator, active effects, active disruptors. Fine control. |
| **Director** | High-level operator (with autoplay ON) | Abstract controls: `Calm`, `Build-up`, `Drop`, `Chaos`, `Hold`. Nudges autoplay rather than micro-managing. Override buttons (force gen change, force palette). |
| **Spectator** | Public-facing / monitor | Read-only: current BPM, energy, active generator name, active effects, mini preview canvas. |

A **mode switch** is always visible at the top of the tablet UI.

---

## 2. Architecture

```
┌──────────────────────────────┐         ┌─────────────────────────────┐
│  TS Host (laptop/PC)         │         │  Tablet / Phone             │
│  ─────────────────────       │         │  ──────────────────         │
│  Electron renderer           │         │  Browser (PWA)              │
│   ├─ HTTP server  :7777      │◄────────│   └─ Loads PWA shell        │
│   └─ WebSocket    :7777/ws   │◄═══════►│       └─ Dynamic UI         │
│                              │  JSON   │                             │
│  Pushes:                     │         │  Sends:                     │
│   • /schema (UI descriptor)  │         │   • /control (param change) │
│   • /state  (live values)    │         │   • /mode   (switch)        │
│   • /metrics (BPM, energy)   │         │   • /trigger (Director cmd) │
└──────────────────────────────┘         └─────────────────────────────┘
        ▲
        │ QR code displayed in TS (URL + token)
        │ Tablet scans → connected
```

### Transport choice: **WebSocket**

- Bidirectional, low-latency, native browser support
- Schema/state pushed from TS, control messages pushed from tablet
- Single connection per client; TS supports N clients

### Discovery: **QR code + HTTP**

- TS displays a QR code (top bar button) containing `http://<lan-ip>:7777/?token=XYZ`
- Tablet scans → loads PWA → auto-connects to WebSocket
- No mDNS dependency, no manual IP entry

### Security

- Token-based (rotates per launch)
- Bound to LAN only (server binds `0.0.0.0` but token gates access)
- No external network exposure

---

## 3. JSON Schema — Adaptive UI

### `/schema` payload (pushed when active gen/effects change)

```json
{
  "mode": "performance",
  "active": {
    "generator": { "id": "industrial.grid_pulse", "name": "Grid Pulse" },
    "effects":   [{ "id": "fx.halftone", "name": "Halftone" }],
    "disruptors":[{ "id": "dis.block_displace", "name": "Block Displace" }]
  },
  "groups": [
    {
      "title": "Generator — Grid Pulse",
      "controls": [
        { "id": "gen.p0", "label": "Density",  "type": "slider", "min": 0, "max": 1, "value": 0.5, "curve": "linear" },
        { "id": "gen.p1", "label": "Speed",    "type": "knob",   "min": 0, "max": 1, "value": 0.3 },
        { "id": "gen.p2", "label": "Audio Mix","type": "slider", "min": 0, "max": 1, "value": 0.8 }
      ]
    },
    {
      "title": "Halftone",
      "controls": [
        { "id": "fx.halftone.dot",   "label": "Dot Size",   "type": "slider", "min": 0, "max": 1, "value": 0.4 },
        { "id": "fx.halftone.angle", "label": "Angle",      "type": "knob",   "min": 0, "max": 360, "value": 45 }
      ]
    },
    {
      "title": "Master",
      "controls": [
        { "id": "master.brightness", "label": "Brightness", "type": "slider", "min": 0, "max": 1, "value": 0.6 },
        { "id": "master.industrial", "label": "Industrial", "type": "toggle", "value": true },
        { "id": "master.palette",    "label": "Palette",    "type": "select", "options": ["bw","phosphor","blueprint","sepia"], "value": "bw" }
      ]
    }
  ]
}
```

### Control types supported

- `slider` — linear/log curve, vertical or horizontal
- `knob` — rotary, single value
- `toggle` — bool
- `select` — enum dropdown
- `xy` — 2D pad (for paired params)
- `button` — momentary trigger (Director mode)
- `meter` — read-only display (Spectator mode)

### `/control` message (tablet → TS)

```json
{ "id": "gen.p0", "value": 0.72 }
```

### `/state` push (TS → tablets, throttled to ~30Hz)

```json
{ "values": { "gen.p0": 0.72, "master.brightness": 0.6 }, "bpm": 128, "energy": 0.43 }
```

### `/trigger` (Director mode)

```json
{ "action": "buildup" }      // or: calm | drop | chaos | hold | nextGen | nextPalette
```

---

## 4. Mode-Specific Behavior

### Performance Mode

- Schema lists every parameter of every active component
- Schema **updates whenever** generator/effects change (autoplay triggers schema push)
- Tablet hot-reloads UI smoothly (animate in/out new controls)

### Director Mode

- Schema is fixed regardless of active gen: 5–7 high-level buttons + 3 macros
- Macros map to autoplay biases:
  - `Calm` → reduce energy multiplier, slower changes
  - `Build-up` → ramp parameters toward intensity
  - `Drop` → force disruptor, palette flash, gen change
  - `Chaos` → max disruptor probability, fast changes
  - `Hold` → freeze autoplay for N seconds
- Override section: `Next Generator`, `Next Palette`, `Toggle Industrial`

### Spectator Mode

- Read-only schema with `meter` controls
- Shows: BPM, energy bar, current gen name, active effects list
- Optional: low-res preview canvas streamed at 5–10 fps (if implemented later)

---

## 5. Implementation Plan

### File structure

```
src/
├─ server/                       # NEW — runs in Electron main process
│   ├─ remoteServer.ts           # HTTP + WS server
│   ├─ schemaBuilder.ts          # Build /schema from current TS state
│   └─ controlBus.ts             # Bridge between WS and renderer (IPC)
│
├─ pwa/                          # NEW — served by remoteServer
│   ├─ index.html
│   ├─ pwa.ts                    # Bootstraps PWA, connects WS
│   ├─ ui/
│   │   ├─ renderSchema.ts       # Builds DOM from JSON schema
│   │   ├─ controls/             # Slider, Knob, Toggle, XY, etc.
│   │   └─ modes.ts              # Performance/Director/Spectator
│   ├─ styles.css                # Touch-first, dark, large hit targets
│   └─ manifest.json             # PWA manifest
│
└─ renderer/
    └─ remoteHook.ts             # NEW — registers params, listens to control bus
```

### Milestones

| Milestone | Scope | Effort |
|-----------|-------|--------|
| **v1.8.0** | HTTP+WS server, schema export for Performance mode, basic PWA with slider/toggle, QR pairing | ~1.5 weeks |
| **v1.8.1** | Knob, XY pad, select controls; hot-reload on schema change | ~1 week |
| **v1.8.2** | Director mode + macros + autoplay hooks | ~1 week |
| **v1.8.3** | Spectator mode + meters + BPM/energy push | ~3 days |
| **v1.8.4** | Latency optimization, multi-client support, polish | ~1 week |

---

## 6. UX / Design Principles for PWA

- **Touch-first**: minimum hit target 44×44pt (Apple HIG)
- **Dark**: pure black background, high-contrast white controls — performance environment
- **Large readouts**: param values legible at arm's length
- **Haptic feedback** on slider drag end (`navigator.vibrate(10)`)
- **Latency-perceived optimization**: optimistic UI — tablet moves slider instantly, doesn't wait for ACK
- **Reconnect**: auto-reconnect with backoff on WS drop, visible status indicator
- **Mode switch**: persistent top bar — always 1 tap away

### Target devices

- **Primary**: iPad 10–11" landscape (1024×768 baseline)
- **Secondary**: Android tablets 10"
- **Tertiary**: Phones (responsive, single column)
- **Tested browsers**: Safari iOS 16+, Chrome Android, desktop Chrome/Firefox

---

## 7. Performance / Latency Targets

- **End-to-end latency** (tablet slider → TS visual change): **< 50ms** on local LAN
- **Schema push** on gen change: **< 100ms**
- **State broadcast rate**: 30Hz throttled
- **Max concurrent clients**: 4 (one operator + spectators)

---

## 8. Risks & Open Questions

- **Risk**: WebSocket through corporate Wi-Fi blocked → fallback to phone hotspot
- **Risk**: PWA install friction on iOS → ship as bookmark-able fullscreen page first
- **Open**: Should schemas be **diffed** (delta only) or **replaced** (full push)? Probably full at v1.8.0, delta later.
- **Open**: Multiple operators editing same param — last-write-wins or lock?
- **Open**: Persist a "session preset" so reopening tablet restores last mode?

---

## 9. Definition of Done (v1.8.0)

- [ ] QR code from TS top bar → tablet PWA loads in < 3s
- [ ] Performance mode shows current gen+effects controls, hot-reloads when they change
- [ ] Slider drag updates TS visual with < 80ms perceived latency
- [ ] Reconnect works after WS disconnect
- [ ] No external network port opened (LAN-only verified)
- [ ] Tests for schema builder + control bus
- [ ] README section: "Remote Control Setup"

---

## 10. Stretch Goals (post-v1.8)

- **Bluetooth MIDI controllers** as additional remote input
- **Preset library** on tablet: save/recall full TS states
- **Multi-tablet split**: one tablet on Performance, another on Spectator
- **OSC bridge** for integration with TouchOSC / Lemur / Ableton Link
