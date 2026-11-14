/*{
  "name": "Entropie",
  "id": "ENT"
}*/

vec3 process(vec2 uv) {
  float a = u_amount;
  // micro-déplacement aléatoire (plus vif sur les aigus)
  vec2 j = (vec2(hash(uv + u_time), hash(uv.yx - u_time)) - 0.5) * a * 0.03 * (0.4 + u_treble);
  vec3 c = prev(uv + j);
  // grain additif
  float g = hash(uv * u_resolution + u_time) - 0.5;
  return c + g * a * (0.12 + u_treble * 0.25);
}
