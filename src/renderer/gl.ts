/**
 * Pipeline WebGL2 multi-passes :
 *   génération → [effets chaînés] → écran (ou pixels pour l'ASCII)
 *
 * Ping-pong entre deux FBO + une texture d'historique (frame précédent) pour le feedback.
 */

const VERT = `#version 300 es
void main() {
  vec2 v[3] = vec2[3](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));
  gl_Position = vec4(v[gl_VertexID], 0.0, 1.0);
}`;

const COMMON_UNIFORMS = `
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_bass;
uniform float u_mid;
uniform float u_treble;
uniform float u_level;
uniform float u_amount;
`;

// Générateur : implémente vec3 render(vec2 uv, vec2 res)
const GEN_HEADER = `#version 300 es
precision highp float;
out vec4 fragColor;
${COMMON_UNIFORMS}
uniform sampler2D u_audio; // 256×2 : ligne 0 = spectre, ligne 1 = forme d'onde
uniform sampler2D u_text;  // canvas texte (générateur RECTA)
float fftAt(float x) { return texture(u_audio, vec2(clamp(x, 0.0, 1.0), 0.25)).r; }
float waveAt(float x) { return texture(u_audio, vec2(clamp(x, 0.0, 1.0), 0.75)).r; }
vec3 textCol(vec2 uv) { return texture(u_text, uv).rgb; }
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
#define PI      3.14159265358979323846
#define TWO_PI  6.28318530717958647692
#define HALF_PI 1.5707963267948966192
`;
const GEN_FOOTER = `
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  fragColor = vec4(render(uv, u_resolution.xy), 1.0);
}`;

// Effet : implémente vec3 process(vec2 uv), avec prev()/fb()/hash()
const FX_HEADER = `#version 300 es
precision highp float;
out vec4 fragColor;
${COMMON_UNIFORMS}
uniform sampler2D u_prev;
uniform sampler2D u_feedback;
vec3 prev(vec2 uv) { return texture(u_prev, uv).rgb; }
vec3 fb(vec2 uv) { return texture(u_feedback, uv).rgb; }
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
`;
const FX_FOOTER = `
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  fragColor = vec4(process(uv), 1.0);
}`;

const UNIFORM_NAMES = [
  "u_resolution", "u_time", "u_bass", "u_mid", "u_treble", "u_level", "u_amount", "u_prev", "u_feedback", "u_audio", "u_text",
];

export interface Uniforms {
  time: number;
  bass: number;
  mid: number;
  treble: number;
  level: number;
}

export interface Program {
  program: WebGLProgram;
  loc: Partial<Record<string, WebGLUniformLocation | null>>;
}

export interface Stage {
  fx: Program;
  amount: number;
}

