/*{
  "name": "Aurora",
  "params": [
    {
      "label": "Hauteur",
      "key": "u_p0",
      "min": 0.1,
      "max": 0.9,
      "default": 0.44,
      "step": 0.01
    },
    {
      "label": "Vitesse",
      "key": "u_p1",
      "min": 0,
      "max": 1,
      "default": 0.35,
      "step": 0.01
    }
  ]
}*/

float aur_n(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x),
             mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
}
vec3 render(vec2 uv, vec2 res) {
  float t = u_time * mix(0.08, 0.7, u_p1);
  float w1 = aur_n(vec2(uv.x * 3.0 + t,        t * 0.5 )) * 0.50;
  float w2 = aur_n(vec2(uv.x * 6.0 - t * 0.7,  t * 0.3 )) * 0.25;
  float curtain = u_p0 + w1 + w2 + u_bass * 0.14;
  float d = abs(uv.y - curtain);
  float band = exp(-d *  7.5) * (0.45 + u_level * 0.7);
  float thin = exp(-d * 22.0) * 0.65;
  float hue = uv.x * 0.35 + t * 0.12 + aur_n(vec2(uv.x * 2.0, t * 0.18)) * 0.5;
  vec3 ac = mix(vec3(0.0, 0.9, 0.4), vec3(0.0, 0.3, 0.9), sin(hue*TWO_PI)*0.5+0.5);
  ac = mix(ac, vec3(0.9, 0.08, 0.55), aur_n(vec2(uv.x * 4.0, t * 0.35)) * u_mid);
  vec3 sky = mix(vec3(0.0, 0.0, 0.03), vec3(0.0, 0.02, 0.06), uv.y);
  vec3 col = sky + ac * (band + thin);
  float star = step(0.997 - u_treble * 0.004, hash(floor(uv * res * 0.5)));
  return col + vec3(star * (0.6 + w1 * 0.4));
}
