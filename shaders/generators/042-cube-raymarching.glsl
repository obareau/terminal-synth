/*{
  "name": "Cube Raymarching",
  "params": [
    {
      "label": "Rotation",
      "key": "u_p0",
      "min": 0,
      "max": 2,
      "default": 0.5,
      "step": 0.1
    },
    {
      "label": "Scale",
      "key": "u_p1",
      "min": 0.3,
      "max": 1.5,
      "default": 0.6,
      "step": 0.1
    }
  ]
}*/

float sdBox(vec3 p, vec3 b) {
  vec3 q = abs(p) - b;
  return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
}

vec3 render(vec2 uv, vec2 res) {
  vec2 p = (uv - 0.5) * vec2(res.x/res.y, 1.0) * 2.5;
  vec3 ro = vec3(sin(u_time * u_p0 * (0.5 + u_bass)) * 1.5, u_bass * 0.5, 3.0 - u_mid);
  vec3 rd = normalize(vec3(p, -1.0));

  float t = 0.1;
  for(int i = 0; i < 80; i++) {
    vec3 pos = ro + rd * t;
    float d = sdBox(pos, vec3(u_p1 * (0.8 + 0.4 * u_bass)));
    if(d < 0.001) break;
    if(t > 50.0) break;
    t += d * (0.6 + 0.4 * u_treble);
  }

  vec3 pos = ro + rd * t;
  vec3 n = normalize(vec3(
    sdBox(pos+vec3(0.001,0,0), vec3(u_p1))-sdBox(pos-vec3(0.001,0,0), vec3(u_p1)),
    sdBox(pos+vec3(0,0.001,0), vec3(u_p1))-sdBox(pos-vec3(0,0.001,0), vec3(u_p1)),
    sdBox(pos+vec3(0,0,0.001), vec3(u_p1))-sdBox(pos-vec3(0,0,0.001), vec3(u_p1))
  ));

  vec3 light = normalize(vec3(1.0, 1.0 + u_mid, -1.0 - u_treble));
  float spec = pow(max(0.0, dot(reflect(-light, n), -rd)), 16.0) * (0.6 + 0.4 * u_bass);
  vec3 col = vec3(0.2, 0.5, 0.9 + u_treble * 0.2) * (0.3 + 0.7 * max(0.0, dot(n, light))) + spec * 0.8;
  col += u_bass * 0.4;
  col *= exp(-t * 0.08) * (0.7 + 0.3 * u_level);
  return col;
}
