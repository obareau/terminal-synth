/*{
  "name": "Lo-Fi Waves",
  "category": "Lofi"
}*/
vec3 render(vec2 uv, vec2 res) {
  float t = u_time * 0.4;
  vec2 p = uv - 0.5;
  // Slow organic wave layers
  float w1 = sin(p.x * 4.0 + t       + p.y * 2.0 + u_bass * 1.5) * 0.5 + 0.5;
  float w2 = sin(p.x * 6.0 - t * 1.3 + p.y * 3.0 + u_mid  * 2.0) * 0.5 + 0.5;
  float w3 = sin(p.y * 5.0 + t * 0.7 + p.x * 2.5 + u_treble * 1.8) * 0.5 + 0.5;
  // Lo-fi palette — muted purples, teals, ambers
  vec3 ca = vec3(0.55, 0.38, 0.62);
  vec3 cb = vec3(0.25, 0.55, 0.52);
  vec3 cc = vec3(0.72, 0.58, 0.28);
  vec3 col = mix(ca, cb, w1);
  col = mix(col, cc, w2 * 0.5);
  col *= 0.6 + w3 * 0.4;
  // Dithered banding — lo-fi quantize
  col = floor(col * 8.0) / 8.0;
  // Soft grain
  float g = fract(sin(dot(uv + t * 0.1, vec2(127.1, 311.7))) * 43758.5) - 0.5;
  return clamp(col + g * 0.04, 0.0, 1.0);
}
