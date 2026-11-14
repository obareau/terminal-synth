// Compile chaque fichier .metal passé en argument avec le pilote Metal du Mac
// (MTLDevice.makeLibrary(source:)) — même compilateur qu'au runtime, sans Xcode.
// Sortie : une ligne JSON par fichier {"file", "ok", "error"}.
import Foundation
import Metal

guard let device = MTLCreateSystemDefaultDevice() else {
  FileHandle.standardError.write("Aucun GPU Metal disponible\n".data(using: .utf8)!)
  exit(2)
}
let options = MTLCompileOptions()
options.languageVersion = .version2_4

for path in CommandLine.arguments.dropFirst() {
  var entry: [String: Any] = ["file": path, "ok": false]
  do {
    let source = try String(contentsOfFile: path, encoding: .utf8)
    let library = try device.makeLibrary(source: source, options: options)
    if library.makeFunction(name: "main0") == nil {
      entry["error"] = "fonction de fragment main0 absente"
    } else {
      entry["ok"] = true
    }
  } catch {
    entry["error"] = "\(error)"
  }
  let data = try! JSONSerialization.data(withJSONObject: entry)
  print(String(data: data, encoding: .utf8)!)
}
