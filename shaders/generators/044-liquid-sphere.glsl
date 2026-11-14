/*{
  "name": "Liquid Sphere",
  "params": [
    {
      "label": "Viscosity",
      "key": "u_p0",
      "min": 0,
      "max": 1,
      "default": 0.5,
      "step": 0.05
    },
    {
      "label": "Speed",
      "key": "u_p1",
      "min": 0,
      "max": 2,
      "default": 0.8,
      "step": 0.1
    }
  ]
}*/

vec3 render(vec2 uv, vec2 res) {
  vec2 p = (uv - 0.5) * vec2(res.x/res.y, 1.0) * 2.0;
  float r = length(p);
  float t = u_time;

  // Sphère liquide avec perturbations
  float wave = sin(r * 8.0 - t * 2.5) * 0.08 + sin(r * 4.0 + t * 1.5) * 0.04;
  float rad = 0.4 + wave;

  if(r < rad) {
    // Intérieur lumineux avec gradient
    float center_dist = length(p - vec2(sin(t*0.4), cos(t*0.3))*0.15);
    float inside = sin(center_dist * 12.0 - t*2.0) * 0.5 + 0.5;
    vec3 col = mix(vec3(0.05, 0.2, 0.7), vec3(0.9, 0.3, 0.1), inside);
    col += vec3(0.2, 0.3, 0.4) * sin(r * 6.0 + t) * 0.3;

    // Specular highlight (brillance)
    vec2 n = normalize(p);
    float spec = pow(max(0.0, dot(n, normalize(vec2(sin(t*0.5), cos(t*0.3))))), 4.0);
    col += vec3(0.9, 0.95, 1.0) * spec * 0.6;

    // Fresnel effect (bordure brillante)
    float fresnel = pow(1.0 - (rad - r) / wave, 2.0);
    col += vec3(0.7, 0.8, 1.0) * fresnel * 0.4;

    return col * (0.7 + u_bass * 0.3);
  }

  // Fond dégradé
  float bg = 0.02 + 0.03 * sin(uv.x * 5.0 + t) * sin(uv.y * 5.0 - t);
  return vec3(bg * 0.3, bg * 0.4, bg * 0.6);
}
