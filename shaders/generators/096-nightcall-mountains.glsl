/*{
  "name": "Nightcall Mountains",
  "params": [
    {
      "label": "Speed",
      "key": "u_p0",
      "min": 0.5,
      "max": 3,
      "default": 1.5,
      "step": 0.1
    },
    {
      "label": "Intensity",
      "key": "u_p1",
      "min": 0.5,
      "max": 2,
      "default": 1,
      "step": 0.1
    }
  ],
  "category": "Geometry"
}*/

// Distance from point to line segment
float distLine(vec2 p, vec2 a, vec2 b) {
  vec2 d = b - a;
  float t = clamp(dot(p - a, d) / dot(d, d), 0.0, 1.0);
  return length(p - a - t * d);
}

// Pseudo-random
float h11(float x) { return fract(sin(x * 12.9898) * 43758.5453); }

vec3 render(vec2 uv, vec2 res) {
  float t = u_time * u_p0;

  // Centered coords with aspect ratio
  vec2 p = uv * 2.0 - 1.0;
  p.x *= res.x / res.y;

  vec3 col = vec3(0.0);

  // === SKY GRADIENT: violet bas → jaune autour soleil ===
  float skyT = clamp((p.y + 0.2) * 0.7, 0.0, 1.0);
  col = mix(vec3(0.45, 0.05, 0.55), vec3(0.25, 0.0, 0.45), skyT);

  // === SUN (background, with glow) ===
  vec2 sunPos = vec2(0.0, 0.1);
  float sunD = length(p - sunPos);

  // Outer halo: yellow → violet
  float outerGlow = exp(-sunD * sunD * 1.8);
  col = mix(col, vec3(1.0, 0.85, 0.3), outerGlow * 0.65);

  // Sun body
  float sunR = 0.22;
  float sunBody = smoothstep(sunR, sunR - 0.004, sunD);
  vec3 sunCol = mix(vec3(1.0, 0.95, 0.5), vec3(1.0, 0.55, 0.15), sunD / sunR);
  col = mix(col, sunCol, sunBody);

  // Sun bright core
  col += vec3(1.0, 1.0, 0.7) * exp(-sunD * sunD * 25.0) * 0.5;

  // === 3D FLOOR GRID (true perspective, rotated 20°) ===
  if (p.y < 0.0) {
    float ch = 0.35; // camera height
    float fz = -ch / p.y; // distance along floor
    float fx = p.x * fz / ch; // world x

    // Animate forward motion
    fz += t * 4.0;

    // Rotate grid by 20°
    float ang = radians(20.0);
    float ca = cos(ang), sa = sin(ang);
    vec2 g = vec2(fx * ca - fz * sa, fx * sa + fz * ca);

    // Grid distance
    vec2 gd = abs(fract(g + 0.5) - 0.5);

    // Adaptive thickness (constant in screen space)
    float thick = 0.035;
    float lineX = smoothstep(thick, 0.0, gd.x * fz * 0.4);
    float lineY = smoothstep(thick, 0.0, gd.y * fz * 0.4);
    float line = max(lineX, lineY);

    // Glow effect (wider falloff)
    float glowX = exp(-gd.x * gd.x * fz * fz * 50.0);
    float glowY = exp(-gd.y * gd.y * fz * fz * 50.0);
    float glow = max(glowX, glowY);

    // Floor base (dark with violet tint)
    vec3 floorBase = mix(vec3(0.04, 0.0, 0.08), vec3(0.15, 0.02, 0.2), -p.y);

    // Grid color: blue near, violet far
    vec3 gridCol = mix(vec3(0.2, 0.7, 1.0), vec3(0.8, 0.3, 1.0), clamp(fz * 0.05, 0.0, 1.0));

    // Compose floor
    col = mix(floorBase, gridCol * 1.8, line * u_p1);
    col += gridCol * glow * 0.4 * u_p1;

    // Fade into horizon
    float horizonFade = smoothstep(0.0, -0.05, p.y);
    col = mix(mix(vec3(0.45, 0.05, 0.55), col, 0.5), col, horizonFade);
  }

  // === WIREFRAME MOUNTAINS (3D pyramids, animated forward) ===
  float wireThick = 0.004;
  float mtnWire = 0.0;
  float mtnGlow = 0.0;
  float ch = 0.35;

  // 32 mountains, hexagonal base, hidden-face wireframe
  vec3 cam = vec3(0.0, ch, 0.0);
  for (int i = 0; i < 32; i++) {
    float fi = float(i);
    float side = (fi < 16.0) ? -1.0 : 1.0;
    float idx = mod(fi, 16.0);

    float r1 = h11(fi * 1.7);
    float r2 = h11(fi * 3.3);
    float r3 = h11(fi * 5.9);
    float r4 = h11(fi * 7.1);
    float r5 = h11(fi * 11.3);
    float r6 = h11(fi * 17.5);
    float r7 = h11(fi * 19.7);

    // World base center: more random spread (across X and Z offset)
    float wx = side * (0.55 + idx * 0.2 + r1 * 0.5 + r6 * 0.3);
    float r_base = 0.25 + r2 * 0.3;          // wider range 0.25..0.55
    float mh = 0.35 + r3 * 0.55;             // taller mountains possible
    float apexSkewX = (r4 - 0.5) * r_base * 0.6;
    float apexSkewY = (r5 - 0.5) * mh * 0.2;

    // Animated Z with random per-mountain offset for more chaos
    float wzCycle = 22.0;
    float wzInit = 1.0 + idx * 2.5 + r1 * 2.0 + r7 * 1.5;
    float wz = mod(wzInit - t * 3.5, wzCycle) + 0.7;
    if (wz < 0.4 || wz > 18.0) continue;  // Skip too close & too far

    // Also random Z offset perpendicular to camera direction
    wx += (r6 - 0.5) * 0.3 * wz * 0.2;  // perspective wiggle

    // === EARLY-OUT: bounding box check in screen space ===
    // Approximate screen bounds: center around projected base, radius accordingly
    vec2 sCenter = vec2(wx, -ch) / wz;
    float screenRadius = (r_base + mh) / wz * 1.5;
    if (length(p - sCenter) > screenRadius) continue;

    // === Build 6-sided base (vertices on floor, varying radius) ===
    vec3 apexW = vec3(wx + apexSkewX, mh + apexSkewY, wz);
    vec3 V0, V1, V2, V3, V4, V5;
    {
      float a0 = 0.0,         a1 = 1.0472,    a2 = 2.0944;
      float a3 = 3.14159,     a4 = 4.18879,   a5 = 5.23599;
      float ra0 = r_base * (0.6 + h11(fi + 0.11) * 0.8);
      float ra1 = r_base * (0.6 + h11(fi + 0.23) * 0.8);
      float ra2 = r_base * (0.6 + h11(fi + 0.37) * 0.8);
      float ra3 = r_base * (0.6 + h11(fi + 0.49) * 0.8);
      float ra4 = r_base * (0.6 + h11(fi + 0.61) * 0.8);
      float ra5 = r_base * (0.6 + h11(fi + 0.73) * 0.8);

      V0 = vec3(wx + cos(a0) * ra0, 0.0, wz + sin(a0) * ra0);
      V1 = vec3(wx + cos(a1) * ra1, 0.0, wz + sin(a1) * ra1);
      V2 = vec3(wx + cos(a2) * ra2, 0.0, wz + sin(a2) * ra2);
      V3 = vec3(wx + cos(a3) * ra3, 0.0, wz + sin(a3) * ra3);
      V4 = vec3(wx + cos(a4) * ra4, 0.0, wz + sin(a4) * ra4);
      V5 = vec3(wx + cos(a5) * ra5, 0.0, wz + sin(a5) * ra5);
    }

    // === MULTIPLE PEAKS for jagged mountain ridge ===
    // Main apex + 2 sub-peaks at varying heights (creates multi-summit relief)
    vec3 apex2W = vec3(
      wx + (h11(fi + 0.91) - 0.5) * r_base * 1.6,
      mh * (0.55 + h11(fi + 0.97) * 0.3),
      wz + (h11(fi + 0.83) - 0.5) * r_base * 1.0
    );
    vec3 apex3W = vec3(
      wx + (h11(fi + 0.41) - 0.5) * r_base * 1.6,
      mh * (0.4 + h11(fi + 0.59) * 0.3),
      wz + (h11(fi + 0.71) - 0.5) * r_base * 1.0
    );

    // === FACE VISIBILITY (hidden-face culling, INVERTED test) ===
    // Face i = triangle (apex, V_{i+1}, V_i) -> outward normal via cross(V_{i+1}-a, V_i-a)
    bool vis0, vis1, vis2, vis3, vis4, vis5;
    {
      vec3 a = apexW;
      // Outward normal: cross(V_{i+1}-a, V_i-a) (reversed winding)
      vec3 n0 = cross(V1 - a, V0 - a); vec3 c0 = (a + V0 + V1) / 3.0; vis0 = dot(n0, c0 - cam) < 0.0;
      vec3 n1 = cross(V2 - a, V1 - a); vec3 c1 = (a + V1 + V2) / 3.0; vis1 = dot(n1, c1 - cam) < 0.0;
      vec3 n2 = cross(V3 - a, V2 - a); vec3 c2 = (a + V2 + V3) / 3.0; vis2 = dot(n2, c2 - cam) < 0.0;
      vec3 n3 = cross(V4 - a, V3 - a); vec3 c3 = (a + V3 + V4) / 3.0; vis3 = dot(n3, c3 - cam) < 0.0;
      vec3 n4 = cross(V5 - a, V4 - a); vec3 c4 = (a + V4 + V5) / 3.0; vis4 = dot(n4, c4 - cam) < 0.0;
      vec3 n5 = cross(V0 - a, V5 - a); vec3 c5 = (a + V5 + V0) / 3.0; vis5 = dot(n5, c5 - cam) < 0.0;
    }

    // Secondary peaks visibility
    bool vis2peak = (apex2W - cam).z > 0.5;
    bool vis3peak = (apex3W - cam).z > 0.5;

    // === Project all vertices to screen ===
    vec2 sApex = vec2(apexW.x, apexW.y - ch) / apexW.z;
    vec2 sApex2 = vec2(apex2W.x, apex2W.y - ch) / apex2W.z;
    vec2 sApex3 = vec2(apex3W.x, apex3W.y - ch) / apex3W.z;
    vec2 sV0 = vec2(V0.x, V0.y - ch) / V0.z;
    vec2 sV1 = vec2(V1.x, V1.y - ch) / V1.z;
    vec2 sV2 = vec2(V2.x, V2.y - ch) / V2.z;
    vec2 sV3 = vec2(V3.x, V3.y - ch) / V3.z;
    vec2 sV4 = vec2(V4.x, V4.y - ch) / V4.z;
    vec2 sV5 = vec2(V5.x, V5.y - ch) / V5.z;

    // === EDGE VISIBILITY: edge visible if any adjacent face is visible ===
    // Ridge i (apex-Vi) shared between face_{i-1} and face_i
    // Base edge i (Vi-V{i+1}) belongs only to face_i
    float md = 1e10;

    // Ridge edges (apex to vertex)
    if (vis5 || vis0) md = min(md, distLine(p, sApex, sV0));
    if (vis0 || vis1) md = min(md, distLine(p, sApex, sV1));
    if (vis1 || vis2) md = min(md, distLine(p, sApex, sV2));
    if (vis2 || vis3) md = min(md, distLine(p, sApex, sV3));
    if (vis3 || vis4) md = min(md, distLine(p, sApex, sV4));
    if (vis4 || vis5) md = min(md, distLine(p, sApex, sV5));

    // Base edges
    if (vis0) md = min(md, distLine(p, sV0, sV1));
    if (vis1) md = min(md, distLine(p, sV1, sV2));
    if (vis2) md = min(md, distLine(p, sV2, sV3));
    if (vis3) md = min(md, distLine(p, sV3, sV4));
    if (vis4) md = min(md, distLine(p, sV4, sV5));
    if (vis5) md = min(md, distLine(p, sV5, sV0));

    // Secondary peak edges (sub-summits creating jagged ridge)
    if (vis2peak) {
      md = min(md, distLine(p, sApex2, sApex));   // ridge to main apex
      if (vis0 || vis5) md = min(md, distLine(p, sApex2, sV0));
      if (vis1 || vis0) md = min(md, distLine(p, sApex2, sV1));
      if (vis5 || vis4) md = min(md, distLine(p, sApex2, sV5));
    }
    // Third peak edges
    if (vis3peak) {
      md = min(md, distLine(p, sApex3, sApex));
      md = min(md, distLine(p, sApex3, sApex2));  // peak-to-peak ridge
      if (vis2 || vis1) md = min(md, distLine(p, sApex3, sV2));
      if (vis3 || vis2) md = min(md, distLine(p, sApex3, sV3));
      if (vis4 || vis3) md = min(md, distLine(p, sApex3, sV4));
    }

    // === CONTOUR RINGS on visible faces (skip for distant mountains) ===
    if (wz < 8.0) {
      int ringMax = (wz < 4.0) ? 3 : 2; // fewer rings on medium-far mountains
      for (int ring = 1; ring <= 3; ring++) {
        if (ring > ringMax) break;
        float rt = float(ring) / 4.0;
        vec2 r0 = mix(sV0, sApex, rt);
        vec2 r1v = mix(sV1, sApex, rt);
        vec2 r2v = mix(sV2, sApex, rt);
        vec2 r3v = mix(sV3, sApex, rt);
        vec2 r4v = mix(sV4, sApex, rt);
        vec2 r5v = mix(sV5, sApex, rt);

        if (vis0) md = min(md, distLine(p, r0, r1v));
        if (vis1) md = min(md, distLine(p, r1v, r2v));
        if (vis2) md = min(md, distLine(p, r2v, r3v));
        if (vis3) md = min(md, distLine(p, r3v, r4v));
        if (vis4) md = min(md, distLine(p, r4v, r5v));
        if (vis5) md = min(md, distLine(p, r5v, r0));
      }
    }

    // Wireframe & glow, with distance fade
    float w = smoothstep(wireThick * 1.5, 0.0, md);
    float g = exp(-md * md * 500.0);
    float fade = clamp(1.5 - wz * 0.08, 0.15, 1.0);
    fade *= smoothstep(0.5, 1.5, wz); // fade in when appearing

    mtnWire = max(mtnWire, w * fade);
    mtnGlow = max(mtnGlow, g * fade * 0.45);
  }

  // Apply mountains: cyan/blue wireframe with violet glow
  vec3 wireCol = vec3(0.3, 0.9, 1.0);
  vec3 glowCol = vec3(0.5, 0.4, 1.0);
  col += wireCol * mtnWire * 1.2 * u_p1;
  col += glowCol * mtnGlow * u_p1;

  return col;
}
