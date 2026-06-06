/**
 * TacticDisplay — Affiche une "transmission RECTA" dans un vrai terminal UI :
 * fenêtre box-drawing, métadonnées ROBOTARIIS, typewriter, glitch.
 * Le canvas 2D est uploadé en texture u_text → filtré par le shader RECTA.
 */

const GLITCH_POOL = "▓▒░#@%*/\\|<>=+↺[]()01AZΩ◈•—";
const PRIORITIES   = ["RECTITUDE", "OMEGA-NULL", "DELTA", "GAMMA", "ALPHA"];
const CHANNELS     = ["AZA_PRIMARY", "RECTA_FIELD", "COMBAT_NET", "DARK_UPLINK", "SECTOR_VOID"];
const FROMS        = ["AZA//COMBAT-NET", "RECTA_NODE", "SECTOR_ALPHA", "AZA//FIELD", "NODE_DARK"];

export class TacticDisplay {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private pool: string[];
  private current     = "";
  private nextSwapAt  = 0;
  private flashUntil  = 0;
  private lastForce   = 0;
  private swapCount   = 0;
  private typePos     = 0;  // chars typed so far
  private typeSpeed   = 55; // chars/second
  private lastTick    = 0;
  private lastDrawMs  = 0;
  holdMs = 4200;

  private readonly W = 1280;
  private readonly H = 720;
  private readonly FONT = `"Cascadia Mono", Consolas, "Courier New", monospace`;
  private readonly FP   = 14;   // font px (content)
  private readonly LH   = 20;   // line height px

  constructor(lines: string[]) {
    this.canvas = document.createElement("canvas");
    this.canvas.width  = this.W;
    this.canvas.height = this.H;
    this.ctx  = this.canvas.getContext("2d")!;
    this.pool = this.filter(lines);
    this.current   = this.pick();
    this.typePos   = this.current.length; // start fully typed
    this.lastTick  = performance.now();
    this.lastDrawMs = performance.now();
  }

  setLines(lines: string[]): void {
    this.pool    = this.filter(lines);
    this.current = this.pick();
    this.typePos = this.current.length;
  }

  private filter(lines: string[]): string[] {
    const p = lines.filter((l) => l && !l.startsWith("//"));
    return p.length ? p : ["AZA TRANSMISSION"];
  }
  private pick(): string {
    if (this.pool.length === 1) return this.pool[0]!;
    let c = this.current;
    while (c === this.current) c = this.pool[(Math.random() * this.pool.length) | 0]!;
    return c;
  }
  private swap(now: number): void {
    this.current    = this.pick();
    this.flashUntil = now + 160;
    this.nextSwapAt = now + this.holdMs * (0.7 + Math.random() * 0.6);
    this.swapCount++;
    this.typePos    = 0;
  }
  forceNext(now: number): void {
    if (now - this.lastForce < 320) return;
    this.lastForce = now;
    this.swap(now);
  }
  update(now: number): void {
    if (now >= this.nextSwapAt) this.swap(now);
    const dt = Math.min(80, now - this.lastTick);
    this.lastTick = now;
    this.typePos  = Math.min(this.current.length, this.typePos + this.typeSpeed * dt / 1000);
  }

  // ── Dessin principal ────────────────────────────────────────────────

  draw(now: number, energy: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, this.W, this.H);

