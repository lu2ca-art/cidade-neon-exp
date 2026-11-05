// A van (só a /van-preview usa) pro orçamento: 6 → 4 texturas. As rodas perdem
// o mapa de normal e o de metal/rugosidade (a roda é pequena: fica a cor, com
// rugosidade e metal fixos); o resto vai pra 1024 webp + meshopt no optimize:
//   GT=~/.npm/_npx/<hash>/node_modules node blender/scripts/van_orcamento.mjs public/models/van.glb blender/cenas/van-a.glb
//   npx @gltf-transform/cli optimize blender/cenas/van-a.glb public/models/van.glb \
//     --compress meshopt --simplify false --texture-compress webp --texture-size 1024
import { createRequire } from "node:module"
import { join } from "node:path"
const req = createRequire(join(process.env.GT, "x.js"))
const { NodeIO } = req("@gltf-transform/core")
const { ALL_EXTENSIONS } = req("@gltf-transform/extensions")
const { prune } = req("@gltf-transform/functions")
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
const doc = await io.read(process.argv[2])
for (const m of doc.getRoot().listMaterials()) {
  if (m.getName() !== "Wheels") continue
  m.setNormalTexture(null)
  m.setMetallicRoughnessTexture(null)
  m.setRoughnessFactor(0.55)
  m.setMetallicFactor(0.4)
}
await doc.transform(prune())
await io.write(process.argv[3], doc)
console.log("texturas", doc.getRoot().listTextures().length)
