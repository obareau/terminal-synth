/*{
  "name": "Pixelate",
  "id": "PIX"
}*/

vec3 process(vec2 uv) {
  float a    = u_amount;
  float size = max(0.004, mix(0.004, 0.12, a*a) * (1.0 + u_bass * 0.4 * a));
  vec2  puv  = floor(uv / size) * size + size * 0.5;
  return prev(clamp(puv, 0.001, 0.999));
}
