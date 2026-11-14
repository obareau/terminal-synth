/*{
  "name": "Phosphore",
  "id": "PHS",
  "defaultSensitivity": 0.5,
  "defaultDurationMs": 200,
  "defaultCooldownMs": 600
}*/

vec3 process(vec2 uv) {
  float a   = u_amount;
  float t   = u_time;
  // bandes horizontales de phosphore qui s'allument
  float band = floor(uv.y * 9.0);
  float on   = step(0.6, hash(vec2(band, floor(t * 14.0))));
  vec3  phosCol = vec3(0.6, 1.0, 0.5) * on * a;
  // masque sur les zones lumineuses de l'image
  vec3  c = prev(uv);
  float lum = dot(c, vec3(0.299, 0.587, 0.114));
  return c + phosCol * lum * 2.5;
}
