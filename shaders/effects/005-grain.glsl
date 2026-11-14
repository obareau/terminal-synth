/*{
  "name": "Grain",
  "id": "GRN"
}*/

vec3 process(vec2 uv) {
  float a = u_amount;
  float t = u_time;
  vec3  c = prev(uv);
  // grain
  float g = hash(uv * u_resolution + vec2(t * 117.0, t * 73.0)) - 0.5;
  // halation : saignement des zones lumineuses
  vec2  px = 1.0 / u_resolution;
  vec3  halo = vec3(0.0);
  for (int i = 1; i <= 5; i++) {
    float r = float(i) * 2.0;
    halo += prev(uv+vec2(r,0)*px) + prev(uv-vec2(r,0)*px)
          + prev(uv+vec2(0,r)*px) + prev(uv-vec2(0,r)*px);
  }
  halo /= 20.0;
  float lum = dot(halo, vec3(0.299,0.587,0.114));
  c += halo * max(0.0, lum - 0.55) * a * 1.8;
  c += g * a * (0.06 + u_treble * 0.08);
  return c;
}
