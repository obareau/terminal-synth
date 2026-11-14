/*{
  "name": "Tesseract",
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
float h11(float x) { return fract(sin(x * 12.9898) * 43758.5453); }
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
  float aXW = t;
  float aYZ = t * 0.7;
  float scale = mix(0.4, 0.9, u_p2);
  float deform = u_p1 * (0.1 + u_treble * 0.4);
  float camW = 2.2 + sin(u_time * 1.3) * (0.2 + u_bass * 0.5);

  vec2 sv[16];
  for (int i = 0; i < 16; i++) {
    float x = (((i >> 0) & 1) == 1) ? 1.0 : -1.0;
    float y = (((i >> 1) & 1) == 1) ? 1.0 : -1.0;
    float z = (((i >> 2) & 1) == 1) ? 1.0 : -1.0;
    float w = (((i >> 3) & 1) == 1) ? 1.0 : -1.0;
    vec4 v4 = vec4(x, y, z, w) * scale;
    float n = h11(float(i) * 3.7 + floor(u_time * 2.0));
    v4 += vec4(x, y, z, w) * sin(u_time * 1.7 + n * TWO_PI) * deform;
    v4 = rot4(v4, aXW, aYZ);
    vec3 p3 = project3(v4, camW);
    sv[i] = project2(p3, 3.0);
  }

  int e0[32] = int[32](0, 0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 4, 4, 4, 5, 5, 6, 6, 7, 8, 8, 8, 9, 9, 10, 10, 11, 12, 12, 13, 14);
  int e1[32] = int[32](1, 2, 4, 8, 3, 5, 9, 3, 6, 10, 7, 11, 5, 6, 12, 7, 13, 7, 14, 15, 9, 10, 12, 11, 13, 11, 14, 15, 13, 14, 15, 15);

  float md = 10.0;
  for (int i = 0; i < 32; i++) {
    md = min(md, distLine(p, sv[e0[i]], sv[e1[i]]));
  }

  float thick = 0.005 + u_level * 0.003;
  float w2 = smoothstep(thick * 2.0, 0.0, md);
  float glow = exp(-md * md * 500.0);
  vec3 col = vec3(0.02, 0.02, 0.03);
  vec3 wireCol = mix(vec3(0.6, 0.2, 1.0), vec3(0.1, 0.8, 1.0), u_mid);
  col += wireCol * w2 * 1.3;
  col += wireCol * glow * 0.4;
  return col * (0.6 + u_level * 0.6);
}

