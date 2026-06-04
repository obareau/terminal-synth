/** Entrée audio (micro / carte son) → FFT → bandes graves/médiums/aigus + niveau global. */

export interface Bands {
  bass: number;
  mid: number;
  treble: number;
  level: number;
}

export class AudioInput {
  private ctx?: AudioContext;
  private analyser?: AnalyserNode;
  private data?: Uint8Array<ArrayBuffer>;
  enabled = false;

  async start(): Promise<void> {
    this.ctx = new AudioContext();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    const src = this.ctx.createMediaStreamSource(stream);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 1024; // → 512 bins
    this.analyser.smoothingTimeConstant = 0.8;
    src.connect(this.analyser);
    this.data = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));
    this.enabled = true;
  }

  read(): Bands {
    if (!this.analyser || !this.data) return { bass: 0, mid: 0, treble: 0, level: 0 };
    this.analyser.getByteFrequencyData(this.data);
    const d = this.data;
    const n = d.length;
    const avg = (a: number, b: number): number => {
      const lo = Math.max(0, a);
      const hi = Math.min(n, b);
      let s = 0;
      for (let i = lo; i < hi; i++) s += d[i]!;
      return hi > lo ? s / (hi - lo) / 255 : 0;
    };
    return { bass: avg(1, 8), mid: avg(8, 60), treble: avg(60, 250), level: avg(1, 250) };
  }
}
