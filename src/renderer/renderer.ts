/** Glue : pipeline WebGL (génération + chaîne d'effets) + audio + UI + boucle. */

import { Pipeline, type Stage, type Program } from "./gl";
import { AudioInput, type Bands, type AudioSource } from "./audio";
import { pixelsToAscii, pixelsToAsciiColorGlitch } from "./ascii";
import { MidiInput, type MidiMode } from "./midi";
import { TextOverlay } from "./text";
import { TacticDisplay } from "./textsource";
import { TEXTS } from "./texts";
import { SHADERS, type ShaderParam } from "./shaders";
import { EFFECTS } from "./effects";
import { BLEND_MODES } from "./gl";
import { DISRUPTORS } from "./disruptors";
import { autoplayAdvanced, AUTOPLAY_PRESETS } from "./autoplayAdvanced";
import { textLayer } from "./textLayer";
import { MusicAnalyzer } from "./musicAnalyzer";

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

// Mode variables (output window / performance overlay)
const isOutputMode = new URLSearchParams(window.location.search).get("mode") === "output";
const isControlMode = !isOutputMode;
// Bump on each release. Falls back here when package.json isn't bundled.
// In sync with package.json "version" — keep both updated together.
const APP_VERSION = "2.2.0";

let performanceMode = false;
let hudVisible = true;
let cpuUsage = 0;
let gpuUsage = 0;

// Performance metrics
let frameCount = 0;
let lastFpsTime = performance.now();
let fps = 0;
let frameTimeMs = 0;

// Auto-Perf: graduated degrade when fps stays low. Level 0 = full quality.
// L1 squeezes the stage cap, L2/L3 also lower the render scale.
const AUTO_PERF_SCALE = [1, 1, 0.75, 0.6];
let autoPerfEnabled = true;
let autoPerfLevel = 0;
let lowFpsSeconds = 0;
let highFpsSeconds = 0;

// GPU readback throttles (readPixels = pipeline sync stall)
let lastAsciiReadMs = 0;
let lastLumProbeMs = 0;
let peakFrameTimeMs = 0;

// Initialize mode
if (isOutputMode) document.body.classList.add("output-mode");

const app = $("app");
const canvas = $<HTMLCanvasElement>("gl");
const pre = $<HTMLPreElement>("ascii");
const shaderSel = $<HTMLSelectElement>("shader");
const sourcesList = $("sources-list");
const layerAName  = $("layer-a-name");
const paramsPanel = $("params-panel");
const audioBtn = $<HTMLButtonElement>("audio");
const srcSel = $<HTMLSelectElement>("audio-src");
const audioDeviceBtn = $<HTMLButtonElement>("audio-device-btn");
const audioDevicePanel = $("audio-device-panel");
const audioDeviceList = $("audio-device-list");
const audioDeviceClose = $<HTMLButtonElement>("audio-device-close");
const webcamDeviceBtn = $<HTMLButtonElement>("webcam-device-btn");
const webcamDevicePanel = $("webcam-device-panel");
const webcamDeviceList = $("webcam-device-list");
const webcamDeviceClose = $<HTMLButtonElement>("webcam-device-close");
const asciiBtn = $<HTMLButtonElement>("ascii-toggle");
const textBtn = $<HTMLButtonElement>("text-toggle");
const fullBtn = $<HTMLButtonElement>("full");
const blendSel  = $<HTMLSelectElement>("blend-mode");
const layerBSel = $<HTMLSelectElement>("layer-b-shader");
const layerBBtn = $<HTMLButtonElement>("layer-b-on");
const layerBOpa = $<HTMLInputElement>("layer-b-opacity");
layerBOpa.dataset.midiTarget = "layerBOpacity";
const midiBtn = $<HTMLButtonElement>("midi");
const midiModeSel = $<HTMLSelectElement>("midi-mode");
const midiDeviceBtn = $<HTMLButtonElement>("midi-device-btn");
const midiDevicePanel = $("midi-device-panel");
const midiDeviceList = $("midi-device-list");
const midiDeviceClose = $<HTMLButtonElement>("midi-device-close");
const midiMonitor = $<HTMLSpanElement>("midi-monitor");
const meter = $("meter");
const chain = $("chain");
const masterBrightnessToggle = $<HTMLButtonElement>("master-brightness-toggle");
const masterBrightnessSlider = $<HTMLInputElement>("master-brightness-slider");
const themeToggle = $<HTMLButtonElement>("theme-toggle");
const mireElement = $("mire-overlay");
const mireTimeElement = $("mire-time");

// === Light/Dark theme toggle (persisted in localStorage) ===
function applyTheme(light: boolean): void {
  document.body.classList.toggle("light-theme", light);
  if (themeToggle) themeToggle.textContent = light ? "☾" : "☀";
  localStorage.setItem("terminal-synth-theme", light ? "light" : "dark");
}
applyTheme(localStorage.getItem("terminal-synth-theme") === "light");
themeToggle?.addEventListener("click", () => {
  applyTheme(!document.body.classList.contains("light-theme"));
});
document.addEventListener("keydown", (e) => {
  if (!e.ctrlKey && !e.shiftKey && (e.key === "t" || e.key === "T")) {
    const inInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement;
    if (!inInput) {
      e.preventDefault();
      applyTheme(!document.body.classList.contains("light-theme"));
    }
  }
});

const pipeline = new Pipeline(canvas);
const audio = new AudioInput();
const midi = new MidiInput();
const text = new TextOverlay($("text"), TEXTS);
const tactics = new TacticDisplay(TEXTS);
const musicAnalyzer = new MusicAnalyzer(120);
const RECTA_INDEX = 0; // le générateur "RECTA (texte)" est en tête de SHADERS
let currentShader = 0;
let prevEnergy = 0;
let asciiMode = false;
let asciiGlitchPermanentEnabled = false;
let masterBrightnessEnabled = false;
let masterBrightnessAmount = 0.5;
let smoothedAudioLevel = 0; // Exponential moving average for smooth fading
let chosenAudioDeviceId: string | undefined;
let chosenAudioDeviceLabel: string | undefined;
const MIDI_PORT_KEY = "ts-midi-port";
let chosenMidiPortName: string | undefined;
try { chosenMidiPortName = localStorage.getItem(MIDI_PORT_KEY) ?? undefined; } catch {}

// Beat phase & envelope — calculés depuis le BPM détecté chaque frame
let beatPhase  = 0;   // 0→1 sawtooth par beat (pour shaders)
let beatEnv    = 0;   // 1→0 enveloppe rapide après chaque beat (flash)

// ── Media (u_media texture) ─────────────────────────────────────────────────
let mediaVideo: HTMLVideoElement | null = null;
let mediaIsVideo = false;
// Webcam freeze-frame capture
let webcamStream: MediaStream | null = null;
let webcamVideo: HTMLVideoElement | null = null;
let captureCanvas: HTMLCanvasElement | null = null;
let captureCtx: CanvasRenderingContext2D | null = null;
let captureIntervalMs = 1000;
let captureWidth = 64;
let lastCaptureTime = 0;
let mediaIsWebcam = false;
let chosenWebcamDeviceId = "";
let lastBeatIdx = -1; // détection de frontière de beat
const bands: Bands = { bass: 0, mid: 0, treble: 0, level: 0 };
const audioData = new Uint8Array(512); // 256 spectre + 256 waveform → texture audio

// Cache music info display elements (avoid DOM lookups every frame)
const musicInfoElements = {
  bpmDisplay: document.getElementById("bpm-display") as HTMLElement | null,
  energyDisplay: document.getElementById("energy-display") as HTMLElement | null,
  styleDisplay: document.getElementById("style-display") as HTMLElement | null,
};

// Only update display every 6 frames (~10x per second at 60fps) - balance CPU and responsiveness
let analyzeFrameCounter = 0;
const ANALYZE_INTERVAL = 6;

// --- Tab system for generators and controls ---
function setupTabs(panelId: string) {
  const tabs = document.querySelectorAll(`#${panelId} .tab-btn`);
  tabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tabId = btn.getAttribute("data-tab");
      if (!tabId) return;

      // Deactivate all tabs in this panel
      document.querySelectorAll(`#${panelId} .tab-btn`).forEach(b => b.classList.remove("active"));
      document.querySelectorAll(`#${panelId} .tab-content`).forEach(c => c.classList.remove("active"));

      // Activate selected tab
      btn.classList.add("active");
      const content = document.getElementById(tabId);
      if (content) content.classList.add("active");
    });
  });
}

setupTabs("left-panel");
setupTabs("right-panel");

// --- Générateurs : catégorisés par type ---
const SRC_KEYS = "1234567890qwertyuiopasdfghjklzxcvbnm";

// Fonction pour catégoriser basée sur le nom
function getCategory(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("recta") || lower.includes("matrix") || lower.includes("texte")) return "Text";
  if (lower.includes("plasma") || lower.includes("éclair") || lower.includes("marble")) return "Plasma";
  if (lower.includes("tunnel") || lower.includes("lissajous") || lower.includes("orbe") ||
      lower.includes("circuit") || lower.includes("spirale") || lower.includes("scan") ||
      lower.includes("laser") || lower.includes("terrain") || lower.includes("topographie") ||
      lower.includes("fft") || lower.includes("waveform") || lower.includes("signal") ||
      lower.includes("sphere") || lower.includes("connected") || lower.includes("node") ||
      lower.includes("tree") || lower.includes("cluster") || lower.includes("grid") ||
      lower.includes("wave")) return "Geometry";
  if (lower.includes("aurora") || lower.includes("perlin") || lower.includes("voronoi") ||
      lower.includes("noise")) return "Noise";
  if (lower.includes("mandelbrot") || lower.includes("truchet") || lower.includes("chromatic") ||
      lower.includes("stripes") || lower.includes("radial")) return "Interactive";
  return "All";
}

// Créer les items pour chaque onglet
const allItems = new Map<string, HTMLElement[]>();
allItems.set("All", []);
allItems.set("Text", []);
allItems.set("Plasma", []);
allItems.set("Geometry", []);
allItems.set("Noise", []);
allItems.set("Interactive", []);
allItems.set("Lofi", []);
allItems.set("Media", []);

SHADERS.forEach((s, i) => {
  // select caché (logique preset)
  const o = document.createElement("option");
  o.value = String(i); o.textContent = s.name;
  shaderSel.appendChild(o);
  const o2 = o.cloneNode(true) as HTMLOptionElement;
  layerBSel.appendChild(o2);

  // Déterminer la catégorie — priorité à s.category si c'est un onglet connu
  const TAB_CATS = new Set(["Text","Plasma","Geometry","Noise","Interactive","Lofi","Media"]);
  const cat = (s.category && TAB_CATS.has(s.category)) ? s.category : getCategory(s.name);

  // liste visuelle cliquable
  const item = document.createElement("div");
  item.className = "src-item";
  item.dataset["idx"] = String(i);
  item.dataset.midiTarget = `generator:${i}`;
  const key = SRC_KEYS[i] ?? "";
  item.innerHTML = `<span class="src-key">${key}</span><span class="src-name">${s.name}</span>`;
  item.addEventListener("click", () => selectSource(i));

  // Ajouter à All et à la catégorie spécifique
  allItems.get("All")!.push(item);
  if (cat !== "All") {
    const dupItem = item.cloneNode(true) as HTMLElement;
    dupItem.addEventListener("click", () => selectSource(i));
    allItems.get(cat)!.push(dupItem);
  }
});

// Peupler les listes de chaque onglet
const listContainers: Record<string, HTMLElement | null> = {
  "All": document.getElementById("sources-list"),
  "Text": document.getElementById("sources-list-text"),
  "Plasma": document.getElementById("sources-list-plasma"),
  "Geometry": document.getElementById("sources-list-geometry"),
  "Noise": document.getElementById("sources-list-noise"),
  "Interactive": document.getElementById("sources-list-interactive"),
  "Lofi":  document.getElementById("sources-list-lofi"),
  "Media": document.getElementById("sources-list-media"),
};

for (const [cat, items] of allItems) {
  const container = listContainers[cat];
  if (container) {
    const sorted = [...items].sort((a, b) => {
      const nameA = a.querySelector(".src-name")?.textContent ?? "";
      const nameB = b.querySelector(".src-name")?.textContent ?? "";
      return nameA.localeCompare(nameB, "fr", { sensitivity: "base" });
    });
    sorted.forEach(item => container.appendChild(item));
  }
}