export class Pipeline {
  private gl: WebGL2RenderingContext;
  private vao: WebGLVertexArrayObject;
  private vs: WebGLShader;
  private gen: Program | null = null;
  private copy: Program;
  // 2 cibles ping-pong + 1 historique (frame précédent)
  private tex: (WebGLTexture | null)[] = [null, null, null];
  private fbo: (WebGLFramebuffer | null)[] = [null, null, null];
  private audioTex: WebGLTexture;
  private textTex: WebGLTexture;
  private w = 0;
  private h = 0;

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2", { antialias: false });
    if (!gl) throw new Error("WebGL2 indisponible");
    this.gl = gl;
    this.vao = gl.createVertexArray()!;
    this.vs = this.compileShader(gl.VERTEX_SHADER, VERT);
    this.copy = this.compileEffect("vec3 process(vec2 uv) { return prev(uv); }");
    this.audioTex = this.makeAudioTex();
    this.textTex = this.makeTextTex();
  }

  private makeTextTex(): WebGLTexture {
    const gl = this.gl;
    const t = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }

  /** Met à jour la texture texte depuis un canvas 2D. */
  updateText(src: TexImageSource): void {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.textTex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  }

  private makeAudioTex(): WebGLTexture {
    const gl = this.gl;
    const t = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, 256, 2, 0, gl.RED, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }

  /** Met à jour la texture audio : `data` de 512 octets (256 spectre + 256 waveform). */
  updateAudio(data: Uint8Array): void {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.audioTex);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 256, 2, gl.RED, gl.UNSIGNED_BYTE, data);
  }

  private compileShader(type: number, src: string): WebGLShader {
    const gl = this.gl;
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(s) ?? "";
      console.error("[GL] compile error:\n" + log + "\n\nSource:\n" + src);
      throw new Error("Shader : " + log);
    }
    return s;
  }

  private link(fragSrc: string): Program {
    const gl = this.gl;
    const fs = this.compileShader(gl.FRAGMENT_SHADER, fragSrc);
    const p = gl.createProgram()!;
    gl.attachShader(p, this.vs);
    gl.attachShader(p, fs);
    gl.linkProgram(p);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      throw new Error("Link : " + gl.getProgramInfoLog(p));
    }
    const loc: Partial<Record<string, WebGLUniformLocation | null>> = {};
    for (const n of UNIFORM_NAMES) loc[n] = gl.getUniformLocation(p, n);
    return { program: p, loc };
  }

  setGenerator(body: string): void {
    const next = this.link(GEN_HEADER + body + GEN_FOOTER);
    if (this.gen) this.gl.deleteProgram(this.gen.program);
    this.gen = next;
  }

  compileEffect(body: string): Program {
    return this.link(FX_HEADER + body + FX_FOOTER);
  }

  private bindUniforms(p: Program, u: Uniforms, amount: number): void {
    const gl = this.gl;
    gl.useProgram(p.program);
    gl.uniform2f(p.loc["u_resolution"] ?? null, this.w, this.h);
    gl.uniform1f(p.loc["u_time"] ?? null, u.time);
    gl.uniform1f(p.loc["u_bass"] ?? null, u.bass);
    gl.uniform1f(p.loc["u_mid"] ?? null, u.mid);
    gl.uniform1f(p.loc["u_treble"] ?? null, u.treble);
    gl.uniform1f(p.loc["u_level"] ?? null, u.level);
    gl.uniform1f(p.loc["u_amount"] ?? null, amount);
  }

  private makeTex(): WebGLTexture {
    const gl = this.gl;
    const t = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, this.w, this.h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }

  private ensure(w: number, h: number): void {
    const gl = this.gl;
    if (this.w === w && this.h === h && this.fbo[0]) return;
    this.w = w;
    this.h = h;
    for (let i = 0; i < 3; i++) {
      if (this.tex[i]) gl.deleteTexture(this.tex[i]);
      if (this.fbo[i]) gl.deleteFramebuffer(this.fbo[i]);
      this.tex[i] = this.makeTex();
      this.fbo[i] = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo[i]);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.tex[i], 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
  }

  private drawTri(): void {
    this.gl.bindVertexArray(this.vao);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 3);
  }

  private pass(p: Program, target: WebGLFramebuffer | null, u: Uniforms, amount: number, srcTex?: WebGLTexture | null): void {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, target);
    gl.viewport(0, 0, this.w, this.h);
    this.bindUniforms(p, u, amount);
    // texture audio (spectre + waveform) → unité 2, dispo pour les générateurs
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.audioTex);
    gl.uniform1i(p.loc["u_audio"] ?? null, 2);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, this.textTex);
    gl.uniform1i(p.loc["u_text"] ?? null, 3);
    if (srcTex !== undefined) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, srcTex);
      gl.uniform1i(p.loc["u_prev"] ?? null, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.tex[2]); // historique
      gl.uniform1i(p.loc["u_feedback"] ?? null, 1);
    }
    this.drawTri();
  }

  /** Lit les pixels du dernier frame rendu (depuis tex[2], la copie historique). */
  readback(): Uint8Array | null {
    const gl = this.gl;
    if (!this.fbo[2] || this.w <= 0 || this.h <= 0) return null;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo[2]);
    const pixels = new Uint8Array(this.w * this.h * 4);
    gl.readPixels(0, 0, this.w, this.h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return pixels;
  }

  /**
   * Exécute la chaîne. Si `readback`, renvoie les pixels finaux (pour l'ASCII),
   * sinon dessine à l'écran.
   */
  render(stages: Stage[], w: number, h: number, u: Uniforms, readback: boolean): Uint8Array | null {
    if (!this.gen) return null;
    const gl = this.gl;
    this.ensure(w, h);

    // Génération → tex[0]
    this.pass(this.gen, this.fbo[0], u, 0);
    let cur = 0;

    // Effets chaînés
    for (const st of stages) {
      const dst = cur === 0 ? 1 : 0;
      this.pass(st.fx, this.fbo[dst], u, st.amount, this.tex[cur]);
      cur = dst;
    }

    // Lecture éventuelle des pixels finaux
    let pixels: Uint8Array | null = null;
    if (readback) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo[cur]);
      pixels = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    }

    // Met à jour l'historique (frame précédent) ← final
    this.pass(this.copy, this.fbo[2], u, 0, this.tex[cur]);

    // Écran
    if (!readback) this.pass(this.copy, null, u, 0, this.tex[cur]);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return pixels;
  }
}
