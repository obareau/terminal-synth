/*{
  "name": "Kuwahara",
  "id": "KUW"
}*/

vec3 process(vec2 uv) {
  float a = u_amount;
  vec2 px = 2.0 / u_resolution;

  // 4-quadrant edge-preserving filter (oil painting effect)
  vec3 quad[4];
  float mean[4];
  float var[4];

  // Top-left quadrant
  quad[0] = prev(uv + vec2(-px.x, px.y)) + prev(uv + vec2(0, px.y))
          + prev(uv + vec2(-px.x, 0)) + prev(uv);
  quad[0] /= 4.0;
  mean[0] = (dot(quad[0], vec3(0.299, 0.587, 0.114))) * 0.25;

  // Top-right quadrant
  quad[1] = prev(uv + vec2(px.x, px.y)) + prev(uv + vec2(0, px.y))
          + prev(uv + vec2(px.x, 0)) + prev(uv);
  quad[1] /= 4.0;
  mean[1] = (dot(quad[1], vec3(0.299, 0.587, 0.114))) * 0.25;

  // Bottom-left quadrant
  quad[2] = prev(uv + vec2(-px.x, -px.y)) + prev(uv + vec2(0, -px.y))
          + prev(uv + vec2(-px.x, 0)) + prev(uv);
  quad[2] /= 4.0;
  mean[2] = (dot(quad[2], vec3(0.299, 0.587, 0.114))) * 0.25;

  // Bottom-right quadrant
  quad[3] = prev(uv + vec2(px.x, -px.y)) + prev(uv + vec2(0, -px.y))
          + prev(uv + vec2(px.x, 0)) + prev(uv);
  quad[3] /= 4.0;
  mean[3] = (dot(quad[3], vec3(0.299, 0.587, 0.114))) * 0.25;

  // Select quadrant with minimum variance (best preserved edges)
  int minIdx = 0;
  float minVar = 1e10;
  for (int i = 0; i < 4; i++) {
    float m = mean[i];
    var[i] = abs(dot(quad[i], vec3(0.299, 0.587, 0.114)) - m * 4.0);
    if (var[i] < minVar) {
      minVar = var[i];
      minIdx = i;
    }
  }

  vec3 result = mix(prev(uv), quad[minIdx], a * (0.5 + u_mid * 0.5));
  return result;
}
