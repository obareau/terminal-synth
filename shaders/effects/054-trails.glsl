/*{
  "name": "Trails",
  "id": "TRL"
}*/

vec3 process(vec2 uv) {
  float a  = u_amount;
  float t  = u_time;
  vec2 dir = vec2(cos(t * 0.4 + u_bass), sin(t * 0.3 + u_mid)) * a * 0.025;
  vec3 cur = prev(uv);
  vec3 tr  = max(fb(uv + dir) * (0.88 + a * 0.06),
                 fb(uv + dir * 2.0) * (0.75 + a * 0.12));
  return mix(cur, max(cur, tr), a * 0.85);
}
