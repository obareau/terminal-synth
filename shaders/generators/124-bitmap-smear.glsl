/*{
  "name": "BITMAP SMEAR",
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
  vec2 p = floor(uv*vec2(160.0, 90.0)) / vec2(160.0, 90.0);
  float v = 0.0;
  for (int i=0; i<3; i++) {
    vec2 q = p; q.x -= float(i)*0.016;
    v += n2(q*20.0 + vec2(u_time*0.3, u_time*0.1)) * (1.0 - float(i)/3.0);
  }
  v /= 1.8; v = smoothstep(0.45, 0.7, v);
  return vec3(v);
}
