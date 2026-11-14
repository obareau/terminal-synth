/*{
  "name": "NOISE BANDS",
  "category": "Industrial"
}*/

float h21(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float h11(float p){ return fract(sin(p*78.233)*43758.5453); }
float n2(vec2 p){
  vec2 i=floor(p), f=fract(p);
  float a=h21(i), b=h21(i+vec2(1,0)), c=h21(i+vec2(0,1)), d=h21(i+vec2(1,1));
  vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}
// Same 5-octave fbm, pre-baked into u_fbmTex at startup (1 fetch vs 20 hashes)
float fbm(vec2 p){ return fbmTex(p); }
vec3 render(vec2 uv, vec2 res) {
  float band = floor(uv.y * 14.0);
  float speed = mix(0.5, 3.0, h11(band));
  float n = fbm(vec2(uv.x*8.0 + u_time*speed, band));
  float gap = smoothstep(0.05, 0.0, abs(fract(uv.y*14.0) - 0.5) - 0.45);
  return vec3(n * (1.0 - gap));
}
