/*{
  "name": "Cassette Hiss",
  "category": "Lofi"
}*/
vec3 render(vec2 uv, vec2 res) {
  float t = u_time;
  vec2 p = uv;
  // Noise base
  float n1 = fract(sin(dot(floor(p * 160.0) + floor(t * 15.0), vec2(127.1, 311.7))) * 43758.5);
  float n2 = fract(sin(dot(floor(p * 80.0)  + floor(t * 7.0),  vec2(269.5, 183.3))) * 47453.3);
  // Warped scanlines
  float scan = step(0.5, fract(p.y * 120.0 + sin(p.y * 30.0 + t * 0.2) * 0.01));
  // Horizontal bands of hiss (audio-driven)
  float band = step(1.0 - u_level * 0.6, fract(p.y * 4.0 + t * 0.05));
  // Dark green phosphor palette
  vec3 phosphor = vec3(0.0, 0.7, 0.2) * (0.4 + n1 * 0.6) * scan;
  phosphor += vec3(0.0, 0.3, 0.05) * n2 * band * u_mid;
  // Dropout flicker
  float flick = step(0.95, fract(sin(t * 7.3 + p.y * 5.0) * 321.7));
  phosphor = mix(phosphor, vec3(0.0), flick * 0.7);
  return phosphor;
}
