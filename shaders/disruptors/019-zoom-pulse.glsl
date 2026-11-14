/*{
  "name": "Zoom Pulse",
  "id": "ZMP",
  "defaultSensitivity": 0.7,
  "defaultDurationMs": 140,
  "defaultCooldownMs": 450
}*/

vec3 process(vec2 uv) {
  float a = u_amount;
  float t = u_time;
  vec2 center = vec2(0.5);
  vec2 p = (uv - center);

  // Zoom in/out pulsant
  float zoom = 1.0 + sin(t * 4.0) * 0.2 * a;
  vec2 zoomed = center + p / zoom;

  return prev(clamp(zoomed, 0.0, 1.0));
}
