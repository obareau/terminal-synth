# terminal-synth

Synthé visuel **dark / industriel** — shaders GLSL réactifs au **son** (et bientôt au
**MIDI**), avec un **mode rendu ASCII** (esthétique terminal). Inspiré de *VS — Visual
Synthesizer* (Imaginando). Bras visuel de **ROBOTARIIS**.

**Statut** : MVP · v0.1.0 · Electron + TypeScript + WebGL2

## MVP (présent)

- Fenêtre WebGL2 plein écran rendant un **shader** (3 intégrés : Plasma indus, Tunnel, Scan grid).
- **Audio-réactif** : FFT du micro/carte son → bandes graves/médiums/aigus + niveau → uniforms.
- **Mode ASCII** (toggle) : le rendu est converti en art ASCII (vert sur noir, lueur).
- UI sombre minimale : choix du shader, activation audio, ASCII, plein écran, VU-mètre.

Uniforms exposés aux shaders : `u_time`, `u_resolution`, `u_bass`, `u_mid`, `u_treble`, `u_level`.

## Lancer

```bash
npm install
npm start      # build (esbuild) + lance Electron
```

Clique **🎤 audio** pour autoriser l'entrée son, **ASCII** pour le mode terminal,
**⛶** pour le plein écran.

## Structure

```
src/
  main.ts              # process principal Electron (fenêtre, permissions audio/MIDI)
  renderer/
    index.html         # UI sombre (canvas + <pre> ASCII + barre)
    renderer.ts        # glue : WebGL + audio + UI + boucle
    gl.ts              # moteur WebGL2 (shader plein écran + rendu offscreen)
    audio.ts           # Web Audio : FFT → bandes
    ascii.ts           # pixels → art ASCII
    shaders.ts         # shaders intégrés (fonction render(uv, res))
build.ts               # bundle esbuild (main = node, renderer = browser) + copie html
```

## Roadmap

**Fait**
- Audio-réactif sur la **sortie système Windows** (loopback) ou micro ; vues **FFT bars** / **Waveform**.
- **Pipeline** d'effets chaînés (entropie → feedback → glitch → filtre).
- **Plein écran** natif (⛶ / F, Échap pour sortir).
- **MIDI-in (contrôle)** + 2 modes de jeu : **Orgue** (dark ambient, soutenu) / **Noise** (percussif).

**En cours / suite**
- **Générateurs polyphoniques** : N passes générateur empilées (notes tenues = calques),
  vélocité = brillance, aftertouch = modulation ; blend additif.
- **Mapping MIDI complet** : zone basse = effets (note+aftertouch), zone médium = générateurs.
- **Overlay texte** (lore ROBOTARIIS — « tactiques Recta »), style terminal/glitch.
- **Lecture de fichier MIDI** pour séquencer les visuels.
- **Export** vidéo (`MediaRecorder` → ffmpeg) + *asciicast* (easter-egg).

**Plus tard**
- Support **ISF** + import Shadertoy ; **presets** de chaîne ; sortie **Spout/NDI** (VJ) ;
  bascule moteur **natif Rust** si besoin de perf.
