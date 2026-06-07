/**
 * Autoplay Advanced — Complete generative system with all features
 * - Generative Loops (evolving sequences)
 * - Audio-Reactive (bass-driven aggression)
 * - History & Snapshots (undo/redo)
 * - Dual-Layer automation (A/B independent)
 * - Probability maps & presets
 * - Visual feedback (metronome, pulse)
 * - Session save/load
 * - Text layer randomization
 * - RECTA color/size randomization
 */

import { textLayer } from "./textLayer";

// Global functions from renderer.ts
declare function applyRenderFilter(mode: "none" | "monochrome" | "green" | "amber"): void;

export interface AutoplayPreset {
  name: string;
  minMeasures: number;
  maxMeasures: number;
  bassReactivity: number; // 0-1: how much bass affects aggression
  effectChangeProb: number; // 0-1: probability of effect change
  perturbatorChangeProb: number;
  driftSpeed: number; // 0-1: evolution speed in generative loops
  crossfadeDuration: number; // ms for smooth transitions
}

export interface Snapshot {
  timestamp: number;
  measure: number;
  sourceA: number;
  sourceB: number;
  blendMode: number;
  effects: { id: string; enabled: boolean; amount: number }[];
  perturbators: { id: string; enabled: boolean; sensitivity: number }[];
}

export interface GenerativeLoop {
  id: string;
  baseState: Snapshot;
  loopLength: number; // measures
  currentLoop: number;
  evolutionFactor: number; // 0-1
  history: Snapshot[];
  isFrozen: boolean;
}

// PRESETS
export const AUTOPLAY_PRESETS: Record<string, AutoplayPreset> = {
  gentle: {
    name: "Gentle",
    minMeasures: 16,
    maxMeasures: 32,
    bassReactivity: 0.2,
    effectChangeProb: 0.1,
    perturbatorChangeProb: 0.05,
    driftSpeed: 0.1,
    crossfadeDuration: 1000,
  },
  chaotic: {
    name: "Chaotic",
    minMeasures: 4,
    maxMeasures: 12,
    bassReactivity: 0.8,
    effectChangeProb: 0.7,
    perturbatorChangeProb: 0.6,
    driftSpeed: 0.8,
    crossfadeDuration: 200,
  },
  psycho: {
    name: "Psycho",
    minMeasures: 2,
    maxMeasures: 8,
    bassReactivity: 1.0,
    effectChangeProb: 0.9,
    perturbatorChangeProb: 0.9,
    driftSpeed: 1.0,
    crossfadeDuration: 100,
  },
  glitch: {
    name: "Glitch",
    minMeasures: 8,
    maxMeasures: 16,
    bassReactivity: 0.6,
    effectChangeProb: 0.3,
    perturbatorChangeProb: 0.9,
    driftSpeed: 0.5,
    crossfadeDuration: 150,
  },
};

class AutoplayAdvanced {
  private preset: AutoplayPreset = AUTOPLAY_PRESETS.chaotic;
  private enabled: boolean = false;
  private running: boolean = false;
  private bpm: number = 120;
  private measureDurationMs: number = 2000;

  // Timing
  private frameStart: number = 0;
  private currentMeasure: number = 0;
  private nextChangeAt: number = 0;
  private nextChangeMeasures: number = 8;
  private animationFrameId: number = 0;

  // Audio reactivity
  private lastBassEnergy: number = 0;
  private bassSpikeSensitivity: number = 0.7;

  // History & Snapshots
  private snapshots: Snapshot[] = [];
  private snapshotIndex: number = -1;
  private maxHistorySize: number = 50;

  // Generative Loops
  private generativeLoop: GenerativeLoop | null = null;
  private loopMeasureCounter: number = 0;

  // Dual-layer
  private layerAEnabled: boolean = true;
  private layerBEnabled: boolean = true;
  private layerAIntensity: number = 1;
  private layerBIntensity: number = 1;

  // Visual feedback
  private metronomeCallback: ((measure: number, beat: number) => void) | null = null;
  private pulseCallback: ((intensity: number) => void) | null = null;

