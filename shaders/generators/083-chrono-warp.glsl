/*{
  "name": "Chrono Warp",
  "params": [
    {
      "label": "Warp Strength",
      "key": "u_p0",
      "min": 0,
      "max": 2,
      "default": 1,
      "step": 0.1
    },
    {
      "label": "Frequency",
      "key": "u_p1",
      "min": 1,
      "max": 10,
      "default": 4,
      "step": 0.5
    }
  ],
  "category": "Plasma"
}*/

vec3 render(vec2 uv, vec2 res) {
  vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0);
  float t = u_time;

  // Time distortion field
  float warp_strength = u_p0;
  float freq = u_p1;

  // Concentric time waves
  float r = length(p);
  float angle = atan(p.y, p.x);

  // Distorted time field
  float time_wave = sin(r * freq - t) * 0.5 + 0.5;
  float time_dist = sin(angle * 3.0 + t * 2.0) * 0.5 + 0.5;

  // Sample positions distorted by time
  vec2 warp_offset = vec2(
    sin(time_dist * 3.14 + t) * r * warp_strength * 0.3,
    cos(time_dist * 3.14 + t * 0.7) * r * warp_strength * 0.3
  );

  vec2 warped_p = p + warp_offset;
  float warped_r = length(warped_p);

  // Temporal layers
  float layer1 = sin(warped_r * 8.0 - t * 2.0);
  float layer2 = cos(warped_r * 5.0 - t);
  float layer3 = sin(warped_r * 3.0 - t * 0.5);

  float pattern = layer1 * layer2 * layer3 * 0.5 + 0.5;

  vec3 col = mix(vec3(0.02, 0.05, 0.15), vec3(0.4, 0.2, 0.8), pattern);
  col += vec3(0.3, 0.7, 1.0) * time_wave * 0.3;

  // Time distortion artifact
  col += vec3(1.0, 0.3, 0.8) * smoothstep(0.1, 0.0, abs(warped_r - 0.3)) * 0.4;

  col *= 0.6 + 0.4 * u_level;
  return clamp(col, vec3(0.0), vec3(1.0));
}
