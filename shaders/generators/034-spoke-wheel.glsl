/*{
  "name": "Spoke Wheel",
  "params": [
    {
      "label": "Rayons",
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
      "default": 0.3,
      "step": 0.01
    },
    {
      "label": "Anneaux",
      "key": "u_p2",
      "min": 0,
      "max": 1,
      "default": 0.4,
      "step": 0.01
    }
  ]
}*/

vec3 render(vec2 uv, vec2 res) {
  float t = u_time;
  vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0);
  float angle  = atan(p.y, p.x) / TWO_PI + 0.5;
  float radius = length(p);
  float N   = floor(4.0 + u_p0 * 14.0);
  float spd = mix(0.05, 2.5, u_p1);
  float sector = step(0.5 - u_bass*0.12, fract(angle * N - t * spd));
  float rings  = step(0.72, fract(radius*(6.0 + u_mid*10.0) - t*u_p2*2.0));
  float v = sector * (1.0 - rings) * (0.5 + u_level * 0.6);
  // Beat inversion
  float beatInv = step(0.88, u_bass) * 0.35;
  v = mix(v, 1.0 - v, beatInv);
  float vig = 1.0 - smoothstep(0.35, 0.68, radius);
  vec3 warm = vec3(0.9, 0.35, 0.0);
  vec3 cool = vec3(0.0, 0.45, 0.9);
  return clamp(mix(cool, warm, sector) * v * vig, 0.0, 1.0);
}
