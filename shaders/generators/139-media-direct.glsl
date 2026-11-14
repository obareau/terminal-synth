/*{
  "name": "Media Direct",
  "category": "Media",
  "params": [
    {
      "label": "Warp",
      "key": "u_p0",
      "min": 0,
      "max": 1,
      "default": 0.3
    },
    {
      "label": "Chroma",
      "key": "u_p1",
      "min": 0,
      "max": 1,
      "default": 0.4
    }
  ]
}*/

#include "no-media-fallback.glsl"
vec3 render(vec2 uv, vec2 res) {
  if (u_mediaLoaded == 0) return noMediaFallback(uv);

  float t    = u_time;
  float warp = u_p0 * 0.04;
  float chr  = u_p1 * 0.015;

  vec2 p = uv;
  p.x += sin(p.y * 12.0 + t * 1.3) * warp * u_bass;
  p.y += cos(p.x * 9.0  + t * 0.8) * warp * u_mid;

  float split = chr * (0.5 + u_beatEnv * 0.5);
  float r = mediaCol(p + vec2( split, 0.0)).r;
  float g = mediaCol(p).g;
  float b = mediaCol(p - vec2( split, 0.0)).b;
  vec3 col = vec3(r, g, b);

  col *= 0.85 + u_beatEnv * 0.3;
  return col;
}
