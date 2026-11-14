
vec3 noMediaFallback(vec2 uv) {
  float t = u_time * 0.4;
  // Grille de scan + dégradé pour signaler "pas de média"
  vec3 col = vec3(0.04, 0.02, 0.08);
  // Lignes de scan horizontales
  float scan = 0.5 + 0.5 * sin(uv.y * 80.0 + t * 3.0);
  col += vec3(0.0, 0.06, 0.12) * scan * (0.3 + u_bass * 0.4);
  // Croix centrale clignotante
  float cx = abs(uv.x - 0.5);
  float cy = abs(uv.y - 0.5);
  float cross_ = (step(cx, 0.002) * step(cy, 0.12)) +
                 (step(cy, 0.002) * step(cx, 0.12));
  col += vec3(0.0, 0.4, 0.6) * cross_ * (0.5 + 0.5 * sin(t * 4.0));
  // Vignette
  col *= 1.0 - 0.6 * smoothstep(0.3, 0.7, length(uv - 0.5));
  return col;
}
