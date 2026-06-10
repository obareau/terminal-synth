// Lightweight real-time music analysis: BPM detection, energy trending, style classification
export interface MusicAnalysis {
  bpm: number;
  bpmConfidence: number; // 0-1, based on stability
  energy: number; // 0-1
  energyTrend: number; // -1 (descending) to 1 (ascending)
  spectralChange: number; // 0-1
  isTransient: boolean; // sudden peak
  style: "calm" | "driving" | "chaotic" | "peak";
}

export class MusicAnalyzer {
  private readonly BPM_MIN = 40;
  private readonly BPM_MAX = 240;
  private readonly ONSET_THRESHOLD = 0.2;

  // Minimal state for BPM detection (only last 3 onsets)
  private lastOnsetTime = 0;
  private onsetIntervals: number[] = [];
  private lastBPM = 120;
  private bpmConfidence = 0;

  // Energy trend (simple 2-point comparison)
  private lastEnergy = 0;
  private prevEnergy = 0;

  // Tap tempo
  private tapTempoData = { taps: [] as number[], bpm: 120 };

  // Display update throttle (only update display every N frames)
  private frameCounter = 0;
  private readonly DISPLAY_UPDATE_INTERVAL = 6; // Update display every 6 frames (~10Hz)

  constructor(initialBpm: number = 120) {
    this.lastBPM = initialBpm;
    this.tapTempoData.bpm = initialBpm;
  }

  analyze(bands: { bass: number; mid: number; treble: number; level: number }): MusicAnalysis {
    // Detect onsets (simple threshold)
    const energyDelta = bands.level - this.lastEnergy;
    const isOnset = energyDelta > this.ONSET_THRESHOLD;

    if (isOnset) {
      const now = performance.now();
      const timeSinceLastOnset = now - this.lastOnsetTime;

      // Only track if at least 200ms since last onset (avoid noise)
      if (timeSinceLastOnset > 200) {
        if (this.lastOnsetTime > 0) {
          this.onsetIntervals.push(timeSinceLastOnset);
          // Keep only last 3 intervals
          if (this.onsetIntervals.length > 3) {
            this.onsetIntervals.shift();
          }

          // Calculate BPM from intervals
          if (this.onsetIntervals.length >= 2) {
            const avgInterval = this.onsetIntervals.reduce((a, b) => a + b, 0) / this.onsetIntervals.length;
            const avgBPM = Math.round(60000 / avgInterval);

            if (avgBPM >= this.BPM_MIN && avgBPM <= this.BPM_MAX) {
              // Simple confidence: closer all intervals are, higher confidence
              const variance = this.onsetIntervals.reduce(
                (sum, v) => sum + Math.pow(v - avgInterval, 2),
                0
              ) / this.onsetIntervals.length;
              const stdDev = Math.sqrt(variance);
              const variancePercent = (stdDev / avgInterval) * 100;
              this.bpmConfidence = Math.max(0, Math.min(1, 1 - variancePercent / 100));
              this.lastBPM = avgBPM;
            }
          }
        }
        this.lastOnsetTime = now;
      }
    }

    // Energy trend: simple comparison of last 2 values
    const rawTrend = this.lastEnergy > 0 ? (bands.level - this.lastEnergy) / this.lastEnergy : 0;
    const energyTrend = Math.max(-1, Math.min(1, rawTrend));

    // Update energy history
    this.prevEnergy = this.lastEnergy;
    this.lastEnergy = bands.level;

    // Classify style (very simple, no expensive calculations)
    let style: "calm" | "driving" | "chaotic" | "peak" = "calm";

    if (bands.level > 0.8 && energyTrend > 0.15) {
      style = "peak";
    } else if (bands.level > 0.6) {
      style = "chaotic";
    } else if (bands.level >= 0.4) {
      style = "driving";
    } else {
      style = "calm";
    }

    // Apply manual tap tempo if set
    let bpm = this.tapTempoData.bpm !== 120 ? this.tapTempoData.bpm : this.lastBPM;
    let confidence = this.tapTempoData.bpm !== 120 ? 0.95 : this.bpmConfidence;

    return {
      bpm,
      bpmConfidence: confidence,
      energy: bands.level,
      energyTrend,
      spectralChange: Math.abs(bands.bass - bands.treble) * 0.5, // Very fast calc
      isTransient: energyDelta > 0.3,
      style,
    };
  }

  tapTempo(): number {
    const now = performance.now();
    this.tapTempoData.taps.push(now);

    // Keep only recent taps (last 10 seconds)
    this.tapTempoData.taps = this.tapTempoData.taps.filter((t) => now - t < 10000);

    if (this.tapTempoData.taps.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < this.tapTempoData.taps.length; i++) {
        intervals.push(this.tapTempoData.taps[i] - this.tapTempoData.taps[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const bpm = Math.round(60000 / avgInterval);
      if (bpm >= this.BPM_MIN && bpm <= this.BPM_MAX) {
        this.tapTempoData.bpm = bpm;
        this.lastBPM = bpm;
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

  // Helper to check if should update display (throttle updates)
  shouldUpdateDisplay(): boolean {
    this.frameCounter++;
    if (this.frameCounter >= this.DISPLAY_UPDATE_INTERVAL) {
      this.frameCounter = 0;
      return true;
    }
    return false;
  }
}
