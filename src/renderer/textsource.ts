/**
 * TextScroller — dessine les Tactiques Recta en GRAND, défilant verticalement,
 * sur un canvas 2D offscreen. Ce canvas est uploadé en texture (u_text) et
 * échantillonné par le générateur "RECTA" → le texte traverse toute la chaîne
 * d'effets (glitch/feedback/…) pour une transmission bien foireuse.
 */

interface WrappedLine {
  t: string;
  header: boolean;
}

export class TextScroller {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private lines: string[];
  private wrapped: WrappedLine[] = [];
  private scrollY = 0;
  private fontPx = 54;
  private lineH = 68;
  speed = 55; // px/s

  constructor(lines: string[]) {
    this.canvas = document.createElement("canvas");
    this.canvas.width = 1280;
    this.canvas.height = 720;
    this.ctx = this.canvas.getContext("2d")!;
    this.lines = lines.length ? lines : ["..."];
    this.rebuild();
  }

  setLines(lines: string[]): void {
    this.lines = lines.length ? lines : ["..."];
    this.rebuild();
  }

  private fontStr(): string {
    return `bold ${this.fontPx}px "Cascadia Mono", Consolas, monospace`;
  }

  private rebuild(): void {
    this.ctx.font = this.fontStr();
    const maxW = this.canvas.width * 0.9;
    this.wrapped = [];
    for (const line of this.lines) {
      const header = line.startsWith("//");
      const words = line.split(" ");
      let cur = "";
      for (const w of words) {
        const test = cur ? cur + " " + w : w;
        if (cur && this.ctx.measureText(test).width > maxW) {
          this.wrapped.push({ t: cur, header });
          cur = w;
        } else {
          cur = test;
        }
      }
      if (cur) this.wrapped.push({ t: cur, header });
      this.wrapped.push({ t: "", header: false }); // respiration entre tactiques
    }
  }

  update(dt: number): void {
    this.scrollY += this.speed * dt;
  }

  /** Redessine le canvas (à appeler avant l'upload). */
  draw(): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    ctx.font = this.fontStr();
    ctx.textBaseline = "top";

    const total = Math.max(1, this.wrapped.length * this.lineH);
    const startY = h - (this.scrollY % total);
    const x = w * 0.05;

    for (let k = -1; k <= 1; k++) {
      for (let i = 0; i < this.wrapped.length; i++) {
        const yy = startY + i * this.lineH + k * total;
        if (yy < -this.lineH || yy > h) continue;
        const wl = this.wrapped[i];
        if (!wl.t) continue;
        ctx.fillStyle = wl.header ? "#d8ff6a" : "#9be29b";
        ctx.fillText(wl.t, x, yy);
      }
    }
  }
}
