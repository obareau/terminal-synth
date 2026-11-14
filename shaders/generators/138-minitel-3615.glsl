/*{
  "name": "Minitel 3615",
  "category": "Lofi"
}*/

// 4×5 bitmap font — bit = row*4+col, row0=top, col0=left
float charPx(float packed, float cx, float cy) {
  int col = int(cx * 4.0);
  int row = int(cy * 5.0);
  if (col >= 4 || row >= 5) return 0.0;
  int bit = row * 4 + col;
  return float((int(packed) >> bit) & 1);
}

// "3615 ROBOTARIIS" (15 chars, indices 0-14)
float lookupChar(int idx, float cx, float cy) {
  float chars[15];
  chars[0]  = 493255.0;  // 3
  chars[1]  = 431894.0;  // 6
  chars[2]  = 467506.0;  // 1
  chars[3]  = 493343.0;  // 5
  chars[4]  = 0.0;       // space
  chars[5]  = 604055.0;  // R
  chars[6]  = 432534.0;  // O
  chars[7]  = 497559.0;  // B
  chars[8]  = 432534.0;  // O
  chars[9]  = 139823.0;  // T
  chars[10] = 630678.0;  // A
  chars[11] = 604055.0;  // R
  chars[12] = 401958.0;  // I
  chars[13] = 401958.0;  // I
  chars[14] = 493086.0;  // S
  if (idx < 0 || idx >= 15) return 0.0;
  return charPx(chars[idx], cx, cy);
}

