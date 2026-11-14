/*{
  "name": "SIGNAL SPECTRUM",
  "category": "Industrial"
}*/

float h21(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float n2(vec2 p){
  vec2 i=floor(p), f=fract(p);
  float a=h21(i), b=h21(i+vec2(1,0)), c=h21(i+vec2(0,1)), d=h21(i+vec2(1,1));
  vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}
vec3 render(vec2 uv, vec2 res) {
  float bars = 64.0;
  float idx = floor(uv.x * bars);
  float base = pow(1.0 - idx/bars, 1.5);
  float jit = n2(vec2(idx*0.3, u_time*4.0)) * 0.6;
  float h = clamp(base*0.6 + jit*0.7 + u_level*0.3 + u_bass*0.2, 0.0, 1.0);
  float colSpace = fract(uv.x * bars);
  float gap = smoothstep(0.0, 0.08, colSpace) * smoothstep(1.0, 0.92, colSpace);
  float bar = step(1.0 - h, uv.y) * gap;
  float bar2 = step(1.0 - h, 1.0 - uv.y) * gap;
  return vec3(max(bar*0.9, bar2*0.4));
}
