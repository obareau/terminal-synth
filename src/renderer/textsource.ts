/**
 * TacticDisplay — pioche UNE Tactique Recta au hasard et l'affiche en GRAND
 * (auto-fit centré) sur un canvas 2D offscreen, puis coupe sur une autre.
 *
 * Dynamique (pas un prompteur) : changement auto toutes ~N secondes, et coupe
 * forcée sur les pics d'énergie (hits audio/MIDI). Le canvas est uploadé en
 * texture (u_text) et échantillonné par le générateur "RECTA".
 */

const GLITCH_CHARS = "▓▒░#@%*/\\|<>=+x-?↺[]()";

export class TacticDisplay {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private pool: string[];
  private current = "";
  private nextSwapAt = 0;
  private flashUntil = 0;
  private lastForce = 0;
  holdMs = 4200;

  constructor(lines: string[]) {
    this.canvas = document.createElement("canvas");
    this.canvas.width = 1280;
    this.canvas.height = 720;
    this.ctx = this.canvas.getContext("2d")!;
    this.pool = this.filter(lines);
    this.current = this.pick();
  }

  setLines(lines: string[]): void {
    this.pool = this.filter(lines);
    this.current = this.pick();
  }

  private filter(lines: string[]): string[] {
    const p = lines.filter((l) => l && !l.startsWith("//"));
    return p.length ? p : ["..."];
  }

  private pick(): string {
    if (this.pool.length === 1) return this.pool[0] ?? "";
    let c = this.current;
    while (c === this.current) c = this.pool[(Math.random() * this.pool.length) | 0] ?? "";
    return c;
  }

  private swap(now: number): void {
    this.current = this.pick();
    this.flashUntil = now + 170; // bref cut glitché
    this.nextSwapAt = now + this.holdMs * (0.7 + Math.random() * 0.7);
  }

  /** Force une nouvelle tactique (sur un hit), avec un cooldown. */
  forceNext(now: number): void {
    if (now - this.lastForce < 350) return;
    this.lastForce = now;
    this.swap(now);
  }

  update(now: number): void {
    if (now >= this.nextSwapAt) this.swap(now);
  }

  private scramble(s: string): string {
    let out = "";
    for (const c of s) out += c === " " ? " " : GLITCH_CHARS[(Math.random() * GLITCH_CHARS.length) | 0] ?? "#";
    return out;
  }

  private wrap(txt: string, maxW: number): string[] {
    const words = txt.split(" ");
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      const test = cur ? cur + " " + w : w;
      if (cur && this.ctx.measureText(test).width > maxW) {
        lines.push(cur);
        cur = w;
      } else {
        cur = test;
      }
    }
    if (cur) lines.push(cur);
    return lines;
  }

  /** Calcule la plus grosse police qui fait tenir le texte. */
  private layout(txt: string): { fontPx: number; lines: string[] } {
    const maxW = this.canvas.width * 0.86;
    const maxH = this.canvas.height * 0.74;
    for (let fp = Math.floor(this.canvas.height * 0.17); fp >= 24; fp -= 4) {
      this.ctx.font = `bold ${fp}px "Cascadia Mono", Consolas, monospace`;
      const lines = this.wrap(txt, maxW);
      if (lines.length * fp * 1.2 <= maxH) return { fontPx: fp, lines };
    }
    this.ctx.font = `bold 24px "Cascadia Mono", Consolas, monospace`;
    return { fontPx: 24, lines: this.wrap(txt, maxW) };
  }

  /** `energy` 0..1 → léger glitch même pendant le maintien. */
  draw(now: number, energy: number): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);

    const flashing = now < this.flashUntil;
    const { fontPx, lines } = this.layout(this.current);
    ctx.font = `bold ${fontPx}px "Cascadia Mono", Consolas, monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const lineH = fontPx * 1.2;
    const totalH = lines.length * lineH;
    let y = h / 2 - totalH / 2 + lineH / 2;
    const gAmt = flashing ? 1 : energy * 0.5;

    for (const raw of lines) {
      const s = flashing ? this.scramble(raw) : this.glitchLine(raw, gAmt);
      const jx = gAmt > 0.2 ? (Math.random() - 0.5) * gAmt * 24 : 0;
      ctx.fillStyle = "#9be29b";
      ctx.fillText(s, w / 2 + jx, y);
      y += lineH;
    }
  }

  private glitchLine(s: string, amt: number): string {
    if (amt < 0.05) return s;
    let out = "";
    for (const c of s) {
      out += c !== " " && Math.random() < amt * 0.18
        ? GLITCH_CHARS[(Math.random() * GLITCH_CHARS.length) | 0] ?? c
        : c;
    }
    return out;
  }
}