vec3 render(vec2 uv, vec2 res) {
  float t = u_time;
  vec2 grd = vec2(40.0, 25.0);
  vec2 cell   = floor(uv * grd);
  vec2 within = fract(uv * grd);
  float cx = cell.x;
  float cy = cell.y;

  // Thin cell grid
  float brd = clamp(step(0.92, within.x) + step(0.92, within.y), 0.0, 1.0);

  vec3 col = vec3(0.0);

  // === ROW 0 : HEADER "3615 | ROBOTARIIS" ===
  if (cy < 1.0) {
    // "3615" on dark background (cols 0-3)
    if (cx < 4.0) {
      col = vec3(0.05, 0.0, 0.12);
      float lit = lookupChar(int(cx), within.x, within.y);
      col = mix(col, vec3(1.0, 1.0, 1.0), lit);
    }
    // Separator (col 4)
    else if (cx < 5.0) {
      col = vec3(0.3, 0.0, 0.3);
    }
    // "ROBOTARIIS" on magenta (cols 5-14)
    else if (cx < 15.0) {
      col = vec3(0.55, 0.0, 0.55);
      float lit = lookupChar(int(cx), within.x, within.y);
      col = mix(col, vec3(1.0, 1.0, 0.0), lit);
    }
    // Right service area (cols 15-39): dark blue, level-reactive fill
    else {
      col = vec3(0.0, 0.0, 0.42);
      float fill = step(cx, 15.0 + u_level * 22.0);
      col = mix(col, vec3(0.15, 0.15, 0.7), fill * 0.4);
    }
    col *= 1.0 - brd * 0.4;
  }

  // === ROW 1 : service name bar ===
  else if (cy < 2.0) {
    col = vec3(0.0, 0.0, 0.45);
    // Highlighted zone for service title
    if (cx >= 10.0 && cx <= 29.0) {
      float pulse = 0.6 + 0.2 * sin(t * 1.2) + u_level * 0.2;
      col = vec3(0.05, 0.05, 0.65) * pulse;
    }
    col *= 1.0 - brd * 0.3;
  }

  // === ROW 2 : cyan separator ===
  else if (cy < 3.0) {
    float wave = 0.5 + 0.5 * sin(cx * 0.8 + t * 2.0 + u_bass * 3.0);
    col = vec3(0.0, 0.6, 0.6) * (0.6 + wave * 0.4);
  }

  // === ROWS 3-21 : service content ===
  else if (cy < 22.0) {
    float row = cy - 3.0;   // 0-18

    // Vertical borders
    if (cx < 1.0 || cx > 38.0) {
      col = vec3(0.0, 0.45, 0.45);
    }
    // Label column (cols 1-11)
    else if (cx < 12.0) {
      vec3 lcols[6];
      lcols[0] = vec3(0.0,  0.75, 0.0);   // green
      lcols[1] = vec3(0.0,  0.65, 0.65);  // cyan
      lcols[2] = vec3(0.75, 0.0,  0.0);   // red
      lcols[3] = vec3(0.75, 0.75, 0.0);   // yellow
      lcols[4] = vec3(0.65, 0.0,  0.65);  // magenta
      lcols[5] = vec3(0.5,  0.5,  0.5);   // white
      int li = int(mod(floor(row / 3.0), 6.0));
      float bands[6];
      bands[0] = u_bass;
      bands[1] = u_mid;
      bands[2] = u_treble;
      bands[3] = u_level;
      bands[4] = u_bass * 0.5 + u_treble * 0.5;
      bands[5] = u_mid;
      col = lcols[li] * (0.45 + bands[li] * 0.65);
      // Row separators
      if (fract(row / 3.0) < 0.07) col *= 0.25;
    }
    // Separator pipe (col 12)
    else if (cx < 13.0) {
      col = vec3(0.25, 0.25, 0.25);
    }
    // Content area (cols 13-37)
    else if (cx < 38.0) {
      float colN = (cx - 13.0) / 25.0;
      // Fake text blocks: animated per-row hash
      float h1 = fract(sin(row * 127.1 + floor(t * 0.4)) * 4375.8);
      float h2 = fract(sin(row * 311.7 + cx  * 0.07)     * 3287.4);
      float textLen = h1 * 0.6 + 0.2 + u_level * 0.2;
      float isLit = step(colN, textLen) * step(0.2, h2);
      // Band coloring per row group
      float band = mod(row, 3.0) < 1.0 ? u_bass : mod(row, 3.0) < 2.0 ? u_mid : u_treble;
      vec3 txt = mix(vec3(0.55, 0.55, 0.55), vec3(1.0), band);
      col = mix(vec3(0.0, 0.0, 0.04), txt, isLit * 0.65);
      // Beat flash on alternating rows
      float onBeat = step(0.85, u_bass) * mod(row, 2.0);
      col = mix(col, vec3(1.0, 1.0, 0.5), onBeat * 0.35 * isLit);
      // Row separator
      if (fract(row / 3.0) < 0.07) col = vec3(0.1, 0.1, 0.22);
    }
  }

  // === ROW 22 : bottom separator ===
  else if (cy < 23.0) {
    float wave = 0.5 + 0.5 * sin(cx * 0.8 - t * 2.0 + u_bass * 3.0);
    col = vec3(0.0, 0.55, 0.55) * (0.5 + wave * 0.5);
  }

  // === ROWS 23-24 : nav bar ===
  else {
    col = vec3(0.0, 0.0, 0.3);
    // 4 colored key blocks
    float zone = floor(cx / 9.0);
    float zoneX = fract(cx / 9.0);
    float bands4[4];
    bands4[0] = u_bass;
    bands4[1] = u_mid;
    bands4[2] = u_treble;
    bands4[3] = u_level;
    if (zone < 4.0 && zoneX < 0.7) {
      vec3 kb = vec3(0.0, 0.0, 0.55 + bands4[int(zone)] * 0.35);
      col = kb;
    }
    // Blinking cursor at right
    if (cx >= 37.0) {
      float blink = step(0.5, fract(t * 1.5));
      col = mix(col, vec3(0.9, 0.9, 1.0), blink);
    }
  }

  // CRT scanlines
  float scan = 0.87 + 0.13 * step(0.5, fract(uv.y * res.y * 0.5));
  col *= scan;

  return clamp(col, 0.0, 1.0);
}
