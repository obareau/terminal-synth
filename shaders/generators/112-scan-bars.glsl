/*{
  "name": "SCAN BARS",
  "category": "Industrial"
}*/

vec3 render(vec2 uv, vec2 res) {
  float bars = abs(fract(uv.y*40.0 + u_time*1.5) - 0.5);
  float v = smoothstep(0.22, 0.18, bars);
  float wob = sin(uv.y*220.0 + u_time*8.0)*0.5 + 0.5;
  v *= mix(0.5, 1.0, wob);
  float head = smoothstep(0.0, 0.04, fract(uv.y*40.0 + u_time*1.5));
  v = max(v, head*0.6);
  float sweep = smoothstep(0.0, 0.02, fract(uv.x - u_time*0.2)) * 0.3;
  return vec3(clamp(v + sweep*u_level, 0.0, 1.0));
}
