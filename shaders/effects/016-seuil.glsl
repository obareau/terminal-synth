/*{
  "name": "Seuil",
  "id": "SEU"
}*/

vec3 process(vec2 uv) {
  float a    = u_amount;
  vec3  c    = prev(uv);
  float lvl  = mix(256.0, 3.0, a);
  vec3  post = floor(c * lvl) / lvl;
  vec2  px   = 2.0 / u_resolution;
  vec3  dx   = prev(uv + vec2(px.x, 0.0)) - prev(uv - vec2(px.x, 0.0));
  vec3  dy   = prev(uv + vec2(0.0, px.y)) - prev(uv - vec2(0.0, px.y));
  float edge = length(dx) + length(dy);
  return post + vec3(0.9, 0.45, 0.05) * edge * 6.0 * a * (0.5 + u_bass * 0.6);
}
