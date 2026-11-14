/*{
  "name": "Scanlines",
  "id": "SCN"
}*/

vec3 process(vec2 uv) {
  float a     = u_amount;
  vec3  c     = prev(uv);
  float row   = floor(uv.y * u_resolution.y);
  // scanlines alternées
  float scan  = mix(1.0, mod(row, 2.0) < 1.0 ? 1.0 : 0.35, a);
  // dot mask RGB phosphore
  float col3  = mod(floor(uv.x * u_resolution.x) + mod(row, 3.0), 3.0);
  vec3  mask  = col3 < 1.0 ? vec3(1.0,0.35,0.35) : (col3 < 2.0 ? vec3(0.35,1.0,0.35) : vec3(0.35,0.35,1.0));
  // flou vertical (rémanence phosphore)
  vec2  px    = 1.0 / u_resolution;
  vec3  blur  = c*0.5 + prev(uv+vec2(0,px.y))*0.25 + prev(uv-vec2(0,px.y))*0.25;
  c = mix(c, blur * mask * scan, a);
  // vignette CRT
  vec2  vn = uv * (1.0 - uv.yx);
  float vig = pow(vn.x * vn.y * 15.0, a * 0.35);
  return c * mix(1.0, vig, a);
}
