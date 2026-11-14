/*{
  "name": "CRT Warp",
  "id": "CRT"
}*/

vec3 process(vec2 uv) {
  float a = u_amount;
  vec2 p  = uv - 0.5;
  p      *= 1.0 + a * 0.28 * dot(p, p);
  if (abs(p.x) > 0.499 || abs(p.y) > 0.499) return vec3(0.0);
  vec3 col = prev(clamp(p + 0.5, 0.001, 0.999));
  col *= mix(1.0, 1.0 - smoothstep(0.28, 0.72, length(p)), a * 0.85);
  float scan = step(0.67, fract(uv.y * u_resolution.y / 3.0));
  col *= mix(1.0, 0.72 + 0.28 * scan, a * 0.55);
  return col;
}
