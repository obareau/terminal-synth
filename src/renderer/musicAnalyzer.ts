// Ultra-lightweight music analysis - minimal CPU overhead
// Only calculates BPM on detected onsets, everything else is instant lookups
export interface MusicAnalysis {
  bpm: number;
  bpmConfidence: number; // 0-1
  energy: number; // 0-1
  energyTrend: number; // -1 to 1
  spectralChange: number; // 0-1
  isTransient: boolean;
  style: "calm" | "driving" | "chaotic" | "peak";
}

export class MusicAnalyzer {
  private readonly BPM_MIN = 40;
  private readonly BPM_MAX = 240;
  private readonly ONSET_THRESHOLD = 0.25;

  private lastOnsetTime = 0;
  private lastInterval = 0;
  private lastBPM = 120;
  private lastEnergy = 0;
  private tapTempoData = { taps: [] as number[], bpm: 120 };

  constructor(initialBpm: number = 120) {
    this.lastBPM = initialBpm;
    this.tapTempoData.bpm = initialBpm;
  }

  analyze(bands: { bass: number; mid: number; treble: number; level: number }): MusicAnalysis {
    // Onset detection
    const energyDelta = bands.level - this.lastEnergy;
    const isOnset = energyDelta > this.ONSET_THRESHOLD;
    let bpm = this.tapTempoData.bpm !== 120 ? this.tapTempoData.bpm : this.lastBPM;
    let confidence = this.tapTempoData.bpm !== 120 ? 0.95 : 0.3;

    if (isOnset && performance.now() - this.lastOnsetTime > 250) {
      const now = performance.now();
      const interval = now - this.lastOnsetTime;
      this.lastOnsetTime = now;

      if (interval > 200) {
        const calcBPM = Math.round(60000 / interval);
        if (calcBPM >= this.BPM_MIN && calcBPM <= this.BPM_MAX) {
          this.lastBPM = calcBPM;
          this.lastInterval = interval;
          bpm = calcBPM;
          confidence = 0.7;
        }
      }
    }

    // Simple style classification (no calculations)
    let style: "calm" | "driving" | "chaotic" | "peak" = "calm";
    if (bands.level > 0.8 && energyDelta > 0.2) style = "peak";
    else if (bands.level > 0.6) style = "chaotic";
    else if (bands.level > 0.4) style = "driving";

    this.lastEnergy = bands.level;

    return {
      bpm,
      bpmConfidence: confidence,
      energy: bands.level,
      energyTrend: energyDelta > 0.05 ? 1 : energyDelta < -0.05 ? -1 : 0,
      spectralChange: 0, // Skip entirely
      isTransient: energyDelta > 0.3,
      style,
    };
  }

  tapTempo(): number {
    const now = performance.now();
    this.tapTempoData.taps.push(now);
    this.tapTempoData.taps = this.tapTempoData.taps.filter((t) => now - t < 10000);

    if (this.tapTempoData.taps.length >= 2) {
      let sum = 0;
      for (let i = 1; i < this.tapTempoData.taps.length; i++) {
        sum += this.tapTempoData.taps[i] - this.tapTempoData.taps[i - 1];
      }
      const avgInterval = sum / (this.tapTempoData.taps.length - 1);
      const bpm = Math.round(60000 / avgInterval);
      if (bpm >= this.BPM_MIN && bpm <= this.BPM_MAX) {
        this.tapTempoData.bpm = bpm;
        return bpm;
      }
    }
    return this.tapTempoData.bpm;
  }

  resetTapTempo(): void {
    this.tapTempoData = { taps: [], bpm: this.lastBPM };
  }

  getBPM(): number {
    return this.tapTempoData.bpm !== 120 ? this.tapTempoData.bpm : this.lastBPM;
  }

  setBPM(bpm: number): void {
    if (bpm >= this.BPM_MIN && bpm <= this.BPM_MAX) {
      this.lastBPM = bpm;
    }
  }

  shouldUpdateDisplay(): boolean {
    // Update display rarely - helps with CPU
    return Math.random() < 0.15; // ~15% chance = ~10fps at 60fps
  }
}
