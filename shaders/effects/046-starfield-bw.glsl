/*{
  "name": "Starfield BW",
  "id": "SBW"
}*/

vec3 process(vec2 uv) {
  float a = u_amount;
  float t = u_time;
  vec2 p = uv - 0.5;
  float r = length(p);
  vec3 col = prev(uv);

  // Monochrome starfield orbiting the center
  float star_count = 20.0;
  for(float i = 0.0; i < star_count; i++) {
    // Star position on orbit
    float angle = (i / star_count) * 6.28 + t * (0.5 + 0.3 * sin(i));
    float orbit_r = 0.15 + 0.1 * sin(i * 0.7 + t * 0.3);
    vec2 star_pos = vec2(cos(angle), sin(angle)) * orbit_r;

    // Star brightness
    float brightness = 0.5 + 0.5 * sin(t * 2.0 + i * 1.3);

    // Render star
    float d = length(p - star_pos);
    float star = exp(-d * d * 150.0) * brightness;

    col += vec3(star * a * (0.6 + 0.4 * brightness));
  }

  // Center pulse
  float center = 0.3 * (1.0 + sin(t * 3.0)) * exp(-r * r * 120.0);
  col += vec3(center * a);

  return mix(prev(uv), col, a * 0.35);
}
