/*{
  "name": "Flying Toasters",
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
      "label": "Battement",
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

float sdBox(vec2 p, vec2 b) {
  vec2 d = abs(p) - b;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}
float sdTri(vec2 p, vec2 a, vec2 b, vec2 c) {
  vec2 e0 = b - a, e1 = c - b, e2 = a - c;
  vec2 v0 = p - a, v1 = p - b, v2 = p - c;
  vec2 pq0 = v0 - e0 * clamp(dot(v0, e0) / dot(e0, e0), 0.0, 1.0);
  vec2 pq1 = v1 - e1 * clamp(dot(v1, e1) / dot(e1, e1), 0.0, 1.0);
  vec2 pq2 = v2 - e2 * clamp(dot(v2, e2) / dot(e2, e2), 0.0, 1.0);
  float s = sign(e0.x * e2.y - e0.y * e2.x);
  vec2 d0 = vec2(dot(pq0, pq0), s * (v0.x * e0.y - v0.y * e0.x));
  vec2 d1 = vec2(dot(pq1, pq1), s * (v1.x * e1.y - v1.y * e1.x));
  vec2 d2 = vec2(dot(pq2, pq2), s * (v2.x * e2.y - v2.y * e2.x));
  vec2 d = min(min(d0, d1), d2);
  return -sqrt(d.x) * sign(d.y);
}
float h11(float x) { return fract(sin(x * 12.9898) * 43758.5453); }

float toasterDist(vec2 lp, float flap) {
  float body = sdBox(lp, vec2(0.11, 0.075));
  float slotL = sdBox(lp - vec2(-0.04, 0.075), vec2(0.02, 0.02));
  float slotR = sdBox(lp - vec2(0.04, 0.075), vec2(0.02, 0.02));
  body = max(body, -slotL);
  body = max(body, -slotR);
  float wingY = sin(flap) * 0.05;
  float wL = sdTri(lp, vec2(-0.11, -0.02), vec2(-0.30, wingY), vec2(-0.11, 0.05));
  float wR = sdTri(lp, vec2(0.11, -0.02), vec2(0.30, wingY), vec2(0.11, 0.05));
  return min(body, min(wL, wR));
}

vec3 render(vec2 uv, vec2 res) {
  vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0);
  float speed = mix(0.15, 0.6, u_p0) * (1.0 + u_level * 0.4);
  float flapSpeed = mix(6.0, 18.0, u_p1) * (1.0 + u_treble * 0.6);
  float scale = mix(0.7, 1.6, u_p2);

  vec3 col = vec3(0.015, 0.015, 0.02);
  vec3 wireCol = mix(vec3(0.15, 0.95, 0.35), vec3(0.9, 0.85, 0.15), u_mid);

  float md = 10.0;
  const int N = 6;
  for (int i = 0; i < N; i++) {
    float fi = float(i);
    float seedX = h11(fi * 3.1);
    float seedY = h11(fi * 7.7 + 1.0);
    float lane = -0.4 + seedY * 0.8;
    float x = fract(seedX + u_time * speed * (0.6 + h11(fi) * 0.6) ) * 2.4 - 1.2;
    float bob = sin(u_time * 2.0 + fi * 2.1) * 0.04;
    vec2 c = vec2(x, lane + bob);
    float flap = u_time * flapSpeed + fi * 1.7;
    vec2 lp = (p - c) / scale * 3.0;
    float d = toasterDist(lp, flap) * scale / 3.0;
    md = min(md, d);
  }

  float body = smoothstep(0.004, -0.004, md);
  float glow = exp(-max(md, 0.0) * 90.0) * step(0.0, md);
  col = mix(col, wireCol, body);
  col += wireCol * glow * 0.5;

  return col * (0.6 + u_level * 0.6);
}

