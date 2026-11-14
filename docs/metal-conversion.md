# Conversion des shaders vers Metal

Généré par `npm run metal:convert` — ne pas éditer à la main.

Chaîne : GLSL assemblé comme dans `gl.ts` → glslang → SPIR-V → spirv-cross → MSL 2.1, puis compilation par le pilote Metal du Mac (`scripts/metal-validate.swift`).

**260 / 260 shaders passent sans retouche.**

| | Total | OK | Échec GLSL → SPIR-V | Échec SPIR-V → MSL | Échec compilation Metal |
|---|---|---|---|---|---|
| Générateurs | 142 | 142 | 0 | 0 | 0 |
| Effets | 57 | 57 | 0 | 0 | 0 |
| Perturbateurs | 61 | 61 | 0 | 0 | 0 |

## Shaders à retoucher

Aucun.

## À savoir pour le port Metal

- Les uniforms sont regroupés dans une struct `Uniforms` (`[[buffer(0)]]`).
- Textures et samplers ont des index fixes pour tous les shaders (`TEXTURE_SLOTS` dans `scripts/convert-metal.ts`) : `u_audio` → 0, `u_text` → 1, `u_fbmTex` → 2, `u_media` → 3, `u_prev` → 0, `u_feedback` → 1.
- `gl_FragCoord` a son origine en bas à gauche en OpenGL, en haut à gauche en Metal : le pipeline Metal doit retourner l'axe Y (ou passer `uv.y = 1 - uv.y`).
- La compilation valide la syntaxe et les types, pas le rendu : un shader « ok » peut encore différer visuellement.
