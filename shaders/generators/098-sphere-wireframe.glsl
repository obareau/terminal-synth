/*{
  "name": "Sphere Wireframe",
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
      "default": 0.3,
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
mat3 rotY(float a) { float s = sin(a), c = cos(a); return mat3(c,0.0,s, 0.0,1.0,0.0, -s,0.0,c); }
mat3 rotX(float a) { float s = sin(a), c = cos(a); return mat3(1.0,0.0,0.0, 0.0,c,-s, 0.0,s,c); }
vec2 project(vec3 p, float camZ) {
  float d = camZ + p.z;
  return p.xy / max(d, 0.2);
}

vec3 render(vec2 uv, vec2 res) {
  vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0);
  float t = u_time * mix(0.15, 1.0, u_p0);
  mat3 rot = rotY(t) * rotX(t * 0.5);
  float scale = mix(0.5, 1.1, u_p2);
  float deform = u_p1 * (0.1 + u_treble * 0.4);

  const int LAT = 6;
  const int SEG = 16;
  float md = 10.0;

  for (int la = 1; la < LAT; la++) {
    float phi = PI * float(la) / float(LAT) - HALF_PI;
    float ringR = cos(phi);
    float y = sin(phi);
    float bump = sin(u_time * 3.0 + float(la) * 1.7) * deform * (0.3 + u_bass * 0.7);
    vec2 prevPt = vec2(0.0);
    for (int s = 0; s <= SEG; s++) {
      float th = TWO_PI * float(s) / float(SEG);
      vec3 vp = vec3(ringR * cos(th), y, ringR * sin(th)) * (scale + bump);
      vp = rot * vp;
      vec2 sp = project(vp, 3.0);
      if (s > 0) md = min(md, distLine(p, prevPt, sp));
      prevPt = sp;
    }
  }

  const int MER = 8;
  for (int me = 0; me < MER; me++) {
    float lambda = TWO_PI * float(me) / float(MER);
    vec2 prevPt = vec2(0.0);
    for (int s = 0; s <= SEG; s++) {
      float phi = PI * float(s) / float(SEG) - HALF_PI;
      float ringR = cos(phi);
      vec3 vp = vec3(ringR * cos(lambda), sin(phi), ringR * sin(lambda)) * scale;
      vp = rot * vp;
      vec2 sp = project(vp, 3.0);
      if (s > 0) md = min(md, distLine(p, prevPt, sp));
      prevPt = sp;
    }
  }

  float thick = 0.005 + u_level * 0.003;
  float w = smoothstep(thick * 2.0, 0.0, md);
  float glow = exp(-md * md * 500.0);
  vec3 col = vec3(0.02, 0.02, 0.03);
  vec3 wireCol = mix(vec3(0.2, 0.6, 1.0), vec3(1.0, 0.5, 0.1), u_mid);
  col += wireCol * w * 1.3;
  col += wireCol * glow * 0.4;
  return col * (0.6 + u_level * 0.6);
}
