/*{
  "name": "Bayer Storm",
  "params": [
    {
      "label": "Blocs",
      "key": "u_p0",
      "min": 0,
      "max": 1,
      "default": 0.3,
      "step": 0.01
    },
    {
      "label": "Vitesse",
      "key": "u_p1",
      "min": 0,
      "max": 1,
      "default": 0.4,
      "step": 0.01
    }
  ]
}*/

float bayer4(vec2 sp) {
  int x = int(mod(sp.x, 4.0));
  int y = int(mod(sp.y, 4.0));
  int mat[16];
  mat[0]=0;  mat[1]=8;  mat[2]=2;  mat[3]=10;
  mat[4]=12; mat[5]=4;  mat[6]=14; mat[7]=6;
  mat[8]=3;  mat[9]=11; mat[10]=1; mat[11]=9;
  mat[12]=15;mat[13]=7; mat[14]=13;mat[15]=5;
  return float(mat[y*4+x]) / 16.0;
}
vec3 render(vec2 uv, vec2 res) {
  float t = u_time;
  float scale = mix(2.0, 18.0, u_p0);
  vec2 blk = floor(uv * scale);
  float n = fract(sin(dot(blk + floor(t * mix(1.0,12.0,u_p1)), vec2(127.1,311.7)))*43758.5);
  n += u_bass * 0.35 * sin(blk.y*0.4 + t) + u_level * 0.2;
  n = clamp(n, 0.0, 1.0);
  float thresh = bayer4(floor(uv * res));
  float dithered = step(thresh, n);
  vec3 dark = vec3(0.02, 0.03, 0.02);
  vec3 lit  = mix(vec3(0.6, 0.5, 0.2), vec3(0.95, 0.4, 0.05), u_mid*0.7 + fract(n*4.0)*0.3);
  return mix(dark, lit, dithered);
}
