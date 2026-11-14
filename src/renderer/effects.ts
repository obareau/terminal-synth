/**
 * Effets de post-traitement, dans l'ordre de la chaîne :
 *   génération → entropie → feedback → glitch → filtre
 *
 * Chaque effet fournit une fonction GLSL ES 3.00 :
 *   vec3 process(vec2 uv)
 * avec, fournis par le moteur (gl.ts) :
 *   prev(uv)  → couleur de la passe précédente
 *   fb(uv)    → couleur du frame précédent (historique, pour le feedback)
 *   hash(p)   → bruit pseudo-aléatoire
 *   uniforms  : u_time, u_resolution, u_bass/mid/treble/level, u_amount (0..1)
 */

export interface Effect {
  name: string;
  id: string;
  body: string;
}

import library from "virtual:shader-library";

/** Les effets vivent dans shaders/effects/*.glsl (voir src/shaderLibrary/library.ts). */
export const EFFECTS: Effect[] = library.effects as unknown as Effect[];