    if (now < this.flashUntil) { this.drawGlitch(); return; }
    this.drawTUI(now, energy);
    this.lastDrawMs = now;
  }

  private drawTUI(now: number, energy: number): void {
    const { ctx, W, H, FONT, FP, LH } = this;
    ctx.font         = `${FP}px ${FONT}`;
    ctx.textBaseline = "top";
    ctx.textAlign    = "left";

    // ── Layout ────────────────────────────────────────────────────────
    const CW   = ctx.measureText("M").width;  // char width (monospace)
    const winW = Math.min(880, W - 100);
    const winX = Math.floor((W - winW) / 2);
    const cols = Math.floor((winW - CW * 4) / CW); // usable text columns

    // ── Metadata ──────────────────────────────────────────────────────
    const ts    = new Date().toISOString().slice(11, 19);
    const txID  = String(this.swapCount).padStart(4, "0");
    const sector = this.hashInt(this.current).toString(16).toUpperCase().padStart(6, "0");
    const prio  = PRIORITIES[this.swapCount % PRIORITIES.length]!;
    const chan   = CHANNELS[this.swapCount % CHANNELS.length]!;
    const from   = FROMS[this.swapCount % FROMS.length]!;

    // ── Tactique text (typewriter) ─────────────────────────────────────
    const displayed = this.current.slice(0, Math.round(this.typePos));
    ctx.font = `bold ${FP}px ${FONT}`;
    const tacLines  = this.wrap(displayed, cols - 2, ctx, CW);
    const fullLines = this.wrap(this.current, cols - 2, ctx, CW);
    ctx.font = `${FP}px ${FONT}`;

    // Progress bar
    const elapsed  = now - (this.nextSwapAt - this.holdMs * 1.05);
    const progress = Math.max(0, Math.min(1, elapsed / this.holdMs));
    const barLen   = 24;
    const filled   = Math.round(progress * barLen);
    const pBar     = "█".repeat(filled) + "░".repeat(barLen - filled);
    const rxStatus = progress < 0.2 ? "RECEIVING" : progress < 0.85 ? "DECRYPTING" : "RECEIVED ";

    // Cursor blink
    const cursor = Math.floor(now / 420) % 2 === 0 ? "▋" : " ";

    // Meta lines
    const sep   = "─".repeat(cols);
    const meta1 = `FROM: ${from}-${sector}`;
    const meta2 = `PRIORITY: ${prio}   CHANNEL: ${chan}`;
    const stat  = `[${pBar}] ${String(Math.round(progress * 100)).padStart(3, " ")}%  ◈ ${rxStatus}`;

    const inner: string[] = [
      meta1,
      meta2,
      sep,
      "",
      ...tacLines.map((l, i) => {
        const isLast = i === tacLines.length - 1;
        const done   = Math.round(this.typePos) >= this.current.length;
        return isLast && !done ? l + cursor : l;
      }),
      ...Array(Math.max(0, fullLines.length - tacLines.length)).fill(""),
      "",
      sep,
      stat,
    ];

    // ── Window height & position ─────────────────────────────────────
    const hdrH = LH + 2;
    const winH = hdrH + inner.length * LH + LH + 4;
    const winY = Math.floor((H - winH) * 0.48);

    // ── Background panel ─────────────────────────────────────────────
    ctx.fillStyle = "#080808";
    ctx.fillRect(winX, winY, winW, winH);

    // ── Header border: ┌─ ◈ TX·XXXX ─── timestamp ─┐ ──────────────
    ctx.fillStyle = "#fff";
    const hdrL   = ` ◈ TX·${txID} `;
    const hdrR   = ` ${ts} `;
    const hdrMid = "─".repeat(Math.max(2, cols - hdrL.length - hdrR.length + 2));
    ctx.fillText(`┌${hdrL}${hdrMid}${hdrR}┐`, winX, winY);

    // ── Inner lines ──────────────────────────────────────────────────
    const tacStart = 4; // index of first tactique line in inner[]
    const tacEnd   = tacStart + fullLines.length;

    let y = winY + hdrH;
    inner.forEach((line, idx) => {
      const isTac = idx > tacStart - 1 && idx < tacEnd + 1 && line !== "" && line !== sep;
      const glitch = !isTac && energy > 0.45 && Math.random() < energy * 0.07;
      const display = glitch ? this.scrambleLine(line) : line;
      const padded  = display.padEnd(cols, " ").slice(0, cols);

      if (isTac) {
        ctx.fillStyle = "#fff"; // brightware = green through shader
        ctx.font = `bold ${FP}px ${FONT}`;
      } else {
        ctx.fillStyle = "#aaa";
        ctx.font = `${FP}px ${FONT}`;
      }
      ctx.fillText(`│ ${padded} │`, winX, y);
      y += LH;
    });

    // ── Footer border: └──────────────────────────────────────────────────┘
    ctx.fillStyle = "#fff";
    ctx.font = `${FP}px ${FONT}`;
    ctx.fillText(`└${"─".repeat(cols + 2)}┘`, winX, y);
  }

  // ── Helpers ─────────────────────────────────────────────────────────

  private wrap(text: string, cols: number, ctx: CanvasRenderingContext2D, cw: number): string[] {
    const maxW = cols * cw;
    const words = text.split(" ");
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      const test = cur ? cur + " " + w : w;
      if (cur && ctx.measureText(test).width > maxW) { lines.push(cur); cur = w; }
      else cur = test;
    }
    if (cur) lines.push(cur);
    return lines.length ? lines : [""];
  }

  private drawGlitch(): void {
    const ctx = this.ctx;
    const pool = GLITCH_POOL + "AZA//RECTA OMEGA NULL COMBAT ";
    ctx.fillStyle = "#2a2a2a";
    ctx.font = `${this.FP}px ${this.FONT}`;
    ctx.textBaseline = "top";
    for (let y = 0; y < this.H; y += 18) {
      const line = Array.from({ length: 90 }, () =>
        pool[Math.floor(Math.random() * pool.length)] ?? " "
      ).join("");
      ctx.fillText(line, 0, y);
    }
  }

  private scrambleLine(s: string): string {
    return [...s].map((c) =>
      c !== " " && Math.random() < 0.18
        ? GLITCH_POOL[Math.floor(Math.random() * GLITCH_POOL.length)] ?? c
        : c
    ).join("");
  }

  private hashInt(s: string): number {
    let h = 5381;
    for (const c of s) h = ((h << 5) + h + c.charCodeAt(0)) | 0;
    return Math.abs(h);
  }
}
