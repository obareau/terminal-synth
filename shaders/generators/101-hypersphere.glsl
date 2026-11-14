/*{
  "name": "Hypersphere",
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
      "label": "Plongée 4D",
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
vec4 rot4(vec4 v, float aXW, float aYZ) {
  float c1 = cos(aXW), s1 = sin(aXW);
  float x = v.x * c1 - v.w * s1;
  float w = v.x * s1 + v.w * c1;
  float c2 = cos(aYZ), s2 = sin(aYZ);
  float y = v.y * c2 - v.z * s2;
  float z = v.y * s2 + v.z * c2;
  return vec4(x, y, z, w);
}
vec2 project2(vec3 p, float camZ) {
  float d = camZ + p.z;
  return p.xy / max(d, 0.2);
}
vec3 project3(vec4 p, float camW) {
  float d = camW + p.w;
  return p.xyz / max(d, 0.4);
}

vec3 render(vec2 uv, vec2 res) {
  vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0);
  float t = u_time * mix(0.15, 1.0, u_p0);
  float aXW = t * 0.8;
  float aYZ = t * 0.5;
  float scale = mix(0.4, 0.9, u_p2);
  float wAmt = u_p1 * (0.6 + u_bass * 0.6);
  float camW = 2.4;

  const int LAT = 6;
  const int SEG = 14;
  float md = 10.0;

  for (int la = 1; la < LAT; la++) {
    float phi = PI * float(la) / float(LAT) - HALF_PI;
    float ringR = cos(phi);
    float y = sin(phi);
    vec2 prevPt = vec2(0.0);
    for (int s = 0; s <= SEG; s++) {
      float th = TWO_PI * float(s) / float(SEG);
      vec3 p3d = vec3(ringR * cos(th), y, ringR * sin(th));
      float wCoord = (p3d.x * cos(u_time * 0.6) + p3d.z * sin(u_time * 0.6)) * wAmt;
      vec4 v4 = vec4(p3d, wCoord) * scale;
      v4 = rot4(v4, aXW, aYZ);
      vec3 pr3 = project3(v4, camW);
      vec2 sp = project2(pr3, 3.0);
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
      vec3 p3d = vec3(ringR * cos(lambda), sin(phi), ringR * sin(lambda));
      float wCoord = (p3d.x * cos(u_time * 0.6) + p3d.z * sin(u_time * 0.6)) * wAmt;
      vec4 v4 = vec4(p3d, wCoord) * scale;
      v4 = rot4(v4, aXW, aYZ);
      vec3 pr3 = project3(v4, camW);
      vec2 sp = project2(pr3, 3.0);
      if (s > 0) md = min(md, distLine(p, prevPt, sp));
      prevPt = sp;
    }
  }

  float thick = 0.005 + u_level * 0.003;
  float w2 = smoothstep(thick * 2.0, 0.0, md);
  float glow = exp(-md * md * 500.0);
  vec3 col = vec3(0.02, 0.02, 0.03);
  vec3 wireCol = mix(vec3(1.0, 0.3, 0.7), vec3(0.3, 0.9, 1.0), u_treble);
  col += wireCol * w2 * 1.3;
  col += wireCol * glow * 0.4;
  return col * (0.6 + u_level * 0.6);
}

