/*{
  "name": "Menger Sponge",
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
      "label": "Explosion",
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

float distLine(vec2 p, vec2 a, vec2 b) {
  vec2 d = b - a;
  float t = clamp(dot(p - a, d) / dot(d, d), 0.0, 1.0);
  return length(p - a - t * d);
}
mat3 rotY(float a) { float s = sin(a), c = cos(a); return mat3(c,0.0,s, 0.0,1.0,0.0, -s,0.0,c); }
mat3 rotX(float a) { float s = sin(a), c = cos(a); return mat3(1.0,0.0,0.0, 0.0,c,-s, 0.0,s,c); }
vec2 project(vec3 p, float camZ) {
  float d = camZ + p.z;
  return p.xy / max(d, 0.2);
}

vec3 render(vec2 uv, vec2 res) {
  vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0);
  float t = u_time * mix(0.1, 0.8, u_p0);
  mat3 rot = rotY(t) * rotX(t * 0.6);
  float scale = mix(0.4, 0.9, u_p2);
  float explode = 1.0 + u_p1 * (0.4 + u_bass * 0.8);

  vec3 cubeV[8];
  cubeV[0] = vec3(-1.0,-1.0,-1.0); cubeV[1] = vec3(1.0,-1.0,-1.0);
  cubeV[2] = vec3(1.0,1.0,-1.0);   cubeV[3] = vec3(-1.0,1.0,-1.0);
  cubeV[4] = vec3(-1.0,-1.0,1.0);  cubeV[5] = vec3(1.0,-1.0,1.0);
  cubeV[6] = vec3(1.0,1.0,1.0);    cubeV[7] = vec3(-1.0,1.0,1.0);
  int e0[12] = int[12](0,1,2,3, 4,5,6,7, 0,1,2,3);
  int e1[12] = int[12](1,2,3,0, 5,6,7,4, 4,5,6,7);

  float md = 10.0;
  for (int ix = -1; ix <= 1; ix++) {
    for (int iy = -1; iy <= 1; iy++) {
      for (int iz = -1; iz <= 1; iz++) {
        int zeros = 0;
        if (ix == 0) zeros++;
        if (iy == 0) zeros++;
        if (iz == 0) zeros++;
        if (zeros >= 2) continue;
        vec3 offset = vec3(float(ix), float(iy), float(iz)) * (0.66 * explode);
        vec2 sv[8];
        for (int k = 0; k < 8; k++) {
          vec3 vp = (cubeV[k] * 0.32 + offset) * scale;
          vp = rot * vp;
          sv[k] = project(vp, 3.2);
        }
        for (int k = 0; k < 12; k++) {
          md = min(md, distLine(p, sv[e0[k]], sv[e1[k]]));
        }
      }
    }
  }

  float thick = 0.004 + u_level * 0.003;
  float w = smoothstep(thick * 2.0, 0.0, md);
  float glow = exp(-md * md * 600.0);
  vec3 col = vec3(0.02, 0.02, 0.03);
  vec3 wireCol = mix(vec3(0.15, 0.9, 0.5), vec3(0.9, 0.7, 0.1), u_mid);
  col += wireCol * w * 1.3;
  col += wireCol * glow * 0.35;
  return col * (0.6 + u_level * 0.6);
}

