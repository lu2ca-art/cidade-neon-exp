# A PLANTA DA ELLA (09/11, ep. 7), o glb com as duas versões (a geometria em
# planta_ella_kit.py):
#   planta_casa   a detalhada: dentro da casa dela             ≤ 2000 tri (a copa de antes: 2112)
#   planta_leve   pra instanciar aos milhares (como os tufos do mundo depois) ≤ 300 tri
#
#   blender -b --factory-startup --python blender/scripts/planta_ella.py -- bruto.glb
#   blender -b --factory-startup --python blender/scripts/planta_ella_foto.py -- bruto.glb docs/blender/planta-ella.png
#   npx @gltf-transform/cli optimize bruto.glb public/models/planta-ella.glb \
#     --compress meshopt --simplify false --join false --flatten false --instance false --palette false
#
# Coordenadas: Blender Z pra cima, metros. A origem é o pé da planta, no chão; a
# planta tem 1,5 m de altura. Uma malha por versão, a mesma receita do
# mundo_depois.py pra instanciar igual a ele: <id>_solido (cor no vértice x AO
# assada x luz falsa, gravada x4: o jogo usa cor 0,25), sem normais (MeshBasic,
# dos dois lados). Um desenho por versão: instanciar a leve custa 1 draw call.

import bpy, math, os, sys
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import planta_ella_kit as kit

args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
SAIDA = args[0] if args else "/tmp/planta-ella-bruto.glb"
IDS = ["planta_casa", "planta_leve"]
LUGAR = {"planta_casa": 0.0, "planta_leve": 3.0}
TETO = {"planta_casa": 2000, "planta_leve": 300}
GANHO = 4.0
H = 1.5

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
COL = bpy.data.collections.new("PlantaElla")
sc.collection.children.link(COL)

mat = bpy.data.materials.new("planta_solido")
try:
    mat.use_nodes = True
except Exception:
    pass
b = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
a = mat.node_tree.nodes.new("ShaderNodeVertexColor")
a.layer_name = "Col"
mat.node_tree.links.new(a.outputs["Color"], b.inputs["Base Color"])
b.inputs["Roughness"].default_value = 0.7

objs = []
for pid in IDS:
    V, C, F = [], [], []

    def saida(P, Cc, Fc):
        base = len(V)
        V.extend(P)
        C.extend(Cc)
        F.extend([tuple(base + i for i in f) for f in Fc])

    kit.planta(saida, "casa" if pid == "planta_casa" else "leve", seed=3, H=H)
    tris = sum(len(f) - 2 for f in F)
    print("TRI", pid, tris)
    if tris > TETO[pid]:
        raise SystemExit(f"{pid} passou do orçamento: {tris} > {TETO[pid]}")

    e = bpy.data.objects.new(pid, None)
    COL.objects.link(e)
    e.location = (LUGAR[pid], 0, 0)
    me = bpy.data.meshes.new(f"{pid}_solido")
    me.from_pydata([tuple(v) for v in V], [], F)
    me.polygons.foreach_set("use_smooth", [True] * len(me.polygons))
    me.update()
    at = me.color_attributes.new("Base", "FLOAT_COLOR", "CORNER")
    vi = [0] * len(me.loops)
    me.loops.foreach_get("vertex_index", vi)
    at.data.foreach_set("color", [x for i in vi for x in (C[i].x, C[i].y, C[i].z, 1.0)])
    o = bpy.data.objects.new(f"{pid}_solido", me)
    COL.objects.link(o)
    o.parent = e
    me.materials.append(mat)
    objs.append(o)

vl = bpy.context.view_layer
vl.update()

# ── a AO assada: as folhas de cima sombreiam as de baixo ──
for o in objs:
    ao = o.data.color_attributes.new("AO", "FLOAT_COLOR", "CORNER")
    o.data.color_attributes.active_color = ao
try:
    sc.render.engine = "CYCLES"
except TypeError as e:
    print("engine", e)
sc.cycles.samples = 96
try:
    pr = bpy.context.preferences.addons["cycles"].preferences
    pr.compute_device_type = "METAL"
    pr.get_devices()
    for d in pr.devices:
        d.use = True
    sc.cycles.device = "GPU"
except Exception as e:
    print("gpu", e)
if sc.world is None:
    sc.world = bpy.data.worlds.new("Mundo")
sc.world.light_settings.distance = 0.55
vl.update()
for x in sc.objects:
    x.select_set(False)
for o in objs:
    o.select_set(True)
vl.objects.active = objs[0]
print("BAKE", bpy.ops.object.bake(type="AO", target="VERTEX_COLORS"))

for o in objs:
    me = o.data
    n = len(me.color_attributes["Base"].data)
    bc, ac = [0.0] * (n * 4), [0.0] * (n * 4)
    me.color_attributes["Base"].data.foreach_get("color", bc)
    me.color_attributes["AO"].data.foreach_get("color", ac)
    vi = [0] * n
    me.loops.foreach_get("vertex_index", vi)
    for i in range(n):
        z = me.vertices[vi[i]].co.z / H
        a = (0.3 + 0.7 * ac[i * 4]) * (0.72 + 0.42 * z) * GANHO   # a AO, a luz falsa de cima e o ganho
        for c in range(3):
            bc[i * 4 + c] = min(1.0, bc[i * 4 + c] * a)
    me.color_attributes.remove(me.color_attributes["AO"])
    me.color_attributes.remove(me.color_attributes["Base"])
    col = me.color_attributes.new("Col", "FLOAT_COLOR", "CORNER")
    col.data.foreach_set("color", bc)
    me.color_attributes.active_color = col
    me.color_attributes.render_color_index = me.color_attributes.active_color_index

# ── exporta (os nós na origem) ──
for pid in IDS:
    bpy.data.objects[pid].location = (0, 0, 0)
vl.update()
for x in sc.objects:
    x.select_set(False)
for x in COL.objects:
    x.select_set(True)
vl.objects.active = bpy.data.objects[IDS[0]]
print(bpy.ops.export_scene.gltf(filepath=SAIDA, export_format="GLB", use_selection=True, export_texcoords=False,
      export_normals=False, export_materials="EXPORT", export_yup=True, export_apply=True, export_vertex_color="ACTIVE"))
