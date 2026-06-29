/**
 * Text Layer — Giant pixellated text with effects
 * - Random word display from customizable list
 * - Pixelization shader (1-64px)
 * - Composable with effects/perturbators
 * - Audio-reactive positioning/color
 */

export interface TextLayerConfig {
  enabled: boolean;
  words: string[];
  pixelationLevel: number; // 1-64
  fontSize: number; // percentage, 10-200
  color: string; // hex color
  opacity: number; // 0-1
  duration: number; // ms per word
  audioReactive: boolean; // position/color driven by audio
}

class TextLayer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private config: TextLayerConfig = {
    enabled: true,
    words: [
      "RECTA", "VORTEX", "SIGNAL", "STATIC", "CHAOS", "GLITCH",
      "SURGE", "VOID", "FLUX", "PULSE", "BREACH", "PROTOCOL",
      "OVERRIDE", "BLACKOUT", "DRONE", "RUST", "BLADE", "IRON",
      "STEEL", "NODE", "SYNC", "CORRUPT", "WARFARE", "FRAGMENT",
      "FACTION", "DISPATCH", "TRANSMIT", "FEEDBACK", "SEQUENCE",
      "LOCKDOWN", "CRASH", "STORM", "NOISE", "CIRCUIT", "CHROME",
    ],
    pixelationLevel: 4,
    fontSize: 85,
    color: "#00ff00",
    opacity: 0.8,
    duration: 3000,
    audioReactive: true,
  };

  private currentWord: string = "";
  private currentFont: string = "monospace";
  private readonly fontPool: string[] = [
    // Mono — Linux → Mac → Windows → fallback
    "'DejaVu Sans Mono', Menlo, Consolas, 'Courier New', monospace",
    // Mono — Mac → Linux → Windows
    "Menlo, Monaco, 'Ubuntu Mono', 'Liberation Mono', Consolas, monospace",
    // Mono — Windows → Linux → Mac
    "Consolas, 'Lucida Console', 'Liberation Mono', 'DejaVu Sans Mono', monospace",
    // Mono générique (toujours dispo)
    "monospace",
    // Sans — Linux → Win → Mac
    "'Liberation Sans', 'Ubuntu', Arial, 'Helvetica Neue', sans-serif",
    // Sans — Mac → Linux → Win
    "'Helvetica Neue', 'Noto Sans', 'DejaVu Sans', Arial, sans-serif",
    // Serif cross-platform
    "Georgia, 'Noto Serif', 'DejaVu Serif', serif",
  ];
  private wordChangeTime: number = 0;
  private audioEnergy: number = 0;
  private audioFrequency: number = 0;
  private wordLoopCount: number = 0;
  private maxWordsPerSession: number = 2;
  private disabledAt: number = 0;
  private reappearDelay: number = 25000;

  /**
   * Initialize text layer
   */
  init(container: HTMLElement) {
    // Create canvas
    this.canvas = document.createElement("canvas");
    this.canvas.style.position = "absolute";
    this.canvas.style.top = "0";
    this.canvas.style.left = "0";
    this.canvas.style.pointerEvents = "none";
    this.canvas.style.mixBlendMode = "screen"; // Default blend
    container.appendChild(this.canvas);

    this.ctx = this.canvas.getContext("2d");
    this.resizeCanvas(container.clientWidth, container.clientHeight);

    // Listen for window resize
    window.addEventListener("resize", () => {
      this.resizeCanvas(container.clientWidth, container.clientHeight);
    });

    // Start animation loop
    this.animate();
  }

  /**
   * Resize canvas to fit container
   */
  private resizeCanvas(width: number, height: number) {
    if (this.canvas) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  }

  /**
   * Main animation loop
   */
  private animate() {
    const now = performance.now();

    // Check if we should reappear after being disabled
    if (!this.config.enabled && this.disabledAt > 0) {
      if (now - this.disabledAt > this.reappearDelay) {
        this.config.enabled = true;
        this.disabledAt = 0;
        this.wordLoopCount = 0;
        this.pickRandomWord();
        this.wordChangeTime = now;
        if (this.canvas) {
          this.canvas.style.display = "block";
        }
      }
    }

    if (!this.config.enabled || !this.ctx || !this.canvas) {
      requestAnimationFrame(() => this.animate());
      return;
    }

    // Change word periodically
    if (now - this.wordChangeTime > this.config.duration) {
      this.pickRandomWord();
      this.wordChangeTime = now;
    }

    // Clear canvas
    this.ctx.fillStyle = "rgba(10, 10, 10, 0.1)"; // Slight trail
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw pixelated text
    this.drawPixelatedText();

    requestAnimationFrame(() => this.animate());
  }

  /**
   * Draw pixelated text
   */
  private drawPixelatedText() {
    if (!this.ctx || !this.canvas || !this.currentWord) return;

    const w = this.canvas.width;
    const h = this.canvas.height;
    const pixelSize = this.config.pixelationLevel;

    // Adaptive font size: scale so text fills config.fontSize% of canvas width
    const refSize = 500;
    this.ctx.font = `bold ${refSize}px ${this.currentFont}`;
    const refWidth = this.ctx.measureText(this.currentWord).width;
    const targetWidth = w * (this.config.fontSize / 100);
    const baseFontSize = Math.min(refSize * targetWidth / refWidth, h * 0.82);

    this.ctx.font = `bold ${baseFontSize}px ${this.currentFont}`;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";

    // Create temporary canvas for pixelation
    const tempCanvas = document.createElement("canvas");
    const tempCtx = tempCanvas.getContext("2d")!;

    // Calculate text dimensions
    const metrics = this.ctx.measureText(this.currentWord);
    const textWidth = metrics.width + 100;
    const textHeight = baseFontSize * 1.5;

    tempCanvas.width = textWidth;
    tempCanvas.height = textHeight;

    // Draw text on temp canvas
    tempCtx.font = `bold ${baseFontSize}px ${this.currentFont}`;
    tempCtx.textAlign = "center";
    tempCtx.textBaseline = "middle";
    tempCtx.fillStyle = this.config.color;
    tempCtx.fillText(this.currentWord, tempCanvas.width / 2, tempCanvas.height / 2);

    // Apply pixelization via imageData
    if (pixelSize > 1) {
      const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
      const data = imageData.data;

      // Pixelate by averaging blocks
      for (let y = 0; y < tempCanvas.height; y += pixelSize) {
        for (let x = 0; x < tempCanvas.width; x += pixelSize) {
          let r = 0, g = 0, b = 0, a = 0, count = 0;

          // Average pixels in block
          for (let dy = 0; dy < pixelSize && y + dy < tempCanvas.height; dy++) {
            for (let dx = 0; dx < pixelSize && x + dx < tempCanvas.width; dx++) {
              const idx = ((y + dy) * tempCanvas.width + (x + dx)) * 4;
              r += data[idx];
              g += data[idx + 1];
              b += data[idx + 2];
              a += data[idx + 3];
              count++;
            }
          }

          r = Math.round(r / count);
          g = Math.round(g / count);
          b = Math.round(b / count);
          a = Math.round(a / count);

          // Fill block with averaged color
          for (let dy = 0; dy < pixelSize && y + dy < tempCanvas.height; dy++) {
            for (let dx = 0; dx < pixelSize && x + dx < tempCanvas.width; dx++) {
              const idx = ((y + dy) * tempCanvas.width + (x + dx)) * 4;
              data[idx] = r;
              data[idx + 1] = g;
              data[idx + 2] = b;
              data[idx + 3] = a;
            }
          }
        }
      }

      tempCtx.putImageData(imageData, 0, 0);
    }

    // Draw pixelated text centered on main canvas
    const centerX = (w - tempCanvas.width) / 2;
    const centerY = (h - tempCanvas.height) / 2;

    // Audio-reactive wobble (small movement around center)
    let offsetX = centerX;
    let offsetY = centerY;
    if (this.config.audioReactive) {
      offsetX += Math.sin(this.audioEnergy * Math.PI) * 30;
      offsetY += Math.cos(this.audioFrequency * Math.PI) * 30;
    }

    this.ctx.globalAlpha = this.config.opacity;
    this.ctx.drawImage(tempCanvas, offsetX, offsetY);
    this.ctx.globalAlpha = 1;
  }

  /**
   * Pick random word from list
   */
  private pickRandomWord() {
    if (this.config.words.length > 0) {
      const idx = Math.floor(Math.random() * this.config.words.length);
      this.currentWord = this.config.words[idx];
      this.currentFont = this.fontPool[Math.floor(Math.random() * this.fontPool.length)];
      this.wordLoopCount++;

      // After 3 words, disable the layer and mark when
      if (this.wordLoopCount >= this.maxWordsPerSession) {
        this.wordLoopCount = 0;
        this.config.enabled = false;
        this.disabledAt = performance.now();
        if (this.canvas) {
          this.canvas.style.display = "none";
        }
      }
    }
  }

  /**
   * HSL to Hex converter
   */
  private hslToHex(h: number, s: number, l: number): string {
    l /= 100;
    const a = (s * Math.min(l, 1 - l)) / 100;
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color)
        .toString(16)
        .padStart(2, "0");
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  }

  /**
   * Update configuration
   */
  updateConfig(partial: Partial<TextLayerConfig>) {
    this.config = { ...this.config, ...partial };
  }

  /**
   * Set word list
   */
  setWords(words: string[]) {
    this.config.words = words.filter((w) => w.trim().length > 0);
    this.pickRandomWord();
  }

  /**
   * Update audio energy (0-1)
   */
  updateAudioEnergy(energy: number) {
    this.audioEnergy = Math.max(0, Math.min(1, energy));
  }

  /**
   * Update audio frequency (0-1)
   */
  updateAudioFrequency(frequency: number) {
    this.audioFrequency = Math.max(0, Math.min(1, frequency));
  }

  /**
   * Apply active effects to text layer (CSS filters based on active effects)
   */
  applyActiveEffects(effectStates: Array<{ name: string; enabled: boolean; amount: number }>) {
    if (!this.canvas) return;

    const filters: string[] = [];

    // Map effect names to CSS filters
    effectStates.forEach((fx) => {
      if (!fx.enabled) return;

      const amt = fx.amount;
      switch (fx.name.toLowerCase()) {
        case "invert":
          filters.push(`invert(${amt * 100}%)`);
          break;
        case "glitch":
          filters.push(`brightness(${1 + amt * 0.3})`);
          break;
        case "filtre":
          filters.push(`saturate(${1 + amt * 0.5})`);
          break;
        case "pixelate":
          filters.push(`blur(${amt * 2}px)`);
          break;
        case "neon":
          filters.push(`brightness(${1 + amt * 0.5}) contrast(${1 + amt * 0.3})`);
          break;
        case "grain":
          filters.push(`contrast(${1 + amt * 0.2})`);
          break;
        case "hue":
          filters.push(`hue-rotate(${amt * 360}deg)`);
          break;
        case "scanlines":
          filters.push(`brightness(${1 - amt * 0.1})`);
          break;
        case "thermal":
          filters.push(`sepia(${amt * 50}%) saturate(${1 + amt})`);
          break;
        case "fisheye":
          // Can't do true fisheye with CSS, use brightness as proxy
          filters.push(`brightness(${1 + amt * 0.1})`);
          break;
        case "onde":
          // Wave effect proxy
          filters.push(`brightness(${1 + Math.sin(performance.now() / 100) * amt * 0.2})`);
          break;
        case "dithering":
          filters.push(`contrast(${1 + amt * 0.5})`);
          break;
        case "posterize dither":
          filters.push(`saturate(${1 - amt * 0.5}) contrast(${1 + amt * 0.3})`);
          break;
      }
    });

    // Apply all filters
    if (filters.length > 0) {
      this.canvas.style.filter = filters.join(" ");
    } else {
      this.canvas.style.filter = "none";
    }
  }

  /**
   * Get configuration
   */
  getConfig(): TextLayerConfig {
    return { ...this.config };
  }

  /**
   * Toggle visibility
   */
  get isEnabled(): boolean { return this.config.enabled; }

  toggle() {
    this.config.enabled = !this.config.enabled;
    if (this.config.enabled) {
      this.wordLoopCount = 0; // Reset counter when enabling
      this.pickRandomWord();
      this.wordChangeTime = performance.now();
    }
    if (this.canvas) {
      this.canvas.style.display = this.config.enabled ? "block" : "none";
    }
  }
}

export const textLayer = new TextLayer();
