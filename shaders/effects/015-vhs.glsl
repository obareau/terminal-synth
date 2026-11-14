/*{
  "name": "VHS",
  "id": "VHS"
}*/

vec3 process(vec2 uv) {
  float a  = u_amount;
  float t  = u_time;
  float band  = hash(vec2(floor(uv.y * 240.0), floor(t * 9.0)));
  float shift = step(0.93 - a * 0.25, band) * (hash(vec2(band, t)) - 0.5) * a * 0.18;
  vec2  suv = vec2(clamp(uv.x + shift, 0.001, 0.999), uv.y);
  vec3  c   = prev(suv);
  float bl  = a * 0.007;
  c.r = mix(c.r, prev(clamp(suv + vec2( bl, 0.0), 0.001, 0.999)).r, a * 0.45);
  c.b = mix(c.b, prev(clamp(suv - vec2( bl, 0.0), 0.001, 0.999)).b, a * 0.45);
  c  *= 1.0 - a * 0.12 * sin(uv.y * 720.0 * PI);
  c  += (hash(uv * u_resolution + t) - 0.5) * a * 0.07;
  return c;
}
