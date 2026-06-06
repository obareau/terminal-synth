/** Glue : pipeline WebGL (génération + chaîne d'effets) + audio + UI + boucle. */

import { Pipeline, type Stage } from "./gl";
import { AudioInput, type Bands, type AudioSource } from "./audio";
import { pixelsToAscii } from "./ascii";
import { MidiInput, type MidiMode } from "./midi";
import { SHADERS } from "./shaders";
import { EFFECTS } from "./effects";

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

const app = $("app");
const canvas = $<HTMLCanvasElement>("gl");
const pre = $<HTMLPreElement>("ascii");
const shaderSel = $<HTMLSelectElement>("shader");
const audioBtn = $<HTMLButtonElement>("audio");
const srcSel = $<HTMLSelectElement>("audio-src");
const asciiBtn = $<HTMLButtonElement>("ascii-toggle");
const fullBtn = $<HTMLButtonElement>("full");
const midiBtn = $<HTMLButtonElement>("midi");
const midiModeSel = $<HTMLSelectElement>("midi-mode");
const meter = $("meter");
const chain = $("chain");

const pipeline = new Pipeline(canvas);
const audio = new AudioInput();
const midi = new MidiInput();
let asciiMode = false;
const bands: Bands = { bass: 0, mid: 0, treble: 0, level: 0 };
const audioData = new Uint8Array(512); // 256 spectre + 256 waveform → texture audio

// --- Générateurs ---
SHADERS.forEach((s, i) => {
  const o = document.createElement("option");
  o.value = String(i);
  o.textContent = s.name;
  shaderSel.appendChild(o);
});
function loadShader(i: number): void {
  try {
    pipeline.setGenerator(SHADERS[i]!.src);
  } catch (e) {
    console.error(e);
  }
}
shaderSel.addEventListener("change", () => loadShader(Number(shaderSel.value)));
loadShader(0);

// --- Chaîne d'effets (génération → entropie → feedback → glitch → filtre) ---
const defaultAmounts = [0.3, 0.4, 0.3, 0.4];
const fxState = EFFECTS.map((_e, i) => ({ enabled: false, amount: defaultAmounts[i] ?? 0.3 }));
const fxProg = EFFECTS.map((e) => pipeline.compileEffect(e.body));

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
  try {
    await audio.start(srcSel.value as AudioSource);
    audioBtn.textContent = "🔊 on";
    audioBtn.classList.add("on");
  } catch (e) {
    console.error(e);
    audioBtn.textContent = "audio ✗";
    audioBtn.classList.remove("on");
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
      setFullscreen: (v: boolean) => Promise<boolean>;
    };
  }
}

midiBtn.addEventListener("click", async () => {
  try {
    await midi.start();
    midiBtn.textContent = "🎛 " + midi.deviceName;
    midiBtn.classList.add("on");
  } catch (e) {
    console.error(e);
    midiBtn.textContent = "MIDI ✗";
  }
});
midiModeSel.addEventListener("change", () => {
  midi.mode = midiModeSel.value as MidiMode;
});

fullBtn.addEventListener("click", () => {
  window.synth?.toggleFullscreen();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "f" || e.key === "F") window.synth?.toggleFullscreen();
  if (e.key === "Escape") window.synth?.setFullscreen(false);
});

// --- Tailles ---
function resizeCanvas(): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
  canvas.height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

const ASCII_COLS = 150;
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

  const pct = (v: number) => String(Math.round(v * 100)).padStart(3, " ");
  let line = `bass${pct(bands.bass)} mid${pct(bands.mid)} hi${pct(bands.treble)}`;
  if (midi.enabled) line += `  · midi ${midi.mode} e${pct(e)} poly${midi.polyphony}`;
  meter.textContent = line;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
