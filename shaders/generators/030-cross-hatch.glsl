/*{
  "name": "Cross Hatch",
  "params": [
    {
      "label": "Angle",
      "key": "u_p0",
      "min": 0,
      "max": 1,
      "default": 0.1,
      "step": 0.01
    },
    {
      "label": "Densité",
      "key": "u_p1",
      "min": 0,
      "max": 1,
      "default": 0.35,
      "step": 0.01
    }
  ]
}*/

vec3 render(vec2 uv, vec2 res) {
  float t = u_time;
  vec2 p = uv - 0.5;
  float a    = u_p0 * TWO_PI;
  float freq = 8.0 + u_p1 * 36.0 + u_bass * 6.0;
  float th   = 0.84 - u_level * 0.16;
  float h1 = step(th, abs(sin((p.x*cos(a)        + p.y*sin(a))        * freq + t * 2.0)));
  float h2 = step(th, abs(sin((p.x*cos(a+2.094)  + p.y*sin(a+2.094)) * freq - t * 1.5)));
  float h3 = step(th, abs(sin((p.x*cos(a+4.189)  + p.y*sin(a+4.189)) * freq*0.7 + t)));
  float hatch = clamp(h1 + h2 + h3, 0.0, 1.0);
  float cross = clamp(h1*h2 + h2*h3 + h1*h3, 0.0, 1.0);
  vec3 fg  = mix(vec3(0.75, 0.65, 0.5), vec3(0.3, 0.95, 0.4), u_mid*0.6 + h2*0.4);
  vec3 col = mix(vec3(0.02, 0.02, 0.04), fg, hatch);
  return clamp(mix(col, vec3(1.0, 0.3, 0.0), cross * u_bass * 0.85), 0.0, 1.0);
}
