import * as esbuild from "esbuild";
import * as fs from "node:fs";

const production = process.argv.includes("--production");
const common = {
  bundle: true,
  sourcemap: !production,
  minify: production,
  logLevel: "info" as const,
};

async function main(): Promise<void> {
  // Processus principal Electron (Node / CommonJS).
  await esbuild.build({
    ...common,
    entryPoints: ["src/main.ts"],
    outfile: "dist/main.js",
    platform: "node",
    format: "cjs",
    external: ["electron"],
  });

  // Renderer (navigateur : WebGL2 / Web Audio / Web MIDI).
  await esbuild.build({
    ...common,
    entryPoints: ["src/renderer/renderer.ts"],
    outfile: "dist/renderer.js",
    platform: "browser",
    format: "iife",
  });

  fs.mkdirSync("dist", { recursive: true });
  fs.copyFileSync("src/renderer/index.html", "dist/index.html");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
