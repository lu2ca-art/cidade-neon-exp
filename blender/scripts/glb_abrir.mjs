// Desfaz o meshopt e a quantização de um .glb (o importador do Blender não lê
// EXT_meshopt_compression). Usa o @gltf-transform do cache do npx:
//   GT=~/.npm/_npx/<hash>/node_modules node blender/scripts/glb_abrir.mjs in.glb out.glb
import { createRequire } from "node:module"
import { join } from "node:path"
const req = createRequire(join(process.env.GT, "x.js"))
const { NodeIO } = req("@gltf-transform/core")
const { ALL_EXTENSIONS } = req("@gltf-transform/extensions")
const { dequantize } = req("@gltf-transform/functions")
const { MeshoptDecoder } = req("meshoptimizer")
await MeshoptDecoder.ready
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.decoder": MeshoptDecoder })
const doc = await io.read(process.argv[2])
await doc.transform(dequantize())
for (const e of doc.getRoot().listExtensionsUsed()) {
  if (e.extensionName === "EXT_meshopt_compression" || e.extensionName === "KHR_mesh_quantization") e.dispose()
}
await io.write(process.argv[3], doc)
console.log("ok", process.argv[3])
