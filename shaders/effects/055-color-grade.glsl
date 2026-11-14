/*{
  "name": "Color Grade",
  "id": "CGR"
}*/

vec3 process(vec2 uv) {
  vec3 c  = prev(uv);
  float a = u_amount;
  vec3 g  = c * vec3(1.06, 0.97, 0.86) + vec3(-0.03, 0.02, 0.08) * (1.0 - c);
  g       = g * g * (3.0 - 2.0 * g);
  float lum = dot(g, vec3(0.299, 0.587, 0.114));
  g         = mix(vec3(lum), g, 1.0 + u_bass * 0.45 * a);
  return mix(c, g, a);
}
