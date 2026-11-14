/*{
  "name": "HALFTONE SPHERE",
  "category": "Industrial"
}*/

vec3 render(vec2 uv, vec2 res) {
  vec2 p = uv - 0.5; p.x *= res.x/res.y;
  float r = length(p);
  float sphere = smoothstep(0.45, 0.44, r);
  vec2 g = p * 60.0;
  vec2 cuv = fract(g) - 0.5;
  vec2 lp = p * 2.0;
  float light = clamp(0.5 + lp.x*0.6 - lp.y*0.4 - r*1.2 + u_bass*0.2, 0.0, 1.0);
  float dotR = mix(0.05, 0.42, light) * sphere;
  float dotV = 1.0 - smoothstep(dotR, dotR+0.02, length(cuv));
  return vec3(dotV * sphere);
}
