/*{
  "name": "Filtre",
  "id": "FLT"
}*/

vec3 process(vec2 uv) {
  vec3 c = prev(uv);
  float a = u_amount;
  // posterize
  float levels = mix(256.0, 6.0, a);
  c = floor(c * levels) / levels;
  // scanlines
  float scan = 0.5 + 0.5 * sin(uv.y * u_resolution.y * 1.2);
  c *= mix(1.0, 0.65 + 0.35 * scan, a);
  return c;
}
