/**
 * Perturbateurs — glitch events courts et intenses, déclenchés par l'audio.
 * Même format que les effets (vec3 process(vec2 uv)) mais appliqués
 * de façon probabiliste et éphémère plutôt que continue.
 */

export interface Disruptor {
  name: string;
  id: string;
  body: string;
  defaultSensitivity: number; // 0..1 — seuil de déclenchement
  defaultDurationMs: number;  // durée d'un burst
  defaultCooldownMs: number;  // temps minimal entre deux bursts
}

import library from "virtual:shader-library";

/** Les perturbateurs vivent dans shaders/disruptors/*.glsl (voir src/shaderLibrary/library.ts). */
export const DISRUPTORS: Disruptor[] = library.disruptors as unknown as Disruptor[];
