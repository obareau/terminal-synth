/** Convertit un buffer de pixels RGBA (rendu offscreen) en art ASCII. */

// Extended ramp with more characters for subtler glitch effect
const RAMP = " ·.,:;-–—=+*#%@░▒▓█∙•◦○●◉◊▪▫■□▬▭▯╌╍╎╏╸╹╺╻░▒▓█▄▀▐▌▫▯▬▭╋╂╊╅╈╇╄╃╆╉╊╋╌╍╎╏═║╒╓╔╕╖╗╘╙╚╛╜╝╞╟╠╡╢╣║╤╥╦╧╨╩╪╫╬═╭╮╯╰▔▕▎▍▌▋▊▉▐▏▎▍▌▋▊▉▐┌─┐│└─┘├─┤┌─┐│├─┤│└─┘¡!¿?『』「」⟨⟩《》≪≫◂▸◄▶◅▷◁▶「」『』∿∿∼～≈≉≠±∓×÷⋅∙・▪■□▫◘◙○◎●◐◑◒◓◔◕◖◗◘◙◚◛◜◝◞◟◠◡◢◣◤◥◦◧◨◩◪◫◬◭◮◯ ·•゚･◆◇◎◈◉◊▲▼▶◀△▽▷◁◯◆◇◈●■□★☆✓✕✗✘✙✚✛✜✝✞✟✠✡✢✣✤✥✦✧✨✩✪✫✬✭✮✯"; // sombre → clair avec variété

export function pixelsToAscii(px: Uint8Array, w: number, h: number): string {
  const rows: string[] = [];
  // readPixels renvoie de bas en haut → on parcourt à l'envers.
  for (let y = h - 1; y >= 0; y--) {
    let line = "";
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const lum = 0.299 * px[i]! + 0.587 * px[i + 1]! + 0.114 * px[i + 2]!;
      const idx = Math.max(0, Math.min(RAMP.length - 1, Math.floor((lum / 255) * (RAMP.length - 1))));
      line += RAMP[idx];
    }
    rows.push(line);
  }
  return rows.join("\n");
}

// Color palette for glitch - high contrast colors with 2-3% opacity
const GLITCH_COLORS = [
  "rgba(255, 0, 127, 0.02)",  // Bright magenta
  "rgba(0, 255, 255, 0.03)",  // Cyan
  "rgba(255, 255, 0, 0.025)", // Yellow
  "rgba(0, 255, 0, 0.02)",    // Lime
  "rgba(255, 127, 0, 0.03)",  // Orange
];

export function pixelsToAsciiColorGlitch(px: Uint8Array, w: number, h: number): string {
  const rows: string[] = [];
  for (let y = h - 1; y >= 0; y--) {
    let line = "";
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const lum = 0.299 * px[i]! + 0.587 * px[i + 1]! + 0.114 * px[i + 2]!;
      const idx = Math.max(0, Math.min(RAMP.length - 1, Math.floor((lum / 255) * (RAMP.length - 1))));
      const char = RAMP[idx];

      // Very subtle random glitch: ~2% of chars get a minimal color overlay
      if (Math.random() < 0.02) {
        const color = GLITCH_COLORS[Math.floor(Math.random() * GLITCH_COLORS.length)]!;
        line += `<span style="background-color:${color};text-decoration:underline">${char}</span>`;
      } else {
        line += char;
      }
    }
    rows.push(line);
  }
  return rows.join("<br>");
}