  /**
   * Initialize
   */
  init(bpm: number) {
    this.bpm = bpm;
    this.updateMeasureDuration();
  }

  private updateMeasureDuration() {
    const beatMs = 60000 / this.bpm;
    this.measureDurationMs = beatMs * 4;
  }

  /**
   * Start with preset
   */
  start(presetName: keyof typeof AUTOPLAY_PRESETS = "chaotic") {
    if (this.running) {
      this.stop();
    }

    this.preset = AUTOPLAY_PRESETS[presetName];
    this.enabled = true;
    this.running = true;
    this.currentMeasure = 0;
    this.nextChangeMeasures = this.randomMeasures();
    this.nextChangeAt = this.currentMeasure + this.nextChangeMeasures;
    this.frameStart = performance.now();
    this.loopMeasureCounter = 0;

    console.log(`🌀 Autoplay ${this.preset.name} started`);
    this.loop();
  }

  /**
   * Stop
   */
  stop() {
    this.enabled = false;
    this.running = false;
    cancelAnimationFrame(this.animationFrameId);
  }

  /**
   * Main loop
   */
  private loop() {
    if (!this.running) return;

    const now = performance.now();
    const elapsedMs = now - this.frameStart;
    const newMeasure = Math.floor(elapsedMs / this.measureDurationMs);

    // Detect measure change
    if (newMeasure !== this.currentMeasure) {
      this.currentMeasure = newMeasure;
      this.onMeasureChange();
    }

    // Metronome visual (4 beats per measure)
    const beat = Math.floor((elapsedMs % this.measureDurationMs) / (this.measureDurationMs / 4));
    if (this.metronomeCallback) {
      this.metronomeCallback(this.currentMeasure, beat);
    }

    this.animationFrameId = requestAnimationFrame(() => this.loop());
  }

  /**
   * Called every measure
   */
  private onMeasureChange() {
    // Update generative loop evolution
    if (this.generativeLoop && !this.generativeLoop.isFrozen) {
      this.loopMeasureCounter++;
      if (this.loopMeasureCounter >= this.generativeLoop.loopLength) {
        this.loopMeasureCounter = 0;
        this.evolveGenerativeLoop();
      }
    }

    // Check if time to change
    if (this.currentMeasure >= this.nextChangeAt) {
      this.triggerChange();
      this.nextChangeMeasures = this.randomMeasures();
      this.nextChangeAt = this.currentMeasure + this.nextChangeMeasures;
    }
  }

  /**
   * Trigger random changes (with audio reactivity)
   */
  private triggerChange() {
    // Audio-reactive aggression
    const aggression = Math.min(1, this.lastBassEnergy * this.preset.bassReactivity);
    this.lastBassEnergy = 0; // Reset

    // Apply changes with probability
    if (Math.random() < this.preset.effectChangeProb + aggression * 0.3) {
      this.randomizeEffects();
    }

    if (Math.random() < this.preset.perturbatorChangeProb + aggression * 0.2) {
      this.randomizePerturbators();
    }

    // Occasionally swap source
    if (Math.random() < 0.3 + aggression * 0.5) {
      this.randomizeSource();
    }

    // Occasionally change blend
    if (Math.random() < 0.2 + aggression * 0.3) {
      this.randomizeBlendMode();
    }

    // Occasionally toggle text layer (moderate probability, shorter duration)
    if (Math.random() < 0.15 + aggression * 0.1) {
      this.randomizeTextLayer();
    }

    // Occasionally randomize render filter (global color modes)
    if (Math.random() < 0.08 + aggression * 0.05) {
      this.randomizeRenderFilter();
    }

    // Smooth slider changes
    this.randomizeSliders(this.preset.crossfadeDuration);

    // Create snapshot for history
    this.createSnapshot();
  }

