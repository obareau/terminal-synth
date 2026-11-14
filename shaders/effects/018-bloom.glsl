/*{
  "name": "Bloom",
  "id": "BLM"
}*/

vec3 process(vec2 uv) {
  vec3  col   = prev(uv);
  float a     = u_amount;
  vec2  px    = 1.0 / u_resolution;
  vec3  bloom = vec3(0.0);
  float total = 0.0;
  for (int y = -2; y <= 2; y++) for (int x = -2; x <= 2; x++) {
    float w = exp(-float(x*x + y*y) * 0.35);
    vec3  s = prev(uv + vec2(x, y) * px * (2.5 + a * 5.0));
    float lum = dot(s, vec3(0.299, 0.587, 0.114));
    bloom += s * max(0.0, lum - (0.45 - a * 0.35)) * w;
    total += w;
  }
  bloom /= total;
  return col + bloom * a * (0.9 + u_treble * 0.6);
}
