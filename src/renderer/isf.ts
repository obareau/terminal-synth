/**
 * Parser ISF (Interactive Shader Format) → corps de shader pour notre pipeline.
 * Traduit les globals ISF vers nos uniforms et enveloppe dans vec3 render().
 */

interface IsfInput {
  NAME: string;
  TYPE: "float" | "color" | "bool" | "point2D" | "long" | "image" | "event";
  DEFAULT?: unknown;
  MIN?: number;
  MAX?: number;
}

interface IsfMeta {
  CREDIT?: string;
  DESCRIPTION?: string;
  CATEGORIES?: string[];
  INPUTS?: IsfInput[];
}

export interface IsfShader {
  name: string;
  glsl: string;
  inputs: IsfInput[];
}

export function parseISF(filename: string, source: string): IsfShader | null {
  try {
    // 1. Extraire et parser le JSON header /*{ ... }*/
    const headerMatch = source.match(/\/\*\{([\s\S]*?)\}\*\//);
    const meta: IsfMeta = headerMatch ? JSON.parse("{" + headerMatch[1] + "}") : {};
    const inputs: IsfInput[] = (meta.INPUTS ?? []).filter((i) => i.TYPE !== "image" && i.TYPE !== "event");

    // 2. Retirer le header JSON + directives de version + précision
    let glsl = source
      .replace(/\/\*\{[\s\S]*?\}\*\//, "")
      .replace(/#version\s+\d+(\s+es)?\s*/g, "")
      .replace(/precision\s+(lowp|mediump|highp)\s+float\s*;/g, "");

    // 3. Gérer l'out variable GLSL 300 es style (out vec4 xxx;) avant de remplacer gl_FragColor
    const outVarMatch = glsl.match(/\bout\s+vec4\s+(\w+)\s*;/);
    if (outVarMatch) {
      const outVar = outVarMatch[1]!;
      glsl = glsl.replace(outVarMatch[0], "");
      if (outVar !== "_isf_out") {
        glsl = glsl.replace(new RegExp(`\\b${outVar}\\b`, "g"), "_isf_out");
      }
    }

    // 4. Traduire les globals ISF → nos uniforms
    glsl = glsl
      .replace(/\bisf_FragNormCoord\b/g, "_uv")
      .replace(/\bTIME\b/g, "u_time")
      .replace(/\bTIMEDELTA\b/g, "(1.0/60.0)")
      .replace(/\bRENDERSIZE\b/g, "u_resolution")
      .replace(/\bFRAMEINDEX\b/g, "0")
      .replace(/\btexture2D\b/g, "texture")
      .replace(/\bgl_FragColor\b/g, "_isf_out")
      // ISF 1.0 varying texCoord
      .replace(/varying\s+\w+\s+texCoord\s*;/, "")
      .replace(/\btexCoord\b/g, "_uv");

    // 5. Renommer void main() → void _isf_main()
    glsl = glsl.replace(/\bvoid\s+main\s*\(\s*\)/, "void _isf_main()");

    // 6. Déclarations uniform pour les inputs personnalisés
    const uniformDecls = inputs
      .map((inp) => {
        switch (inp.TYPE) {
          case "float":   return `uniform float ${inp.NAME};`;
          case "bool":    return `uniform bool ${inp.NAME};`;
          case "color":   return `uniform vec4 ${inp.NAME};`;
          case "point2D": return `uniform vec2 ${inp.NAME};`;
          case "long":    return `uniform int ${inp.NAME};`;
          default:        return "";
        }
      })
      .filter(Boolean)
      .join("\n");

    // 7. Déclarer les image inputs comme sampler2D non liés (échantillonnent noir,
    //    mais le shader compile même s'il y fait référence)
    const imageInputs = (meta.INPUTS ?? []).filter((i) => i.TYPE === "image");
    const imageSamplerDecls = imageInputs.map((i) => `uniform sampler2D ${i.NAME};`).join("\n");

    // 8. Constantes ISF prédéfinies + globals partagés avec _isf_main()
    const wrapped = `
#define PI    3.14159265358979323846
#define TWO_PI 6.28318530717958647692
#define HALF_PI 1.5707963267948966192
#define PASSINDEX 0

${uniformDecls}
${imageSamplerDecls}

vec4 _isf_out = vec4(0.0);
vec2 _uv = vec2(0.0);

${glsl}

vec3 render(vec2 uv, vec2 res) {
  _uv = uv;
  _isf_out = vec4(0.0);
  _isf_main();
  return _isf_out.rgb;
}`;

    const name = filename.replace(/\.(fs|frag|glsl)$/i, "");
    console.log(`[ISF] "${name}" traduit → ouvre DevTools (F12) pour voir le GLSL`);
    console.log("[ISF GLSL]\n" + wrapped);
    return { name, glsl: wrapped, inputs };
  } catch (err) {
    console.error("[ISF] parse error:", err);
    return null;
  }
}
