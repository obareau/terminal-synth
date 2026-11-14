/*{
  "name": "Pixel Sort",
  "id": "PST"
}*/

vec3 process(vec2 uv) {
  float a    = u_amount * (0.4 + u_bass * 0.8);
  float range = a * 0.28;
  float thresh = mix(0.75, 0.15, a);
  vec3 best  = prev(uv);
  float bestL = dot(best, vec3(0.299, 0.587, 0.114));
  for (int i = 1; i <= 28; i++) {
    vec3  s = prev(vec2(uv.x, uv.y + float(i) * range / 28.0));
    float l = dot(s, vec3(0.299, 0.587, 0.114));
    if (l > bestL && l > thresh) { best = s; bestL = l; }
  }
  return mix(prev(uv), best, step(thresh, bestL) * u_amount);
}
