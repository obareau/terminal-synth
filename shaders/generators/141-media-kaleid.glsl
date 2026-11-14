/*{
  "name": "Media Kaleid",
  "category": "Media",
  "params": [
    {
      "label": "Faces",
      "key": "u_p0",
      "min": 0,
      "max": 1,
      "default": 0.33
    },
    {
      "label": "Zoom",
      "key": "u_p1",
      "min": 0,
      "max": 1,
      "default": 0.5
    }
  ]
}*/

#include "no-media-fallback.glsl"
vec3 render(vec2 uv, vec2 res) {
  if (u_mediaLoaded == 0) return noMediaFallback(uv);

  float t    = u_time;
  float N    = 3.0 + floor(u_p0 * 9.0);
  float zoom = mix(0.4, 1.5, u_p1);

  vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0) * zoom;
  float r = length(p);
  float a = atan(p.y, p.x);

  float sector = TWO_PI / N;
  a = mod(a, sector);
  if (a > sector * 0.5) a = sector - a;

  a += t * 0.05 * (0.5 + u_mid * 0.5);

  vec2 kp  = vec2(cos(a), sin(a)) * r;
  vec2 muv = kp * 0.5 + 0.5;

  if (u_beatEnv > 0.7 && mod(floor(t * 2.0), 2.0) < 1.0)
    muv = 1.0 - muv;

  vec3 col = mediaCol(muv);
  col *= 1.0 - smoothstep(0.35, 0.8, r);
  col *= 0.7 + u_level * 0.4;
  return col;
}
