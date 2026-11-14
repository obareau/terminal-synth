/**
 * Assemblage GLSL ES 3.00 complet d'un générateur ou d'un effet (en-tête, uniforms,
 * helpers, main). Partagé par le pipeline WebGL (gl.ts) et le script de conversion
 * Metal (scripts/convert-metal.ts) : les deux compilent exactement le même source.
 */

export const COMMON_UNIFORMS = `
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_bass;
uniform float u_mid;
uniform float u_treble;
uniform float u_level;
uniform float u_amount;
uniform float u_beat;
uniform float u_beatEnv;
uniform float u_p0;
uniform float u_p1;
uniform float u_p2;
uniform float u_p3;
`;

export const GEN_HEADER = `#version 300 es
precision highp float;
out vec4 fragColor;
${COMMON_UNIFORMS}
uniform sampler2D u_audio;
uniform sampler2D u_text;
uniform sampler2D u_fbmTex;
uniform sampler2D u_media;
uniform int u_mediaLoaded;
float fftAt(float x) { return texture(u_audio, vec2(clamp(x, 0.0, 1.0), 0.25)).r; }
float waveAt(float x) { return texture(u_audio, vec2(clamp(x, 0.0, 1.0), 0.75)).r; }
vec3 textCol(vec2 uv) { return texture(u_text, uv).rgb; }
// 5-octave value-noise fbm baked at startup (tiles every 64 units).
float fbmTex(vec2 p) { return texture(u_fbmTex, p * (1.0 / 64.0)).r; }
vec3 mediaCol(vec2 uv) { return texture(u_media, clamp(uv, 0.0, 1.0)).rgb; }
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
#define PI      3.14159265358979323846
#define TWO_PI  6.28318530717958647692
#define HALF_PI 1.5707963267948966192
`;
export const GEN_FOOTER = `
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  fragColor = vec4(render(uv, u_resolution.xy), 1.0);
}`;

export const FX_HEADER = `#version 300 es
precision highp float;
out vec4 fragColor;
${COMMON_UNIFORMS}
uniform sampler2D u_prev;
uniform sampler2D u_feedback;
vec3 prev(vec2 uv) { return texture(u_prev, uv).rgb; }
vec3 fb(vec2 uv)   { return texture(u_feedback, uv).rgb; }
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
#define PI      3.14159265358979323846
#define TWO_PI  6.28318530717958647692
#define HALF_PI 1.5707963267948966192
`;
export const FX_FOOTER = `
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  fragColor = vec4(process(uv), 1.0);
}`;

function hasFunction(src: string, name: string): boolean {
  return new RegExp(`\\b${name}\\s*\\(`).test(src);
}
function hasMainFunction(src: string): boolean {
  return /\bvoid\s+main\s*\(/.test(src);
}
function ensureFunction(src: string, name: string, defaultBody: string): string {
  if (hasFunction(src, name)) return src;
  return src + `\n${defaultBody}`;
}

export interface WrappedShader { source: string; isComplete: boolean; }

/** Générateur : corps `vec3 render(vec2 uv, vec2 res)` → fragment shader complet. */
export function wrapGenerator(body: string): WrappedShader {
  const isComplete = hasMainFunction(body);
  return {
    isComplete,
    source: isComplete
      ? body  // Already a complete shader
      : GEN_HEADER + ensureFunction(body, "render", "vec3 render(vec2 uv, vec2 resolution) { return vec3(0.0); }") + GEN_FOOTER,
  };
}

/** Effet ou perturbateur : corps `vec3 process(vec2 uv)` → fragment shader complet. */
export function wrapEffect(body: string): WrappedShader {
  const isComplete = hasMainFunction(body);
  return {
    isComplete,
    source: isComplete
      ? body
      : FX_HEADER + ensureFunction(body, "process", "vec3 process(vec2 uv) { return prev(uv); }") + FX_FOOTER,
  };
}
