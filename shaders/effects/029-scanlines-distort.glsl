/*{
  "name": "Scanlines Distort",
  "id": "SCD"
}*/

vec3 process(vec2 uv) {
  float a = u_amount;
  float line = sin(uv.y * 100.0 + u_time * 5.0) * 0.5 + 0.5;
  float shift = sin(line * 6.28 + u_time * 3.0) * 0.1 * a;
  vec2 distorted = uv + vec2(shift, line * 0.05 * a);
  return prev(clamp(distorted, 0.0, 1.0));
}
