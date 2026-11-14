/*{
  "name": "CONTOUR MAP",
  "category": "Industrial"
}*/

float h21(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float n2(vec2 p){
  vec2 i=floor(p), f=fract(p);
  float a=h21(i), b=h21(i+vec2(1,0)), c=h21(i+vec2(0,1)), d=h21(i+vec2(1,1));
  vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}
// Same 5-octave fbm, pre-baked into u_fbmTex at startup (1 fetch vs 20 hashes)
float fbm(vec2 p){ return fbmTex(p); }
vec3 render(vec2 uv, vec2 res) {
  vec2 p = uv * 3.0 + vec2(u_time*0.1, u_time*0.05);
  float n = fbm(p);
  float bands = abs(fract(n*12.0) - 0.5);
  float line = smoothstep(0.10, 0.0, bands);
  float bold = abs(fract(n*12.0/5.0) - 0.5);
  line += smoothstep(0.05, 0.0, bold) * 0.6;
  return vec3(line);
}
