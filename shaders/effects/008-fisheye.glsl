/*{
  "name": "Fisheye",
  "id": "FSH"
}*/

vec3 process(vec2 uv) {
  float a  = u_amount;
  vec2  p  = uv * 2.0 - 1.0;
  float r2 = dot(p, p);
  float k  = a * (0.6 + u_mid * 0.4);
  vec2  suv = clamp((p * (1.0 - k * r2) + 1.0) * 0.5, 0.001, 0.999);
  return mix(prev(uv), prev(suv), a);
}
