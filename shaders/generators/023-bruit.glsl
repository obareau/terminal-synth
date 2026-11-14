/*{
  "name": "Bruit",
  "params": [
    {
      "label": "Échelle",
      "key": "u_p0",
      "min": 0.5,
      "max": 5,
      "default": 1,
      "step": 0.1
    },
    {
      "label": "Vitesse",
      "key": "u_p1",
      "min": 0,
      "max": 1,
      "default": 0.35,
      "step": 0.01
    }
  ]
}*/

float n2(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x),
             mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
}
float fbm(vec2 p) {
  float v=0.0, a=0.5;
  for (int i=0;i<5;i++){v+=a*n2(p); p=p*2.1+vec2(1.7,9.2); a*=0.5;}
  return v;
}
vec3 render(vec2 uv, vec2 res) {
  vec2 p = uv * vec2(res.x/res.y, 1.0) * u_p0;
  float t = u_time * mix(0.05, 0.7, u_p1);
  vec2 q = vec2(fbm(p + t), fbm(p + vec2(5.2,1.3) + t * 0.85));
  float f = fbm(p + q * (1.4 + u_bass * 0.9));
  vec3 col = mix(vec3(0.01,0.0,0.02), vec3(0.45,0.05,0.01), f);
  col = mix(col, vec3(0.9,0.38,0.03), smoothstep(0.4,0.7,f));
  col = mix(col, vec3(1.0,0.88,0.6),  smoothstep(0.7,1.0,f) * (0.3+u_level*0.9));
  return col;
}
