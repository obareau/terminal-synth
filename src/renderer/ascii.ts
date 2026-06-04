/** Convertit un buffer de pixels RGBA (rendu offscreen) en art ASCII. */

const RAMP = " .:-=+*#%@"; // sombre → clair

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
