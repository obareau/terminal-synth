/*{
  "name": "Thermal",
  "id": "THM"
}*/

vec3 process(vec2 uv) {
  float a   = u_amount;
  vec3  c   = prev(uv);
  float lum = dot(c, vec3(0.299, 0.587, 0.114));
  // noir → violet → rouge → orange → blanc
  vec3 th = vec3(0.0);
  th = mix(th, vec3(0.35, 0.00, 0.50), smoothstep(0.00, 0.22, lum));
  th = mix(th, vec3(0.80, 0.00, 0.10), smoothstep(0.22, 0.45, lum));
  th = mix(th, vec3(1.00, 0.45, 0.00), smoothstep(0.45, 0.68, lum));
  th = mix(th, vec3(1.00, 1.00, 0.90), smoothstep(0.68, 1.00, lum));
  return mix(c, th, a);
}
