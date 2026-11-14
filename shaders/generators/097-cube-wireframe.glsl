/*{
  "name": "Cube Wireframe",
  "params": [
    {
      "label": "Vitesse",
      "key": "u_p0",
      "min": 0,
      "max": 1,
      "default": 0.4,
      "step": 0.01
    },
    {
      "label": "Déformation",
      "key": "u_p1",
      "min": 0,
      "max": 1,
      "default": 0.35,
      "step": 0.01
    },
    {
      "label": "Échelle",
      "key": "u_p2",
      "min": 0,
      "max": 1,
      "default": 0.5,
      "step": 0.01
    }
  ],
  "category": "Geometry"
}*/

float distLine(vec2 p, vec2 a, vec2 b) {
  vec2 d = b - a;
  float t = clamp(dot(p - a, d) / dot(d, d), 0.0, 1.0);
  return length(p - a - t * d);
}
float h11(float x) { return fract(sin(x * 12.9898) * 43758.5453); }
mat3 rotY(float a) { float s = sin(a), c = cos(a); return mat3(c,0.0,s, 0.0,1.0,0.0, -s,0.0,c); }
mat3 rotX(float a) { float s = sin(a), c = cos(a); return mat3(1.0,0.0,0.0, 0.0,c,-s, 0.0,s,c); }
vec2 project(vec3 p, float camZ) {
  float d = camZ + p.z;
  return p.xy / max(d, 0.2);
}

vec3 render(vec2 uv, vec2 res) {
  vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0);
  float t = u_time * mix(0.2, 1.5, u_p0);
  mat3 rot = rotY(t) * rotX(t * 0.7);
  float scale = mix(0.5, 1.2, u_p2);
  float deform = u_p1 * (0.15 + u_bass * 0.5);

  vec3 v[8];
  v[0] = vec3(-1.0,-1.0,-1.0); v[1] = vec3(1.0,-1.0,-1.0);
  v[2] = vec3(1.0,1.0,-1.0);   v[3] = vec3(-1.0,1.0,-1.0);
  v[4] = vec3(-1.0,-1.0,1.0);  v[5] = vec3(1.0,-1.0,1.0);
  v[6] = vec3(1.0,1.0,1.0);    v[7] = vec3(-1.0,1.0,1.0);

  vec2 sv[8];
  for (int i = 0; i < 8; i++) {
    vec3 vp = v[i] * scale;
    float n = h11(float(i) * 7.13 + floor(u_time * 3.0));
    vp += normalize(v[i]) * sin(u_time * 2.0 + n * TWO_PI) * deform;
    vp = rot * vp;
    sv[i] = project(vp, 3.0);
  }

  int e0[12] = int[12](0,1,2,3, 4,5,6,7, 0,1,2,3);
  int e1[12] = int[12](1,2,3,0, 5,6,7,4, 4,5,6,7);
  float md = 10.0;
  for (int i = 0; i < 12; i++) {
    md = min(md, distLine(p, sv[e0[i]], sv[e1[i]]));
  }

  float thick = 0.006 + u_level * 0.004;
  float w = smoothstep(thick * 2.0, 0.0, md);
  float glow = exp(-md * md * 400.0);
  vec3 col = vec3(0.02, 0.02, 0.03);
  vec3 wireCol = mix(vec3(0.1, 0.9, 0.6), vec3(0.9, 0.2, 0.5), u_mid);
  col += wireCol * w * 1.3;
  col += wireCol * glow * 0.4;
  return col * (0.6 + u_level * 0.6);
}
