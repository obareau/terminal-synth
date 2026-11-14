/*{
  "name": "Signal Jam",
  "params": [
    {
      "label": "Bandes",
      "key": "u_p0",
      "min": 0,
      "max": 1,
      "default": 0.4,
      "step": 0.01
    },
    {
      "label": "Vitesse",
      "key": "u_p1",
      "min": 0,
      "max": 1,
      "default": 0.5,
      "step": 0.01
    },
    {
      "label": "Sync",
      "key": "u_p2",
      "min": 0,
      "max": 1,
      "default": 0.35,
      "step": 0.01
    }
  ]
}*/

vec3 render(vec2 uv, vec2 res) {
  float t = u_time;
  float band = floor(uv.y * mix(20.0, 80.0, u_p0));
  float bNoise = fract(sin(band*127.1 + floor(t*mix(5.0,25.0,u_p1))*311.7)*43758.5);
  float hShift = (bNoise - 0.5) * 0.1 * (0.3 + u_bass * 0.7);
  vec2 p = vec2(fract(uv.x + hShift), uv.y);
  float grain = fract(sin(dot(floor(p*vec2(320.0,240.0))+floor(t*30.0), vec2(127.1,311.7)))*43758.5);
  float sync = step(0.96, fract(uv.y * 10.0 + t * 0.9 * u_p2));
  float scan = 0.82 + 0.18 * step(0.5, fract(uv.y * res.y * 0.5));
  float v = grain * (0.3 + u_level * 0.7) * (1.0 - sync) * scan;
  float burst = step(0.94, bNoise) * u_bass;
  return clamp(vec3(v*0.35, v, v*0.25) + vec3(burst, burst*0.3, 0.0), 0.0, 1.0);
}
