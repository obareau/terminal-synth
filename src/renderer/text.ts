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

  private glitch(s: string, amt: number): string {
    if (amt < 0.04) return s;
    let out = "";
    for (const c of s) {
      out += c !== " " && Math.random() < amt * 0.22
        ? GLITCH_CHARS[(Math.random() * GLITCH_CHARS.length) | 0]
        : c;
    }
    return out;
  }

  private render(now: number): void {
    const amt = this.energy;
    const cursor = Math.floor(now / 420) % 2 ? "█" : " ";
    const typed = this.cur.slice(0, this.charPos);
    const log = this.shown.map((l) => this.glitch(l, amt)).join("\n");
    this.el.textContent = (log ? log + "\n" : "") + this.glitch(typed, amt) + cursor;

    const j = amt > 0.3 ? (Math.random() - 0.5) * amt * 9 : 0;
    this.el.style.transform = `translateX(${j.toFixed(1)}px)`;
    const flicker = Math.random() < amt * 0.08 ? 0.35 : 0;
    this.el.style.opacity = (0.8 + 0.2 * Math.min(1, amt + 0.5) - flicker).toFixed(2);
  }
}
