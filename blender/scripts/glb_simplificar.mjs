// Simplifica as malhas de um .glb com o meshoptimizer (respeita costura de UV:
// o vértice da costura só anda junto com o par). Só pra peça SEM estampa por face.
//   GT=~/.npm/_npx/<hash>/node_modules [SEM_NORMAL=1] [ERRO_M=0.05] node blender/scripts/glb_simplificar.mjs \
//     in.glb out.glb <razão> <erro> [nomes a pular, vírgula]
import { createRequire } from "node:module"
import { join } from "node:path"
const req = createRequire(join(process.env.GT, "x.js"))
const { NodeIO } = req("@gltf-transform/core")
const { ALL_EXTENSIONS } = req("@gltf-transform/extensions")
const { weld, simplifyPrimitive } = req("@gltf-transform/functions")
const { MeshoptSimplifier, MeshoptDecoder } = req("meshoptimizer")
await MeshoptSimplifier.ready
await MeshoptDecoder.ready
const [, , ent, sai, razao = "0.25", erro = "0.02", pular = ""] = process.argv
const pula = new Set(pular.split(",").filter(Boolean))
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.decoder": MeshoptDecoder })
const doc = await io.read(ent)
// sem a normal (as caixas têm normal reta: cada quina vira costura e o
// simplificador trava); o Blender refaz a normal depois (suave por ângulo)
if (process.env.SEM_NORMAL) for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) p.setAttribute("NORMAL", null)
await doc.transform(weld())
const conta = () => doc.getRoot().listMeshes().reduce((s, m) => s + m.listPrimitives().reduce((a, p) => a + (p.getIndices()?.getCount() ?? p.getAttribute("POSITION").getCount()) / 3, 0), 0)
console.log("antes", conta())
const tri = (m) => m.listPrimitives().reduce((a, p) => a + (p.getIndices()?.getCount() ?? 0) / 3, 0)
for (const m of doc.getRoot().listMeshes()) {
  if (pula.has(m.getName())) continue
  const t0 = tri(m)
  for (const p of m.listPrimitives()) {
    // ERRO_M: o erro em metros (o meshoptimizer mede em fração do tamanho da
    // malha; nas malhas espalhadas pelo bairro inteiro 0,5% já é 1 m)
    let e = Number(erro)
    if (process.env.ERRO_M) {
      const pos = p.getAttribute("POSITION")
      const mn = pos.getMin([]), mx = pos.getMax([])
      const raio = Math.hypot(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]) / 2
      e = Math.min(Number(erro), Number(process.env.ERRO_M) / Math.max(raio, 1e-6))
    }
    simplifyPrimitive(p, { simplifier: MeshoptSimplifier, ratio: Number(razao), error: e, lockBorder: false })
  }
  if (process.env.DETALHE) console.log("MALHA", m.getName(), t0, tri(m))
}
console.log("depois", conta())
await io.write(sai, doc)
