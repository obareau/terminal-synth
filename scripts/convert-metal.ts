/**
 * Conversion de tous les shaders de shaders/ en Metal (MSL), puis validation par
 * le pilote Metal du Mac.
 *
 *   GLSL (assemblé comme dans gl.ts) → glslang → SPIR-V → spirv-cross → .metal
 *   .metal → scripts/metal-validate.swift (MTLDevice.makeLibrary)
 *
 * Prérequis : brew install glslang spirv-cross   (+ swiftc des Command Line Tools)
 * Usage     : npm run metal:convert
 * Sorties   : out/metal/msl/<type>/<nom>.metal  et  docs/metal-conversion.md
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { spawnSync } from "node:child_process";
import { loadShaderLibrary, shaderFilesIn } from "../src/shaderLibrary/library";
import { wrapGenerator, wrapEffect } from "../src/shaderLibrary/glslWrap";

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "out/metal");
const REPORT = path.join(ROOT, "docs/metal-conversion.md");

// Index fixes des textures côté Metal ([[texture(n)]] / [[sampler(n)]]), identiques
// pour tous les shaders, pour que le pipeline Metal les lie toujours au même endroit.
// Le buffer 0 contient la struct Uniforms.
export const TEXTURE_SLOTS: Record<string, number> = {
  u_audio: 0, u_text: 1, u_fbmTex: 2, u_media: 3, // générateurs
  u_prev: 0, u_feedback: 1,                       // effets et perturbateurs
};

function pinTextureSlots(glsl: string): string {
  return glsl.replace(/^uniform sampler2D (\w+);/gm, (line, name: string) => {
    const slot = TEXTURE_SLOTS[name];
    if (slot === undefined) throw new Error(`texture ${name} sans index Metal dans TEXTURE_SLOTS`);
    return `layout(binding = ${slot}) ${line}`;
  });
}

type Stage ="glslang" | "spirv-cross" | "metal" | "ok";
interface Result { kind: string; file: string; name: string; stage: Stage; error?: string; }

function need(tool: string): void {
  if (spawnSync("which", [tool]).status !== 0) {
    console.error(`${tool} introuvable — brew install glslang spirv-cross`);
    process.exit(1);
  }
}

function firstError(text: string): string {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const hit = lines.find((l) => /error/i.test(l) && !/compilation errors|No code generated|not generated/i.test(l));
  return (hit ?? lines[0] ?? "erreur inconnue").slice(0, 220);
}

function main(): void {
  need("glslang");
  need("spirv-cross");
  fs.rmSync(OUT, { recursive: true, force: true });

  const validator = path.join(OUT, "metal-validate");
  fs.mkdirSync(OUT, { recursive: true });
  const sc = spawnSync("swiftc", ["-O", path.join(ROOT, "scripts/metal-validate.swift"), "-o", validator], { encoding: "utf8" });
  if (sc.status !== 0) { console.error(sc.stderr); process.exit(1); }

  const lib = loadShaderLibrary(path.join(ROOT, "shaders"));
  const kinds = [
    { kind: "generators", items: lib.generators.map((g) => ({ name: g.name, body: g.src })), wrap: wrapGenerator },
    { kind: "effects", items: lib.effects.map((e) => ({ name: e.name, body: e.body })), wrap: wrapEffect },
    { kind: "disruptors", items: lib.disruptors.map((d) => ({ name: d.name, body: d.body })), wrap: wrapEffect },
  ];

  const results: Result[] = [];
  const toValidate = new Map<string, Result>();

  for (const { kind, items, wrap } of kinds) {
    const files = shaderFilesIn(path.join(ROOT, "shaders", kind));
    for (const sub of ["glsl", "spv", "msl"]) fs.mkdirSync(path.join(OUT, sub, kind), { recursive: true });
    items.forEach((item, i) => {
      const base = path.basename(files[i]!, ".glsl");
      const r: Result = { kind, file: base, name: item.name, stage: "glslang" };
      results.push(r);
      // Vulkan SPIR-V exige ES 3.10 minimum ; 3.10 est un sur-ensemble de 3.00 pour ces shaders.
      const glsl = pinTextureSlots(wrap(item.body).source.replace(/^#version 300 es/, "#version 310 es"));
      const frag = path.join(OUT, "glsl", kind, base + ".frag");
      const spv = path.join(OUT, "spv", kind, base + ".spv");
      const msl = path.join(OUT, "msl", kind, base + ".metal");
      fs.writeFileSync(frag, glsl);

      const g = spawnSync("glslang", ["-V", "-R", "--amb", "--aml", "--sdub", "Uniforms", "0", "0", "-S", "frag", "-o", spv, frag], { encoding: "utf8" });
      if (g.status !== 0) { r.error = firstError(g.stdout + g.stderr); return; }
      r.stage = "spirv-cross";
      const x = spawnSync("spirv-cross", [spv, "--msl", "--msl-version", "20100", "--msl-decoration-binding", "--output", msl], { encoding: "utf8" });
      if (x.status !== 0) { r.error = firstError(x.stdout + x.stderr); return; }
      r.stage = "metal";
      toValidate.set(msl, r);
    });
  }

  const files = [...toValidate.keys()];
  const v = spawnSync(validator, files, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (v.status !== 0) { console.error(v.stderr); process.exit(1); }
  for (const line of v.stdout.split("\n").filter(Boolean)) {
    const { file, ok, error } = JSON.parse(line) as { file: string; ok: boolean; error?: string };
    const r = toValidate.get(file)!;
    if (ok) r.stage = "ok"; else r.error = firstError(error ?? "");
  }

  writeReport(results);
}

function writeReport(results: Result[]): void {
  const kinds = ["generators", "effects", "disruptors"];
  const label: Record<string, string> = { generators: "Générateurs", effects: "Effets", disruptors: "Perturbateurs" };
  const stageLabel: Record<Stage, string> = { glslang: "GLSL → SPIR-V", "spirv-cross": "SPIR-V → MSL", metal: "compilation Metal", ok: "ok" };
  const count = (k: string, s?: Stage) => results.filter((r) => r.kind === k && (!s || r.stage === s)).length;
  const okTotal = results.filter((r) => r.stage === "ok").length;

  let md = `# Conversion des shaders vers Metal\n\n`;
  md += `Généré par \`npm run metal:convert\` — ne pas éditer à la main.\n\n`;
  md += `Chaîne : GLSL assemblé comme dans \`gl.ts\` → glslang → SPIR-V → spirv-cross → MSL 2.1, `;
  md += `puis compilation par le pilote Metal du Mac (\`scripts/metal-validate.swift\`).\n\n`;
  md += `**${okTotal} / ${results.length} shaders passent sans retouche.**\n\n`;
  md += `| | Total | OK | Échec GLSL → SPIR-V | Échec SPIR-V → MSL | Échec compilation Metal |\n|---|---|---|---|---|---|\n`;
  for (const k of kinds) {
    md += `| ${label[k]} | ${count(k)} | ${count(k, "ok")} | ${count(k, "glslang")} | ${count(k, "spirv-cross")} | ${count(k, "metal")} |\n`;
  }
  const failed = results.filter((r) => r.stage !== "ok");
  md += `\n## Shaders à retoucher\n\n`;
  if (!failed.length) md += `Aucun.\n`;
  else {
    md += `| Fichier | Nom | Étape | Première erreur |\n|---|---|---|---|\n`;
    for (const r of failed) {
      md += `| \`${r.kind}/${r.file}.glsl\` | ${r.name} | ${stageLabel[r.stage]} | ${(r.error ?? "").replace(/\|/g, "\\|")} |\n`;
    }
  }
  md += `\n## À savoir pour le port Metal\n\n`;
  md += `- Les uniforms sont regroupés dans une struct \`Uniforms\` (\`[[buffer(0)]]\`).\n`;
  md += `- Textures et samplers ont des index fixes pour tous les shaders (\`TEXTURE_SLOTS\` dans \`scripts/convert-metal.ts\`) : `;
  md += Object.entries(TEXTURE_SLOTS).map(([n, s]) => `\`${n}\` → ${s}`).join(", ") + ".\n";
  md += `- \`gl_FragCoord\` a son origine en bas à gauche en OpenGL, en haut à gauche en Metal : le pipeline Metal doit retourner l'axe Y (ou passer \`uv.y = 1 - uv.y\`).\n`;
  md += `- La compilation valide la syntaxe et les types, pas le rendu : un shader « ok » peut encore différer visuellement.\n`;
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, md);

  console.log(`${okTotal} / ${results.length} shaders convertis et compilés par Metal`);
  for (const k of kinds) console.log(`  ${label[k]} : ${count(k, "ok")} / ${count(k)}`);
  console.log(`Rapport : ${path.relative(ROOT, REPORT)}`);
}

main();
