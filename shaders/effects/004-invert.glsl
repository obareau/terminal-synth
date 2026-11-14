/*{
  "name": "Invert",
  "id": "INV"
}*/

vec3 process(vec2 uv) {
  float a = u_amount * (0.5 + u_bass * 0.5);
  return mix(prev(uv), 1.0 - prev(uv), a);
}
