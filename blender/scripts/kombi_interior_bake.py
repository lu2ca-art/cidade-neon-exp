# Depois do kombi_interior.py: copia a coleção KombiInterior pra KombiBake
# (modificadores aplicados), subdivide as arestas longas (a sombra precisa de
# vértice), assa a oclusão (Cycles, AO) na cor dos vértices, multiplica pela
# cor de cada peça, simplifica o que não é estampado, junta uma malha por
# grupo e exporta. Depois, no repo:
#   npx @gltf-transform/cli optimize bruto.glb public/models/kombi-interior.glb \
#     --compress meshopt --simplify false --join false --instance false --flatten false

# Headless (os dois scripts no mesmo Blender):
#   blender -b --factory-startup --python blender/scripts/kombi_interior.py \
#     --python blender/scripts/kombi_interior_bake.py -- blender/cenas/kombi-interior-bruto.glb

import bpy, bmesh, sys
from mathutils import Color

SAIDA = "/Users/lu2ca/cidade-neon-exp-disco/blender/exports/kombi-interior-bruto.glb"
if "--" in sys.argv and len(sys.argv) > sys.argv.index("--") + 1:
    SAIDA = sys.argv[sys.argv.index("--") + 1]

def lin(h):
    c = Color((int(h[1:3], 16) / 255, int(h[3:5], 16) / 255, int(h[5:7], 16) / 255))
    c = c.from_srgb_to_scene_linear()
    return (c.r, c.g, c.b, 1.0)

SRC = bpy.data.collections["KombiInterior"]
old = bpy.data.collections.get("KombiBake")
if old:
    for o in list(old.all_objects):
        bpy.data.objects.remove(o, do_unlink=True)
    bpy.data.collections.remove(old)
for m in list(bpy.data.meshes):
    if m.users == 0:
        bpy.data.meshes.remove(m)
BK = bpy.data.collections.new("KombiBake")
bpy.context.scene.collection.children.link(BK)
SRC.hide_viewport = False
dg = bpy.context.evaluated_depsgraph_get()
novos = []
for o in SRC.objects:
    me = bpy.data.meshes.new_from_object(o.evaluated_get(dg))
    me.transform(o.matrix_world)
    n = bpy.data.objects.new("b_" + o.name, me)
    n["grupo"] = o["grupo"]
    n["estampa"] = 1 if "cor_por_face" in o.keys() else 0
    BK.objects.link(n)
    at = me.color_attributes.get("Base")
    if at is None:
        at = me.color_attributes.new("Base", "FLOAT_COLOR", "CORNER")
        c = lin(o["cor"])
        for d in at.data:
            d.color = c
    if not n["estampa"]:
        bm = bmesh.new()
        bm.from_mesh(me)
        for passo in range(4):
            longas = [e for e in bm.edges if e.calc_length() > 0.2]
            if not longas:
                break
            bmesh.ops.subdivide_edges(bm, edges=longas, cuts=1, use_grid_fill=True)
        bm.to_mesh(me)
        bm.free()
    ao = me.color_attributes.new("AO", "FLOAT_COLOR", "CORNER")
    me.color_attributes.active_color = ao
    novos.append(n)
SRC.hide_viewport = True
SRC.hide_render = True  # senão a cópia original, no mesmo lugar, tapa a sombra (fica tudo escuro e com ruído)

sc = bpy.context.scene
sc.render.engine = "CYCLES"
sc.cycles.device = "GPU"
sc.cycles.samples = 48
if sc.world is None:
    sc.world = bpy.data.worlds.new("Mundo")
sc.world.light_settings.distance = 0.35
vl = bpy.context.view_layer
for o in vl.objects:
    o.select_set(False)
for o in novos:
    o.select_set(True)
vl.objects.active = novos[0]
print(bpy.ops.object.bake(type="AO", target="VERTEX_COLORS"))

ALVO = 24000  # triângulos no arquivo final

