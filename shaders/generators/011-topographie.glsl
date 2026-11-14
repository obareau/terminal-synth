/*{
  "name": "Topographie",
  "params": [
    {
      "label": "Isolignes",
      "key": "u_p0",
      "min": 3,
      "max": 24,
      "default": 8,
      "step": 1
    },
    {
      "label": "Vitesse",
      "key": "u_p1",
      "min": 0,
      "max": 1,
      "default": 0.3,
      "step": 0.01
    }
  ]
}*/

float tp_n(vec2 p) {
  vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),
             mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
}
float tp_h(vec2 p) {
  float h=0.0,a=0.5;
  for(int i=0;i<4;i++){h+=a*tp_n(p);p*=2.1;a*=0.5;}
  return h;
}
vec3 render(vec2 uv, vec2 res) {
  vec2  p = uv * vec2(res.x/res.y,1.0) * 3.0 + u_time * mix(0.01, 0.3, u_p1);
  float h = tp_h(p + u_bass * 0.4);
  float n = u_p0 + u_mid * 3.0;
  float c = fract(h * n);
  float line = smoothstep(0.06, 0.0, min(c, 1.0-c));
  vec3 col = mix(vec3(0.0,0.05,0.12), vec3(0.0,0.18,0.08), smoothstep(0.2,0.6,h));
  col = mix(col, vec3(0.22,0.32,0.08), smoothstep(0.6,1.0,h));
  col += vec3(0.55, 0.85, 0.35) * line * (0.5+u_level*0.7);
  col += vec3(0.8,  1.0,  0.5)  * line * line * u_bass;
  return col;
}
