// Ultra-lightweight BPM estimation from bass beat pattern
export interface MusicAnalysis {
  bpm: number;
  bpmConfidence: number;
  energy: number;
  energyTrend: number;
  spectralChange: number;
  isTransient: boolean;
  style: "calm" | "driving" | "chaotic" | "peak";
}

export class MusicAnalyzer {
  private readonly BPM_MIN = 60;
  private readonly BPM_MAX = 180;

  private bassPeakCount = 0;
  private peakWindow: number[] = []; // Last 60 frames of bass levels
  private lastBassLevel = 0;
  private lastBPM = 120;
  private tapTempoData = { taps: [] as number[], bpm: 120 };

  constructor(initialBpm: number = 120) {
    this.lastBPM = initialBpm;
    this.tapTempoData.bpm = initialBpm;
  }

  analyze(bands: { bass: number; mid: number; treble: number; level: number }): MusicAnalysis {
    // Track bass peaks (upward crossings of 0.6 threshold)
    const bassPeak = this.lastBassLevel <= 0.6 && bands.bass > 0.6;
    if (bassPeak) {
      this.bassPeakCount++;
    }
    this.lastBassLevel = bands.bass;

    // Keep window of last 60 frames
    this.peakWindow.push(bands.bass);
    if (this.peakWindow.length > 60) {
      this.peakWindow.shift();
    }

    // Estimate BPM from peak frequency (60 frames = 1 second at 60fps)
    // Count peaks in last second
    let peakCount = 0;
    let lastPeakIdx = -1;
    for (let i = 0; i < this.peakWindow.length; i++) {
      const isPeak = i === 0 ? false : this.peakWindow[i - 1] <= 0.6 && this.peakWindow[i] > 0.6;
      if (isPeak) {
        peakCount++;
        lastPeakIdx = i;
      }
    }

    // BPM = peaks per second * 60 (4 peaks/sec = 240 BPM, 2 peaks/sec = 120 BPM)
    let bpm = this.lastBPM;
    if (peakCount >= 2 && this.peakWindow.length >= 30) {
      const estimatedBPM = Math.round(peakCount * 60);
      if (estimatedBPM >= this.BPM_MIN && estimatedBPM <= this.BPM_MAX) {
        bpm = estimatedBPM;
        this.lastBPM = bpm;
      }
    }

    // Apply manual tap tempo if set
    if (this.tapTempoData.bpm !== 120) {
      bpm = this.tapTempoData.bpm;
    }

    // Simple energy trend
    const energyTrend = bands.level > 0.5 ? 1 : bands.level < 0.3 ? -1 : 0;

    // Classify style
    let style: "calm" | "driving" | "chaotic" | "peak" = "calm";
    if (bands.level > 0.8) style = "peak";
    else if (bands.level > 0.6) style = "chaotic";
    else if (bands.level > 0.4) style = "driving";

    return {
      bpm,
      bpmConfidence: peakCount >= 2 ? 0.8 : 0.3,
      energy: bands.level,
      energyTrend,
      spectralChange: 0,
      isTransient: bands.bass > 0.7,
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
      if (bpm >= 40 && bpm <= 240) {
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
    if (bpm >= 40 && bpm <= 240) {
      this.lastBPM = bpm;
    }
  }
}
