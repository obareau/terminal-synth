/*{
  "name": "Hue",
  "id": "HUE"
}*/

vec3 process(vec2 uv) {
  float a    = u_amount;
  float ang  = a * TWO_PI * (0.3 + u_mid * 0.5) + u_time * a * 0.3;
  float c    = cos(ang), s = sin(ang);
  // matrice de rotation de teinte (column-major GLSL)
  mat3 rot = mat3(
    0.213+c*0.787-s*0.213, 0.715-c*0.715-s*0.715, 0.072-c*0.072+s*0.928,
    0.213-c*0.213+s*0.143, 0.715+c*0.285+s*0.140, 0.072-c*0.072-s*0.283,
    0.213-c*0.213-s*0.787, 0.715-c*0.715+s*0.715, 0.072+c*0.928+s*0.072
  );
  return mix(prev(uv), rot * prev(uv), a);
}
