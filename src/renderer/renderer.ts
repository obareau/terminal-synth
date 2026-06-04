/** Glue : pipeline WebGL (génération + chaîne d'effets) + audio + UI + boucle. */

import { Pipeline, type Stage } from "./gl";
import { AudioInput, type Bands } from "./audio";
import { pixelsToAscii } from "./ascii";
import { SHADERS } from "./shaders";
import { EFFECTS } from "./effects";

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

const app = $("app");
const canvas = $<HTMLCanvasElement>("gl");
const pre = $<HTMLPreElement>("ascii");
const shaderSel = $<HTMLSelectElement>("shader");
const audioBtn = $<HTMLButtonElement>("audio");
const asciiBtn = $<HTMLButtonElement>("ascii-toggle");
const fullBtn = $<HTMLButtonElement>("full");
const meter = $("meter");
const chain = $("chain");

const pipeline = new Pipeline(canvas);
const audio = new AudioInput();
let asciiMode = false;
const bands: Bands = { bass: 0, mid: 0, treble: 0, level: 0 };

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
    await audio.start();
    audioBtn.textContent = "🎤 on";
    audioBtn.classList.add("on");
  } catch (e) {
    console.error(e);
    audioBtn.textContent = "🎤 refusé";
  }
});

asciiBtn.addEventListener("click", () => {
  asciiMode = !asciiMode;
  asciiBtn.classList.toggle("on", asciiMode);
  canvas.hidden = asciiMode;
  pre.hidden = !asciiMode;
  if (!asciiMode) resizeCanvas();
});

fullBtn.addEventListener("click", () => {
  if (!document.fullscreenElement) app.requestFullscreen();
  else document.exitFullscreen();
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

function activeStages(): Stage[] {
  const stages: Stage[] = [];
  for (let i = 0; i < EFFECTS.length; i++) {
    const st = fxState[i]!;
    if (st.enabled) stages.push({ fx: fxProg[i]!, amount: st.amount });
  }
  return stages;
}

// --- Boucle ---
function frame(now: number): void {
  const time = now / 1000;
  if (audio.enabled) {
    const b = audio.read();
    bands.bass += (b.bass - bands.bass) * 0.3;
    bands.mid += (b.mid - bands.mid) * 0.3;
    bands.treble += (b.treble - bands.treble) * 0.3;
    bands.level += (b.level - bands.level) * 0.3;
  }
  const u = { time, bass: bands.bass, mid: bands.mid, treble: bands.treble, level: bands.level };
  const stages = activeStages();

  if (asciiMode) {
    const { cols, rows } = asciiGrid();
    const px = pipeline.render(stages, cols, rows, u, true);
    if (px) pre.textContent = pixelsToAscii(px, cols, rows);
  } else {
    pipeline.render(stages, canvas.width, canvas.height, u, false);
  }

  const pct = (v: number) => String(Math.round(v * 100)).padStart(3, " ");
  meter.textContent = `bass${pct(bands.bass)} mid${pct(bands.mid)} hi${pct(bands.treble)}`;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