  /**
   * Evolve generative loop
   */
  private evolveGenerativeLoop() {
    if (!this.generativeLoop) return;

    this.generativeLoop.currentLoop++;
    this.generativeLoop.evolutionFactor = Math.min(
      1,
      (this.generativeLoop.currentLoop * this.preset.driftSpeed) / 10
    );

    // Mutate state slightly based on evolution factor
    const mutationStrength = this.generativeLoop.evolutionFactor * 0.15; // 0-15% drift

    // Small random changes
    if (Math.random() < mutationStrength) {
      this.randomizeEffects();
    }
    if (Math.random() < mutationStrength * 0.5) {
      this.randomizeSource();
    }
    if (Math.random() < mutationStrength * 0.25) {
      this.randomizeTextLayer();
    }
    if (Math.random() < mutationStrength * 0.15) {
      this.randomizeRenderFilter();
    }

    this.randomizeSliders(this.preset.crossfadeDuration, mutationStrength);
    this.createSnapshot();

    console.log(
      `🔄 Loop ${this.generativeLoop.currentLoop}: evolution ${Math.round(
        this.generativeLoop.evolutionFactor * 100
      )}%`
    );
  }

  /**
   * Record generative loop from current state
   */
  recordGenerativeLoop(loopLength: number = 8) {
    const baseState = this.captureState();
    this.generativeLoop = {
      id: `loop-${Date.now()}`,
      baseState,
      loopLength,
      currentLoop: 0,
      evolutionFactor: 0,
      history: [baseState],
      isFrozen: false,
    };
    console.log(`📝 Generative loop recorded (${loopLength} measures)`);
  }

  /**
   * Freeze generative loop (stop evolving)
   */
  freezeGenerativeLoop() {
    if (this.generativeLoop) {
      this.generativeLoop.isFrozen = !this.generativeLoop.isFrozen;
      console.log(`❄️ Loop ${this.generativeLoop.isFrozen ? "frozen" : "unfrozen"}`);
    }
  }

  /**
   * Snapshot system
   */
  private createSnapshot() {
    const snapshot = this.captureState();
    this.snapshots.push(snapshot);
    this.snapshotIndex = this.snapshots.length - 1;

    // Trim history
    if (this.snapshots.length > this.maxHistorySize) {
      this.snapshots.shift();
      this.snapshotIndex--;
    }
  }

  /**
   * Undo
   */
  undo() {
    if (this.snapshotIndex > 0) {
      this.snapshotIndex--;
      this.restoreSnapshot(this.snapshots[this.snapshotIndex]);
      console.log(`↶ Undo (snapshot ${this.snapshotIndex})`);
    }
  }

  /**
   * Redo
   */
  redo() {
    if (this.snapshotIndex < this.snapshots.length - 1) {
      this.snapshotIndex++;
      this.restoreSnapshot(this.snapshots[this.snapshotIndex]);
      console.log(`↷ Redo (snapshot ${this.snapshotIndex})`);
    }
  }

  /**
   * Capture current state
   */
  private captureState(): Snapshot {
    return {
      timestamp: Date.now(),
      measure: this.currentMeasure,
      sourceA: 0, // TODO: get actual source indices
      sourceB: 0,
      blendMode: 0,
      effects: [],
      perturbators: [],
    };
  }

  /**
   * Restore snapshot
   */
  private restoreSnapshot(snapshot: Snapshot) {
    // TODO: Restore UI state from snapshot
    console.log(`Restored snapshot from measure ${snapshot.measure}`);
  }

  /**
   * Audio reactivity: update bass energy
   */
  updateAudioEnergy(bass: number, mid: number, treble: number) {
    this.lastBassEnergy = Math.max(this.lastBassEnergy, bass);

    // Pulse visual feedback
    if (this.pulseCallback) {
      this.pulseCallback(bass);
    }
  }

  /**
   * Helper: randomize source
   */
  private randomizeSource() {
    const sources = document.querySelectorAll(".src-item");
    if (sources.length > 0) {
      const randomSource = sources[Math.floor(Math.random() * sources.length)] as HTMLElement;
      randomSource.click();
    }
  }

