/*{
  "name": "Neuron Network",
  "params": [
    {
      "label": "Grid Size",
      "key": "u_p0",
      "min": 3,
      "max": 10,
      "default": 7,
      "step": 1
    },
    {
      "label": "Speed",
      "key": "u_p1",
      "min": 0,
      "max": 2,
      "default": 0.4,
      "step": 0.1
    }
  ]
}*/

vec3 render(vec2 uv, vec2 res) {
  vec2 center = vec2(0.5);
  vec2 p = uv - center;
  vec3 col = vec3(0.0);
  float t = u_time * u_p1 * (0.8 + u_bass * 1.2);
  float grid_size = u_p0;

  // Réseau de neurones en grille 3D projeté
  for(float i = 0.0; i < 10.0; i++) {
    if(i >= grid_size) break;
    for(float j = 0.0; j < 10.0; j++) {
      if(j >= grid_size) break;
      // Position du neurone dans un cube
      float layer = mod(i, 3.0);
      float angle = (i + j * 0.5) * (0.8 + u_treble * 0.3) + t * 0.3;
      float radius = (0.12 + 0.06 * sin(t + layer)) * (0.8 + 0.4 * u_mid);

      vec2 pos = vec2(cos(angle), sin(angle)) * radius;
      pos += vec2(cos(t + i * 0.3 + u_bass), sin(t + j * 0.3 + u_mid)) * (0.06 + u_bass * 0.08);

      // Distance au neurone
      float d = distance(p, pos);

      // Neurone avec brillance
      vec3 neuron_col = vec3(
        0.2 + 0.6 * sin(t + i * 0.5 + u_treble),
        0.1 + 0.7 * sin(t + j * 0.5 + u_bass),
        0.4 + 0.5 * sin(t + i + j + u_mid)
      );
      col += neuron_col * ((0.08 + u_bass * 0.04) / (d * 80.0 + 0.05));
      col += vec3(0.9, 0.8, 1.0 + u_treble * 0.2) * pow(max(0.0, 0.02 - d), 2.0) * (0.3 + 0.2 * u_bass);

      // Connexions entre neurones proches
      for(float k = i + 1.0; k < min(i + 3.0, grid_size); k++) {
        for(float l = j; l < min(j + 2.0, grid_size); l++) {
          float angle2 = (k + l * 0.5) * (0.8 + u_treble * 0.3) + t * 0.3;
          float radius2 = (0.12 + 0.06 * sin(t + mod(k, 3.0))) * (0.8 + 0.4 * u_mid);
          vec2 pos2 = vec2(cos(angle2), sin(angle2)) * radius2;
          pos2 += vec2(cos(t + k * 0.3 + u_bass), sin(t + l * 0.3 + u_mid)) * (0.06 + u_bass * 0.08);

          float conn_d = distance(p, mix(pos, pos2, 0.5));
          col += vec3(0.3, 0.6, 0.9) * (0.015 + u_bass * 0.015) / (conn_d * 100.0 + 0.05);
        }
      }
    }
  }

  col *= 0.5 + 0.8 * u_level;
  col += vec3(u_bass * 0.2);
  return clamp(col, vec3(0.0), vec3(1.0));
}