def marca_costura_de_cor(me, base):
    # estampa: aresta entre faces de cor diferente vira costura (o dissolve
    # planar não cruza costura, então o desenho fica igual)
    cor_face = [tuple(round(c, 4) for c in base.data[p.loop_start].color[:3]) for p in me.polygons]
    for e in me.edges:
        e.use_seam = False
    face_da_aresta = {}
    for p in me.polygons:
        for k in p.edge_keys:
            face_da_aresta.setdefault(k, []).append(p.index)
    for e in me.edges:
        fs = face_da_aresta.get(e.key, [])
        if len(fs) == 2 and cor_face[fs[0]] != cor_face[fs[1]]:
            e.use_seam = True

grupos = {}
tri_obj = {}
for o in novos:
    me = o.data
    g = o["grupo"]
    base = me.color_attributes["Base"]
    ao = me.color_attributes["AO"]
    if o["estampa"]:
        marca_costura_de_cor(me, base)
    col = me.color_attributes.new("Col", "FLOAT_COLOR", "CORNER")
    for i in range(len(col.data)):
        a = ao.data[i].color[0]
        b = base.data[i].color
        if g == "brilho":
            col.data[i].color = (b[0], b[1], b[2], 1.0)
        elif g == "lata":
            col.data[i].color = (a, a, a, 1.0)
        else:
            col.data[i].color = (b[0] * a, b[1] * a, b[2] * a, 1.0)
    me.color_attributes.remove(me.color_attributes["Base"])
    me.color_attributes.remove(me.color_attributes["AO"])
    me.color_attributes.active_color = me.color_attributes["Col"]
    me.color_attributes.render_color_index = me.color_attributes.active_color_index
    if o["estampa"]:
        # só dissolve planar, dentro de cada quadrado/listra
        bm = bmesh.new()
        bm.from_mesh(me)
        bmesh.ops.dissolve_limit(bm, angle_limit=0.035, use_dissolve_boundaries=False,
                                 verts=bm.verts, edges=bm.edges, delimit={"SEAM"})
        bmesh.ops.triangulate(bm, faces=bm.faces)
        bm.to_mesh(me)
        bm.free()
    ntri = sum(len(p.vertices) - 2 for p in me.polygons)
    tri_obj[o.name] = ntri
    print("PECA", o.name, g, o["estampa"], ntri)
    grupos.setdefault(g, []).append(o)

# as lisas (sem estampa) dividem o que sobra do alvo: uma razão só, com piso
fixo = sum(t for o in novos for t in [tri_obj[o.name]] if o["estampa"] or t <= 60)
livre = sum(t for o in novos for t in [tri_obj[o.name]] if not o["estampa"] and t > 60)
razao = max(0.05, min(1.0, (ALVO - fixo) / max(livre, 1)))
print("RAZAO", round(razao, 3), "fixo", fixo, "livre", livre)
for o in novos:
    t = tri_obj[o.name]
    if o["estampa"] or t <= 60 or razao >= 0.98:
        continue
    m = o.modifiers.new("dec", "DECIMATE")
    m.ratio = max(razao, 48 / t)

for g, obs in grupos.items():
    for o in vl.objects:
        o.select_set(False)
    for o in obs:
        if o.modifiers:
            vl.objects.active = o
            bpy.ops.object.modifier_apply(modifier="dec")
        o.select_set(True)
    vl.objects.active = obs[0]
    bpy.ops.object.join()
    j = vl.objects.active
    j.name = g
    j.data.name = g
    j.data.materials.clear()
    m = bpy.data.materials.get("kexp_" + g) or bpy.data.materials.new("kexp_" + g)
    j.data.materials.append(m)

for o in vl.objects:
    o.select_set(False)
for o in BK.objects:
    o.select_set(True)
vl.objects.active = BK.objects[0]
print(bpy.ops.export_scene.gltf(filepath=SAIDA, export_format="GLB", use_selection=True, export_texcoords=False,
      export_normals=True, export_materials="EXPORT", export_yup=True, export_apply=True, export_vertex_color="ACTIVE"))
tot = 0
for o in BK.objects:
    tot += sum(len(p.vertices) - 2 for p in o.data.polygons)
print("triângulos", tot)
