// Adaptive beat detection for automatic BPM calculation
export interface MusicAnalysis {
  bpm: number;
  bpmConfidence: number;
  energy: number;
  energyTrend: number;
  spectralChange: number;
  style: "calm" | "driving" | "chaotic" | "peak";
}

export class MusicAnalyzer {
  private readonly BPM_MIN = 60;
  private readonly BPM_MAX = 180;
  private readonly WINDOW_SIZE = 120; // 2 seconds at 60fps

  // Adaptive peak detection
  private bassHistory: number[] = [];
  private peakTimes: number[] = []; // Timestamps of detected peaks
  private bpmEstimates: number[] = []; // Recent BPM estimates
  private lastPeakTime = 0;
  private lastBPM = 120;
  private tapTempoData = { taps: [] as number[], bpm: 120 };
  private frameCount = 0;

  constructor(initialBpm: number = 120) {
    this.lastBPM = initialBpm;
    this.tapTempoData.bpm = initialBpm;
  }

  analyze(bands: { bass: number; mid: number; treble: number; level: number }): MusicAnalysis {
    this.frameCount++;

    // Build history of bass levels
    this.bassHistory.push(bands.bass);
    if (this.bassHistory.length > this.WINDOW_SIZE) {
      this.bassHistory.shift();
    }

    // Detect peaks using adaptive threshold
    const avgBass = this.bassHistory.length > 0
      ? this.bassHistory.reduce((a, b) => a + b) / this.bassHistory.length
      : 0.3;
    const threshold = avgBass + (0.3 * avgBass); // Peak = average + 30% of average

    const now = this.frameCount;
    const isPeak = bands.bass > threshold &&
                   now - this.lastPeakTime > 10; // At least 10 frames (167ms) between peaks

    if (isPeak) {
      this.lastPeakTime = now;
      this.peakTimes.push(now);

      // Keep only recent peaks (last 5 seconds)
      while (this.peakTimes.length > 0 && now - this.peakTimes[0] > 300) {
        this.peakTimes.shift();
      }

      // Calculate BPM from peak intervals
      if (this.peakTimes.length >= 3) {
        const intervals: number[] = [];
        for (let i = 1; i < this.peakTimes.length; i++) {
          intervals.push(this.peakTimes[i] - this.peakTimes[i - 1]);
        }

        // Average interval in frames, convert to BPM
        const avgInterval = intervals.reduce((a, b) => a + b) / intervals.length;
        const avgIntervalMs = (avgInterval / 60) * 1000; // 60fps to milliseconds
        const estimatedBPM = Math.round(60000 / avgIntervalMs);

        if (estimatedBPM >= this.BPM_MIN && estimatedBPM <= this.BPM_MAX) {
          this.bpmEstimates.push(estimatedBPM);

          // Keep smoothed BPM from last 10 estimates
          if (this.bpmEstimates.length > 10) {
            this.bpmEstimates.shift();
          }

          // Use median of recent estimates for stability
          const sorted = [...this.bpmEstimates].sort((a, b) => a - b);
          this.lastBPM = sorted[Math.floor(sorted.length / 2)];
        }
      }
    }

    // Apply manual tap tempo if set
    let bpm = this.tapTempoData.bpm !== 120 ? this.tapTempoData.bpm : this.lastBPM;
    const confidence = this.tapTempoData.bpm !== 120 ? 0.95 :
                       this.peakTimes.length >= 3 ? 0.7 : 0.2;

    // Energy trend
    const prevBass = this.bassHistory.length > 1
      ? this.bassHistory[this.bassHistory.length - 2]
      : bands.bass;
    const energyTrend = prevBass > 0 ? (bands.bass - prevBass) / prevBass : 0;

    // Classify style
    let style: "calm" | "driving" | "chaotic" | "peak" = "calm";
    if (bands.level > 0.8) style = "peak";
    else if (bands.level > 0.6) style = "chaotic";
    else if (bands.level > 0.4) style = "driving";

    return {
      bpm,
      bpmConfidence: confidence,
      energy: bands.level,
      energyTrend: Math.max(-1, Math.min(1, energyTrend)),
      spectralChange: Math.abs(bands.bass - bands.treble) * 0.5,
      style,
    };
  }

  tapTempo(): number {
    const now = performance.now();
    this.tapTempoData.taps.push(now);
    this.tapTempoData.taps = this.tapTempoData.taps.filter((t) => now - t < 30000);

    if (this.tapTempoData.taps.length >= 2) {
      let sum = 0;
      for (let i = 1; i < this.tapTempoData.taps.length; i++) {
        sum += this.tapTempoData.taps[i] - this.tapTempoData.taps[i - 1];
      }
      const avgInterval = sum / (this.tapTempoData.taps.length - 1);
      const bpm = Math.round(60000 / avgInterval);
      if (bpm >= 40 && bpm <= 240) {
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
    if (bpm >= 40 && bpm <= 240) {
      this.lastBPM = bpm;
    }
  }
}