// Recherche générateur — filtre les .src-item de la liste visible par nom
const genSearch = document.getElementById("gen-search") as HTMLInputElement | null;
genSearch?.addEventListener("input", () => {
  const q = genSearch.value.trim().toLowerCase();
  document.querySelectorAll<HTMLElement>(".src-item").forEach(item => {
    const name = item.querySelector(".src-name")?.textContent?.toLowerCase() ?? "";
    item.style.display = !q || name.includes(q) ? "" : "none";
  });
});

function selectSource(i: number): void {
  shaderSel.value = String(i);
  loadShader(i);
}

// --- Layer B / blend modes ---
BLEND_MODES.forEach((name, i) => {
  const o = document.createElement("option");
  o.value = String(i); o.textContent = name;
  blendSel.appendChild(o);
});
let layerBEnabled = false;
function syncBlend(): void {
  pipeline.setBlend(Number(blendSel.value), Number(layerBOpa.value));
}
function loadLayerB(): void {
  if (!layerBEnabled) { pipeline.setGenerator2(null); return; }
  const result = pipeline.setGenerator2(SHADERS[Number(layerBSel.value)]!.src);
  if (!result.success) {
    console.error("[GL layer B]", result.error);
    const prev = meter.textContent;
    meter.textContent = `Layer B error: ${result.error}`.slice(0, 120);
    setTimeout(() => { meter.textContent = prev ?? ""; }, 4000);
  }
}
layerBBtn.addEventListener("click", () => {
  layerBEnabled = !layerBEnabled;
  layerBBtn.classList.toggle("on", layerBEnabled);
  layerBBtn.textContent = layerBEnabled ? "B on" : "B";
  loadLayerB();
});
layerBSel.addEventListener("change", loadLayerB);
blendSel.addEventListener("input", syncBlend);
layerBOpa.addEventListener("input", syncBlend);
syncBlend();
// Valeurs courantes des params du shader actif (réinitialisées au changement)
let currentParamValues: number[] = [];

function buildParamsPanel(shader: typeof SHADERS[0]): void {
  paramsPanel.innerHTML = "";
  const params = shader.params ?? [];
  paramsPanel.style.display = params.length ? "" : "none";
  currentParamValues = params.map(p => p.default);
  pipeline.setGenParams(currentParamValues);
  params.forEach((p: ShaderParam, i: number) => {
    const row = document.createElement("div");
    row.className = "param-row";
    const lbl = document.createElement("span"); lbl.className = "param-label"; lbl.textContent = p.label;
    const val = document.createElement("span"); val.className = "param-val";   val.textContent = p.default.toFixed(p.step && p.step >= 1 ? 0 : 2);
    const rng = document.createElement("input");
    rng.type = "range"; rng.min = String(p.min); rng.max = String(p.max);
    rng.step = String(p.step ?? (p.max - p.min) / 100); rng.value = String(p.default);
    rng.addEventListener("input", () => {
      const v = Number(rng.value);
      currentParamValues[i] = v;
      val.textContent = v.toFixed(p.step && p.step >= 1 ? 0 : 2);
      pipeline.setGenParams(currentParamValues);
    });
    row.append(lbl, rng, val);
    paramsPanel.appendChild(row);
  });
}

function loadShader(i: number): void {
  const shaderName = SHADERS[i]?.name ?? "unknown";
  console.log(`[Renderer] Loading shader[${i}]: ${shaderName}`);

  // Hide mire when switching away from it
  if (mireVisible && i !== 0) hideMire();

  const result = pipeline.setGenerator(SHADERS[i]!.src);
  if (!result.success) {
    console.error("[Renderer] Generator failed:", shaderName, "→", result.error);
    const prev = meter.textContent;
    meter.textContent = `Error: ${result.error}`.slice(0, 120);
    setTimeout(() => { meter.textContent = prev ?? ""; }, 4000);
    return;
  }
  console.log(`[Renderer] ✓ Loaded: ${shaderName}`);
  currentShader = i;
  buildParamsPanel(SHADERS[i]!);
  // sync liste visuelle
  sourcesList.querySelectorAll(".src-item").forEach(el => el.classList.remove("active"));
  sourcesList.querySelector(`.src-item[data-idx="${i}"]`)?.classList.add("active");
  (sourcesList.querySelector(`.src-item[data-idx="${i}"]`) as HTMLElement | null)
    ?.scrollIntoView({ block: "nearest" });
  layerAName.textContent = SHADERS[i]?.name ?? "—";
}
shaderSel.addEventListener("change", () => loadShader(Number(shaderSel.value)));
loadShader(0);

// --- Chaîne d'effets (génération → entropie → feedback → glitch → filtre) ---
const defaultAmounts = [0.3, 0.4, 0.3, 0.4, 0.45, 0.3, 0.5, 0.4, 0.5, 0.35, 0.4, 0.4, 0.45, 0.35, 0.4, 0.4, 0.5, 0.4, 0.5, 0.4];
const fxState = EFFECTS.map((_e, i) => ({ enabled: false, amount: defaultAmounts[i] ?? 0.3 }));
const fxProg = EFFECTS.map((e) => {
  const result = pipeline.compileEffect(e.body);
  if (!result.success) {
    console.error(`[GL] effet "${e.name}" :`, result.error);
    const fallback = pipeline.compileEffect("vec3 process(vec2 uv) { return prev(uv); }");
    return fallback.success ? fallback.program! : null;
  }
  return result.program!;
});

// --- Industrial Mode (v1.7) -------------------------------------------------
// Global N&B post-process: luminance + gamma + contrast + blue-noise dither +
// quantize + palette. Toggled with key `I`; palette cycled with Shift+I.
// Palette is packed into u_amount as a quarter-range:
//   0.0..0.25 = B&W  | 0.25..0.50 = Phosphor
//   0.50..0.75 = Blueprint | 0.75..1.00 = Sepia
const INDUSTRIAL_MODE_BODY = /* glsl */ `
// Interleaved Gradient Noise (Jiménez) — blue-noise-like dither
float ign_(vec2 p) {
  return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
}
vec3 indPalette_(float lum, int pal) {
  if (pal == 0) return vec3(lum);
  if (pal == 1) return vec3(lum * 0.15, lum, lum * 0.25);              // phosphor
  if (pal == 2) return vec3(lum * 0.25, lum * 0.55, lum);              // blueprint
  return vec3(lum, lum * 0.78, lum * 0.55);                            // sepia
}
vec3 process(vec2 uv) {
  vec3 col = prev(uv);
  // Luminance (Rec. 709)
  float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
  // Contrast + gamma (hardcoded sensible defaults for v1.7.0)
  lum = pow(clamp(lum, 0.0, 1.0), 0.85);
  lum = clamp((lum - 0.5) * 1.4 + 0.5, 0.0, 1.0);
  // Blue-noise dither in quantization space (2 levels = pure 1-bit B&W)
  float steps = 2.0;
  float n = ign_(gl_FragCoord.xy) - 0.5;
  lum = floor(lum * steps + n * 1.0 + 0.5) / steps;
  // Palette unpacked from u_amount
  int pal = int(floor(u_amount * 4.0));
  pal = clamp(pal, 0, 3);
  return indPalette_(lum, pal);
}`;
const industrialModeProg = (() => {
  const r = pipeline.compileEffect(INDUSTRIAL_MODE_BODY);
  if (!r.success) {
    console.error("[GL] Industrial Mode compile error:", r.error);
    return null;
  }
  return r.program!;
})();
let industrialModeEnabled = false;
let industrialPalette = 0; // 0=B&W, 1=Phosphor, 2=Blueprint, 3=Sepia
const PALETTE_NAMES = ["B&W", "PHOSPHOR", "BLUEPRINT", "SEPIA"] as const;

const fxSliders: HTMLInputElement[] = [];

EFFECTS.forEach((e, i) => {
  const st = fxState[i]!;
  const wrap = document.createElement("label");
  wrap.className = "fx";
  const cb = document.createElement("input");
  cb.type = "checkbox";
  cb.addEventListener("change", () => {
    st.enabled = cb.checked;
    wrap.classList.toggle("on", cb.checked);
  });
  const name = document.createElement("span");
  name.className = "fx-name";
  name.textContent = e.name;
  const rng = document.createElement("input");
  rng.type = "range";
  rng.min = "0";
  rng.max = "1";
  rng.step = "0.01";
  rng.value = String(st.amount);
  rng.dataset.midiTarget = `effect:${i}`;
  rng.addEventListener("input", () => {
    st.amount = Number(rng.value);
  });
  fxSliders.push(rng);
  wrap.append(cb, name, rng);
  chain.appendChild(wrap);
});

// --- Perturbateurs ---
interface DisruptorState {
  prog: Program | null;
  enabled: boolean;
  sensitivity: number;  // 0..1 (seuil de déclenchement)
  amount: number;       // intensité quand actif
  cooldownMs: number;
  durationMs: number;
  lastFire: number;
  fireUntil: number;
}

const disruptorsList = document.getElementById("disruptors-list")!;
const disruptorState: DisruptorState[] = DISRUPTORS.map((d) => {
  const result = pipeline.compileEffect(d.body);
  let prog: Program | null = null;
  if (!result.success) {
    console.error(`[GL] perturbateur "${d.name}" :`, result.error);
    const fallback = pipeline.compileEffect("vec3 process(vec2 uv) { return prev(uv); }");
    prog = fallback.success ? fallback.program ?? null : null;
  } else {
    prog = result.program ?? null;
  }
  return {
    prog,
    enabled: false,
    sensitivity: d.defaultSensitivity,
    amount: 0.85,
    cooldownMs: d.defaultCooldownMs,
    durationMs: d.defaultDurationMs,
    lastFire: 0,
    fireUntil: 0,
  };
});

const disruptorSliders: HTMLInputElement[] = [];
const disruptorCbs: HTMLInputElement[] = [];

DISRUPTORS.forEach((d, i) => {
  const st   = disruptorState[i]!;
  const row  = document.createElement("div");
  row.className = "fx";
  row.style.cssText = "grid-template-columns:20px 1fr 64px";

  const cb = document.createElement("input");
  cb.type  = "checkbox";
  cb.dataset.midiTarget = `disruptor:${i}:toggle`;
  cb.addEventListener("change", () => {
    st.enabled = cb.checked;
    row.classList.toggle("on", cb.checked);
  });
  disruptorCbs.push(cb);

  const nm = document.createElement("span");
  nm.className = "fx-name";
  nm.textContent = d.name;
  nm.title = `cooldown ${d.defaultCooldownMs}ms · burst ${d.defaultDurationMs}ms`;

  const sens = document.createElement("input");
  sens.type  = "range"; sens.min = "0"; sens.max = "1"; sens.step = "0.01";
  sens.value = String(st.sensitivity);
  sens.title = "Sensibilité";
  sens.dataset.midiTarget = `disruptor:${i}`;
  sens.addEventListener("input", () => { st.sensitivity = Number(sens.value); });
  disruptorSliders.push(sens);

  row.append(cb, nm, sens);
  disruptorsList.appendChild(row);
});

// --- Contrôles ---
async function enableAudio(): Promise<void> {
  try {
    await audio.start(srcSel.value as AudioSource, chosenAudioDeviceId);
    const label = chosenAudioDeviceLabel ?? srcSel.value;
    audioBtn.textContent = `🔊 ${label.length > 14 ? label.slice(0, 13) + "…" : label}`;
    audioBtn.classList.add("on");
  } catch (e) {
    console.error(e);
    audioBtn.textContent = "audio ✗";
    audioBtn.classList.remove("on");
  }
}

audioBtn.addEventListener("click", async () => {
  if (audio.enabled) {
    await audio.stop();
    audioBtn.textContent = "audio";
    audioBtn.classList.remove("on");
  } else {
    await enableAudio();
  }
});

// Changer la source pendant que l'audio tourne = restart immédiat sur
// la nouvelle source (avant : le select n'était lu qu'au clic sur audio).
srcSel.addEventListener("change", async () => {
  chosenAudioDeviceId = undefined;
  chosenAudioDeviceLabel = undefined;
  if (audio.enabled) await enableAudio();
});

