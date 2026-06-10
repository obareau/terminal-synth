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
import { parseISF } from "./isf";
import { BLEND_MODES } from "./gl";
import { DISRUPTORS } from "./disruptors";
import { autoplayAdvanced, AUTOPLAY_PRESETS } from "./autoplayAdvanced";
import { textLayer } from "./textLayer";
import { MusicAnalyzer } from "./musicAnalyzer";
import { AutoplayAdapter } from "./autoplayAdapter";

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

// Mode variables (output window / performance overlay)
const isOutputMode = new URLSearchParams(window.location.search).get("mode") === "output";
const isControlMode = !isOutputMode;
let performanceMode = false;
let hudVisible = true;
let cpuUsage = 0;
let gpuUsage = 0;

// Performance metrics
let frameCount = 0;
let lastFpsTime = performance.now();
let fps = 0;
let frameTimeMs = 0;
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
const asciiBtn = $<HTMLButtonElement>("ascii-toggle");
const textBtn = $<HTMLButtonElement>("text-toggle");
const fullBtn = $<HTMLButtonElement>("full");
const isfBtn  = $<HTMLButtonElement>("isf-load");
const spoutBtn = $<HTMLButtonElement>("spout");
const blendSel  = $<HTMLSelectElement>("blend-mode");
const layerBSel = $<HTMLSelectElement>("layer-b-shader");
const layerBBtn = $<HTMLButtonElement>("layer-b-on");
const layerBOpa = $<HTMLInputElement>("layer-b-opacity");
const midiBtn = $<HTMLButtonElement>("midi");
const midiModeSel = $<HTMLSelectElement>("midi-mode");
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
const bands: Bands = { bass: 0, mid: 0, treble: 0, level: 0 };
const audioData = new Uint8Array(512); // 256 spectre + 256 waveform → texture audio

// Cache music info display elements (avoid DOM lookups every frame)
const musicInfoElements = {
  bpmDisplay: document.getElementById("bpm-display") as HTMLElement | null,
  energyDisplay: document.getElementById("energy-display") as HTMLElement | null,
  styleDisplay: document.getElementById("style-display") as HTMLElement | null,
};

// Only analyze music every 60 frames (~1x per second at 60fps) - minimal CPU
let analyzeFrameCounter = 0;
const ANALYZE_INTERVAL = 60;

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

SHADERS.forEach((s, i) => {
  // select caché (logique preset)
  const o = document.createElement("option");
  o.value = String(i); o.textContent = s.name;
  shaderSel.appendChild(o);
  const o2 = o.cloneNode(true) as HTMLOptionElement;
  layerBSel.appendChild(o2);

  // Déterminer la catégorie
  const cat = getCategory(s.name);

  // liste visuelle cliquable
  const item = document.createElement("div");
  item.className = "src-item";
  item.dataset["idx"] = String(i);
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
};

for (const [cat, items] of allItems) {
  const container = listContainers[cat];
  if (container) {
    items.forEach(item => container.appendChild(item));
  }
}

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
  if (mireVisible && i !== 0) {
    const mireEl = document.getElementById("mire-overlay");
    if (mireEl) {
      mireEl.style.opacity = "0";
      mireEl.style.visibility = "hidden";
      mireEl.style.pointerEvents = "none";
    }
    mireVisible = false;
  }

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
  rng.addEventListener("input", () => {
    st.amount = Number(rng.value);
  });
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

DISRUPTORS.forEach((d, i) => {
  const st   = disruptorState[i]!;
  const row  = document.createElement("div");
  row.className = "fx";
  row.style.cssText = "grid-template-columns:20px 1fr 64px";

  const cb = document.createElement("input");
  cb.type  = "checkbox";
  cb.addEventListener("change", () => {
    st.enabled = cb.checked;
    row.classList.toggle("on", cb.checked);
  });

  const nm = document.createElement("span");
  nm.className = "fx-name";
  nm.textContent = d.name;
  nm.title = `cooldown ${d.defaultCooldownMs}ms · burst ${d.defaultDurationMs}ms`;

  const sens = document.createElement("input");
  sens.type  = "range"; sens.min = "0"; sens.max = "1"; sens.step = "0.01";
  sens.value = String(st.sensitivity);
  sens.title = "Sensibilité";
  sens.addEventListener("input", () => { st.sensitivity = Number(sens.value); });

  row.append(cb, nm, sens);
  disruptorsList.appendChild(row);
});

// --- Contrôles ---
audioBtn.addEventListener("click", async () => {
  if (audio.enabled) {
    await audio.stop();
    audioBtn.textContent = "audio";
    audioBtn.classList.remove("on");
  } else {
    try {
      await audio.start(srcSel.value as AudioSource);
      audioBtn.textContent = "🔊 on";
      audioBtn.classList.add("on");
    } catch (e) {
      console.error(e);
      audioBtn.textContent = "audio ✗";
      audioBtn.classList.remove("on");
    }
  }
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
      exportMP4: (config: any) => Promise<any>;
      spoutSendFrame: (w: number, h: number, pixels: Uint8Array) => Promise<void>;
      openOutputWindow: () => Promise<boolean>;
      getStats: () => Promise<{ cpu: number; gpu: number }>;
    };
    applyRenderFilter?: (mode: "none" | "monochrome" | "green" | "amber") => void;
  }
}

