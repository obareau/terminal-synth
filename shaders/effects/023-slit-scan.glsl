/*{
  "name": "Slit Scan",
  "id": "SLT"
}*/

vec3 process(vec2 uv) {
  float a = u_amount;

  // Temporal video synthesis: scan through time at different spatial positions
  vec2 p = uv * 2.0 - 1.0;
  float t = u_time * a * 0.8;

  // Vertical slit scan displaced in time
  float slitWidth = 0.08 + a * 0.12;
  float slitPos = mod(p.x * 2.0 + t, 2.0) - 1.0;

  // Sample current frame at slit
  vec3 col = prev(uv);

  // Sample history frames at time-displaced positions
  vec3 scanCol = vec3(0.0);
  float weight = 0.0;

  for (int i = 0; i < 5; i++) {
    float phase = float(i) / 5.0;
    float timeScan = t * (0.5 + phase * 0.8);

    vec2 scanUV = vec2(
      mod(uv.x + timeScan * 0.15, 1.0),
      clamp(uv.y + sin(timeScan * 2.0) * 0.1, 0.001, 0.999)
    );

    float dist = abs(scanUV.x - uv.x);
    float w = exp(-dist * dist * 15.0 / slitWidth);

    scanCol += fb(clamp(scanUV, 0.001, 0.999)) * w;
    weight += w;
  }

  scanCol /= weight;
  return mix(col, scanCol, a * (0.6 + u_bass * 0.4));
}
