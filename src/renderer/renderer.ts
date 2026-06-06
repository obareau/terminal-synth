/** Glue : pipeline WebGL (génération + chaîne d'effets) + audio + UI + boucle. */

import { Pipeline, type Stage } from "./gl";
import { AudioInput, type Bands, type AudioSource } from "./audio";
import { pixelsToAscii } from "./ascii";
import { MidiInput, type MidiMode } from "./midi";
import { TextOverlay } from "./text";
import { TacticDisplay } from "./textsource";
import { TEXTS } from "./texts";
import { SHADERS } from "./shaders";
import { EFFECTS } from "./effects";
import { parseISF } from "./isf";
import { BLEND_MODES } from "./gl";

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

const app = $("app");
const canvas = $<HTMLCanvasElement>("gl");
const pre = $<HTMLPreElement>("ascii");
const shaderSel = $<HTMLSelectElement>("shader");
const sourcesList = $("sources-list");
const layerAName = $("layer-a-name");
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

const pipeline = new Pipeline(canvas);
const audio = new AudioInput();
const midi = new MidiInput();
const text = new TextOverlay($("text"), TEXTS);
const tactics = new TacticDisplay(TEXTS);
const RECTA_INDEX = 0; // le générateur "RECTA (texte)" est en tête de SHADERS
let currentShader = 0;
let prevEnergy = 0;
let asciiMode = false;
const bands: Bands = { bass: 0, mid: 0, treble: 0, level: 0 };
const audioData = new Uint8Array(512); // 256 spectre + 256 waveform → texture audio

// --- Générateurs : select caché + liste visuelle ---
const SRC_KEYS = "1234567890qwertyuiopasdfghjklzxcvbnm";

SHADERS.forEach((s, i) => {
  // select caché (logique preset)
  const o = document.createElement("option");
  o.value = String(i); o.textContent = s.name;
  shaderSel.appendChild(o);
  const o2 = o.cloneNode(true) as HTMLOptionElement;
  layerBSel.appendChild(o2);

  // liste visuelle cliquable
  const item = document.createElement("div");
  item.className = "src-item";
  item.dataset["idx"] = String(i);
  const key = SRC_KEYS[i] ?? "";
  item.innerHTML = `<span class="src-key">${key}</span><span class="src-name">${s.name}</span>`;
  item.addEventListener("click", () => selectSource(i));
  sourcesList.appendChild(item);
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
  try { pipeline.setGenerator2(SHADERS[Number(layerBSel.value)]!.src); }
  catch(e) { console.error("[GL layer B]", e); }
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
function loadShader(i: number): void {
  try {
    pipeline.setGenerator(SHADERS[i]!.src);
    currentShader = i;
    // sync liste visuelle
    sourcesList.querySelectorAll(".src-item").forEach(el => el.classList.remove("active"));
    sourcesList.querySelector(`.src-item[data-idx="${i}"]`)?.classList.add("active");
    (sourcesList.querySelector(`.src-item[data-idx="${i}"]`) as HTMLElement | null)
      ?.scrollIntoView({ block: "nearest" });
    // sync label layer A
    layerAName.textContent = SHADERS[i]?.name ?? "—";
  } catch (e) {
    console.error("[GL]", e);
    const prev = meter.textContent;
    meter.textContent = String(e).slice(0, 120);
    setTimeout(() => { meter.textContent = prev ?? ""; }, 4000);
  }
}
shaderSel.addEventListener("change", () => loadShader(Number(shaderSel.value)));
loadShader(0);

// --- Chaîne d'effets (génération → entropie → feedback → glitch → filtre) ---
const defaultAmounts = [0.3, 0.4, 0.3, 0.4, 0.45, 0.3, 0.5, 0.4, 0.5, 0.35, 0.4, 0.4, 0.45, 0.35, 0.4, 0.4, 0.5, 0.4, 0.5, 0.4];
const fxState = EFFECTS.map((_e, i) => ({ enabled: false, amount: defaultAmounts[i] ?? 0.3 }));
const fxProg = EFFECTS.map((e) => {
  try { return pipeline.compileEffect(e.body); }
  catch (err) {
    console.error(`[GL] effet "${e.name}" :`, err);
    return pipeline.compileEffect("vec3 process(vec2 uv) { return prev(uv); }"); // passthrough
  }
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
      spoutSendFrame: (w: number, h: number, pixels: Uint8Array) => Promise<void>;
    };
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

// --- Raccourcis clavier ---
let focusMode = false;
function toggleFocus(): void {
  focusMode = !focusMode;
  document.body.classList.toggle("focus", focusMode);
}

document.addEventListener("keydown", (e) => {
  const inInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement;

  // Toujours actifs
  if (e.key === "Escape") {
    if (focusMode) { toggleFocus(); return; }
    window.synth?.setFullscreen(false);
  }
  if (e.key === "F11" || (!inInput && (e.key === "f" || e.key === "F")))
    window.synth?.toggleFullscreen();

  if (inInput) return; // le reste est désactivé si on est dans un input

  // Tab = focus mode (canvas plein écran interne)
  if (e.key === "Tab") { e.preventDefault(); toggleFocus(); return; }

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
const rectaSpeedRng = $<HTMLInputElement>("recta-speed");
rectaSpeedRng.addEventListener("input", () => { tactics.holdMs = Number(rectaSpeedRng.value); });

// --- Presets ---
interface Preset {
  version: 2;
  shaderIndex: number;
  layerB: { enabled: boolean; shaderIndex: number; blendMode: number; opacity: number };
  effects: { enabled: boolean; amount: number }[];
  rectaHoldMs: number;
}
const presetSaveBtn = $<HTMLButtonElement>("preset-save");
const presetLoadBtn = $<HTMLButtonElement>("preset-load");

presetSaveBtn.addEventListener("click", async () => {
  const preset: Preset = {
    version: 2,
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

// --- Boucle ---
function frame(now: number): void {
  const time = now / 1000;

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

  // MIDI = contrôle : on replie l'énergie/mod dans les canaux existants.
  midi.update();
  const e = midi.energy;
  const mod = midi.mod;
  const noise = midi.mode === "noise";

  // Énergie globale + détection de hit (front montant) → pioche d'une nouvelle tactique.
  const energy = Math.max(bands.bass, e);
  const hit = energy > 0.55 && prevEnergy <= 0.55;
  prevEnergy = energy;
  if (currentShader === RECTA_INDEX) {
    if (hit) tactics.forceNext(now);
    tactics.update(now);
    tactics.draw(now, energy);
    pipeline.updateText(tactics.canvas);
  }

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
    let amt = st.amount;
    if (midi.enabled) {
      if (noise && (i === 0 || i === 2)) amt = Math.max(amt, e); // entropie + glitch sur les hits
      else if (!noise && i === 1) amt = Math.max(amt, e * 0.6); // feedback soutenu en orgue
    }
    stages.push({ fx: fxProg[i], amount: amt });
  }

  if (asciiMode) {
    const { cols, rows } = asciiGrid();
    const px = pipeline.render(stages, cols, rows, u, true);
    if (px) pre.textContent = pixelsToAscii(px, cols, rows);
  } else {
    pipeline.render(stages, canvas.width, canvas.height, u, false);
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
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