midiBtn.addEventListener("click", async () => {
  if (midi.enabled) {
    midi.stop();
    midiBtn.textContent = "🎛 MIDI";
    midiBtn.classList.remove("on");
  } else {
    try {
      await midi.start();
      midiBtn.textContent = "🎛 " + midi.deviceName;
      midiBtn.classList.add("on");
    } catch (e) {
      console.error(e);
      midiBtn.textContent = "MIDI ✗";
    }
  }
});
midiModeSel.addEventListener("change", () => {
  midi.mode = midiModeSel.value as MidiMode;
});

textBtn.addEventListener("click", () => {
  text.toggle(!text.enabled);
  textBtn.classList.toggle("on", text.enabled);
});

fullBtn.addEventListener("click", () => {
  window.synth?.toggleFullscreen();
});

// --- ISF loader ---
isfBtn.addEventListener("click", async () => {
  const result = await window.synth?.loadFile([
    { name: "ISF Shaders", extensions: ["fs", "frag", "glsl"] },
    { name: "All Files", extensions: ["*"] },
  ]);
  if (!result) return;
  const shader = parseISF(result.name, result.content);
  if (!shader) {
    isfBtn.textContent = "ISF ✗";
    setTimeout(() => { isfBtn.textContent = "ISF…"; }, 3000);
    return;
  }
  const entry = { name: shader.name, src: shader.glsl };
  const existingIdx = SHADERS.findIndex((s) => s.name === shader.name);
  if (existingIdx >= 0) {
    SHADERS[existingIdx] = entry;
    loadShader(existingIdx);
    shaderSel.value = String(existingIdx);
  } else {
    SHADERS.push(entry);
    const idx = SHADERS.length - 1;
    const o = document.createElement("option");
    o.value = String(idx);
    o.textContent = shader.name;
    shaderSel.appendChild(o);
    shaderSel.value = String(idx);
    loadShader(idx);
  }
});

