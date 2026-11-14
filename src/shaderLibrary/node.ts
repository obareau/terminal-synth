// Version Node du module "virtual:shader-library" (utilisée par Jest via moduleNameMapper).
import * as path from "node:path";
import { loadShaderLibrary } from "./library";

export default loadShaderLibrary(path.join(__dirname, "../../shaders"));
