/**
 * Bibliothèque de shaders partagée — lit le dossier shaders/ (Node uniquement).
 *
 * Chaque fichier .glsl = un en-tête JSON style ISF  /*{ ... }*\/  suivi du corps GLSL.
 * L'ordre des fichiers (préfixe numérique) fixe l'index : les scènes, presets et
 * mappings MIDI référencent les shaders par index, il ne faut donc pas renuméroter
 * sans raison.
 *
 * `#include "x.glsl"` insère tel quel le contenu de shaders/lib/x.glsl.
 *
 * Utilisé au build (plugin esbuild → module "virtual:shader-library") et par les
 * tests Jest. Le futur port Metal lira le même dossier.
 */
import * as fs from "node:fs";
import * as path from "node:path";

export type ShaderMeta = Record<string, unknown> & { name: string };

export interface ShaderLibrary {
  generators: (ShaderMeta & { src: string })[];
  effects: (ShaderMeta & { body: string })[];
  disruptors: (ShaderMeta & { body: string })[];
}

const HEADER = /^\/\*(\{[\s\S]*?\})\*\/\n/;
const INCLUDE = /#include\s+"([^"]+)"/g;

export function parseShaderFile(text: string, file: string, libDir: string): { meta: ShaderMeta; glsl: string } {
  const m = text.match(HEADER);
  if (!m) throw new Error(`${file} : en-tête /*{ ... }*/ manquant en début de fichier`);
  const meta = JSON.parse(m[1]!) as ShaderMeta;
  if (typeof meta.name !== "string") throw new Error(`${file} : "name" manquant dans l'en-tête`);
  let glsl = text.slice(m[0].length);
  // L'éditeur ajoute souvent un saut de ligne final : on en retire un seul.
  if (glsl.endsWith("\n")) glsl = glsl.slice(0, -1);
  glsl = glsl.replace(INCLUDE, (_all, inc: string) => {
    const p = path.join(libDir, inc);
    if (!fs.existsSync(p)) throw new Error(`${file} : #include "${inc}" introuvable dans ${libDir}`);
    return fs.readFileSync(p, "utf8");
  });
  return { meta, glsl };
}

export function shaderFilesIn(dir: string): string[] {
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".glsl"))
    .sort()
    .map((f) => path.join(dir, f));
}

function loadKind<K extends string>(root: string, kind: string, bodyKey: K): (ShaderMeta & Record<K, string>)[] {
  const libDir = path.join(root, "lib");
  return shaderFilesIn(path.join(root, kind)).map((file) => {
    const { meta, glsl } = parseShaderFile(fs.readFileSync(file, "utf8"), file, libDir);
    return { ...meta, [bodyKey]: glsl } as ShaderMeta & Record<K, string>;
  });
}

export function loadShaderLibrary(root: string): ShaderLibrary {
  return {
    generators: loadKind(root, "generators", "src"),
    effects: loadKind(root, "effects", "body"),
    disruptors: loadKind(root, "disruptors", "body"),
  };
}

/** Sérialise un shader au format fichier (inverse de parseShaderFile, sans les #include). */
export function formatShaderFile(meta: ShaderMeta, glsl: string): string {
  return `/*${JSON.stringify(meta, null, 2)}*/\n${glsl}\n`;
}
