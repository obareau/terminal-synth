/*{
  "name": "Glitch",
  "id": "GLT"
}*/

vec3 process(vec2 uv) {
  float a = u_amount * (0.35 + u_bass * 1.3);
  float t = floor(u_time * 12.0);
  float row = floor(uv.y * 28.0);
  // déplacement par blocs horizontaux
  float trig = step(0.72, hash(vec2(row, t))) * a;
  vec2 off = vec2(trig * (hash(vec2(t, row)) - 0.5) * 0.25, 0.0);
  // décalage chromatique
  float s = a * 0.012;
  vec3 c;
  c.r = prev(uv + off + vec2(s, 0.0)).r;
  c.g = prev(uv + off).g;
  c.b = prev(uv + off - vec2(s, 0.0)).b;
  return c;
}
