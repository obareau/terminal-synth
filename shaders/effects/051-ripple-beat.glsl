/*{
  "name": "Ripple Beat",
  "id": "RPB"
}*/

vec3 process(vec2 uv) {
  float a = u_amount;
  vec2 p  = uv - 0.5;
  p.x    *= u_resolution.x / u_resolution.y;
  float r = length(p);
  vec2 dir = p / max(r, 0.001);
  float rip   = sin(r * 38.0 - u_time * 7.0) * exp(-r * 5.0) * 0.6;
  float burst = u_beatEnv * sin(r * 22.0 - u_time * 5.0) * exp(-r * 3.5) * 1.4;
  return prev(uv + dir * (rip + burst) * a * 0.022);
}
