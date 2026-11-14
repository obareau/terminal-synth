/*{
  "name": "Éclairs",
  "params": [
    {
      "label": "Éclairs",
      "key": "u_p0",
      "min": 1,
      "max": 5,
      "default": 3,
      "step": 1
    },
    {
      "label": "Fréquence",
      "key": "u_p1",
      "min": 4,
      "max": 20,
      "default": 9,
      "step": 1
    }
  ]
}*/

vec3 render(vec2 uv, vec2 res) {
  float t = floor(u_time * u_p1);
  float bright = 0.0;
  for (int b = 0; b < 5; b++) {
    if (float(b) >= u_p0) break;
    float fb  = float(b);
    float bx  = 0.2 + hash(vec2(fb, floor(u_time*0.5+fb))) * 0.6;
    float x   = bx;
    for (int i = 0; i < 16; i++) {
      float fi = float(i);
      float y0 = fi / 16.0, y1 = (fi+1.0) / 16.0;
      float xn = x + (hash(vec2(fi+fb*100.0, t+fb)) - 0.5) * 0.09;
      float inS = step(y0,uv.y)*step(uv.y,y1);
      float lx  = mix(x, xn, (uv.y-y0)/max(y1-y0,1e-4));
      float d   = abs(uv.x - lx) * inS + (1.0-inS) * 1.0;
      bright += 0.0018 / max(d,0.0001) * inS * (1.0+u_bass*0.6);
      // ramification
      float bSeed = hash(vec2(fi+fb*100.0+50.0, t));
      if (bSeed > 0.72) {
        float bxe = lx + (hash(vec2(fi+200.0,t+fb))-0.5)*0.12;
        float blx = mix(lx, bxe, clamp((uv.y-y0)/(y1*0.5-y0+1e-4),0.0,1.0));
        float bd  = abs(uv.x - blx) * inS;
        bright += 0.0009 / max(bd,0.0001) * inS * 0.6;
      }
      x = xn;
    }
  }
  bright *= 0.6 + hash(vec2(floor(u_time*14.0),0.0))*0.4;
  vec3 col = mix(vec3(0.5,0.65,1.0), vec3(1.0,1.0,1.0), min(bright*0.5,1.0));
  return col * min(bright, 2.5);
}
