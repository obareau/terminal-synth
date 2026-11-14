/*{
  "name": "Chrono",
  "id": "CHR"
}*/

vec3 process(vec2 uv) {
  float a = u_amount;
  vec3 col = prev(uv);

  // 8-level frame history decay
  vec3 ghost = vec3(0.0);
  float totalWeight = 1.0;

  // Sample frame history at different time offsets with exponential decay
  for (int i = 1; i <= 8; i++) {
    float level = float(i) / 8.0;
    float decay = pow(0.75, level * 8.0);

    // Time-displaced sample (simulating motion trail)
    float timeLag = level * 0.05;
    vec2 ghostUV = mix(uv, uv + (vec2(hash(uv + float(i)), hash(uv.yx - float(i))) - 0.5) * 0.08, level);

    ghost += fb(clamp(ghostUV, 0.001, 0.999)) * decay;
    totalWeight += decay;
  }

  ghost /= totalWeight;
  ghost *= a * (0.6 + u_level * 0.4);

  return mix(col, col + ghost, a);
}
