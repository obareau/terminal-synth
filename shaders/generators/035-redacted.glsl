/*{
  "name": "Redacted",
  "params": [
    {
      "label": "Barres",
      "key": "u_p0",
      "min": 0,
      "max": 1,
      "default": 0.4,
      "step": 0.01
    },
    {
      "label": "Largeur",
      "key": "u_p1",
      "min": 0,
      "max": 1,
      "default": 0.6,
      "step": 0.01
    }
  ]
}*/

vec3 render(vec2 uv, vec2 res) {
  float t = u_time;
  // Background: horizontal faux-text noise
  float line = floor(uv.y * 60.0);
  float lh = fract(sin(line * 127.1) * 43758.5);
  float textSim = step(0.3 + lh*0.35, fract(uv.x * 60.0 + lh * 2.0));
  vec3 doc = vec3(textSim * 0.65 + 0.04);
  // Redaction bars — animated, per-row random width
  float N = 4.0 + floor(u_p0 * 8.0);
  float barRow = floor(uv.y * N);
  float barW = mix(0.35, 0.92, fract(sin(barRow*311.7)*43758.5));
  barW *= u_p1 * (0.6 + u_level * 0.45);
  float redacted = step(fract(uv.y * N), barW);
  // Occasionally a bar scrolls with audio
  float scroll = step(0.7, fract(sin(barRow*73.1)*4375.8)) * step(0.7, u_bass);
  redacted = max(redacted, scroll * step(fract(uv.x + t*0.05), barW));
  // Black bar with faint grain
  float barGrain = hash(vec2(floor(uv.x*150.0), barRow)) * 0.04;
  vec3 bar = vec3(barGrain) + vec3(step(0.9, u_bass) * u_beatEnv * 0.4);
  return clamp(mix(doc, bar, redacted), 0.0, 1.0);
}