// --- Spout output ---
let spoutEnabled = false;
let spoutFrameIdx = 0;
spoutBtn.addEventListener("click", () => {
  spoutEnabled = !spoutEnabled;
  spoutBtn.classList.toggle("on", spoutEnabled);
  spoutBtn.textContent = spoutEnabled ? "SPOUT on" : "SPOUT";
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

  // Ctrl+S / Ctrl+O / Ctrl+R
  if (e.ctrlKey) {
    if (e.key === "s") { e.preventDefault(); presetSaveBtn.click(); return; }
    if (e.key === "o") { e.preventDefault(); presetLoadBtn.click(); return; }
    if (e.key === "r") { e.preventDefault(); recBtn.click(); return; }
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
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
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
tactics.holdMs = 8000;
const rectaSpeedRng = $<HTMLInputElement>("recta-speed");
rectaSpeedRng.value = "8000";
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
  recorder.onstop = async () => {
    recBtn.classList.remove("rec");
    recBtn.textContent = "⏺ REC";
    const blob = new Blob(recChunks, { type: "video/webm" });
    const buf  = await blob.arrayBuffer();
    const name = `terminal-synth-${Date.now()}.webm`;
    await window.synth?.saveVideo(new Uint8Array(buf), name);
    recorder = null;
  };
  recorder.start(1000); // chunk toutes les secondes
  recBtn.classList.add("rec");
  recBtn.textContent = "⏹ STOP";
});

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

  // Music analysis - check BPM on raw audio bands every frame (for onset detection)
  // But only update display every 60 frames (~1x/sec) to minimize DOM overhead
  const rawBands = audio.bands();
  const analysis = musicAnalyzer.analyze(rawBands);

  analyzeFrameCounter++;
  if (analyzeFrameCounter >= ANALYZE_INTERVAL) {
    analyzeFrameCounter = 0;
    if (analysis) {
      // Display BPM (large, visible)
      if (musicInfoElements.bpmDisplay) {
        musicInfoElements.bpmDisplay.textContent = `${analysis.bpm}`;
        musicInfoElements.bpmDisplay.style.color =
          analysis.bpmConfidence > 0.5 ? "var(--orange)" : "var(--text-dim)";
      }
      // Display Energy (large, visible)
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
  const e = midi.energy;
  const mod = midi.mod;
  const noise = midi.mode === "noise";

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

  const u = {
    time,
    bass: Math.max(bands.bass, noise ? e : e * 0.4),
    mid: Math.max(bands.mid, mod),
    treble: Math.max(bands.treble, noise ? e * 0.8 : 0),
    level: Math.max(bands.level, e),
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
      if (rawEnergy > threshold || Math.random() < rawEnergy * ds.sensitivity * 0.02) {
        ds.lastFire = nowMs;
        ds.fireUntil = nowMs + ds.durationMs * (0.6 + Math.random() * 0.8);
        stages.push({ fx: ds.prog, amount: ds.amount });
      }
    }
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
    const { cols, rows } = asciiGrid();
    const px = pipeline.render(stages, cols, rows, u, true);
    if (px) pre.innerHTML = pixelsToAsciiColorGlitch(px, cols, rows);
  } else {
    pipeline.render(stages, canvas.width, canvas.height, u, false);

    // Apply Master Brightness post-process via CSS filter on canvas
    if (masterBrightnessEnabled) {
      // Smooth the audio level for gradual fading (exponential moving average)
      // Lower alpha = smoother/slower transitions, higher = more responsive
      smoothedAudioLevel = smoothedAudioLevel * 0.85 + u.level * 0.15;

      // Fade to black with smoothed audio level
      // Use exponential curve to be more dramatic at low levels
      const normalizedLevel = Math.pow(smoothedAudioLevel, 0.55); // Power curve for dramatic fade from silence
      const minBrightness = 1; // Nearly black when silent (1% brightness)
      const baseBrightness = minBrightness + (normalizedLevel * (100 - minBrightness));

      // Slider dramatically amplifies the effect: 0 = 100% at peak, 1 = 200% at peak
      const amplification = 1 + (masterBrightnessAmount * 1.0);
      const brightnessPercent = baseBrightness * amplification;

      canvas.style.filter = `brightness(${Math.max(1, Math.min(200, brightnessPercent))}%)`;

      // Auto-switch safety: read average luminance via WebGL
      try {
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

  // Spout : readback toutes les 8 images (~7 fps) pour limiter la charge IPC
  spoutFrameIdx++;
  if (spoutEnabled && spoutFrameIdx % 8 === 0) {
    const spoutPixels = pipeline.readback();
    if (spoutPixels) {
      window.synth?.spoutSendFrame(canvas.width, canvas.height, spoutPixels);
    }
  }

  text.energy = energy;
  text.update(now);

  const pct = (v: number) => String(Math.round(v * 100)).padStart(3, " ");
  let line = `bass${pct(bands.bass)} mid${pct(bands.mid)} hi${pct(bands.treble)}`;
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
      <div style="font-weight:700;margin-bottom:4px">TERMINAL·SYNTH v0.9.9</div>
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

// --- Export MP4 with FFmpeg ---
const exportBtn = $<HTMLButtonElement>("export-mp4");
exportBtn.addEventListener("click", async () => {
  try {
    exportBtn.disabled = true;
    exportBtn.textContent = "🔄 Encoding...";

    const result = await window.synth?.exportMP4({
      config: {
        fps: 30,
        bitrate: "5000k", // H.264 bitrate
        audioBitrate: "320k", // AAC high quality
        outputPath: "", // Will be prompted by dialog
      },
      frameCount: 0,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
    });

    exportBtn.textContent = "✅ Done";
    setTimeout(() => {
      exportBtn.textContent = "🎬";
      exportBtn.disabled = false;
    }, 3000);
  } catch (err) {
    console.error("Export failed:", err);
    exportBtn.textContent = "❌ Failed";
    setTimeout(() => {
      exportBtn.textContent = "🎬";
      exportBtn.disabled = false;
    }, 3000);
  }
});

// --- Autoplay Advanced: Full generative system ---
autoplayAdvanced.init(120); // Default BPM

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

// Audio reactivity: feed bass energy to autoplay
const originalFrameFunc = frame;
const wrappedFrame = (now: number) => {
  originalFrameFunc(now);
  autoplayAdvanced.updateAudioEnergy(bands.bass, bands.mid, bands.treble);
};

// Update BPM if detected
setInterval(() => {
  // TODO: Get BPM from audio analysis
  // autoplayAdvanced.setBPM(detectedBPM);
}, 1000);

// --- Text Layer: Giant Pixelated Text ---
textLayer.init(app);

const textLayerBtn = $<HTMLButtonElement>("text-layer-toggle");
const textPixelationSlider = $<HTMLInputElement>("text-pixelation");
const textSizeSlider = $<HTMLInputElement>("text-size");
const textConfigBtn = $<HTMLButtonElement>("text-config");
const textConfigPanel = $("text-config-panel");
const textConfigCloseBtn = $<HTMLButtonElement>("text-config-close");

// Toggle text layer
textLayerBtn.addEventListener("click", () => {
  textLayer.toggle();
  textLayerBtn.classList.toggle("on");
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

