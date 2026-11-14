/*{
  "name": "Solarize",
  "id": "SLZ"
}*/

vec3 process(vec2 uv) {
  vec3 c  = prev(uv);
  float th = clamp(mix(0.92, 0.28, u_amount) - u_bass * 0.08, 0.05, 0.98);
  vec3 sol = vec3(
    (c.r > th) ? 1.0 - c.r : c.r,
    (c.g > th) ? 1.0 - c.g : c.g,
    (c.b > th) ? 1.0 - c.b : c.b);
  return mix(c, sol, u_amount);
}
