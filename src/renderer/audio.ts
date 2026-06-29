/**
 * Entrée audio → FFT.
 * Source par défaut : **sortie système Windows** (loopback via getDisplayMedia,
 * le handler Electron fournit audio:'loopback'). Sinon micro.
 *
 * `sample()` lit une fois par frame ; `bands()`, `fillTexData()` exploitent le cache.
 */

export interface Bands {
  bass: number;
  mid: number;
  treble: number;
  level: number;
}

export type AudioSource = "system" | "mic";

export class AudioInput {
  private ctx?: AudioContext;
  private analyser?: AnalyserNode;
  private freq?: Uint8Array<ArrayBuffer>;
  private wave?: Uint8Array<ArrayBuffer>;
  private stream?: MediaStream;
  enabled = false;
  source: AudioSource = "system";

  async enumerateInputs(): Promise<MediaDeviceInfo[]> {
    const probe = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter((d) => d.kind === "audioinput");
    } finally {
      probe.getTracks().forEach((t) => t.stop());
    }
  }

  async start(source: AudioSource, deviceId?: string): Promise<void> {
    await this.stop();
    this.source = source;
    this.ctx = new AudioContext();
    await this.ctx.resume();

    let stream: MediaStream;
    if (deviceId) {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: deviceId } },
        video: false,
      });
      console.log(`[Audio] Capture via device: ${deviceId}`);
    } else if (source === "system") {
      stream = await this.captureSystem();
    } else {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    }
    if (stream.getAudioTracks().length === 0) throw new Error("Aucune piste audio capturée");

    this.stream = stream;
    const src = this.ctx.createMediaStreamSource(stream);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 512; // 256 bins fréq, 512 échantillons temps
    this.analyser.smoothingTimeConstant = 0.8;
    src.connect(this.analyser);
    this.freq = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount)); // 256
    this.wave = new Uint8Array(new ArrayBuffer(this.analyser.fftSize)); // 512
    this.enabled = true;
  }

  get mediaStream(): MediaStream | undefined { return this.stream; }

  /**
   * Capture de la sortie système.
   * Linux/PipeWire expose la sortie comme entrée "Monitor of …" — on la
   * cherche en priorité. Les labels ne sont lisibles qu'après un premier
   * getUserMedia, d'où le stream mic temporaire (c'est la manip manuelle
   * mic→sys, automatisée).
   * Sous Linux on ne tente JAMAIS getDisplayMedia : ça ouvre le portal
   * screencast KDE/GNOME (popup) et son refus plantait l'app.
   * Windows/macOS : fallback getDisplayMedia loopback.
   */
  private async captureSystem(): Promise<MediaStream> {
    const probe = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter((d) => d.kind === "audioinput");
      console.log(`[Audio] Entrées audio détectées: ${audioInputs.map((d) => `"${d.label}"`).join(", ") || "aucune"}`);
      const monitor = audioInputs.find((d) => /monitor|loopback|moniteur/i.test(d.label));
      if (monitor) {
        const monStream = await navigator.mediaDevices.getUserMedia({
          audio: { deviceId: { exact: monitor.deviceId } },
          video: false,
        });
        console.log(`[Audio] System capture via monitor device: ${monitor.label}`);
        return monStream;
      }
    } finally {
      probe.getTracks().forEach((t) => t.stop());
    }
    if (navigator.platform.toLowerCase().includes("linux")) {
      throw new Error(
        "Aucune source monitor trouvée. Ouvrir F12 → Console pour voir les entrées détectées.\n" +
        "Sur PipeWire : pactl list sources | grep -i monitor\n" +
        "Si absent : pw-loopback -m '[FL FR]' --capture-props='media.class=Audio/Sink'",
      );
    }
    // loopback via getDisplayMedia ; on demande la vidéo (requise) puis on la jette.
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    stream.getVideoTracks().forEach((t) => t.stop());
    return stream;
  }

  async stop(): Promise<void> {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = undefined;
    if (this.ctx) {
      try {
        await this.ctx.close();
      } catch {
        /* ignore */
      }
      this.ctx = undefined;
    }
    this.analyser = undefined;
    this.enabled = false;
  }

  /** À appeler une fois par frame avant bands()/fillTexData(). */
  sample(): void {
    if (!this.analyser || !this.freq || !this.wave) return;
    this.analyser.getByteFrequencyData(this.freq);
    this.analyser.getByteTimeDomainData(this.wave);
  }

  bands(): Bands {
    const d = this.freq;
    if (!d) return { bass: 0, mid: 0, treble: 0, level: 0 };
    const n = d.length;
    const avg = (a: number, b: number): number => {
      const lo = Math.max(0, a);
      const hi = Math.min(n, b);
      let s = 0;
      for (let i = lo; i < hi; i++) s += d[i];
      return hi > lo ? s / (hi - lo) / 255 : 0;
    };
    return { bass: avg(1, 6), mid: avg(6, 40), treble: avg(40, 128), level: avg(1, 128) };
  }

  /** Remplit `out` (512) : [0..255] = spectre, [256..511] = forme d'onde. */
  fillTexData(out: Uint8Array): void {
    if (!this.freq || !this.wave) {
      out.fill(0);
      return;
    }
    for (let i = 0; i < 256; i++) out[i] = this.freq[i] ?? 0;
    for (let i = 0; i < 256; i++) out[256 + i] = this.wave[i * 2] ?? 0; // 512 → 256
  }
}
