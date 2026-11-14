/*{
  "name": "Morph Polyhedron",
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
      "label": "Hauteur apex",
      "key": "u_p1",
      "min": 0,
      "max": 1,
      "default": 0.4,
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

#define MAXN 8
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

float bipyramidWire(vec2 p, mat3 rot, float scale, int n, float apexH) {
  vec2 sv[MAXN];
  for (int i = 0; i < MAXN; i++) {
    if (i >= n) break;
    float ang = TWO_PI * float(i) / float(n);
    vec3 vp = rot * (vec3(cos(ang), 0.0, sin(ang)) * scale);
    sv[i] = project(vp, 3.0);
  }
  vec2 topApex = project(rot * vec3(0.0, apexH, 0.0) * scale, 3.0);
  vec2 botApex = project(rot * vec3(0.0, -apexH, 0.0) * scale, 3.0);

  float md = 10.0;
  for (int i = 0; i < MAXN; i++) {
    if (i >= n) break;
    int j = (i + 1 < n) ? (i + 1) : 0;
    md = min(md, distLine(p, sv[i], sv[j]));
    md = min(md, distLine(p, sv[i], topApex));
    md = min(md, distLine(p, sv[i], botApex));
  }
  return md;
}

vec3 render(vec2 uv, vec2 res) {
  vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0);
  float t = u_time * mix(0.2, 1.2, u_p0);
  mat3 rot = rotY(t) * rotX(t * 0.6);
  float scale = mix(0.4, 1.0, u_p2);
  float apexH = mix(0.8, 1.6, u_p1);

  // Nombre de côtés continu, piloté par l'intensité audio (u_level) : 3 (tétra) à 8 (octo)
  float nf = 3.0 + clamp(u_level, 0.0, 1.0) * 5.0;
  int nlo = int(floor(nf));
  int nhi = min(nlo + 1, MAXN);
  float blend = fract(nf);

  float mdLo = bipyramidWire(p, rot, scale, nlo, apexH);
  float mdHi = bipyramidWire(p, rot, scale, nhi, apexH);

  float thick = 0.006 + u_bass * 0.004;
  float wLo = smoothstep(thick * 2.0, 0.0, mdLo) * (1.0 - blend);
  float wHi = smoothstep(thick * 2.0, 0.0, mdHi) * blend;
  float glowLo = exp(-mdLo * mdLo * 400.0) * (1.0 - blend);
  float glowHi = exp(-mdHi * mdHi * 400.0) * blend;

  vec3 col = vec3(0.02, 0.02, 0.03);
  vec3 wireCol = mix(vec3(0.95, 0.55, 0.05), vec3(0.95, 0.15, 0.5), u_mid);
  col += wireCol * (wLo + wHi) * 1.3;
  col += wireCol * (glowLo + glowHi) * 0.4;
  return col * (0.6 + u_level * 0.6);
}

