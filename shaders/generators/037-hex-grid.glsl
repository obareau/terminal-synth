/*{
  "name": "Hex Grid",
  "params": [
    {
      "label": "Échelle",
      "key": "u_p0",
      "min": 0,
      "max": 1,
      "default": 0.3,
      "step": 0.01
    },
    {
      "label": "Vitesse",
      "key": "u_p1",
      "min": 0,
      "max": 1,
      "default": 0.2,
      "step": 0.01
    }
  ]
}*/

vec2 hexOff(vec2 p) {
  vec2 r = vec2(1.0, 1.7320508);
  vec2 h = r * 0.5;
  vec2 a = mod(p, r) - h;
  vec2 b = mod(p - h, r) - h;
  return dot(a,a) < dot(b,b) ? a : b;
}
vec3 render(vec2 uv, vec2 res) {
  float t = u_time;
  float scale = 3.0 + u_p0 * 12.0;
  vec2 p = (uv - 0.5) * scale * vec2(res.x / res.y, 1.0);
  vec2 off = hexOff(p);
  float d = length(off);
  // Cell hash for color
  vec2 cid = floor((p - off) * 10.0) * 0.1;
  float h = fract(sin(dot(cid + floor(t * u_p1 * 0.5), vec2(127.1, 311.7))) * 43758.5);
  // Audio-reactive fill
  float fill = 0.12 + u_bass * 0.38 + u_level * 0.22;
  float lit = step(d, 0.42 * fill);
  // Border glow
  float bord = exp(-max(d - 0.38, 0.0) * 25.0) * 0.35 * u_mid;
  vec3 cellCol = mix(vec3(0.08, 0.55, 0.3), vec3(0.65, 0.15, 0.5), h);
  cellCol = mix(cellCol, vec3(1.0, 0.45, 0.0), step(0.82, u_bass) * h);
  return clamp(cellCol * (lit*(0.4+u_level*0.65) + bord), 0.0, 1.0);
}
