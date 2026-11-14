/*{
  "name": "Disintegration",
  "params": [
    {
      "label": "Speed",
      "key": "u_p0",
      "min": 0,
      "max": 2,
      "default": 0.8,
      "step": 0.1
    },
    {
      "label": "Fragments",
      "key": "u_p1",
      "min": 2,
      "max": 20,
      "default": 10,
      "step": 1
    }
  ],
  "category": "Geometry"
}*/

vec3 render(vec2 uv, vec2 res) {
  vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0);
  float t = u_time * u_p0 * (0.5 + u_bass * 2.0);
  vec3 col = vec3(0.0);

  // Exploding wireframe fragments
  float frag_count = u_p1 * (0.8 + 0.4 * u_mid);
  for(float i = 0.0; i < 50.0; i++) {
    if(i >= frag_count) break;

    float seed = hash(vec2(i, 0.0));
    float delay = seed * (1.0 - u_bass * 0.5);
    float life = mod(t - delay, 2.5 + u_treble);

    // Fragment direction from center
    vec2 dir = vec2(cos(seed * 6.28 + u_treble), sin(seed * 6.28 + u_treble));
    float distance = life * life * (0.3 + u_bass * 0.2);
    vec2 frag_pos = dir * distance;

    // Fragment as wireframe ring
    float d = length(p - frag_pos);
    float frag_size = 0.04 * (1.0 - life / 2.5);
    float ring = smoothstep(frag_size + 0.004, frag_size - 0.004, d);
    ring *= (1.0 - life / 2.5) * (0.5 + 0.5 * u_mid);

    col += vec3(ring * 0.8);
  }

  col *= 0.4 + 0.9 * u_level;
  col += vec3(u_bass * 0.15);
  return col;
}
