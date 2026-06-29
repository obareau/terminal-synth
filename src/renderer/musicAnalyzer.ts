/**
 * BPM detection via spectral flux + autocorrelation.
 *
 * Onset detection: half-wave rectified spectral flux sur les 256 bins FFT
 * (somme des différences positives frame-to-frame), bien plus robuste qu'un
 * simple seuil sur le bass band.
 *
 * Tempo: autocorrélation de la fonction d'onset sur une fenêtre de 5s (300
 * frames @ 60fps). Relance toutes les 30 frames (~0.5s). Interpolation
 * parabolique sub-frame + correction d'octave.
 *
 * Inspiré de l'approche BPM de Mixxx (AnalyzerBeats / spectral flux ACF).
 */
export interface MusicAnalysis {
  bpm: number;
  bpmConfidence: number;
  energy: number;
  energyTrend: number;
  spectralChange: number;
  style: "calm" | "driving" | "chaotic" | "peak";
}

const FPS          = 60;
const BPM_MIN      = 60;
const BPM_MAX      = 180;
const LAG_MIN      = Math.round(FPS * 60 / BPM_MAX); // ~20 frames
const LAG_MAX      = Math.round(FPS * 60 / BPM_MIN); // ~60 frames
const ONSET_LEN    = 300;  // 5s history
const ACF_INTERVAL = 30;   // recalculate every 0.5s
const MIN_FILLED   = 120;  // need 2s before first estimate
const BPM_HISTORY  = 8;    // median window

export class MusicAnalyzer {
  private prevSpectrum = new Float32Array(256);
  private prevBass     = 0;

  private onsetBuf  = new Float32Array(ONSET_LEN);
  private onsetIdx  = 0;
  private onsetFilled = 0;
  private acfCtr    = 0;

  private lastBPM        = 120;
  private lastConfidence = 0;
  private bpmHistory: number[] = [];

  private tapTaps: number[] = [];
  private tapBPM = 0;  // 0 = auto

  constructor(initialBpm = 120) {
    this.lastBPM = initialBpm;
  }

  /**
   * Appeler une fois par frame.
   * @param bands  Bandes audio lissées (bass/mid/treble/level)
   * @param freq   Spectre FFT brut [0..255], 256 bins (optionnel — fallback si absent)
   */
  analyze(
    bands: { bass: number; mid: number; treble: number; level: number },
    freq?: Uint8Array,
  ): MusicAnalysis {
    // --- Onset function ---
    const onset = freq && freq.length >= 256
      ? this.spectralFlux(freq)
      : Math.max(0, bands.bass - this.prevBass);

    this.prevBass = bands.bass;

    this.onsetBuf[this.onsetIdx] = onset;
    this.onsetIdx = (this.onsetIdx + 1) % ONSET_LEN;
    if (this.onsetFilled < ONSET_LEN) this.onsetFilled++;

    // --- ACF (every ACF_INTERVAL frames, once we have MIN_FILLED) ---
    if (++this.acfCtr >= ACF_INTERVAL && this.onsetFilled >= MIN_FILLED) {
      this.acfCtr = 0;
      this.runACF();
    }

    // --- Energy & style ---
    const energyTrend = this.prevBass > 0
      ? Math.max(-1, Math.min(1, (bands.bass - this.prevBass) / this.prevBass))
      : 0;

    let style: MusicAnalysis["style"] = "calm";
    if      (bands.level > 0.8) style = "peak";
    else if (bands.level > 0.6) style = "chaotic";
    else if (bands.level > 0.4) style = "driving";

    return {
      bpm:            this.tapBPM > 0 ? this.tapBPM : this.lastBPM,
      bpmConfidence:  this.tapBPM > 0 ? 0.95 : this.lastConfidence,
      energy:         bands.level,
      energyTrend,
      spectralChange: Math.abs(bands.bass - bands.treble) * 0.5,
      style,
    };
  }

  // Half-wave rectified spectral flux across all bins (skip DC bin 0)
  private spectralFlux(freq: Uint8Array): number {
    let flux = 0;
    for (let i = 1; i < 256; i++) {
      const cur  = freq[i] / 255;
      const diff = cur - this.prevSpectrum[i];
      if (diff > 0) flux += diff;
      this.prevSpectrum[i] = cur;
    }
    return flux;
  }

