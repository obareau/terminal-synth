/*{
  "name": "Stroboscope",
  "params": [
    {
      "label": "Angle",
      "key": "u_p0",
      "min": 0,
      "max": 1,
      "default": 0.25,
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
  float a  = u_p0 * PI;
  float freq = 5.0 + u_p1 * 22.0 + u_mid * 4.0;
  // Two diagonal stripe sets
  float s1 = step(0.5, fract((uv.x*cos(a)        + uv.y*sin(a))        * freq + t * 1.8));
  float s2 = step(0.5, fract((uv.x*cos(a+HALF_PI) + uv.y*sin(a+HALF_PI)) * (freq*0.6) - t * 1.2));
  float v  = s1 * s2 * (0.45 + u_level * 0.55);
  float v2 = (s1 + s2 - s1*s2) * 0.3 * u_treble;
  // Hard beat flash
  float beat = step(0.87, u_bass) * u_beatEnv;
  v = mix(v + v2, 1.0, beat * 0.75);
  vec3 amber = vec3(0.9, 0.65, 0.0);
  vec3 dark  = vec3(0.02, 0.02, 0.04);
  vec3 col = mix(dark, amber, v + v2);
  col = mix(col, vec3(1.0), beat * 0.55);
  return clamp(col, 0.0, 1.0);
}
