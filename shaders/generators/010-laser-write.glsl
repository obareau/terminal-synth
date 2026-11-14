/*{
  "name": "Laser write",
  "params": [
    {
      "label": "Durée texte",
      "key": "holdMs",
      "min": 1000,
      "max": 15000,
      "default": 8000,
      "step": 500
    },
    {
      "label": "Vitesse laser",
      "key": "u_p0",
      "min": 0,
      "max": 1,
      "default": 0.4,
      "step": 0.01
    }
  ]
}*/

vec3 render(vec2 uv, vec2 res) {
  float t   = u_time;
  float sp  = mix(0.5, 4.0, u_p0) + u_bass * 1.5;
  // Laser qui parcourt l'ecran en zigzag et grave le texte RECTA
  float row  = floor(uv.y * 12.0);
  float dir  = mod(row, 2.0) < 1.0 ? 1.0 : -1.0;
  float scanX = fract(t * sp * 0.04 + row * 0.083) ;
  if (dir < 0.0) scanX = 1.0 - scanX;
  float scanY = (row + 0.5) / 12.0;

  // Texte RECTA (texture u_text)
  float txt = textCol(uv).g;

  // Faisceau laser
  vec2 scan = vec2(scanX, scanY);
  float d   = length(uv - scan);
  float r   = 0.025 + u_level * 0.015;
  float beam = exp(-d * d / (r * r)) * (0.8 + u_level * 0.3);

  // La ou le laser passe sur du texte : surbrillance intense
  float burn = txt * exp(-d * 45.0) * 4.0;

  // Residu : texte deja grave (phosphorescence)
  float residue = txt * 0.55 * (0.4 + u_level * 0.4);

  vec3 col = vec3(0.8, 0.08, 0.01) * residue;
  col += vec3(1.0, 0.55, 0.08) * beam;
  col += vec3(1.0, 0.9,  0.4 ) * burn;
  return col;
}
