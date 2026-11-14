/**
 * Shaders intégrés. Chacun fournit une fonction GLSL ES 3.00 :
 *   vec3 render(vec2 uv, vec2 res)
 * Le moteur (gl.ts) ajoute l'en-tête (uniforms) et le main().
 *
 * Uniforms disponibles : u_time, u_resolution, u_bass, u_mid, u_treble, u_level (0..1).
 * u_p0..u_p3 sont des uniforms GLSL flottants.
 * "holdMs" est un paramètre JS uniquement (contrôle tactics.holdMs, pas un uniform GLSL).
 */

export interface ShaderParam {
  label: string;
  key: "u_p0" | "u_p1" | "u_p2" | "u_p3" | "holdMs";
  min: number; max: number; default: number; step?: number;
}
export interface Shader {
  name: string;
  src: string;
  params?: ShaderParam[];
  category?: "Text" | "Plasma" | "Geometry" | "Noise" | "Interactive" | "Real-world" | "Industrial" | "Lofi" | "Media";
}

import library from "virtual:shader-library";

/** Les générateurs vivent dans shaders/generators/*.glsl (voir src/shaderLibrary/library.ts). */
export const SHADERS: Shader[] = library.generators as unknown as Shader[];
