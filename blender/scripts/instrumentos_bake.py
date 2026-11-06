# Depois do instrumentos.py (no mesmo Blender): afasta os 11 (pra um não
# sombrear o outro), põe um chão (a sombra de contato no pé), assa a oclusão
# (Cycles, AO) na cor dos vértices, multiplica pela cor de cada peça, junta uma
# malha por material em cada instrumento (djembe_madeira, djembe_couro, ...),
# pendura no nó do instrumento (origem na base) e exporta o .glb bruto.
# Sem decimate: a contagem já sai certa da modelagem (e as estampas por face
# ficam intactas). Depois, no repo:
#   npx @gltf-transform/cli optimize bruto.glb public/models/instrumentos.glb \
#     --compress meshopt --simplify false --join false --flatten false --instance false --palette false

import bpy, sys

SAIDA = "/Users/lu2ca/cidade-neon-blend-inst/blender/exports/instrumentos-bruto.glb"
if "--" in sys.argv and len(sys.argv) > sys.argv.index("--") + 1:
    SAIDA = sys.argv[sys.argv.index("--") + 1]

IDS = ["djembe", "tambor-agua", "udu", "caxixi", "sitar", "didgeridoo",
       "berimbau", "flauta-bambu", "ocarina", "handpan", "kalimba"]
COL = bpy.data.collections["Instrumentos"]
pecas = [o for o in COL.objects if o.type == "MESH"]
PASSO = 2.0
for o in pecas:
    o.location = (IDS.index(o["inst"]) * PASSO, 0, 0)
    ao = o.data.color_attributes.new("AO", "FLOAT_COLOR", "CORNER")
    o.data.color_attributes.active_color = ao

# o chão (só pra sombra; não vai pro arquivo)
me = bpy.data.meshes.new("chao_bake")
me.from_pydata([(-2, -2, -0.0004), (PASSO * len(IDS), -2, -0.0004), (PASSO * len(IDS), 2, -0.0004), (-2, 2, -0.0004)], [], [(0, 1, 2, 3)])
chao = bpy.data.objects.new("chao_bake", me)
bpy.context.scene.collection.objects.link(chao)

sc = bpy.context.scene
sc.render.engine = "CYCLES"
sc.cycles.samples = 64
if sc.world is None:
    sc.world = bpy.data.worlds.new("Mundo")
sc.world.light_settings.distance = 0.07
vl = bpy.context.view_layer
vl.update()
for o in bpy.context.scene.objects:
    o.select_set(False)
for o in pecas:
    o.select_set(True)
vl.objects.active = pecas[0]
print(bpy.ops.object.bake(type="AO", target="VERTEX_COLORS"))
bpy.data.objects.remove(chao, do_unlink=True)

for o in pecas:
    me = o.data
    base = me.color_attributes["Base"]
    ao = me.color_attributes["AO"]
    col = me.color_attributes.new("Col", "FLOAT_COLOR", "CORNER")
    for i in range(len(col.data)):
        a = 0.2 + 0.8 * ao.data[i].color[0]
        b = base.data[i].color
        col.data[i].color = (b[0] * a, b[1] * a, b[2] * a, 1.0)
    me.color_attributes.remove(me.color_attributes["Base"])
    me.color_attributes.remove(me.color_attributes["AO"])
    me.color_attributes.active_color = me.color_attributes["Col"]
    me.color_attributes.render_color_index = me.color_attributes.active_color_index

# uma malha por (instrumento, grupo), pendurada no nó do instrumento
grupos = {}
for o in pecas:
    grupos.setdefault((o["inst"], o["grupo"]), []).append(o)
nos = {}
for inst in IDS:
    e = bpy.data.objects.new(inst, None)
    e.empty_display_size = 0.1
    COL.objects.link(e)
    nos[inst] = e
for (inst, g), obs in grupos.items():
    for o in bpy.context.scene.objects:
        o.select_set(False)
    for o in obs:
        o.select_set(True)
    vl.objects.active = obs[0]
    if len(obs) > 1:
        bpy.ops.object.join()
    j = vl.objects.active
    j.name = f"{inst}_{g}"
    j.data.name = f"{inst}_{g}"
    j.location = (0, 0, 0)
    j.parent = nos[inst]
    mat = bpy.data.materials["inst_" + g]
    j.data.materials.clear()
    j.data.materials.append(mat)

for o in bpy.context.scene.objects:
    o.select_set(False)
for o in COL.objects:
    o.select_set(True)
vl.objects.active = nos[IDS[0]]
print(bpy.ops.export_scene.gltf(filepath=SAIDA, export_format="GLB", use_selection=True, export_texcoords=False,
      export_normals=True, export_materials="EXPORT", export_yup=True, export_apply=True, export_vertex_color="ACTIVE"))
tot = {}
for o in COL.objects:
    if o.type == "MESH":
        tot[o.parent.name] = tot.get(o.parent.name, 0) + sum(len(p.vertices) - 2 for p in o.data.polygons)
for k in IDS:
    print("BAKE", k, tot.get(k, 0), [c.name for c in nos[k].children])
print("BAKE total", sum(tot.values()))
