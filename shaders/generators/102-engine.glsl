/*{
  "name": "Engine",
  "params": [
    {
      "label": "Vitesse",
      "key": "u_p0",
      "min": 0,
      "max": 1,
      "default": 0.4,
      "step": 0.01
    },
    {
      "label": "Jitter",
      "key": "u_p1",
      "min": 0,
      "max": 1,
      "default": 0.3,
      "step": 0.01
    },
    {
      "label": "Échelle",
      "key": "u_p2",
      "min": 0,
      "max": 1,
      "default": 0.5,
      "step": 0.01
    }
  ],
  "category": "Geometry"
}*/

float gearDist(vec2 p, vec2 c, float r, float teeth, float depth, float rot) {
  vec2 d = p - c;
  float dist = length(d);
  float ang = atan(d.y, d.x) - rot;
  float toothWave = 0.5 + 0.5 * cos(ang * teeth);
  float rTeeth = r + depth * smoothstep(0.4, 0.6, toothWave);
  return dist - rTeeth;
}

vec3 render(vec2 uv, vec2 res) {
  vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0);
  float speed = mix(0.3, 2.5, u_p0) * (1.0 + u_bass * 0.8);
  float scale = mix(0.35, 0.85, u_p2);
  float jitter = u_p1 * u_treble * 0.15;

  float r1 = 0.32 * scale, r2 = 0.26 * scale, r3 = 0.21 * scale;
  vec2 c1 = vec2(-(r1 + r2) * 0.92, 0.0);
  vec2 c2 = vec2((r1 + r2) * 0.92, 0.0);
  vec2 c3 = vec2(0.0, (r1 + r3) * 0.92);
  float t1 = 10.0, t2 = 8.0, t3 = 6.0;
  float toothDepth = 0.045 * scale;
  float rot1 = u_time * speed + sin(u_time * 9.0) * jitter;
  float rot2 = -u_time * speed * (t1 / t2) + cos(u_time * 8.0) * jitter;
  float rot3 = u_time * speed * (t1 / t3) + sin(u_time * 7.0) * jitter;

  float d1 = gearDist(p, c1, r1, t1, toothDepth, rot1);
  float d2 = gearDist(p, c2, r2, t2, toothDepth, rot2);
  float d3 = gearDist(p, c3, r3, t3, toothDepth, rot3);

  vec3 col = vec3(0.015, 0.015, 0.02);
  vec3 gearCol1 = mix(vec3(0.9, 0.4, 0.05), vec3(0.9, 0.15, 0.1), u_mid);
  vec3 gearCol2 = gearCol1 * 0.85;
  vec3 gearCol3 = gearCol1 * 0.7;

  float body1 = smoothstep(0.006, -0.006, d1);
  float body2 = smoothstep(0.006, -0.006, d2);
  float body3 = smoothstep(0.006, -0.006, d3);
  float hole1 = smoothstep(r1 * 0.32, r1 * 0.28, length(p - c1));
  float hole2 = smoothstep(r2 * 0.32, r2 * 0.28, length(p - c2));
  float hole3 = smoothstep(r3 * 0.32, r3 * 0.28, length(p - c3));

  col = mix(col, gearCol1, body1 * (1.0 - hole1));
  col = mix(col, gearCol2, body2 * (1.0 - hole2));
  col = mix(col, gearCol3, body3 * (1.0 - hole3));

  float rim = exp(-abs(d1) * 80.0) + exp(-abs(d2) * 80.0) + exp(-abs(d3) * 80.0);
  col += gearCol1 * rim * 0.5 * (0.5 + u_level * 0.5);

  return col * (0.6 + u_level * 0.6);
}

