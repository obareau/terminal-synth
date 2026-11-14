/*{
  "name": "Floyd-Steinberg",
  "id": "FLD"
}*/

vec3 process(vec2 uv) {
  float a = u_amount;
  vec3 c = prev(uv);
  float levels = mix(256.0, 2.0, a);
  vec3 quant = floor(c * levels) / levels;
  vec3 error = c - quant;
  vec2 px = 1.0 / u_resolution;
  vec3 right = prev(clamp(uv + vec2(px.x, 0.0), 0.001, 0.999));
  vec3 down = prev(clamp(uv + vec2(0.0, -px.y), 0.001, 0.999));
  vec3 downleft = prev(clamp(uv + vec2(-px.x, -px.y), 0.001, 0.999));
  vec3 downright = prev(clamp(uv + vec2(px.x, -px.y), 0.001, 0.999));
  vec3 dithered = quant + error * (0.2 + hash(uv + u_time) * 0.3) * a;
  return mix(c, dithered, a);
}
