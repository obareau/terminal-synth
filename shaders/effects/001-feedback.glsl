/*{
  "name": "Feedback",
  "id": "FDB"
}*/

vec3 process(vec2 uv) {
  float a = u_amount;
  // historique légèrement zoomé + tourné → traînées
  vec2 c = uv - 0.5;
  float ang = (a * 0.06) * (0.5 + u_mid);
  mat2 rot = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));
  vec2 fuv = 0.5 + rot * c * (1.0 - 0.012 * a);
  vec3 hist = fb(fuv) * (0.82 + 0.16 * a);
  vec3 cur = prev(uv);
  return max(cur, hist * a + cur * (1.0 - a * 0.6));
}
