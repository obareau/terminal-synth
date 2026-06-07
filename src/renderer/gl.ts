/**
 * Pipeline WebGL2 multi-passes :
 *   [gen A]  ─┐
 *              ├─ composite(blend) → [effets chaînés] → écran
 *   [gen B]  ─┘
 *
 * Ping-pong tex[0]/tex[1] + historique tex[2] + layer B tex[3].
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
uniform float u_p0;
uniform float u_p1;
uniform float u_p2;
uniform float u_p3;
`;

const GEN_HEADER = `#version 300 es
precision highp float;
out vec4 fragColor;
${COMMON_UNIFORMS}
uniform sampler2D u_audio;
uniform sampler2D u_text;
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

const FX_HEADER = `#version 300 es
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
const FX_FOOTER = `
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  fragColor = vec4(process(uv), 1.0);
}`;

// ── Composite (blend modes Photoshop-style) ──────────────────────────────────
const COMPOSITE_FRAG = `#version 300 es
precision highp float;
out vec4 fragColor;
uniform vec2  u_resolution;
uniform sampler2D u_layerA;
uniform sampler2D u_layerB;
uniform int   u_blend;
uniform float u_opacity;

vec3 blend_fn(vec3 a, vec3 b) {
  if (u_blend == 1)  return clamp(a + b, 0.0, 1.0);                          // Add
  if (u_blend == 2)  return a * b;                                            // Multiply
  if (u_blend == 3)  return 1.0 - (1.0-a)*(1.0-b);                          // Screen
  if (u_blend == 4)  return mix(2.0*a*b, 1.0-2.0*(1.0-a)*(1.0-b),
                                step(0.5, a));                                // Overlay
  if (u_blend == 5)  return min(a, b);                                        // Darken
  if (u_blend == 6)  return max(a, b);                                        // Lighten
  if (u_blend == 7)  return abs(a - b);                                       // Difference
  if (u_blend == 8)  return clamp(a / max(b, vec3(0.001)), 0.0, 2.0);        // Divide
  if (u_blend == 9)  return clamp(2.0*a*b + a*a - 2.0*a*b*a, 0.0, 1.0);    // Hard Light
  if (u_blend == 10) { ivec3 ia = ivec3(clamp(a,0.0,1.0)*255.0);             // XOR
                       ivec3 ib = ivec3(clamp(b,0.0,1.0)*255.0);
                       return vec3(ia ^ ib) / 255.0; }
  return b;  // 0 = Normal
}

void main() {
  vec2  uv = gl_FragCoord.xy / u_resolution;
  vec3  a  = texture(u_layerA, uv).rgb;
  vec3  b  = texture(u_layerB, uv).rgb;
  fragColor = vec4(mix(a, blend_fn(a, b), u_opacity), 1.0);
}`;

const UNIFORM_NAMES = [
  "u_resolution","u_time","u_bass","u_mid","u_treble","u_level","u_amount",
  "u_p0","u_p1","u_p2","u_p3",
  "u_prev","u_feedback","u_audio","u_text",
];

export interface Uniforms { time: number; bass: number; mid: number; treble: number; level: number; }
export interface Program  { program: WebGLProgram; loc: Partial<Record<string, WebGLUniformLocation | null>>; }
export interface Stage    { fx: Program; amount: number; }

export const BLEND_MODES = [
  "Normal","Add","Multiply","Screen","Overlay",
  "Darken","Lighten","Difference","Divide","Hard Light","XOR",
];

export class Pipeline {
  private gl: WebGL2RenderingContext;
  private vao: WebGLVertexArrayObject;
  private vs: WebGLShader;
  private gen:  Program | null = null;
  private gen2: Program | null = null;
  private copy: Program;
  private compositeProg: Program;
  // tex[0]/[1] ping-pong · tex[2] historique · tex[3] layer B
  private tex: (WebGLTexture | null)[]    = [null, null, null, null];
  private fbo: (WebGLFramebuffer | null)[] = [null, null, null, null];
  private audioTex: WebGLTexture;
  private textTex:  WebGLTexture;
  private w = 0;
  private h = 0;
  private blendMode    = 0;
  private blendOpacity = 1.0;
  private genParams    = [0, 0, 0, 0];

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2", { antialias: false, preserveDrawingBuffer: true });
    if (!gl) throw new Error("WebGL2 indisponible");
    this.gl  = gl;
    this.vao = gl.createVertexArray()!;
    this.vs  = this.compileShader(gl.VERTEX_SHADER, VERT);
    this.copy = this.compileEffect("vec3 process(vec2 uv) { return prev(uv); }");
    this.compositeProg = this.linkRaw(COMPOSITE_FRAG,
      ["u_resolution","u_layerA","u_layerB","u_blend","u_opacity"]);
    this.audioTex = this.makeAudioTex();
    this.textTex  = this.makeTextTex();
  }

  // ── Textures utilitaires ────────────────────────────────────────────────────

  private makeTextTex(): WebGLTexture {
    const gl = this.gl, t = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,255]));
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    return t;
  }
  updateText(src: TexImageSource): void {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.textTex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,src);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  }
  private makeAudioTex(): WebGLTexture {
    const gl = this.gl, t = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.R8,256,2,0,gl.RED,gl.UNSIGNED_BYTE,null);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    return t;
  }
  updateAudio(data: Uint8Array): void {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.audioTex);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,256,2,gl.RED,gl.UNSIGNED_BYTE,data);
  }

  // ── Compilation ─────────────────────────────────────────────────────────────

  private compileShader(type: number, src: string): WebGLShader {
    const gl = this.gl, s = gl.createShader(type)!;
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(s) ?? "";
      console.error("[GL] compile error:\n" + log + "\n\nSource:\n" + src);
      throw new Error("Shader : " + log);
    }
    return s;
  }
  private link(fragSrc: string): Program {
    return this.linkRaw(fragSrc, UNIFORM_NAMES);
  }
  private linkRaw(fragSrc: string, uniforms: string[]): Program {
    const gl = this.gl;
    const fs = this.compileShader(gl.FRAGMENT_SHADER, fragSrc);
    const p  = gl.createProgram()!;
    gl.attachShader(p, this.vs); gl.attachShader(p, fs);
    gl.linkProgram(p); gl.deleteShader(fs);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS))
      throw new Error("Link : " + gl.getProgramInfoLog(p));
    const loc: Partial<Record<string, WebGLUniformLocation | null>> = {};
    for (const n of uniforms) loc[n] = gl.getUniformLocation(p, n);
    return { program: p, loc };
  }

  setGenerator(body: string): void {
    const next = this.link(GEN_HEADER + body + GEN_FOOTER);
    if (this.gen) this.gl.deleteProgram(this.gen.program);
    this.gen = next;
  }
  setGenerator2(body: string | null): void {
    if (body === null) {
      if (this.gen2) this.gl.deleteProgram(this.gen2.program);
      this.gen2 = null;
      return;
    }
    const next = this.link(GEN_HEADER + body + GEN_FOOTER);
    if (this.gen2) this.gl.deleteProgram(this.gen2.program);
    this.gen2 = next;
  }
  compileEffect(body: string): Program { return this.link(FX_HEADER + body + FX_FOOTER); }

  setBlend(mode: number, opacity: number): void {
    this.blendMode = mode; this.blendOpacity = opacity;
  }
  setGenParams(p: number[]): void {
    for (let i = 0; i < 4; i++) this.genParams[i] = p[i] ?? 0;
  }

  // ── FBO management ──────────────────────────────────────────────────────────

  private makeTex(): WebGLTexture {
    const gl = this.gl, t = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,this.w,this.h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    return t;
  }
  private makeFbo(idx: number): void {
    const gl = this.gl;
    if (this.tex[idx]) gl.deleteTexture(this.tex[idx]);
    if (this.fbo[idx]) gl.deleteFramebuffer(this.fbo[idx]);
    this.tex[idx] = this.makeTex();
    this.fbo[idx] = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo[idx]);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,this.tex[idx],0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }
  private ensure(w: number, h: number): void {
    if (this.w === w && this.h === h && this.fbo[0]) return;
    this.w = w; this.h = h;
    for (let i = 0; i < 3; i++) this.makeFbo(i);
    // invalide layer B si resize
    if (this.fbo[3]) { this.gl.deleteTexture(this.tex[3]); this.gl.deleteFramebuffer(this.fbo[3]); this.tex[3]=null; this.fbo[3]=null; }
  }
  private ensureLayer2(): void {
    if (this.fbo[3]) return;
    this.makeFbo(3);
  }

  // ── Draw ────────────────────────────────────────────────────────────────────

  private drawTri(): void { this.gl.bindVertexArray(this.vao); this.gl.drawArrays(this.gl.TRIANGLES,0,3); }

  private bindUniforms(p: Program, u: Uniforms, amount: number): void {
    const gl = this.gl;
    gl.useProgram(p.program);
    gl.uniform2f(p.loc["u_resolution"]??null, this.w, this.h);
    gl.uniform1f(p.loc["u_time"]??null,   u.time);
    gl.uniform1f(p.loc["u_bass"]??null,   u.bass);
    gl.uniform1f(p.loc["u_mid"]??null,    u.mid);
    gl.uniform1f(p.loc["u_treble"]??null, u.treble);
    gl.uniform1f(p.loc["u_level"]??null,  u.level);
    gl.uniform1f(p.loc["u_amount"]??null, amount);
    for (let i = 0; i < 4; i++) gl.uniform1f(p.loc[`u_p${i}`]??null, this.genParams[i] ?? 0);
  }

  private pass(p: Program, target: WebGLFramebuffer | null, u: Uniforms, amount: number, srcTex?: WebGLTexture | null): void {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, target);
    gl.viewport(0, 0, this.w, this.h);
    this.bindUniforms(p, u, amount);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, this.audioTex); gl.uniform1i(p.loc["u_audio"]??null, 2);
    gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, this.textTex);  gl.uniform1i(p.loc["u_text"]??null,  3);
    if (srcTex !== undefined) {
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, srcTex);       gl.uniform1i(p.loc["u_prev"]??null, 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.tex[2]);  gl.uniform1i(p.loc["u_feedback"]??null, 1);
    }
    this.drawTri();
  }

  private composite(idxA: number, idxB: number, idxDst: number): void {
    const gl = this.gl, p = this.compositeProg;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo[idxDst]);
    gl.viewport(0, 0, this.w, this.h);
    gl.useProgram(p.program);
    gl.uniform2f(p.loc["u_resolution"]??null, this.w, this.h);
    gl.uniform1i(p.loc["u_blend"]??null,   this.blendMode);
    gl.uniform1f(p.loc["u_opacity"]??null, this.blendOpacity);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.tex[idxA]); gl.uniform1i(p.loc["u_layerA"]??null, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.tex[idxB]); gl.uniform1i(p.loc["u_layerB"]??null, 1);
    this.drawTri();
  }

  readback(): Uint8Array | null {
    const gl = this.gl;
    if (!this.fbo[2] || this.w <= 0 || this.h <= 0) return null;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo[2]);
    const pixels = new Uint8Array(this.w * this.h * 4);
    gl.readPixels(0, 0, this.w, this.h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return pixels;
  }

  render(stages: Stage[], w: number, h: number, u: Uniforms, readback: boolean): Uint8Array | null {
    if (!this.gen) return null;
    const gl = this.gl;
    this.ensure(w, h);

    // Layer A → tex[0]
    this.pass(this.gen, this.fbo[0], u, 0);
    let cur = 0;

    // Layer B → tex[3], composite A+B → tex[1]
    if (this.gen2) {
      this.ensureLayer2();
      this.pass(this.gen2, this.fbo[3], u, 0);
      this.composite(0, 3, 1);
      cur = 1;
    }

    // Effets chaînés (ping-pong tex[0] ↔ tex[1])
    for (const st of stages) {
      const dst = cur === 0 ? 1 : 0;
      this.pass(st.fx, this.fbo[dst], u, st.amount, this.tex[cur]);
      cur = dst;
    }

    let pixels: Uint8Array | null = null;
    if (readback) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo[cur]);
      pixels = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    }
    this.pass(this.copy, this.fbo[2], u, 0, this.tex[cur]);
    if (!readback) this.pass(this.copy, null, u, 0, this.tex[cur]);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return pixels;
  }
}
