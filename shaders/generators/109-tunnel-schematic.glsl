/*{
  "name": "TUNNEL SCHEMATIC",
  "category": "Industrial"
}*/

vec3 render(vec2 uv, vec2 res) {
  vec2 p = uv - 0.5; p.x *= res.x/res.y;
  float a = atan(p.y, p.x), r = length(p);
  float z = 0.2/r + u_time*0.5;
  float ang = abs(fract(a/6.2831*16.0) - 0.5);
  float radial = smoothstep(0.48, 0.50, ang);
  float depth = abs(fract(z) - 0.5);
  float rings = smoothstep(0.45, 0.48, depth);
  float v = max(radial, rings) * smoothstep(0.0, 0.4, r);
  return vec3(v);
}
