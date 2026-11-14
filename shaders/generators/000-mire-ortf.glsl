/*{
  "name": "MIRE ORTF",
  "category": "Real-world"
}*/

vec3 render(vec2 uv, vec2 res) {
  vec2 center = vec2(0.5);
  vec2 p = uv - center;
  float dist = length(p);

  // Grille carrés (background)
  float gridx = mod(uv.x * 8.0, 1.0);
  float gridy = mod(uv.y * 6.0, 1.0);
  float grid = step(0.05, gridx) * step(0.95, gridx) + step(0.05, gridy) * step(0.95, gridy);
  grid = max(grid, step(0.5, gridx) * step(0.5, gridy) * 0.3);

  // Bandes verticales (barres colonne)
  float vbars = step(0.45, mod(uv.x * 16.0, 1.0)) * step(0.55, mod(uv.x * 16.0, 1.0));

  // Cercles concentriques au centre
  float circle1 = step(0.08, abs(dist - 0.15));
  float circle2 = step(0.03, abs(dist - 0.25));
  float circle3 = step(0.02, abs(dist - 0.35));
  float circles = (1.0 - circle1 * circle2 * circle3);

  // Croix au centre
  float cross = step(0.02, abs(p.x)) * step(0.02, abs(p.y));
  cross += step(0.02, abs(p.x - p.y)) * 0.5;
  cross += step(0.02, abs(p.x + p.y)) * 0.5;
  cross = 1.0 - cross;

  // Fusion mire
  float mire = max(grid * 0.6, circles * 0.8);
  mire = max(mire, cross * 0.7);
  mire = max(mire, vbars * 0.5);

  // Dégradé radial (vignette style mire)
  float vignette = 1.0 - dist * 0.6;
  vignette = smoothstep(0.3, 1.0, vignette);

  // Scanlines subtiles
  float scan = 0.95 + 0.05 * sin(uv.y * res.y * 2.0);

  // Couleur noir et blanc
  vec3 col = vec3(mire * vignette * scan);

  // Légère teinte pour l'effet rétro
  col += vec3(0.02, 0.01, 0.0);

  return col;
}