  private runACF(): void {
    const N = this.onsetFilled;

    // Linearize circular buffer
    const sig = new Float32Array(N);
    const start = this.onsetIdx;
    for (let i = 0; i < N; i++) {
      sig[i] = this.onsetBuf[(start - N + i + ONSET_LEN) % ONSET_LEN];
    }

    // Remove mean
    let mean = 0;
    for (let i = 0; i < N; i++) mean += sig[i];
    mean /= N;
    for (let i = 0; i < N; i++) sig[i] -= mean;

    // Variance (for confidence normalization)
    let variance = 0;
    for (let i = 0; i < N; i++) variance += sig[i] * sig[i];
    variance /= N;
    if (variance < 1e-6) return;  // silent / no signal

    // Autocorrelation for lags in BPM range
    const lagCount = LAG_MAX - LAG_MIN + 1;
    const acf = new Float32Array(lagCount);
    let bestIdx = 0;

    for (let li = 0; li < lagCount; li++) {
      const lag = LAG_MIN + li;
      let sum = 0;
      const len = N - lag;
      for (let i = 0; i < len; i++) sum += sig[i] * sig[i + lag];
      acf[li] = sum / len;
      if (acf[li] > acf[bestIdx]) bestIdx = li;
    }

    if (acf[bestIdx] <= 0) return;

    // Parabolic interpolation for sub-frame accuracy
    let refinedLag = LAG_MIN + bestIdx;
    if (bestIdx > 0 && bestIdx < lagCount - 1) {
      const y1 = acf[bestIdx - 1];
      const y2 = acf[bestIdx];
      const y3 = acf[bestIdx + 1];
      const denom = 2 * y2 - y1 - y3;
      if (denom > 0) refinedLag += (y3 - y1) / (2 * denom);
    }

    let bpm = Math.round(FPS * 60 / refinedLag);

    // Octave correction: check if half the lag has a comparable ACF peak
    // (detected at 2× the true tempo → halve the lag → double BPM)
    const halfLag = Math.round((LAG_MIN + bestIdx) / 2);
    const halfIdx = halfLag - LAG_MIN;
    if (halfIdx >= 0 && halfIdx < lagCount && acf[halfIdx] > acf[bestIdx] * 0.75) {
      bpm = Math.round(FPS * 60 / halfLag);
    }

    // Clamp
    while (bpm > BPM_MAX) bpm = Math.round(bpm / 2);
    while (bpm < BPM_MIN) bpm = Math.round(bpm * 2);

    // Confidence: ACF peak strength relative to signal variance
    const confidence = Math.min(1, Math.max(0, acf[bestIdx] / variance));
    this.lastConfidence = confidence;

    if (confidence > 0.1) {
      this.bpmHistory.push(bpm);
      if (this.bpmHistory.length > BPM_HISTORY) this.bpmHistory.shift();
      const sorted = [...this.bpmHistory].sort((a, b) => a - b);
      this.lastBPM = sorted[Math.floor(sorted.length / 2)];
    }
  }

  tapTempo(): number {
    const now = performance.now();
    this.tapTaps.push(now);
    this.tapTaps = this.tapTaps.filter((t) => now - t < 30_000);
    if (this.tapTaps.length >= 2) {
      let sum = 0;
      for (let i = 1; i < this.tapTaps.length; i++) sum += this.tapTaps[i] - this.tapTaps[i - 1];
      const bpm = Math.round(60_000 / (sum / (this.tapTaps.length - 1)));
      if (bpm >= 40 && bpm <= 240) { this.tapBPM = bpm; return bpm; }
    }
    return this.tapBPM || this.lastBPM;
  }

  resetTapTempo(): void {
    this.tapTaps = [];
    this.tapBPM = 0;
  }

  getBPM(): number {
    return this.tapBPM > 0 ? this.tapBPM : this.lastBPM;
  }

  setBPM(bpm: number): void {
    if (bpm >= 40 && bpm <= 240) this.lastBPM = bpm;
  }
}
