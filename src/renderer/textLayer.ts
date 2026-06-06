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
    enabled: false,
    words: ["SYNTH", "CHAOS", "GLITCH", "PSYCHO", "VORTEX", "SIGNAL"],
    pixelationLevel: 4,
    fontSize: 150,
    color: "#00ff00",
    opacity: 0.8,
    duration: 2000,
    audioReactive: true,
  };

  private currentWord: string = "";
  private wordChangeTime: number = 0;
  private audioEnergy: number = 0;
  private audioFrequency: number = 0;

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
    if (!this.config.enabled || !this.ctx || !this.canvas) {
      requestAnimationFrame(() => this.animate());
      return;
    }

    const now = performance.now();

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

    // Set font
    const baseFontSize = Math.min(w, h) * (this.config.fontSize / 100) * 0.3;
    this.ctx.font = `bold ${baseFontSize}px 'Courier New', monospace`;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";

    // Audio-reactive color/position
    let posX = w / 2;
    let posY = h / 2;
    let color = this.config.color;

    if (this.config.audioReactive) {
      // Wobble position with audio
      posX += Math.sin(this.audioEnergy * Math.PI) * 50;
      posY += Math.cos(this.audioFrequency * Math.PI) * 50;

      // Shift hue based on audio
      const hueShift = (this.audioEnergy * 60) % 360;
      color = this.hslToHex(hueShift, 100, 50);
    }

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
    tempCtx.font = this.ctx.font;
    tempCtx.textAlign = "center";
    tempCtx.textBaseline = "middle";
    tempCtx.fillStyle = color;
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

    // Draw pixelated text on main canvas
    const offsetX = Math.max(0, posX - tempCanvas.width / 2);
    const offsetY = Math.max(0, posY - tempCanvas.height / 2);

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
   * Apply effect to text layer (via canvas manipulation)
   */
  applyEffect(effectName: string, intensity: number) {
    if (!this.ctx || !this.canvas) return;

    switch (effectName) {
      case "invert":
        this.ctx.filter = `invert(${intensity})`;
        break;
      case "hue-rotate":
        this.ctx.filter = `hue-rotate(${intensity * 360}deg)`;
        break;
      case "saturate":
        this.ctx.filter = `saturate(${1 + intensity})`;
        break;
      case "blur":
        this.ctx.filter = `blur(${intensity * 10}px)`;
        break;
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
  toggle() {
    this.config.enabled = !this.config.enabled;
    if (this.canvas) {
      this.canvas.style.display = this.config.enabled ? "block" : "none";
    }
  }
}

export const textLayer = new TextLayer();
