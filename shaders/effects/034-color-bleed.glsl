/*{
  "name": "Color Bleed",
  "id": "CBL"
}*/

vec3 process(vec2 uv) {
  float a = u_amount;
  float bleed_amount = a * 0.05;

  // Red channel bleeds right
  float r = prev(uv - vec2(bleed_amount, 0.0)).r;
  // Blue channel bleeds left
  float b = prev(uv + vec2(bleed_amount, 0.0)).b;
  // Green stays centered
  float g = prev(uv).g;

  // Vertical fringing (common in analog video)
  float fringe = sin(uv.y * 30.0) * 0.5 + 0.5;
  g *= 0.95 + 0.05 * fringe;

  return vec3(r, g, b);
}
