import * as esbuild from "esbuild";
import * as fs from "node:fs";
import { execSync } from "node:child_process";

const production = process.argv.includes("--production");
const common = {
  bundle: true,
  sourcemap: !production,
  minify: production,
  logLevel: "info" as const,
};

const pkgVersion = JSON.parse(fs.readFileSync("package.json", "utf8")).version as string;
let buildHash = "dev";
try {
  buildHash = execSync("git rev-parse --short HEAD").toString().trim();
} catch {
  // pas de repo git disponible (ex: build depuis un tarball release) — garde "dev"
}
const versionDefines = {
  __APP_VERSION__: JSON.stringify(pkgVersion),
  __BUILD_HASH__: JSON.stringify(buildHash),
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

  // Preload (pont sécurisé renderer ↔ main).
  await esbuild.build({
    ...common,
    entryPoints: ["src/preload.ts"],
    outfile: "dist/preload.js",
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
    define: versionDefines,
  });

  fs.mkdirSync("dist", { recursive: true });
  fs.copyFileSync("src/renderer/index.html", "dist/index.html");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
