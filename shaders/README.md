# shaders/

Source unique de tous les shaders de Terminal-Synth. L'app Electron les embarque au
build (plugin esbuild dans `build.ts`) ; le futur port Metal lira les mêmes fichiers.

| Dossier | Contenu | Fonction GLSL attendue |
|---|---|---|
| `generators/` | générateurs (couche A / B) | `vec3 render(vec2 uv, vec2 res)` |
| `effects/` | chaîne de post-traitement | `vec3 process(vec2 uv)` |
| `disruptors/` | glitches déclenchés par l'audio | `vec3 process(vec2 uv)` |
| `lib/` | code partagé, inclus via `#include "fichier.glsl"` | — |

## Format d'un fichier

Un en-tête JSON (même convention que l'ISF : `/*{ ... }*/` tout en haut), puis le GLSL ES 3.00.

```glsl
/*{
  "name": "Mon générateur",
  "category": "Geometry",
  "params": [
    { "label": "Vitesse", "key": "u_p0", "min": 0, "max": 1, "default": 0.5 }
  ]
}*/
vec3 render(vec2 uv, vec2 res) {
  return vec3(uv, 0.5 + 0.5 * sin(u_time * u_p0));
}
```

- **Générateurs** : `name`, `category` (optionnelle), `params` (optionnels, clés `u_p0`..`u_p3` ou `holdMs`).
- **Effets** : `name`, `id` (3 lettres).
- **Perturbateurs** : `name`, `id`, `defaultSensitivity`, `defaultDurationMs`, `defaultCooldownMs`.

Uniforms et helpers disponibles : voir les commentaires en tête de
`src/renderer/shaders.ts` et `src/renderer/effects.ts`.

## Ordre = index

Le préfixe numérique fixe l'ordre, et donc l'index utilisé par les scènes, presets et
mappings MIDI sauvegardés. **Ajouter à la fin, ne jamais renuméroter.**
`generators/000-mire-ortf.glsl` doit rester en tête (écran de démarrage).

> Ces fichiers ne sont pas des ISF exécutables tels quels dans VDMX/Resolume : seul
> l'en-tête suit la convention ISF, le corps utilise les uniforms de Terminal-Synth.

## Conversion Metal

`npm run metal:convert` convertit tous les shaders en Metal (glslang → SPIR-V →
spirv-cross) et les fait compiler par le pilote Metal du Mac. Prérequis :
`brew install glslang spirv-cross`. Résultat dans `out/metal/msl/`, rapport dans
`docs/metal-conversion.md`.