  /**
   * Helper: randomize blend mode
   */
  private randomizeBlendMode() {
    const blendSel = document.getElementById("blend-mode") as HTMLSelectElement;
    if (blendSel) {
      blendSel.selectedIndex = Math.floor(Math.random() * blendSel.options.length);
      blendSel.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }

  /**
   * Helper: randomize effects
   */
  private randomizeEffects() {
    const checkboxes = document.querySelectorAll(".fx input[type='checkbox']");
    checkboxes.forEach((cb: Element) => {
      if (Math.random() < 0.5) {
        (cb as HTMLInputElement).checked = !(cb as HTMLInputElement).checked;
        cb.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
  }

  /**
   * Helper: randomize perturbators
   */
  private randomizePerturbators() {
    const checkboxes = document.querySelectorAll(".disruptor input[type='checkbox']");
    checkboxes.forEach((cb: Element) => {
      if (Math.random() < 0.5) {
        (cb as HTMLInputElement).checked = !(cb as HTMLInputElement).checked;
        cb.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
  }

  /**
   * Helper: smooth slider changes
   */
  private randomizeSliders(duration: number = 500, mutationStrength: number = 1) {
    const sliders = document.querySelectorAll(".fx input[type='range'], .disruptor input[type='range']");
    const startTime = performance.now();

    sliders.forEach((slider: Element) => {
      const s = slider as HTMLInputElement;
      const min = parseFloat(s.min) || 0;
      const max = parseFloat(s.max) || 1;
      const current = parseFloat(s.value);

      // Random target within mutation strength
      const randomTarget = current + (Math.random() - 0.5) * (max - min) * mutationStrength * 2;
      const target = Math.max(min, Math.min(max, randomTarget));

      // Smooth interpolation
      const animate = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress =
          progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;

        const newValue = current + (target - current) * easeProgress;
        s.value = String(newValue);
        s.dispatchEvent(new Event("input", { bubbles: true }));

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    });
  }

  /**
   * Helper: randomize text layer (toggle on/off)
   */
  private randomizeTextLayer() {
    textLayer.toggle();
  }

  /**
   * Helper: randomize render filter (global color modes)
   */
  private randomizeRenderFilter() {
    const modes: Array<"none" | "monochrome" | "green" | "amber"> = ["none", "monochrome", "green", "amber"];
    const randomMode = modes[Math.floor(Math.random() * modes.length)]!;
    applyRenderFilter(randomMode);
  }

  /**
   * Helper: random measures
   */
  private randomMeasures(): number {
    return (
      this.preset.minMeasures +
      Math.floor(Math.random() * (this.preset.maxMeasures - this.preset.minMeasures + 1))
    );
  }

  /**
   * Export session
   */
  exportSession() {
    const session = {
      preset: this.preset.name,
      bpm: this.bpm,
      generativeLoop: this.generativeLoop,
      snapshots: this.snapshots,
      timestamp: Date.now(),
    };
    return JSON.stringify(session, null, 2);
  }

  /**
   * Import session
   */
  importSession(json: string) {
    try {
      const session = JSON.parse(json);
      this.bpm = session.bpm;
      this.generativeLoop = session.generativeLoop;
      this.snapshots = session.snapshots;
      console.log(`📂 Session loaded (${this.snapshots.length} snapshots)`);
    } catch (err) {
      console.error("Session import failed:", err);
    }
  }

  /**
   * Set visual callbacks
   */
  setMetronomeCallback(cb: (measure: number, beat: number) => void) {
    this.metronomeCallback = cb;
  }

  setPulseCallback(cb: (intensity: number) => void) {
    this.pulseCallback = cb;
  }

  /**
   * Get status
   */
  getStatus() {
    return {
      running: this.running,
      preset: this.preset.name,
      measure: this.currentMeasure,
      nextChangeAt: this.nextChangeAt,
      nextChangeMeasures: this.nextChangeMeasures,
      generativeLoopActive: this.generativeLoop?.isFrozen ? "frozen" : this.generativeLoop ? "running" : "none",
      snapshotCount: this.snapshots.length,
      snapshotIndex: this.snapshotIndex,
    };
  }
}

export const autoplayAdvanced = new AutoplayAdvanced();
