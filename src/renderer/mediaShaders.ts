import type { Shader } from "./shaders";

export const MEDIA_SHADERS: Shader[] = [
  {
    name: "Media Direct",
    category: "Media",
    params: [
      { label: "Warp", key: "u_p0", min: 0, max: 1, default: 0.3 },
      { label: "Chroma", key: "u_p1", min: 0, max: 1, default: 0.4 },
    ],
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  float t = u_time;
  float warp = u_p0 * 0.04;
  float chr  = u_p1 * 0.015;

  // Audio-reactive UV distortion
  vec2 p = uv;
  p.x += sin(p.y * 12.0 + t * 1.3) * warp * u_bass;
  p.y += cos(p.x * 9.0  + t * 0.8) * warp * u_mid;

  // RGB chromatic split
  float split = chr * (0.5 + u_beatEnv * 0.5);
  float r = mediaCol(p + vec2(split, 0.0)).r;
  float g = mediaCol(p).g;
  float b = mediaCol(p - vec2(split, 0.0)).b;
  vec3 col = vec3(r, g, b);

  // Beat flash
  col *= 0.85 + u_beatEnv * 0.3;
  return col;
}`,
  },
  {
    name: "Media Glitch",
    category: "Media",
    params: [
      { label: "Shift", key: "u_p0", min: 0, max: 1, default: 0.5 },
      { label: "Lines", key: "u_p1", min: 0, max: 1, default: 0.5 },
    ],
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  float t = u_time;

  // Band-based glitch displacement
  float lines = mix(20.0, 120.0, u_p1);
  float band   = floor(uv.y * lines);
  float seed   = fract(sin(band * 91.3 + floor(t * 12.0)) * 43758.5);
  float seed2  = fract(sin(band * 17.7 + floor(t * 7.0))  * 29811.3);

  float maxShift = u_p0 * 0.12 * (0.3 + u_bass * 0.7);
  float doShift  = step(0.65, seed) * step(0.4, u_bass + u_p0 * 0.3);
  float shift    = (seed2 - 0.5) * 2.0 * maxShift * doShift;

  // Beat → full-band reset flash
  shift *= 1.0 + u_beatEnv * 0.8;

  vec2 p = vec2(fract(uv.x + shift), uv.y);

  // RGB split proportional to shift
  float cshift = abs(shift) * 2.5;
  float r = mediaCol(p + vec2( cshift, 0.0)).r;
  float g = mediaCol(p).g;
  float b = mediaCol(p - vec2( cshift, 0.0)).b;

  // Dropout scanlines
  float scan  = step(0.96, fract(uv.y * lines * 0.5 + t * 3.0));
  vec3 col    = mix(vec3(r, g, b), vec3(0.05, 0.9, 0.4) * 0.7, scan * 0.6);

  return col;
}`,
  },
  {
    name: "Media Kaleid",
    category: "Media",
    params: [
      { label: "Faces", key: "u_p0", min: 0, max: 1, default: 0.33 },
      { label: "Zoom",  key: "u_p1", min: 0, max: 1, default: 0.5 },
    ],
    src: /* glsl */ `
vec3 render(vec2 uv, vec2 res) {
  float t = u_time;
  float N = 3.0 + floor(u_p0 * 9.0);          // 3..12 faces
  float zoom = mix(0.4, 1.5, u_p1);

  // Center + correct aspect
  vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0) * zoom;

  // Polar coords
  float r = length(p);
  float a = atan(p.y, p.x);

  // Kaleidoscope fold
  float sectorAngle = TWO_PI / N;
  a = mod(a, sectorAngle);
  if (a > sectorAngle * 0.5) a = sectorAngle - a;

  // Slow rotation driven by audio
  a += t * 0.05 * (0.5 + u_mid * 0.5);

  // Back to cartesian → UV
  vec2 kp  = vec2(cos(a), sin(a)) * r;
  vec2 muv = kp * 0.5 + 0.5;

  // Beat: invert one face
  if (u_beatEnv > 0.7 && mod(floor(t * 2.0), 2.0) < 1.0)
    muv = 1.0 - muv;

  vec3 col = mediaCol(muv);

  // Slight vignette
  col *= 1.0 - smoothstep(0.35, 0.8, r);
  col *= 0.7 + u_level * 0.4;
  return col;
}`,
  },
];
