// Module fourni au build par le plugin esbuild (build.ts) et, sous Jest, par node.ts.
declare module "virtual:shader-library" {
  const library: import("./library").ShaderLibrary;
  export default library;
}
