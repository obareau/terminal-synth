/**
 * Overlay texte « transmission terminal » : machine à écrire + log défilant,
 * glitch/jitter réactif à l'énergie (audio + MIDI).
 */

// glitch : blocs/symboles + la syntaxe BANG! (x - ? ↺ ░ [ ] ( )) — clin d'œil
const GLITCH_CHARS = "▓▒░#@%*/\\|<>=+x-?↺[]()";

export type TextMode = "type" | "scroll";

export class TextOverlay {
  private el: HTMLElement;
  private lines: string[];
  private shown: string[] = []; // log visible (lignes terminées)
  private idx = 0; // index de la prochaine ligne source
  private cur = ""; // ligne en cours de frappe
  private charPos = 0;
  private nextAt = 0; // prochaine échéance (frappe / pause)
  private maxLines = 12;
  enabled = false;
  mode: TextMode = "type";
  energy = 0; // 0..1 → glitch

  constructor(el: HTMLElement, lines: string[]) {
    this.el = el;
    this.lines = lines.length ? lines : ["..."];
  }

  setLines(lines: string[]): void {
    this.lines = lines.length ? lines : ["..."];
    this.idx = 0;
    this.shown = [];
    this.cur = "";
    this.charPos = 0;
  }

  toggle(on: boolean): void {
    this.enabled = on;
    this.el.hidden = !on;
  }

  update(now: number): void {
    if (!this.enabled) return;

    if (this.charPos < this.cur.length) {
      // frappe caractère par caractère
      if (now >= this.nextAt) {
        this.charPos++;
        this.nextAt = now + 18 + Math.random() * 45;
      }
    } else if (this.cur) {
      // ligne terminée → pause puis on la pousse dans le log
      if (now >= this.nextAt) {
        this.shown.push(this.cur);
        while (this.shown.length > this.maxLines) this.shown.shift();
        this.cur = "";
        this.charPos = 0;
        this.nextAt = now + 500 + Math.random() * 700;
      }
    } else {
      // prochaine ligne
      if (now >= this.nextAt) {
        this.cur = this.lines[this.idx % this.lines.length] ?? "";
        this.idx++;
        this.charPos = 0;
        this.nextAt = now;
      }
    }

    this.render(now);
  }

  private rnd(): string {
    return GLITCH_CHARS[(Math.random() * GLITCH_CHARS.length) | 0] ?? "#";
  }

  private glitch(s: string, amt: number): string {
    if (amt < 0.03) return s;
    let out = "";
    for (const c of s) {
      if (c === " ") {
        out += " ";
        continue;
      }
      out += Math.random() < amt * 0.38 ? this.rnd() : c;
    }
    return out;
  }

  private scramble(s: string): string {
    let out = "";
    for (const c of s) out += c === " " ? " " : this.rnd();
    return out;
  }

  private render(now: number): void {
    // glitch permanent (baseline 0.22) puis amplifié par l'énergie
    const amt = Math.min(1, this.energy * 1.7 + 0.22);
    const cursor = Math.floor(now / 300) % 2 ? "█" : "▓";
    const typed = this.cur.slice(0, this.charPos);
    const log = this.shown
      .map((l) => (Math.random() < amt * 0.05 ? this.scramble(l) : this.glitch(l, amt)))
      .join("\n");
    this.el.textContent = (log ? log + "\n" : "") + this.glitch(typed, amt) + cursor;

    // tremblement + skew
    const jx = (Math.random() - 0.5) * amt * 14;
    const skew = (Math.random() - 0.5) * amt * 4;
    this.el.style.transform = `translateX(${jx.toFixed(1)}px) skewX(${skew.toFixed(2)}deg)`;

    // aberration chromatique RGB
    const off = (1 + amt * 6).toFixed(1);
    this.el.style.textShadow =
      `${off}px 0 rgba(255,40,40,.75), -${off}px 0 rgba(40,200,255,.65), 0 0 6px rgba(120,255,140,.5)`;

    // dropouts d'opacité
    this.el.style.opacity = (Math.random() < amt * 0.16 ? 0.3 + Math.random() * 0.4 : 1).toFixed(2);
  }
}
