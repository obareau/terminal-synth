/*{
  "name": "Marbre",
  "params": [
    {
      "label": "Échelle",
      "key": "u_p0",
      "min": 0.5,
      "max": 8,
      "default": 3,
      "step": 0.1
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

float mb_n(vec2 p) {
  vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),
             mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
}
vec3 render(vec2 uv, vec2 res) {
  vec2  p = uv * vec2(res.x/res.y,1.0) * u_p0;
  float t = u_time * mix(0.05, 0.6, u_p1);
  float turb=0.0, a=1.0; vec2 q=p+t;
  for(int i=0;i<4;i++){turb+=a*mb_n(q);q=q*2.0+vec2(1.7,9.2);a*=0.5;}
  float v = sin((p.x+p.y)*u_p0 + turb*4.0*(1.0+u_bass) + t)*0.5+0.5;
  vec3 col = mix(vec3(0.02,0.02,0.04), vec3(0.05,0.6,0.88), pow(v,2.0));
  col = mix(col, vec3(0.9,0.4,0.04), pow(v,8.0)*(0.4+u_mid*0.8));
  col = mix(col, vec3(1.0,0.95,0.8), pow(v,18.0)*u_level);
  return col*(0.6+u_level*0.5);
}
