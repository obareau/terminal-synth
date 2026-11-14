/*{
  "name": "Neon",
  "id": "NEO"
}*/

vec3 process(vec2 uv) {
  float a  = u_amount;
  vec2  px = 1.5 / u_resolution;
  vec3  tl = prev(uv+vec2(-px.x, px.y)), tr = prev(uv+vec2(px.x, px.y));
  vec3  bl = prev(uv+vec2(-px.x,-px.y)), br = prev(uv+vec2(px.x,-px.y));
  vec3  l  = prev(uv+vec2(-px.x,0.0)),  r2 = prev(uv+vec2(px.x,0.0));
  vec3  tu = prev(uv+vec2(0.0, px.y)),  bo = prev(uv+vec2(0.0,-px.y));
  vec3  sx = (tr+2.0*r2+br)-(tl+2.0*l+bl);
  vec3  sy = (tl+2.0*tu+tr)-(bl+2.0*bo+br);
  float edge = length(sx) + length(sy);
  vec3  c = prev(uv);
  float hue = fract(edge * 2.0 + u_time * 0.25);
  vec3  nc = mix(vec3(0.0,0.8,1.0), vec3(1.0,0.2,0.8), hue);
  return c + nc * edge * 4.5 * a * (0.5 + u_bass * 0.5);
}