// Audio device picker
audioDeviceBtn.addEventListener("click", async () => {
  if (audioDevicePanel.style.display !== "none") {
    audioDevicePanel.style.display = "none";
    return;
  }
  audioDeviceList.innerHTML = '<div style="padding:8px 12px;font-size:11px;color:var(--text-dim)">Chargement…</div>';
  audioDevicePanel.style.display = "block";
  let devices: MediaDeviceInfo[];
  try {
    devices = await audio.enumerateInputs();
  } catch {
    audioDeviceList.innerHTML = '<div style="padding:8px 12px;font-size:11px;color:var(--red)">Erreur d\'accès au micro</div>';
    return;
  }
  audioDeviceList.innerHTML = "";
  for (const dev of devices) {
    const btn = document.createElement("button");
    const isActive = dev.deviceId === chosenAudioDeviceId;
    btn.style.cssText = `
      display:block; width:100%; text-align:left; padding:7px 12px;
      background:${isActive ? "var(--accent-bg)" : "none"};
      color:${isActive ? "var(--accent)" : "var(--text-sec)"};
      border:none; border-bottom:1px solid var(--border-subtle);
      cursor:pointer; font-size:11px; font-family:var(--font-ui);
    `;
    btn.textContent = dev.label || `Device ${dev.deviceId.slice(0, 8)}`;
    btn.addEventListener("click", async () => {
      chosenAudioDeviceId = dev.deviceId;
      chosenAudioDeviceLabel = dev.label;
      audioDevicePanel.style.display = "none";
      await enableAudio();
    });
    audioDeviceList.appendChild(btn);
  }
  if (devices.length === 0) {
    audioDeviceList.innerHTML = '<div style="padding:8px 12px;font-size:11px;color:var(--text-dim)">Aucun périphérique</div>';
  }
});

audioDeviceClose.addEventListener("click", () => {
  audioDevicePanel.style.display = "none";
});

document.addEventListener("click", (e) => {
  if (!audioDevicePanel.contains(e.target as Node) && e.target !== audioDeviceBtn) {
    audioDevicePanel.style.display = "none";
  }
  if (!webcamDevicePanel.contains(e.target as Node) && e.target !== webcamDeviceBtn) {
    webcamDevicePanel.style.display = "none";
  }
  if (!midiDevicePanel.contains(e.target as Node) && e.target !== midiDeviceBtn) {
    midiDevicePanel.style.display = "none";
  }
});

webcamDeviceBtn?.addEventListener("click", async () => {
  if (webcamDevicePanel.style.display !== "none") {
    webcamDevicePanel.style.display = "none";
    return;
  }
  webcamDeviceList.innerHTML = '<div style="padding:8px 12px;font-size:11px;color:var(--text-dim)">Chargement…</div>';
  webcamDevicePanel.style.display = "block";
  let devices: MediaDeviceInfo[];
  try {
    const all = await navigator.mediaDevices.enumerateDevices();
    devices = all.filter(d => d.kind === "videoinput");
  } catch {
    webcamDeviceList.innerHTML = '<div style="padding:8px 12px;font-size:11px;color:var(--red)">Erreur d\'accès caméra</div>';
    return;
  }
  if (devices.every(d => !d.label)) {
    webcamDeviceList.innerHTML = '<div style="padding:8px 12px;font-size:11px;color:var(--text-dim)">Activez d\'abord la webcam pour voir les labels</div>';
  }
  webcamDeviceList.innerHTML = "";
  for (const dev of devices) {
    const btn = document.createElement("button");
    const isActive = dev.deviceId === chosenWebcamDeviceId;
    btn.style.cssText = `
      display:block; width:100%; text-align:left; padding:7px 12px;
      background:${isActive ? "var(--accent-bg)" : "none"};
      color:${isActive ? "var(--accent)" : "var(--text-sec)"};
      border:none; border-bottom:1px solid var(--border-subtle);
      cursor:pointer; font-size:11px; font-family:var(--font-ui);
    `;
    btn.textContent = dev.label || `Caméra ${dev.deviceId.slice(0, 8)}`;
    btn.addEventListener("click", async () => {
      chosenWebcamDeviceId = dev.deviceId;
      webcamDevicePanel.style.display = "none";
      // Restart webcam with new device if already running
      const webcamBtnEl = document.getElementById("media-webcam-btn") as HTMLButtonElement | null;
      if (mediaIsWebcam && webcamBtnEl) {
        webcamBtnEl.click();
        await new Promise(r => setTimeout(r, 100));
        webcamBtnEl.click();
      }
    });
    webcamDeviceList.appendChild(btn);
  }
  if (devices.length === 0) {
    webcamDeviceList.innerHTML = '<div style="padding:8px 12px;font-size:11px;color:var(--text-dim)">Aucune caméra détectée</div>';
  }
});

webcamDeviceClose?.addEventListener("click", () => {
  webcamDevicePanel.style.display = "none";
});

asciiBtn.addEventListener("click", () => {
  asciiMode = !asciiMode;
  asciiBtn.classList.toggle("on", asciiMode);
  canvas.hidden = asciiMode;
  pre.hidden = !asciiMode;
  if (!asciiMode) resizeCanvas();
});

declare global {
  interface Window {
    synth?: {
      toggleFullscreen: () => Promise<boolean>;
      setFullscreen:     (v: boolean) => Promise<boolean>;
      loadFile:  (filters: { name: string; extensions: string[] }[]) => Promise<{ name: string; content: string } | null>;
      saveFile:  (content: string, filters: { name: string; extensions: string[] }[], defaultName: string) => Promise<boolean>;
      saveVideo: (data: Uint8Array, defaultName: string) => Promise<boolean>;
      openOutputWindow: () => Promise<boolean>;
      getStats: () => Promise<{ cpu: number; gpu: number }>;
      onSceneAction: (cb: (data: { idx: number; save: boolean }) => void) => void;
    };
    applyRenderFilter?: (mode: "none" | "monochrome" | "green" | "amber") => void;
  }
}

midiBtn.addEventListener("click", async () => {
  if (midi.enabled) {
    midi.stop();
    midiBtn.textContent = "🎛 MIDI";
    midiBtn.classList.remove("on");
    midiDeviceBtn.style.display = "none";
    midiDevicePanel.style.display = "none";
    midiLearnBtn.style.display = "none";
    midiMonitor.style.display = "none";
    exitMidiLearn();
  } else {
    try {
      await midi.start(chosenMidiPortName);
      midi.onPortsChanged = () => {
        if (midi.enabled) midiBtn.textContent = "🎛 " + midi.deviceName;
      };
      midiBtn.textContent = "🎛 " + midi.deviceName;
      midiBtn.classList.add("on");
      midiDeviceBtn.style.display = "";
      midiLearnBtn.style.display = "";
      midiMonitor.style.display = "";
    } catch (e) {
      console.error(e);
      midiBtn.textContent = "MIDI ✗";
    }
  }
});
midiModeSel.addEventListener("change", () => {
  midi.mode = midiModeSel.value as MidiMode;
});

// MIDI port picker (plusieurs interfaces MIDI branchées → choisir la bonne au lieu de tout fusionner)
midiDeviceBtn?.addEventListener("click", () => {
  if (midiDevicePanel.style.display !== "none") {
    midiDevicePanel.style.display = "none";
    return;
  }
  const btnRect = midiDeviceBtn.getBoundingClientRect();
  midiDevicePanel.style.left = `${Math.round(btnRect.left)}px`;
  midiDevicePanel.style.top = `${Math.round(btnRect.bottom + 4)}px`;
  midiDevicePanel.style.display = "block";
  if (!midi.enabled) {
    midiDeviceList.innerHTML = '<div style="padding:8px 12px;font-size:11px;color:var(--text-dim)">Activez MIDI d\'abord</div>';
    return;
  }
  const inputs = midi.listInputs();
  midiDeviceList.innerHTML = "";

  const mkBtn = (label: string, isActive: boolean, onClick: () => void): void => {
    const btn = document.createElement("button");
    btn.style.cssText = `
      display:block; width:100%; text-align:left; padding:7px 12px;
      background:${isActive ? "var(--accent-bg)" : "none"};
      color:${isActive ? "var(--accent)" : "var(--text-sec)"};
      border:none; border-bottom:1px solid var(--border-subtle);
      cursor:pointer; font-size:11px; font-family:var(--font-ui);
    `;
    btn.textContent = label;
    btn.addEventListener("click", onClick);
    midiDeviceList.appendChild(btn);
  };

  mkBtn("Tous les ports (fusion)", chosenMidiPortName === undefined, () => {
    chosenMidiPortName = undefined;
    try { localStorage.removeItem(MIDI_PORT_KEY); } catch {}
    midi.setInput(undefined);
    midiBtn.textContent = "🎛 " + midi.deviceName;
    midiDevicePanel.style.display = "none";
  });

  for (const dev of inputs) {
    mkBtn(dev.name, dev.name === chosenMidiPortName, () => {
      chosenMidiPortName = dev.name;
      try { localStorage.setItem(MIDI_PORT_KEY, dev.name); } catch {}
      midi.setInput(dev.name);
      midiBtn.textContent = "🎛 " + midi.deviceName;
      midiDevicePanel.style.display = "none";
    });
  }
  if (inputs.length === 0) {
    midiDeviceList.innerHTML = '<div style="padding:8px 12px;font-size:11px;color:var(--text-dim)">Aucun port MIDI détecté</div>';
  }
});

midiDeviceClose?.addEventListener("click", () => {
  midiDevicePanel.style.display = "none";
});

// --- MIDI Learn ---

type MidiTarget =
  | { type: "stageCap" }
  | { type: "layerBOpacity" }
  | { type: "brightness" }
  | { type: "scene"; idx: number }
  | { type: "generator"; idx: number }
  | { type: "effect"; idx: number }
  | { type: "disruptor"; idx: number }
  | { type: "disruptorToggle"; idx: number };

// cc === -1 → pitch bend ; note défini → mapping par note (ex : pads en mode Session, envoient des Note On/Off plutôt que des CC)
interface MidiCC { cc?: number; note?: number; target: MidiTarget }

const MIDI_MAP_KEY = "ts-midi-map";
let midiMap: MidiCC[] = [];
try { const s = localStorage.getItem(MIDI_MAP_KEY); if (s) midiMap = JSON.parse(s); } catch {}

let midiLearnMode = false;
let midiLearnPending: { target: MidiTarget; el: HTMLElement } | null = null;
let prevMidiBend = 0;

const midiLearnBtn = $<HTMLButtonElement>("midi-learn-btn");

function saveMidiMap(): void {
  try { localStorage.setItem(MIDI_MAP_KEY, JSON.stringify(midiMap)); } catch {}
}

// --- Feedback couleur des pads (Launchkey Session mode / Launchpad Programmer mode) ---
// Couleurs confirmées identiques sur les deux Programmer's Reference Guide Novation :
// 0 = éteint, 5 = rouge, 9 = orange, 45 = bleu.
const midiPadColorCache = new Map<number, number>(); // note → dernière couleur envoyée

function refreshMidiPadColors(): void {
  if (!midi.enabled) return;
  for (const m of midiMap) {
    if (m.note === undefined) continue;
    let color = 0;
    switch (m.target.type) {
      case "scene":           color = m.target.idx === activeSceneIdx ? 45 : 0; break;
      case "disruptorToggle": color = disruptorState[m.target.idx]?.enabled ? 5 : 0; break;
      case "effect":          color = (fxState[m.target.idx]?.amount ?? 0) > 0.05 ? 9 : 0; break;
      default: continue;
    }
    if (midiPadColorCache.get(m.note) !== color) {
      midiPadColorCache.set(m.note, color);
      midi.sendNoteOn(m.note, color, 0);
    }
  }
}

function parseMidiTarget(s: string): MidiTarget | null {
  if (s === "stageCap")     return { type: "stageCap" };
  if (s === "layerBOpacity") return { type: "layerBOpacity" };
  if (s === "brightness")   return { type: "brightness" };
  const sm = s.match(/^scene:(\d)$/);        if (sm) return { type: "scene",          idx: parseInt(sm[1]!) };
  const gm = s.match(/^generator:(\d+)$/);   if (gm) return { type: "generator",      idx: parseInt(gm[1]!) };
  const em = s.match(/^effect:(\d+)$/);      if (em) return { type: "effect",         idx: parseInt(em[1]!) };
  const dm = s.match(/^disruptor:(\d+)$/);   if (dm) return { type: "disruptor",      idx: parseInt(dm[1]!) };
  const dt = s.match(/^disruptor:(\d+):toggle$/); if (dt) return { type: "disruptorToggle", idx: parseInt(dt[1]!) };
  return null;
}

