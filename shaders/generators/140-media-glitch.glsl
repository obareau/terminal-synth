/*{
  "name": "Media Glitch",
  "category": "Media",
  "params": [
    {
      "label": "Shift",
      "key": "u_p0",
      "min": 0,
      "max": 1,
      "default": 0.5
    },
    {
      "label": "Lines",
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

  float t     = u_time;
  float lines = mix(20.0, 120.0, u_p1);
  float band  = floor(uv.y * lines);
  float seed  = fract(sin(band * 91.3 + floor(t * 12.0)) * 43758.5);
  float seed2 = fract(sin(band * 17.7 + floor(t *  7.0)) * 29811.3);

  float maxShift = u_p0 * 0.12 * (0.3 + u_bass * 0.7);
  float doShift  = step(0.65, seed) * step(0.4, u_bass + u_p0 * 0.3);
  float shift    = (seed2 - 0.5) * 2.0 * maxShift * doShift;
  shift         *= 1.0 + u_beatEnv * 0.8;

  vec2 p = vec2(fract(uv.x + shift), uv.y);

  float cshift = abs(shift) * 2.5;
  float r = mediaCol(p + vec2( cshift, 0.0)).r;
  float g = mediaCol(p).g;
  float b = mediaCol(p - vec2( cshift, 0.0)).b;

  float scan = step(0.96, fract(uv.y * lines * 0.5 + t * 3.0));
  return mix(vec3(r, g, b), vec3(0.05, 0.9, 0.4) * 0.7, scan * 0.6);
}
