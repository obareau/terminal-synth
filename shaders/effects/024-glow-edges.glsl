/*{
  "name": "Glow Edges",
  "id": "GLW"
}*/

vec3 process(vec2 uv) {
  float a = u_amount;
  vec2 px = 1.5 / u_resolution;

  // Edge detection (Sobel-like)
  vec3 tl = prev(uv+vec2(-px.x, px.y)), tr = prev(uv+vec2(px.x, px.y));
  vec3 bl = prev(uv+vec2(-px.x,-px.y)), br = prev(uv+vec2(px.x,-px.y));
  vec3 l  = prev(uv+vec2(-px.x,0.0)),  r2 = prev(uv+vec2(px.x,0.0));
  vec3 tu = prev(uv+vec2(0.0, px.y)),  bo = prev(uv+vec2(0.0,-px.y));

  vec3 sx = (tr+2.0*r2+br)-(tl+2.0*l+bl);
  vec3 sy = (tl+2.0*tu+tr)-(bl+2.0*bo+br);
  float edge = length(sx) + length(sy);

  // Bloom trails on edges
  vec3 col = prev(uv);
  float edgeGlow = edge * 3.0 * a;

  // Multi-scale bloom decay
  vec3 bloomTrail = vec3(0.0);
  for (int i = 1; i <= 4; i++) {
    float dist = float(i) * 1.5;
    float decay = pow(0.7, float(i));
    bloomTrail += prev(clamp(uv + vec2(px.x * dist, 0.0), 0.001, 0.999)) * decay * edge;
    bloomTrail += prev(clamp(uv + vec2(-px.x * dist, 0.0), 0.001, 0.999)) * decay * edge;
    bloomTrail += prev(clamp(uv + vec2(0.0, px.y * dist), 0.001, 0.999)) * decay * edge;
    bloomTrail += prev(clamp(uv + vec2(0.0, -px.y * dist), 0.001, 0.999)) * decay * edge;
  }
  bloomTrail *= a * (0.5 + u_treble * 0.5);

  vec3 glowCol = mix(vec3(0.0, 1.0, 1.0), vec3(1.0, 0.2, 0.8), fract(u_time * 0.5));

  return col + glowCol * edgeGlow + bloomTrail;
}