function applyMidiTarget(target: MidiTarget, value: number): void {
  switch (target.type) {
    case "stageCap":
      maxStages = Math.round(1 + value * 11);
      if (maxStagesInput) maxStagesInput.value = String(maxStages);
      if (maxStagesLabel) maxStagesLabel.textContent = `STAGES ${maxStages}`;
      break;
    case "layerBOpacity":
      layerBOpa.value = String(value);
      syncBlend();
      break;
    case "brightness":
      masterBrightnessAmount = value;
      masterBrightnessSlider.value = String(value);
      break;
    case "scene":
      if (value >= 0.5) recallScene(target.idx);
      break;
    case "generator":
      if (value >= 0.5) selectSource(target.idx);
      break;
    case "effect":
      if (fxState[target.idx]) {
        fxState[target.idx]!.amount = value;
        if (fxSliders[target.idx]) fxSliders[target.idx]!.value = String(value);
      }
      break;
    case "disruptor":
      if (disruptorState[target.idx]) {
        disruptorState[target.idx]!.sensitivity = value;
        if (disruptorSliders[target.idx]) disruptorSliders[target.idx]!.value = String(value);
      }
      break;
    case "disruptorToggle": {
      const on = value >= 0.5;
      if (disruptorState[target.idx]) {
        disruptorState[target.idx]!.enabled = on;
        if (disruptorCbs[target.idx]) disruptorCbs[target.idx]!.checked = on;
        disruptorCbs[target.idx]?.closest(".fx")?.classList.toggle("on", on);
      }
      break;
    }
  }
}

function midiTargetToSelector(target: MidiTarget): string | null {
  switch (target.type) {
    case "stageCap":          return "#max-stages";
    case "layerBOpacity":     return "#layer-b-opacity";
    case "brightness":        return "#master-brightness-slider";
    case "scene":             return `.scene-slot[data-idx="${target.idx}"]`;
    case "generator":         return `[data-midi-target="generator:${target.idx}"]`;
    case "effect":            return `[data-midi-target="effect:${target.idx}"]`;
    case "disruptor":         return `[data-midi-target="disruptor:${target.idx}"]`;
    case "disruptorToggle":   return `[data-midi-target="disruptor:${target.idx}:toggle"]`;
  }
}

function updateMidiBadges(): void {
  document.querySelectorAll<HTMLElement>("[data-midi-target]").forEach((el) => {
    el.classList.remove("midi-bound");
    el.title = el.title.replace(/\s*\[(?:CC\d+|PB|PAD\d+)\]/, "").trim();
  });
  for (const m of midiMap) {
    const sel = midiTargetToSelector(m.target);
    if (!sel) continue;
    const el = document.querySelector<HTMLElement>(sel);
    if (!el) continue;
    el.classList.add("midi-bound");
    const label = m.note !== undefined ? `PAD${m.note}` : m.cc === -1 ? "PB" : `CC${m.cc}`;
    el.title = (el.title || "").trim() + ` [${label}]`;
  }
}

function exitMidiLearn(): void {
  midiLearnMode = false;
  midiLearnPending = null;
  document.body.classList.remove("midi-learn");
  document.querySelectorAll(".learn-selected").forEach((x) => x.classList.remove("learn-selected"));
  midiLearnBtn.classList.remove("on");
}

function completeLearning(binding: { cc: number } | { note: number }): void {
  if (!midiLearnPending) return;
  const { target } = midiLearnPending;
  midiMap = midiMap.filter((m) => JSON.stringify(m.target) !== JSON.stringify(target));
  midiMap.push({ ...binding, target });
  saveMidiMap();
  updateMidiBadges();
  exitMidiLearn();
}

midiLearnBtn.addEventListener("click", () => {
  midiLearnMode = !midiLearnMode;
  if (midiLearnMode) {
    document.body.classList.add("midi-learn");
    midiLearnBtn.classList.add("on");
    midiLearnPending = null;
  } else {
    exitMidiLearn();
  }
});

// Clic sur un [data-midi-target] en learn mode → sélectionner le paramètre
document.addEventListener("mousedown", (e) => {
  if (!midiLearnMode) return;
  const el = (e.target as HTMLElement).closest("[data-midi-target]") as HTMLElement | null;
  if (!el) return;
  e.preventDefault(); e.stopPropagation();
  const target = parseMidiTarget(el.dataset.midiTarget!);
  if (!target) return;
  document.querySelectorAll(".learn-selected").forEach((x) => x.classList.remove("learn-selected"));
  el.classList.add("learn-selected");
  midiLearnPending = { target, el };
}, true);

// Clic droit sur un control mappé → débind
document.addEventListener("contextmenu", (e) => {
  const el = (e.target as HTMLElement).closest("[data-midi-target].midi-bound") as HTMLElement | null;
  if (!el) return;
  e.preventDefault();
  const target = parseMidiTarget(el.dataset.midiTarget!);
  if (!target) return;
  midiMap = midiMap.filter((m) => JSON.stringify(m.target) !== JSON.stringify(target));
  saveMidiMap();
  updateMidiBadges();
});

// Preset nanoKONTROL2 (Scene 1, factory CCs)
updateMidiBadges();

// --- Effect Sequencer ---

interface SeqStep {
  indices: number[];   // index dans fxState
  disIndices: number[]; // index dans disruptorState (préfixe D:)
  beats: number;       // durée en beats
  prob: number;        // probabilité 0-1
  alts: SeqStep[][];   // alternatives <A B C> (vide = pas d'alternance)
}

const FX_ID_MAP = new Map<string, number>(
  EFFECTS.map((e, i) => [e.id.toUpperCase(), i])
);
const DIS_ID_MAP = new Map<string, number>(
  DISRUPTORS.map((d, i) => [d.id.toUpperCase(), i])
);

function parseSeqPattern(src: string): SeqStep[] {
  const steps: SeqStep[] = [];
  const tokens = src.split(",").map(s => s.trim()).filter(Boolean);
  for (const tok of tokens) {
    const step = parseSeqToken(tok);
    if (step) steps.push(step);
  }
  return steps;
}

function parseSeqToken(tok: string): SeqStep | null {
  // Alternance <A B C>
  if (tok.startsWith("<") && tok.endsWith(">")) {
    const inner = tok.slice(1, -1).trim();
    const parts = inner.split(/\s+/);
    const alts = parts.map(p => { const s = parseSeqToken(p); return s ? [s] : []; }).filter(a => a.length > 0);
    if (!alts.length) return null;
    return { indices: [], disIndices: [], beats: 1, prob: 1, alts };
  }
  // Extraire *N et ?P où qu'ils soient, puis parser la partie noms
  const beatsM = tok.match(/\*(\d+(?:\.\d+)?)/);
  const probM  = tok.match(/\?(\d+)/);
  const beats  = beatsM ? parseFloat(beatsM[1]!) : 1;
  const prob   = probM  ? parseInt(probM[1]!) / 100 : 1;
  const namePart = tok.replace(/\*\d+(?:\.\d+)?/, "").replace(/\?\d+/, "").trim();
  const atoms = namePart.toUpperCase().split("+").map(s => s.trim()).filter(Boolean);
  const indices: number[] = [];
  const disIndices: number[] = [];
  for (const atom of atoms) {
    if (atom.startsWith("D:")) {
      const di = DIS_ID_MAP.get(atom.slice(2));
      if (di !== undefined) disIndices.push(di);
    } else {
      const fi = FX_ID_MAP.get(atom);
      if (fi !== undefined) indices.push(fi);
    }
  }
  if (!indices.length && !disIndices.length) return null;
  return { indices, disIndices, beats, prob, alts: [] };
}

let seqSteps: SeqStep[] = [];
let seqPlaying = false;
let seqStepIdx = 0;
let seqAltCycle = 0;
let seqBeatStart = -1;        // beatIdx où le step courant a commencé
let seqStepBeats = 0;         // durée du step courant
let seqActiveIndices: number[] = [];  // effets ON par le sequenceur

const seqInput   = document.getElementById("seq-input")   as HTMLInputElement;
const seqPlayBtn = document.getElementById("seq-play")   as HTMLButtonElement;
const seqStepLbl = document.getElementById("seq-step")   as HTMLSpanElement;

function seqApplyStep(step: SeqStep, on: boolean): void {
  for (const idx of step.indices) {
    if (fxState[idx]) fxState[idx]!.enabled = on;
  }
  for (const idx of step.disIndices) {
    if (disruptorState[idx]) disruptorState[idx]!.enabled = on;
    if (disruptorCbs[idx]) disruptorCbs[idx]!.checked = on;
    disruptorCbs[idx]?.closest(".fx")?.classList.toggle("on", on);
  }
}

function seqResolveStep(step: SeqStep): SeqStep {
  if (!step.alts.length) return step;
  const alt = step.alts[seqAltCycle % step.alts.length]!;
  seqAltCycle++;
  return alt[0]!;
}

function seqReset(): void {
  // Éteindre effets et disruptors gérés par le seq
  for (const idx of seqActiveIndices) {
    if (idx < EFFECTS.length) {
      if (fxState[idx]) fxState[idx]!.enabled = false;
    } else {
      const di = idx - EFFECTS.length;
      if (disruptorState[di]) disruptorState[di]!.enabled = false;
      if (disruptorCbs[di]) disruptorCbs[di]!.checked = false;
      disruptorCbs[di]?.closest(".fx")?.classList.remove("on");
    }
  }
  seqActiveIndices = [];
  seqStepIdx = 0;
  seqAltCycle = 0;
  seqBeatStart = -1;
}

function seqStop(): void {
  seqPlaying = false;
  seqPlayBtn.textContent = "▶";
  seqPlayBtn.classList.remove("on");
  seqStepLbl.textContent = "";
  seqReset();
}

function seqStart(): void {
  const src = seqInput.value.trim();
  seqSteps = parseSeqPattern(src);
  if (!seqSteps.length) return;
  seqPlaying = true;
  seqStepIdx = 0;
  seqAltCycle = 0;
  seqBeatStart = -1;
  seqActiveIndices = [];
  seqPlayBtn.textContent = "■";
  seqPlayBtn.classList.add("on");
}

seqPlayBtn.addEventListener("click", () => {
  if (seqPlaying) seqStop(); else seqStart();
});

seqInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") { if (seqPlaying) seqStop(); else seqStart(); }
  e.stopPropagation();
});


textBtn.addEventListener("click", () => {
  text.toggle(!text.enabled);
  textBtn.classList.toggle("on", text.enabled);
});

fullBtn.addEventListener("click", () => {
  window.synth?.toggleFullscreen();
});


// --- Master Brightness (independent of effects) ---
masterBrightnessToggle.addEventListener("click", () => {
  masterBrightnessEnabled = !masterBrightnessEnabled;
  masterBrightnessToggle.classList.toggle("on", masterBrightnessEnabled);
});

masterBrightnessSlider.addEventListener("input", () => {
  masterBrightnessAmount = Number(masterBrightnessSlider.value);
});

// Keyboard shortcut: B = toggle Master Brightness
document.addEventListener("keydown", (e) => {
  if (!e.ctrlKey && !e.shiftKey && (e.key === "b" || e.key === "B")) {
    const inInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement;
    if (!inInput) {
      e.preventDefault();
      masterBrightnessToggle.click();
    }
  }
});

// Industrial Mode: UI buttons (no keyboard shortcut — `i` is reserved for shader selection)
const industrialModeToggle = $<HTMLButtonElement>("industrial-mode-toggle");
const industrialPaletteBtn = $<HTMLButtonElement>("industrial-palette-btn");
const industrialHudBadge = $<HTMLSpanElement>("industrial-hud-badge");
function refreshIndustrialBadge() {
  industrialHudBadge.style.display = industrialModeEnabled ? "inline-block" : "none";
  industrialHudBadge.textContent = `⬛ INDUSTRIAL · ${PALETTE_NAMES[industrialPalette]}`;
}
industrialModeToggle.addEventListener("click", () => {
  industrialModeEnabled = !industrialModeEnabled;
  industrialModeToggle.classList.toggle("on", industrialModeEnabled);
  autoplayAdvanced.setIndustrialOnly(industrialModeEnabled);
  refreshIndustrialBadge();
});
industrialPaletteBtn.addEventListener("click", () => {
  industrialPalette = (industrialPalette + 1) % 4;
  industrialPaletteBtn.textContent = PALETTE_NAMES[industrialPalette]!;
  refreshIndustrialBadge();
});

