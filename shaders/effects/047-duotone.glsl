/*{
  "name": "Duotone",
  "id": "DUO"
}*/

vec3 process(vec2 uv) {
  vec3 c    = prev(uv);
  float lum = dot(c, vec3(0.299, 0.587, 0.114));
  vec3 shadow    = vec3(0.02, 0.04 + u_mid  * 0.10, 0.22 + u_bass * 0.15);
  vec3 highlight = vec3(1.00, 0.76 + u_treble * 0.15, 0.04);
  float t   = pow(clamp(lum, 0.0, 1.0), 0.65 + u_bass * 0.4);
  return mix(c, mix(shadow, highlight, t), u_amount);
}
