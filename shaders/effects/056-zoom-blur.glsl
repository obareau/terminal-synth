/*{
  "name": "Zoom Blur",
  "id": "ZBL"
}*/

vec3 process(vec2 uv) {
  float a   = u_amount * (0.5 + u_level * 0.5);
  float str = a * 0.07;
  vec2 p    = uv - 0.5;
  vec3 acc  = vec3(0.0);
  for (int i = 0; i < 8; i++) {
    acc += prev(p * (1.0 - float(i) / 7.0 * str) + 0.5);
  }
  acc /= 8.0;
  acc += u_beatEnv * a * 0.18 * exp(-dot(p,p) * 8.0);
  return acc;
}