// Auto-Perf toggle: enables the fps-driven graduated degrade (on by default).
const perfModeToggleBtn = $<HTMLButtonElement>("perf-mode-toggle");
perfModeToggleBtn.classList.toggle("on", autoPerfEnabled);
perfModeToggleBtn.addEventListener("click", () => {
  autoPerfEnabled = !autoPerfEnabled;
  perfModeToggleBtn.classList.toggle("on", autoPerfEnabled);
  if (!autoPerfEnabled && autoPerfLevel > 0) {
    autoPerfLevel = 0;
    lowFpsSeconds = 0;
    highFpsSeconds = 0;
    resizeCanvas();
  }
});

// Stage cap: bound concurrent effects+disruptors. Default 6 = generous but
// avoids the "everything is on" mush. Post-process stages are excluded.
let maxStages = 6;
const maxStagesInput = document.getElementById("max-stages") as HTMLInputElement | null;
const maxStagesLabel = document.getElementById("max-stages-label");
function refreshMaxStagesLabel(): void {
  if (maxStagesLabel) maxStagesLabel.textContent = `STAGES ${maxStages}`;
}
if (maxStagesInput) {
  maxStagesInput.value = String(maxStages);
  maxStagesInput.addEventListener("input", () => {
    const v = parseInt(maxStagesInput.value, 10);
    if (Number.isFinite(v)) maxStages = Math.max(1, Math.min(12, v));
    refreshMaxStagesLabel();
  });
}
refreshMaxStagesLabel();

// --- Sequencer UI update ---

// --- Raccourcis clavier ---
let focusMode = false;
function toggleFocus(): void {
  focusMode = !focusMode;
  document.body.classList.toggle("focus", focusMode);
}

function togglePerformanceMode(): void {
  performanceMode = !performanceMode;
  document.body.classList.toggle("performance", performanceMode);
  if (performanceMode) window.synth?.setFullscreen(true);
}

document.addEventListener("keydown", (e) => {
  const inInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement;

  // Toujours actifs
  if (e.key === "Escape") {
    if (performanceMode) { togglePerformanceMode(); return; }
    if (focusMode) { toggleFocus(); return; }
    window.synth?.setFullscreen(false);
  }
  if (e.key === "F11" || (!inInput && (e.key === "f" || e.key === "F")))
    window.synth?.toggleFullscreen();

  // Ctrl shortcuts — toujours actifs même si focus sur un input
  if (e.ctrlKey) {
    if (e.key === "s" && !e.shiftKey) { e.preventDefault(); presetSaveBtn.click(); return; }
    if (e.key === "o") { e.preventDefault(); presetLoadBtn.click(); return; }
    if (e.key === "r") { e.preventDefault(); recBtn.click(); return; }
  }

  if (inInput) return; // le reste est désactivé si on est dans un input

  // Tab = focus mode (canvas plein écran interne)
  if (e.key === "Tab") { e.preventDefault(); toggleFocus(); return; }

  // Shift+O = open output window (secondary display) or performance mode (single screen)
  if (e.shiftKey && (e.key === "o" || e.key === "O") && isControlMode) {
    e.preventDefault();
    window.synth?.openOutputWindow().then((success) => {
      if (!success) togglePerformanceMode(); // Single screen: use performance mode instead
    });
    return;
  }

  // Shift+P = performance mode (canvas fullscreen + HUD)
  if (e.shiftKey && (e.key === "p" || e.key === "P")) {
    e.preventDefault();
    togglePerformanceMode();
    return;
  }

  // Shift+T = tap tempo for BPM detection
  if (e.shiftKey && (e.key === "t" || e.key === "T")) {
    e.preventDefault();
    const bpm = musicAnalyzer.tapTempo();
    const bpmDisplay = document.getElementById("bpm-display");
    if (bpmDisplay) {
      bpmDisplay.style.background = "rgba(230, 25, 25, 0.3)";
      bpmDisplay.textContent = `♪ ${bpm} BPM`;
      setTimeout(() => {
        bpmDisplay.style.background = "transparent";
      }, 150);
    }
    return;
  }

  // H = toggle HUD visibility (in performance mode)
  if ((e.key === "h" || e.key === "H") && performanceMode) {
    e.preventDefault();
    hudVisible = !hudVisible;
    $("performance-hud").style.display = hudVisible ? "block" : "none";
    return;
  }

  // Espace = RECTA prochaine tactique
  if (e.key === " ") { e.preventDefault(); tactics.forceNext(performance.now()); return; }

  // A = audio toggle, M = midi toggle, X = ascii toggle, T = texte toggle
  if (e.key === "a" || e.key === "A") { audioBtn.click(); return; }
  if (e.key === "m" || e.key === "M") { midiBtn.click(); return; }
  if (e.key === "x" || e.key === "X") { asciiBtn.click(); return; }
  if (e.key === "t" || e.key === "T") { textBtn.click(); return; }

  // b = layer B toggle
  if (e.key === "b" || e.key === "B") { layerBBtn.click(); return; }

  // Easter egg: Alt+A = toggle ASCII glitch permanent overlay
  if (e.altKey && (e.key === "a" || e.key === "A")) {
    e.preventDefault();
    asciiGlitchPermanentEnabled = !asciiGlitchPermanentEnabled;
    console.log("🎨 ASCII Glitch Overlay: " + (asciiGlitchPermanentEnabled ? "ON" : "OFF"));
    return;
  }

  // 1-9, 0, q-p, a-k, ... → sélection du générateur
  const idx = SRC_KEYS.indexOf(e.key.toLowerCase());
  if (idx >= 0 && idx < SHADERS.length) { selectSource(idx); return; }
});

// --- Tailles ---
function resizeCanvas(): void {
  const scale = AUTO_PERF_SCALE[autoPerfLevel] ?? 1;
  const dpr = Math.min(window.devicePixelRatio || 1, 2) * scale;
  canvas.width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
  canvas.height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

let ASCII_COLS = 90;
const asciiColsRng = $<HTMLInputElement>("ascii-cols");
asciiColsRng.value = String(ASCII_COLS);
asciiColsRng.addEventListener("input", () => { ASCII_COLS = Number(asciiColsRng.value); });

// --- RECTA speed ---
tactics.holdMs = 24000;
const rectaSpeedRng = $<HTMLInputElement>("recta-speed");
rectaSpeedRng.value = "24000";
rectaSpeedRng.addEventListener("input", () => { tactics.holdMs = Number(rectaSpeedRng.value); });

// --- RECTA font size ---
const rectaFontSizeRng = $<HTMLInputElement>("recta-font-size");
rectaFontSizeRng.value = "14";
rectaFontSizeRng.addEventListener("input", () => { tactics.setFontSize(Number(rectaFontSizeRng.value)); });

// --- Global render filters: Monochrome, Green, Amber ---
let currentFilter: "none" | "monochrome" | "green" | "amber" = "none";

const rectaMonoBtn = $<HTMLButtonElement>("recta-mono");
const rectaGreenBtn = $<HTMLButtonElement>("recta-green");
const rectaAmberBtn = $<HTMLButtonElement>("recta-amber");

// Expose filter function globally for autoplay
window.applyRenderFilter = (mode: "none" | "monochrome" | "green" | "amber") => {
  applyFilter(mode);
};

const applyFilter = (mode: "none" | "monochrome" | "green" | "amber") => {
  currentFilter = mode;
  let filterStyle = "drop-shadow(0 0 0 transparent)"; // Base for composing filters

  switch (mode) {
    case "monochrome":
      filterStyle = "grayscale(100%) contrast(1.2)";
      break;
    case "green":
      filterStyle = "saturate(0.8) hue-rotate(-20deg) brightness(0.95)";
      break;
    case "amber":
      filterStyle = "saturate(0.9) hue-rotate(30deg) sepia(0.3) brightness(0.98)";
      break;
    default:
      filterStyle = "none";
  }

  // Apply filter style only (vignette is on #stage container now)
  canvas.style.filter = filterStyle;

  // Update button states
  rectaMonoBtn.classList.toggle("on", mode === "monochrome");
  rectaGreenBtn.classList.toggle("on", mode === "green");
  rectaAmberBtn.classList.toggle("on", mode === "amber");
};

// Toggle filters on/off
rectaMonoBtn.addEventListener("click", () => {
  applyFilter(currentFilter === "monochrome" ? "none" : "monochrome");
});
rectaGreenBtn.addEventListener("click", () => {
  applyFilter(currentFilter === "green" ? "none" : "green");
});
rectaAmberBtn.addEventListener("click", () => {
  applyFilter(currentFilter === "amber" ? "none" : "amber");
});

// --- Presets ---
interface Preset {
  version: 3;
  shaderIndex: number;
  layerB: { enabled: boolean; shaderIndex: number; blendMode: number; opacity: number };
  effects: { enabled: boolean; amount: number }[];
  rectaHoldMs: number;
}
const presetSaveBtn = $<HTMLButtonElement>("preset-save");
const presetLoadBtn = $<HTMLButtonElement>("preset-load");

presetSaveBtn.addEventListener("click", async () => {
  const preset: Preset = {
    version: 3,
    shaderIndex: currentShader,
    layerB: {
      enabled: layerBEnabled,
      shaderIndex: Number(layerBSel.value),
      blendMode: Number(blendSel.value),
      opacity: Number(layerBOpa.value),
    },
    effects: fxState.map((s) => ({ enabled: s.enabled, amount: s.amount })),
    rectaHoldMs: tactics.holdMs,
  };
  await window.synth?.saveFile(
    JSON.stringify(preset, null, 2),
    [{ name: "Preset terminal-synth", extensions: ["json"] }],
    "preset.json",
  );
});

presetLoadBtn.addEventListener("click", async () => {
  const result = await window.synth?.loadFile([
    { name: "Preset terminal-synth", extensions: ["json"] },
  ]);
  if (!result) return;
  try {
    const p: Preset = JSON.parse(result.content);
    // shader A
    if (p.shaderIndex >= 0 && p.shaderIndex < SHADERS.length) {
      shaderSel.value = String(p.shaderIndex);
      loadShader(p.shaderIndex);
    }
    // layer B
    layerBEnabled = p.layerB.enabled;
    layerBBtn.classList.toggle("on", layerBEnabled);
    layerBBtn.textContent = layerBEnabled ? "B on" : "B";
    if (p.layerB.shaderIndex >= 0 && p.layerB.shaderIndex < SHADERS.length)
      layerBSel.value = String(p.layerB.shaderIndex);
    blendSel.value  = String(p.layerB.blendMode);
    layerBOpa.value = String(p.layerB.opacity);
    loadLayerB(); syncBlend();
    // effets
    p.effects.forEach((e, i) => {
      if (!fxState[i]) return;
      fxState[i]!.enabled = e.enabled;
      fxState[i]!.amount  = e.amount;
    });
    // re-sync les checkboxes et sliders
    chain.querySelectorAll<HTMLInputElement>(".fx input[type=checkbox]").forEach((cb, i) => {
      cb.checked = fxState[i]?.enabled ?? false;
      cb.closest(".fx")?.classList.toggle("on", cb.checked);
    });
    chain.querySelectorAll<HTMLInputElement>(".fx input[type=range]").forEach((r, i) => {
      r.value = String(fxState[i]?.amount ?? 0.3);
    });
    // recta
    if (p.rectaHoldMs) { tactics.holdMs = p.rectaHoldMs; rectaSpeedRng.value = String(p.rectaHoldMs); }
  } catch (err) { console.error("[Preset]", err); }
});

// --- Scene Bank ---

interface Scene {
  shaderIndex: number;
  layerB: { enabled: boolean; shaderIndex: number; blendMode: number; opacity: number };
  effects: { enabled: boolean; amount: number }[];
  disruptors: { enabled: boolean; sensitivity: number }[];
  industrialMode: { enabled: boolean; palette: number };
  maxStages: number;
}

const SCENE_BANK_KEY = "ts-scene-bank";
let sceneBank: (Scene | null)[] = Array(6).fill(null);
try {
  const stored = localStorage.getItem(SCENE_BANK_KEY);
  if (stored) sceneBank = JSON.parse(stored);
} catch {}

function captureScene(): Scene {
  return {
    shaderIndex: currentShader,
    layerB: {
      enabled: layerBEnabled,
      shaderIndex: Number(layerBSel.value),
      blendMode: Number(blendSel.value),
      opacity: Number(layerBOpa.value),
    },
    effects: fxState.map((s) => ({ enabled: s.enabled, amount: s.amount })),
    disruptors: disruptorState.map((s) => ({ enabled: s.enabled, sensitivity: s.sensitivity })),
    industrialMode: { enabled: industrialModeEnabled, palette: industrialPalette },
    maxStages,
  };
}

function applyScene(scene: Scene): void {
  if (scene.shaderIndex >= 0 && scene.shaderIndex < SHADERS.length) {
    shaderSel.value = String(scene.shaderIndex);
    loadShader(scene.shaderIndex);
  }
  layerBEnabled = scene.layerB.enabled;
  layerBBtn.classList.toggle("on", layerBEnabled);
  layerBBtn.textContent = layerBEnabled ? "B on" : "B";
  if (scene.layerB.shaderIndex >= 0 && scene.layerB.shaderIndex < SHADERS.length)
    layerBSel.value = String(scene.layerB.shaderIndex);
  blendSel.value  = String(scene.layerB.blendMode);
  layerBOpa.value = String(scene.layerB.opacity);
  loadLayerB(); syncBlend();
  scene.effects.forEach((e, i) => {
    if (!fxState[i]) return;
    fxState[i]!.enabled = e.enabled;
    fxState[i]!.amount  = e.amount;
  });
  chain.querySelectorAll<HTMLInputElement>(".fx input[type=checkbox]").forEach((cb, i) => {
    cb.checked = fxState[i]?.enabled ?? false;
    cb.closest(".fx")?.classList.toggle("on", cb.checked);
  });
  chain.querySelectorAll<HTMLInputElement>(".fx input[type=range]").forEach((r, i) => {
    r.value = String(fxState[i]?.amount ?? 0.3);
  });
  const dsRows = disruptorsList.querySelectorAll<HTMLElement>(".fx");
  scene.disruptors.forEach((d, i) => {
    if (!disruptorState[i]) return;
    disruptorState[i]!.enabled     = d.enabled;
    disruptorState[i]!.sensitivity = d.sensitivity;
    const row  = dsRows[i];
    if (!row) return;
    const cb   = row.querySelector<HTMLInputElement>("input[type=checkbox]");
    const sens = row.querySelector<HTMLInputElement>("input[type=range]");
    if (cb)   { cb.checked = d.enabled; row.classList.toggle("on", d.enabled); }
    if (sens) sens.value = String(d.sensitivity);
  });
  industrialModeEnabled = scene.industrialMode.enabled;
  industrialPalette     = scene.industrialMode.palette;
  industrialModeToggle.classList.toggle("on", industrialModeEnabled);
  industrialPaletteBtn.textContent = PALETTE_NAMES[industrialPalette]!;
  autoplayAdvanced.setIndustrialOnly(industrialModeEnabled);
  refreshIndustrialBadge();
  maxStages = scene.maxStages;
  if (maxStagesInput) maxStagesInput.value = String(maxStages);
  if (maxStagesLabel) maxStagesLabel.textContent = `STAGES ${maxStages}`;
}

const sceneSlotBtns = Array.from(document.querySelectorAll<HTMLButtonElement>(".scene-slot"));

function updateSceneButtons(): void {
  sceneSlotBtns.forEach((btn, i) => btn.classList.toggle("filled", sceneBank[i] !== null));
}

function saveScene(idx: number): void {
  sceneBank[idx] = captureScene();
  try { localStorage.setItem(SCENE_BANK_KEY, JSON.stringify(sceneBank)); } catch {}
  updateSceneButtons();
}

let activeSceneIdx = -1;

function recallScene(idx: number): void {
  const scene = sceneBank[idx];
  if (scene) {
    applyScene(scene);
    activeSceneIdx = idx;
    refreshMidiPadColors();
  }
}

sceneSlotBtns.forEach((btn, i) => {
  btn.addEventListener("click", (e) => {
    if (e.ctrlKey) { e.preventDefault(); saveScene(i); }
    else recallScene(i);
  });
});

updateSceneButtons();

// Raccourcis scène via IPC (géré dans before-input-event côté main)
window.synth?.onSceneAction(({ idx, save }) => {
  if (save) saveScene(idx); else recallScene(idx);
});

// Program Change MIDI → rappel de scène (PC 0-5 = S1-S6)
midi.onProgramChange = (pc) => {
  if (pc < 0 || pc > 5) return;
  recallScene(pc);
  const btn = sceneSlotBtns[pc];
  if (btn) { btn.classList.add("active"); setTimeout(() => btn.classList.remove("active"), 250); }
};

// --- Enregistrement vidéo ---
const recBtn = $<HTMLButtonElement>("rec");
let recorder: MediaRecorder | null = null;
let recChunks: Blob[] = [];

recBtn.addEventListener("click", async () => {
  if (recorder && recorder.state === "recording") {
    recorder.stop();
    return;
  }
  recChunks = [];
  const withAudio = "video/webm;codecs=vp9,opus";
  const withoutAudio = "video/webm;codecs=vp9";
  const audioAvail = audio.enabled && !!audio.mediaStream;
  const mimeType = MediaRecorder.isTypeSupported(audioAvail ? withAudio : withoutAudio)
    ? (audioAvail ? withAudio : withoutAudio) : "video/webm";
  const stream = canvas.captureStream(60);
  // ajouter les pistes audio si capturées (système ou micro)
  if (audioAvail) {
    audio.mediaStream!.getAudioTracks().forEach((t) => stream.addTrack(t));
  }
  recorder = new MediaRecorder(stream, { mimeType });
  recorder.ondataavailable = (e) => { if (e.data.size > 0) recChunks.push(e.data); };
  recorder.onstop = () => {
    recBtn.classList.remove("rec");
    recBtn.textContent = "⏺ REC";
    const blob = new Blob(recChunks, { type: "video/webm" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `terminal-synth-${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
    recorder = null;
  };
  recorder.start(1000); // chunk toutes les secondes
  recBtn.classList.add("rec");
  recBtn.textContent = "⏹ STOP";
});

// ── Media loader ─────────────────────────────────────────────────────────────
{
  const mediaLoadBtn  = document.getElementById("media-load-btn")  as HTMLButtonElement | null;
  const mediaClearBtn = document.getElementById("media-clear-btn") as HTMLButtonElement | null;
  const mediaFileInput = document.getElementById("media-file-input") as HTMLInputElement | null;
  const mediaFilename  = document.getElementById("media-filename")  as HTMLElement | null;

  function setMediaLabel(name: string | null): void {
    if (mediaFilename) mediaFilename.textContent = name ?? "aucun média chargé";
    if (mediaClearBtn) mediaClearBtn.style.display = name ? "" : "none";
  }

  mediaLoadBtn?.addEventListener("click", () => mediaFileInput?.click());

  mediaFileInput?.addEventListener("change", () => {
    const file = mediaFileInput?.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const label = file.name.length > 36 ? "…" + file.name.slice(-33) : file.name;

    if (file.type.startsWith("video/")) {
      if (mediaVideo) { mediaVideo.pause(); mediaVideo.src = ""; }
      const vid = document.createElement("video");
      vid.src   = url;
      vid.loop  = true;
      vid.muted = true;
      vid.playsInline = true;
      vid.autoplay = true;
      vid.addEventListener("canplay", () => {
        void vid.play();
        pipeline.updateMedia(vid);
      }, { once: true });
      vid.load();
      mediaVideo  = vid;
      mediaIsVideo = true;
    } else {
      // Image
      mediaIsVideo = false;
      if (mediaVideo) { mediaVideo.pause(); mediaVideo.src = ""; mediaVideo = null; }
      const img = new Image();
      img.onload = () => { pipeline.updateMedia(img); URL.revokeObjectURL(url); };
      img.src = url;
    }
    setMediaLabel(label);
    if (mediaFileInput) mediaFileInput.value = "";
  });

  mediaClearBtn?.addEventListener("click", () => {
    if (mediaVideo) { mediaVideo.pause(); mediaVideo.src = ""; mediaVideo = null; }
    if (webcamStream) { webcamStream.getTracks().forEach(t => t.stop()); webcamStream = null; }
    if (webcamVideo) { webcamVideo.srcObject = null; webcamVideo = null; }
    mediaIsVideo  = false;
    mediaIsWebcam = false;
    pipeline.clearMedia();
    setMediaLabel(null);
    const wc = document.getElementById("media-webcam-controls");
    if (wc) wc.style.display = "none";
    const wcBtn = document.getElementById("media-webcam-btn") as HTMLButtonElement | null;
    if (wcBtn) { wcBtn.textContent = "📷 WEBCAM"; wcBtn.style.color = ""; }
  });

  // ── Webcam ──────────────────────────────────────────────────────────────────
  const webcamBtn      = document.getElementById("media-webcam-btn") as HTMLButtonElement | null;
  const webcamControls = document.getElementById("media-webcam-controls") as HTMLElement | null;
  const captureIntervalRng = document.getElementById("media-capture-interval") as HTMLInputElement | null;
  const captureIntervalVal = document.getElementById("media-capture-interval-val") as HTMLElement | null;
  const captureResSelect   = document.getElementById("media-capture-res")  as HTMLSelectElement | null;

  captureIntervalRng?.addEventListener("input", () => {
    captureIntervalMs = parseFloat(captureIntervalRng.value) * 1000;
    if (captureIntervalVal) captureIntervalVal.textContent = captureIntervalRng.value + "s";
  });

  captureResSelect?.addEventListener("change", () => {
    captureWidth = parseInt(captureResSelect.value);
    if (captureCanvas) {
      captureCanvas.width  = captureWidth;
      captureCanvas.height = Math.round(captureWidth * 9 / 16);
    }
  });

  webcamBtn?.addEventListener("click", async () => {
    if (mediaIsWebcam) {
      // Stop webcam
      if (webcamStream) { webcamStream.getTracks().forEach(t => t.stop()); webcamStream = null; }
      if (webcamVideo) { webcamVideo.srcObject = null; webcamVideo = null; }
      mediaIsWebcam = false;
      pipeline.clearMedia();
      setMediaLabel(null);
      if (webcamControls) webcamControls.style.display = "none";
      webcamBtn.textContent = "📷 WEBCAM";
      webcamBtn.style.color = "";
      return;
    }
    try {
      const videoConstraints: MediaTrackConstraints = chosenWebcamDeviceId
        ? { deviceId: { exact: chosenWebcamDeviceId } }
        : {};
      const stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: false });
      webcamStream = stream;
      const vid = document.createElement("video");
      vid.srcObject = stream;
      vid.muted = true;
      vid.playsInline = true;
      await vid.play();
      webcamVideo = vid;
      // Stop any file-based media
      if (mediaVideo) { mediaVideo.pause(); mediaVideo.src = ""; mediaVideo = null; }
      mediaIsVideo  = false;
      mediaIsWebcam = true;
      captureCanvas = document.createElement("canvas");
      captureCanvas.width  = captureWidth;
      captureCanvas.height = Math.round(captureWidth * 9 / 16);
      captureCtx = captureCanvas.getContext("2d", { alpha: false });
      lastCaptureTime = 0;
      setMediaLabel("📷 webcam");
      if (webcamControls) webcamControls.style.display = "flex";
      webcamBtn.textContent = "⏹ STOP WEBCAM";
      webcamBtn.style.color = "var(--accent)";
    } catch (err) {
      console.error("[Webcam] getUserMedia failed:", err);
      setMediaLabel("⚠ webcam refusée");
    }
  });
}

function asciiGrid(): { cols: number; rows: number } {
  const cw = app.clientWidth;
  const ch = app.clientHeight;
  const cols = ASCII_COLS;
  const fontSize = cw / cols / 0.6;
  const rows = Math.max(1, Math.floor(ch / fontSize));
  pre.style.fontSize = fontSize.toFixed(2) + "px";
  pre.style.lineHeight = fontSize.toFixed(2) + "px";
  return { cols, rows };
}

// Apply parameter value from sequencer or MIDI learn
function applyParameterValue(paramId: string, value: number): void {
  const parts = paramId.split(".");

  if (parts[0] === "shader" && parts.length >= 2) {
    const paramIndex = parseInt(parts[1].replace("u_p", ""));
    if (paramIndex >= 0 && paramIndex < 4) {
      currentParamValues[paramIndex] = value;
      pipeline.setGenParams(currentParamValues);
    }
  } else if (parts[0] === "effect" && parts.length >= 3) {
    const fxIndex = parseInt(parts[1]);
    if (fxIndex >= 0 && fxIndex < fxState.length) {
      fxState[fxIndex].amount = value;
    }
  } else if (parts[0] === "disruptor" && parts.length >= 3) {
    const disIndex = parseInt(parts[1]);
    if (disIndex >= 0 && disIndex < disruptorState.length) {
      disruptorState[disIndex].sensitivity = value;
    }
  } else if (parts[0] === "layer" && parts.length >= 3 && parts[1] === "b") {
    if (parts[2] === "opacity") {
      layerBOpa.value = String(value);
      syncBlend();
    }
  }
}

// --- Boucle ---
function frame(now: number): void {
  const frameStart = performance.now();
  const time = now / 1000;

  // Update FPS counter
  frameCount++;
  const elapsed = frameStart - lastFpsTime;
  if (elapsed >= 1000) {
    fps = Math.round((frameCount * 1000) / elapsed);
    lastFpsTime = frameStart;
    frameCount = 0;

    // Auto-Perf controller (1Hz): degrade after 5s under 50fps,
    // recover after 10s above 58fps. Hysteresis avoids oscillation.
    if (autoPerfEnabled) {
      if (fps < 50) { lowFpsSeconds++; highFpsSeconds = 0; }
      else if (fps >= 58) { highFpsSeconds++; lowFpsSeconds = 0; }
      else { lowFpsSeconds = 0; highFpsSeconds = 0; }
      if (lowFpsSeconds >= 5 && autoPerfLevel < 3) {
        autoPerfLevel++;
        lowFpsSeconds = 0;
        resizeCanvas();
      } else if (highFpsSeconds >= 10 && autoPerfLevel > 0) {
        autoPerfLevel--;
        highFpsSeconds = 0;
        resizeCanvas();
      }
    }
  }

  if (audio.enabled) {
    audio.sample();
    const b = audio.bands();
    bands.bass += (b.bass - bands.bass) * 0.3;
    bands.mid += (b.mid - bands.mid) * 0.3;
    bands.treble += (b.treble - bands.treble) * 0.3;
    bands.level += (b.level - bands.level) * 0.3;
  }
  audio.fillTexData(audioData);
  pipeline.updateAudio(audioData);

  // Music analysis — spectral flux onset + ACF BPM, spectre brut passé pour la précision
  const rawBands = audio.bands();
  const analysis = musicAnalyzer.analyze(rawBands, audioData.subarray(0, 256));

  if (analysis) {
    autoplayAdvanced.updateAudioEnergy(bands.bass, bands.mid, bands.treble);
    if (analysis.bpmConfidence > 0.5) autoplayAdvanced.setBPM(analysis.bpm);
  }

  analyzeFrameCounter++;
  if (analyzeFrameCounter >= ANALYZE_INTERVAL) {
    analyzeFrameCounter = 0;
    if (analysis) {
      if (musicInfoElements.bpmDisplay) {
        musicInfoElements.bpmDisplay.textContent = `${analysis.bpm}`;
        musicInfoElements.bpmDisplay.style.color =
          analysis.bpmConfidence > 0.5 ? "var(--orange)" : "var(--text-dim)";
      }
      if (musicInfoElements.energyDisplay) {
        const percent = Math.round(analysis.energy * 100);
        musicInfoElements.energyDisplay.textContent = `${percent}%`;
        const color = percent > 70 ? "#ff6b6b" : percent > 40 ? "var(--accent)" : "#6dd5a3";
        musicInfoElements.energyDisplay.style.color = color;
      }
    }
  }

  // MIDI = contrôle : on replie l'énergie/mod dans les canaux existants.
  midi.update();
  // Témoin d'activité façon DAW : le bouton s'illumine tant que des messages arrivent.
  midiBtn.classList.toggle("midi-activity", midi.enabled && performance.now() - midi.lastActivityAt < 150);
  if (midi.enabled) {
    midiMonitor.textContent = midi.lastEventLabel;
    const lastCC = midi.getAndClearLastCC();
    const lastNote = midi.getAndClearLastNote();
    if (midiLearnMode && midiLearnPending) {
      // Détection : CC, pad (note) ou mouvement pitch bend significatif
      if (lastCC) {
        completeLearning({ cc: lastCC.cc });
      } else if (lastNote && lastNote.velocity > 0) {
        completeLearning({ note: lastNote.note });
      } else if (Math.abs(midi.bend - prevMidiBend) > 0.08) {
        completeLearning({ cc: -1 });
      }
    } else if (!midiLearnMode) {
      if (lastCC) {
        for (const m of midiMap) {
          if (m.cc === lastCC.cc) applyMidiTarget(m.target, lastCC.value / 127);
        }
      }
      if (lastNote) {
        for (const m of midiMap) {
          if (m.note === lastNote.note) applyMidiTarget(m.target, lastNote.velocity / 127);
        }
      }
      if (midi.bend !== prevMidiBend) {
        for (const m of midiMap) {
          if (m.cc === -1) applyMidiTarget(m.target, (midi.bend + 1) / 2);
        }
      }
    }
    prevMidiBend = midi.bend;
    refreshMidiPadColors(); // rattrape aussi les changements venus de l'autoplay
  }
  const e = midi.energy;
  const mod = midi.mod;
  const noise = midi.mode === "noise";

  // --- Beat phase & envelope (depuis BPM détecté, indépendant de l'autoplay) ---
  const bpmNow    = musicAnalyzer.getBPM();
  const beatMs    = 60_000 / bpmNow;
  const beatIdx   = Math.floor(now / beatMs);
  beatPhase       = (now % beatMs) / beatMs;          // 0→1 sawtooth
  const onBeat    = beatIdx !== lastBeatIdx;
  if (onBeat) { lastBeatIdx = beatIdx; beatEnv = 1.0; }
  beatEnv        *= 0.82;                             // decay ~0.15s flash à 60fps

  // --- Effect Sequencer tick ---
  if (seqPlaying && seqSteps.length) {
    if (seqBeatStart < 0) seqBeatStart = beatIdx;     // premier beat
    const elapsed = beatIdx - seqBeatStart;
    if (elapsed >= seqStepBeats) {
      // Éteindre step précédent
      for (const idx of seqActiveIndices) {
        if (fxState[idx]) fxState[idx]!.enabled = false;
      }
      seqActiveIndices = [];
      // Avancer au step suivant
      const raw = seqSteps[seqStepIdx % seqSteps.length]!;
      const step = seqResolveStep(raw);
      seqStepIdx++;
      seqBeatStart = beatIdx;
      seqStepBeats = step.beats;
      const stepNum = ((seqStepIdx - 1) % seqSteps.length) + 1;
      seqStepLbl.textContent = `${stepNum}/${seqSteps.length}`;
      if (Math.random() < step.prob) {
        seqApplyStep(step, true);
        seqActiveIndices = [...step.indices, ...step.disIndices.map(i => i + EFFECTS.length)];
      }
    }
  }

  // Sequencer update (BPM-synced automation)
  // Énergie globale + détection de hit (front montant) → pioche d'une nouvelle tactique.
  const energy = Math.max(bands.bass, e);
  const hit = energy > 0.55 && prevEnergy <= 0.55;
  prevEnergy = energy;
  // Toujours mettre à jour les tactiques (Laser write et autres shaders en ont besoin)
  if (hit) tactics.forceNext(now);
  tactics.update(now);
  tactics.draw(now, energy);
  pipeline.updateText(tactics.canvas);
  if (mediaIsVideo && mediaVideo && mediaVideo.readyState >= 2) {
    pipeline.updateMedia(mediaVideo);
  }
  if (mediaIsWebcam && webcamVideo && webcamVideo.readyState >= 2 && captureCtx && captureCanvas) {
    const nowMs = performance.now();
    if (nowMs - lastCaptureTime >= captureIntervalMs) {
      lastCaptureTime = nowMs;
      captureCtx.drawImage(webcamVideo, 0, 0, captureCanvas.width, captureCanvas.height);
      pipeline.updateMedia(captureCanvas, true);
    }
  }

  // Boost de niveau sur le beat : tous les effets sensibles à u_level pulsent en rythme
  const levelOnBeat = Math.min(1, Math.max(bands.level, e) + beatEnv * 0.25);

  const u = {
    time,
    bass:    Math.max(bands.bass, noise ? e : e * 0.4),
    mid:     Math.max(bands.mid, mod),
    treble:  Math.max(bands.treble, noise ? e * 0.8 : 0),
    level:   levelOnBeat,
    beat:    beatPhase,
    beatEnv: beatEnv,
  };

  const stages: Stage[] = [];
  for (let i = 0; i < EFFECTS.length; i++) {
    const st = fxState[i];
    if (!st.enabled) continue;
    const prog = fxProg[i];
    if (!prog) continue;
    let amt = st.amount;
    if (midi.enabled) {
      if (noise && (i === 0 || i === 2)) amt = Math.max(amt, e);
      else if (!noise && i === 1) amt = Math.max(amt, e * 0.6);
    }
    stages.push({ fx: prog, amount: amt });
  }

  // Perturbateurs : déclenchés par pic audio (valeur non lissée)
  const rawEnergy = Math.max(bands.bass, e);
  const nowMs = performance.now();
  for (const ds of disruptorState) {
    if (!ds.enabled || !ds.prog) continue;
    if (nowMs < ds.fireUntil) {
      stages.push({ fx: ds.prog, amount: ds.amount });
    } else if (nowMs - ds.lastFire > ds.cooldownMs) {
      const threshold = 1.0 - ds.sensitivity * 0.75;
      // Déclenchement normal (niveau audio) OU sur le beat si signal présent
      const beatTrigger = onBeat && rawEnergy > 0.15 && Math.random() < ds.sensitivity * 0.6;
      if (rawEnergy > threshold || Math.random() < rawEnergy * ds.sensitivity * 0.02 || beatTrigger) {
        ds.lastFire = nowMs;
        // Sur le beat : durée légèrement plus courte pour un glitch net, pas trainant
        const durationMult = beatTrigger ? (0.4 + Math.random() * 0.4) : (0.6 + Math.random() * 0.8);
        ds.fireUntil = nowMs + ds.durationMs * durationMult;
        stages.push({ fx: ds.prog, amount: ds.amount });
      }
    }
  }

  // Cap the effects+disruptors stage budget (post-process passes added below
  // don't count). Drops the most recently pushed entries first — disruptors
  // get trimmed before steady effects. Auto-Perf squeezes the cap further.
  const effectiveMaxStages = Math.max(2, maxStages - autoPerfLevel * 2);
  if (stages.length > effectiveMaxStages) stages.length = effectiveMaxStages;

  // Industrial Mode: append as final GL post-process before output.
  // Palette is packed into the amount value (quarter-range encoding).
  if (industrialModeEnabled && industrialModeProg) {
    const paletteAmount = (industrialPalette + 0.5) / 4.0; // midpoint of quarter
    stages.push({ fx: industrialModeProg, amount: paletteAmount });
  }

  // Master Brightness: add as final stage if enabled (independent of effects)
  if (masterBrightnessEnabled) {
    const masterBrightnessShader = `
vec3 process(vec2 uv) {
  vec3 col = prev(uv);
  float intensity = mix(0.3, 2.0, u_level);
  col = 1.0 - exp(-col * intensity);
  return col;
}`;
    // Note: Master Brightness is applied inline below in rendering
  }

  if (asciiMode) {
    // Pixel readback stalls the GPU pipeline — 30Hz is indistinguishable
    // for ASCII text and halves the sync cost. Canvas is hidden in this
    // mode, so skipped frames lose nothing.
    if (frameStart - lastAsciiReadMs >= 33) {
      lastAsciiReadMs = frameStart;
      const { cols, rows } = asciiGrid();
      const px = pipeline.render(stages, cols, rows, u, true);
      if (px) pre.innerHTML = pixelsToAsciiColorGlitch(px, cols, rows);
    }
  } else {
    pipeline.render(stages, canvas.width, canvas.height, u, false);

    // Apply Master Brightness post-process via CSS filter on canvas
    if (masterBrightnessEnabled) {
      // Smooth audio level (exponential moving average) — slower alpha = smoother.
      smoothedAudioLevel = smoothedAudioLevel * 0.85 + u.level * 0.15;

      // Power curve: dramatic response at low levels, gentler at high.
      const normalizedLevel = Math.pow(smoothedAudioLevel, 0.55);

      // Slider = audio-reactivity strength.
      //   amount = 0   -> floor 100% (no effect, identity)
      //   amount = 0.5 -> floor 50%  (fades between 50% and 100%)
      //   amount = 1   -> floor 1%   (full fade-to-black)
      const floor = 100 - masterBrightnessAmount * 99;
      const brightnessPercent = floor + normalizedLevel * (100 - floor);

      canvas.style.filter = `brightness(${Math.max(1, Math.min(100, brightnessPercent))}%)`;

      // Auto-switch safety: read average luminance via WebGL.
      // readPixels forces a GPU sync — 2Hz is plenty for a safety probe.
      try {
        if (frameStart - lastLumProbeMs >= 500) {
          lastLumProbeMs = frameStart;
          const gl = pipeline.getGL();
          const w = Math.min(canvas.width, 256);
          const h = Math.min(canvas.height, 256);
          const pixels = new Uint8Array(w * h * 4);
          gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

          let totalLum = 0;
          for (let i = 0; i < pixels.length; i += 4) {
            const lum = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
            totalLum += lum;
          }
          const avgLum = totalLum / (pixels.length / 4) / 255;

          // Auto-switch if image is too dark/bright
          if (avgLum < 0.05 || avgLum > 0.95) {
            if (Math.random() < 0.08) {
              canvas.style.filter = "none";
              selectSource((currentShader + 1) % SHADERS.length);
            }
          }
        }
      } catch (e) {
        // Fail silently if pixel reading is not available
      }
    } else {
      canvas.style.filter = "none";
    }
  }

  // Permanent ASCII glitch layer (disabled by default, enable with Ctrl+Alt+A)
  if (asciiGlitchPermanentEnabled && Math.random() < 0.3) { // Update ~30% of frames to reduce CPU
    const { cols, rows } = asciiGrid();
    const px = pipeline.render(stages, Math.floor(cols * 0.5), Math.floor(rows * 0.5), u, true);
    if (px) {
      const glitchContent = pixelsToAsciiColorGlitch(px, Math.floor(cols * 0.5), Math.floor(rows * 0.5));
      const asciiGlitch = $("ascii-glitch-permanent");
      asciiGlitch.innerHTML = glitchContent;
    }
  } else if (!asciiGlitchPermanentEnabled) {
    const asciiGlitch = $("ascii-glitch-permanent");
    asciiGlitch.innerHTML = "";
  }


  text.energy = energy;
  text.update(now);

  const pct = (v: number) => String(Math.round(v * 100)).padStart(3, " ");
  // FPS / frame-time / resolution always visible — diagnostic during perf work.
  const ftMs = frameTimeMs.toFixed(1);
  const fpsTag = fps >= 55 ? "fps" : fps >= 45 ? "FPS" : "FPS!";
  let line = `${fps} ${fpsTag} ${ftMs}ms ${canvas.width}×${canvas.height}  ·  bass${pct(bands.bass)} mid${pct(bands.mid)} hi${pct(bands.treble)}`;
  if (autoPerfLevel > 0) line += `  ·  AUTOPERF L${autoPerfLevel}`;
  if (midi.enabled) line += `  · midi ${midi.mode} e${pct(e)} poly${midi.polyphony}`;
  meter.textContent = line;

  // Calculate frame time and update metrics
  frameTimeMs = performance.now() - frameStart;
  peakFrameTimeMs = Math.max(peakFrameTimeMs, frameTimeMs);

  // Update performance HUD
  if (performanceMode) {
    const hud = $("performance-hud");
    const layerA = SHADERS[currentShader]?.name || "—";
    const layerB = layerBEnabled ? SHADERS[Number(layerBSel.value)]?.name || "—" : "";
    const activeFx = Array.from(document.querySelectorAll(".fx.on")).length;
    const resolution = `${canvas.width}×${canvas.height}`;
    const targetFps = 60;
    const frameTimeTarget = (1000 / targetFps).toFixed(1);
    const fpsColor = fps >= 55 ? "#0f0" : fps >= 45 ? "#ff0" : "#f44";
    const frameTimeColor = frameTimeMs <= 16.7 ? "#0f0" : frameTimeMs <= 22 ? "#ff0" : "#f44";

    hud.innerHTML = `
      <div style="font-weight:700;margin-bottom:4px">TERMINAL·SYNTH v${APP_VERSION}</div>
      <div style="font-size:11px;margin-bottom:6px;line-height:1.5;color:${fpsColor};font-weight:600">
        ${fps} fps · ${frameTimeMs.toFixed(2)}ms
      </div>
      <div style="font-size:10px;margin-bottom:6px;line-height:1.4">
        <div>A: ${layerA}${layerB ? ` | B: ${layerB}` : ""}</div>
        <div>${resolution} · ${activeFx} fx</div>
      </div>
      <div style="font-size:10px;margin-bottom:6px;color:#999">
        bass${pct(bands.bass)} · cpu ${cpuUsage}% · gpu ${gpuUsage}%
      </div>
      <div style="font-size:9px;color:#666">
        [Shift+P] exit · [H] hud · Peak: ${peakFrameTimeMs.toFixed(1)}ms
      </div>
    `;
  }

  requestAnimationFrame(frame);
}

// MIRE TV ORTF - Display at startup
let mireVisible = true;

function hideMire(): void {
  mireElement.style.opacity = "0";
  mireElement.style.visibility = "hidden";
  mireElement.style.pointerEvents = "none";
  mireVisible = false;
}

// Failsafe: the overlay is a boot splash — it must never outlive the mire,
// whatever path autoplay takes to move on (Layer B, effects, direct gen swap).
setTimeout(() => { if (mireVisible) hideMire(); }, 10000);

function updateMireTime(): void {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  mireTimeElement.textContent = `${h}:${m}:${s}`;
}

// Initialize mire at startup
updateMireTime();
setInterval(updateMireTime, 1000);

requestAnimationFrame(frame);

// Update CPU/GPU stats every 500ms
setInterval(() => {
  window.synth?.getStats().then((stats) => {
    cpuUsage = stats.cpu;
    gpuUsage = stats.gpu;
  });
}, 500);


// --- Autoplay Advanced: Full generative system ---
autoplayAdvanced.init(120);

// Aligner beatEnv sur le métronomé de l'autoplay quand il tourne (beat 0 = downbeat)
autoplayAdvanced.setMetronomeCallback((_measure, beat) => {
  if (beat === 0) beatEnv = 1.0; // downbeat = flash fort
  else            beatEnv = Math.max(beatEnv, 0.45); // autres beats = flash demi
});

// Status display
const statusEl = $("autoplay-status");
setInterval(() => {
  const status = autoplayAdvanced.getStatus();
  statusEl.textContent = status.running
    ? `${status.preset} · M${status.measure}/${status.nextChangeAt}`
    : "—";
}, 100);

// Preset buttons (toggleable - click to start, re-click to stop)
let autoplayRunning = false;
let activeAutoplayBtn: HTMLElement | null = null;

const setupAutoplayButton = (btnId: string, presetName: "gentle" | "chaotic" | "psycho" | "glitch") => {
  ($<HTMLButtonElement>(btnId)).addEventListener("click", () => {
    const btn = $<HTMLElement>(btnId);
    if (autoplayRunning && activeAutoplayBtn === btn) {
      // Stop autoplay
      autoplayAdvanced.stop();
      btn.classList.remove("on");
      autoplayRunning = false;
      activeAutoplayBtn = null;
    } else {
      // Start autoplay
      if (autoplayRunning && activeAutoplayBtn) {
        activeAutoplayBtn.classList.remove("on");
      }
      autoplayAdvanced.start(presetName);
      btn.classList.add("on");
      autoplayRunning = true;
      activeAutoplayBtn = btn;
    }
  });
};

setupAutoplayButton("autoplay-gentle", "gentle");
setupAutoplayButton("autoplay-chaotic", "chaotic");
setupAutoplayButton("autoplay-psycho", "psycho");
setupAutoplayButton("autoplay-glitch", "glitch");

// Generative loop
($<HTMLButtonElement>("loop-record")).addEventListener("click", () => {
  autoplayAdvanced.recordGenerativeLoop(8);
  ($("loop-record") as HTMLElement).classList.add("on");
});
($<HTMLButtonElement>("loop-freeze")).addEventListener("click", () => {
  autoplayAdvanced.freezeGenerativeLoop();
  ($("loop-freeze") as HTMLElement).classList.toggle("on");
});

// History
($<HTMLButtonElement>("undo")).addEventListener("click", () => {
  autoplayAdvanced.undo();
});
($<HTMLButtonElement>("redo")).addEventListener("click", () => {
  autoplayAdvanced.redo();
});
($<HTMLButtonElement>("session-export")).addEventListener("click", () => {
  const session = autoplayAdvanced.exportSession();
  window.synth?.saveFile(session, [{ name: "JSON", extensions: ["json"] }], "autoplay-session.json");
});


// --- Text Layer: Giant Pixelated Text ---
textLayer.init(app);

const textLayerBtn = $<HTMLButtonElement>("text-layer-toggle");
const textPixelationSlider = $<HTMLInputElement>("text-pixelation");
const textSizeSlider = $<HTMLInputElement>("text-size");
const textConfigBtn = $<HTMLButtonElement>("text-config");
const textConfigPanel = $("text-config-panel");
const textConfigCloseBtn = $<HTMLButtonElement>("text-config-close");

// textLayer démarre enabled:true — on synchronise le bouton et on respecte localStorage si "off"
{
  const saved = localStorage.getItem("ts-textlayer");
  if (saved === "off") {
    textLayer.toggle(); // désactive (part de true → false)
  } else {
    textLayerBtn.classList.add("on"); // déjà activé par défaut
  }
}

// Toggle text layer + persist
textLayerBtn.addEventListener("click", () => {
  textLayer.toggle();
  textLayerBtn.classList.toggle("on");
  localStorage.setItem("ts-textlayer", textLayer.isEnabled ? "on" : "off");
});

// Pixelation control
textPixelationSlider.addEventListener("input", () => {
  const level = parseInt(textPixelationSlider.value);
  textLayer.updateConfig({ pixelationLevel: level });
});

// Size control
textSizeSlider.addEventListener("input", () => {
  const size = parseInt(textSizeSlider.value);
  textLayer.updateConfig({ fontSize: size });
});

// Config panel
textConfigBtn.addEventListener("click", () => {
  const panel = textConfigPanel as HTMLElement;
  panel.style.display = panel.style.display === "none" ? "block" : "none";
});

textConfigCloseBtn.addEventListener("click", () => {
  (textConfigPanel as HTMLElement).style.display = "none";
});

// Config controls
const textWordsTextarea = $<HTMLTextAreaElement>("text-words");
const textColorInput = $<HTMLInputElement>("text-color");
const textOpacitySlider = $<HTMLInputElement>("text-opacity");
const textOpacityVal = $("text-opacity-val");
const textDurationSlider = $<HTMLInputElement>("text-duration");
const textDurationVal = $("text-duration-val");
const textAudioReactiveCheckbox = $<HTMLInputElement>("text-audio-reactive");
const textApplyBtn = $<HTMLButtonElement>("text-apply");

// Update opacity display
textOpacitySlider.addEventListener("input", () => {
  textOpacityVal.textContent = textOpacitySlider.value;
});

// Update duration display
textDurationSlider.addEventListener("input", () => {
  textDurationVal.textContent = textDurationSlider.value;
});

// Apply button
textApplyBtn.addEventListener("click", () => {
  const words = textWordsTextarea.value.split("\n").map((w) => w.trim());
  textLayer.updateConfig({
    words,
    color: textColorInput.value,
    opacity: parseFloat(textOpacitySlider.value) / 100,
    duration: parseInt(textDurationSlider.value),
    audioReactive: textAudioReactiveCheckbox.checked,
  });
  (textConfigPanel as HTMLElement).style.display = "none";
});

// Feed audio energy to text layer
setInterval(() => {
  textLayer.updateAudioEnergy(bands.level);
  textLayer.updateAudioFrequency(bands.mid);
}, 50);

// Apply active effects to text layer
setInterval(() => {
  const activeEffects = fxState
    .map((fx, idx) => ({
      name: EFFECTS[idx].name,
      enabled: fx.enabled,
      amount: fx.amount,
    }))
    .filter((fx) => fx.enabled);

  textLayer.applyActiveEffects(activeEffects);
}, 50);

