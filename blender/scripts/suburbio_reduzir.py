# O subúrbio (CITY SUBURBS, isabm, CC-BY) pro orçamento: ≤40 mil triângulos,
# ≤1,5 MB, ≤4 texturas. Etapa A (Blender, headless). A receita inteira:
#
#   GT=~/.npm/_npx/<hash>/node_modules   (o @gltf-transform do cache do npx)
#   GT=$GT node blender/scripts/glb_abrir.mjs public/models/suburbio.glb blender/cenas/suburbio-aberto.glb
#   blender -b --factory-startup --python blender/scripts/suburbio_reduzir.py -- \
#     blender/cenas/suburbio-aberto.glb blender/cenas/suburbio-a.glb [antes.png]
#   GT=$GT SEM_NORMAL=1 node blender/scripts/glb_simplificar.mjs blender/cenas/suburbio-a.glb \
#     blender/cenas/suburbio-b.glb <razão> <erro> "$(cat blender/cenas/suburbio-pular.txt)"
#   blender -b --factory-startup --python blender/scripts/suburbio_final.py -- \
#     blender/cenas/suburbio-b.glb blender/cenas/suburbio-bruto.glb [depois.png]
#   npx @gltf-transform/cli optimize blender/cenas/suburbio-bruto.glb public/models/suburbio.glb \
#     --compress meshopt --simplify false --join false --instance false --texture-compress webp --texture-size 1024
#
# O que a etapa A faz (Blender Z pra cima; o exportador volta pro Y do jogo):
#  1. as casas (101 prédios) são só 13 modelos repetidos, girados de 90 em 90
#     graus: acha os repetidos, faz UMA versão leve de cada modelo (um mapa de
#     altura de 0,5 m: o volume do prédio, com os degraus e a mureta do
#     telhado) e assa a fachada original nela (Cycles, cor difusa, uma
#     textura de 1024). As cópias viram instâncias da versão leve, no mesmo
#     lugar e giro. Janela, sacada e marquise viram desenho na textura.
#  2. o resto (chão, ruas, placas, postes, o mural): junta vértices repetidos,
#     apaga degenerado, o fundo colado no chão e o pedaço solto pequeno que
#     não acende (a textura de emissão diz o que é neon), dissolve planar sem
#     cruzar costura de UV. A simplificação fina fica pro meshoptimizer
#     (glb_simplificar.mjs), que respeita a costura de UV.
#  3. o vidro das janelas (cristal) sai: ficava dentro da janela funda, atrás
#     da fachada nova.
#  4. o mapa especular (530 KB) sai; fica cor e emissão.

import bpy, bmesh, sys, os, math
import numpy as np
from mathutils import Vector, Matrix
from mathutils.kdtree import KDTree
from mathutils.bvhtree import BVHTree

argv = sys.argv[sys.argv.index("--") + 1:]
ENTRADA, SAIDA = argv[0], argv[1]
PNG_ANTES = argv[2] if len(argv) > 2 and argv[2] else None
PASTA = os.path.dirname(os.path.abspath(SAIDA))
CELULA = float(os.environ.get("CELULA", "0.5"))       # m, o passo do mapa de altura das casas
LADO_BAKE = 2048                                       # assa em 2048 e reduz pra 1024 (antisserrilhado)
PARTE_MIN = float(os.environ.get("PARTE_MIN", "1.2"))  # m, pedaço solto menor que isso some (se não acende)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=ENTRADA)
sc = bpy.context.scene
vl = bpy.context.view_layer

def tris(me):
    return sum(len(p.vertices) - 2 for p in me.polygons)

malhas = [o for o in sc.objects if o.type == "MESH"]
print("ANTES", sum(tris(o.data) for o in malhas), "objetos", len(malhas))

# ── retrato antes (Workbench, textura) ──
if PNG_ANTES:
    mn = Vector((1e9, 1e9, 1e9)); mx = -mn
    for o in malhas:
        for c in o.bound_box:
            w = o.matrix_world @ Vector(c)
            mn = Vector(map(min, mn, w)); mx = Vector(map(max, mx, w))
    cen = (mn + mx) / 2
    raio = (mx - mn).length / 2
    print("CAMERA", ",".join(f"{x:.3f}" for x in cen), f"{raio:.3f}")
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
    cam.data.lens = 35
    sc.collection.objects.link(cam)
    d = Vector((0.55, -0.75, 0.62)).normalized()
    cam.location = cen + d * raio * 1.45
    cam.rotation_euler = (cen - cam.location).to_track_quat("-Z", "Y").to_euler()
    sc.camera = cam
    sc.render.engine = "BLENDER_WORKBENCH"
    sh = sc.display.shading
    sh.light = "STUDIO"
    sh.color_type = "TEXTURE"
    sh.show_cavity = True
    sh.cavity_type = "WORLD"
    sc.render.resolution_x, sc.render.resolution_y = 1600, 1000
    sc.render.image_settings.file_format = "PNG"
    sc.render.filepath = PNG_ANTES
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(cam, do_unlink=True)

# ── tudo em coordenada de mundo, sem pai ──
for o in malhas:
    o.data.transform(o.matrix_world)
for o in malhas:
    o.parent = None
    o.matrix_world = Matrix.Identity(4)
for o in list(sc.objects):
    if o.type != "MESH":
        bpy.data.objects.remove(o, do_unlink=True)

def caixa(me):
    co = np.empty(len(me.vertices) * 3, dtype=np.float64)
    me.vertices.foreach_get("co", co)
    co = co.reshape(-1, 3)
    return Vector(co.min(axis=0)), Vector(co.max(axis=0))

# ── classifica ──
casas, resto = [], []
for o in list(malhas):
    mat = o.data.materials[0].name if o.data.materials else ""
    if mat == "cristal":
        bpy.data.objects.remove(o, do_unlink=True)
        continue
    mn, mx = caixa(o.data)
    d = mx - mn
    if mat == "ATLAS" and max(d.x, d.y) < 30 and d.z > 5:
        casas.append((o, mn, mx, tris(o.data)))
    else:
        resto.append(o)
print("CASAS", len(casas), sum(c[3] for c in casas), "RESTO", len(resto), sum(tris(o.data) for o in resto))

# ── casas repetidas (mesmo modelo, girado de 90 em 90 graus) ──
def amostra(me, n=300):
    vs = me.vertices
    k = max(1, len(vs) // n)
    return [vs[i].co.copy() for i in range(0, len(vs), k)]

modelos = []   # [obj, centro, dims, tri, kdtree]
copias = []    # (obj, modelo, k, centro)
for o, mn, mx, t in casas:
    c, d = (mn + mx) / 2, mx - mn
    achou = None
    for m in modelos:
        mo, mc, md, mt, kd = m
        if abs(mt - t) > 0.06 * mt or abs(md.z - d.z) > 0.3:
            continue
        if abs(sorted([md.x, md.y])[0] - sorted([d.x, d.y])[0]) > 0.5:
            continue
        pts = amostra(o.data)
        melhor = None
        for k in range(4):
            R = Matrix.Rotation(k * math.pi / 2, 3, "Z")
            s = sum(kd.find(R @ (p - c) + mc)[2] for p in pts) / len(pts)
            if melhor is None or s < melhor[0]:
                melhor = (s, k)
        if melhor[0] < 0.2:
            achou = (m, melhor[1])
            break
    if achou:
        copias.append((o, achou[0], achou[1], c))
    else:
        vs = o.data.vertices
        kd = KDTree(len(vs))
        for i, v in enumerate(vs):
            kd.insert(v.co, i)
        kd.balance()
        modelos.append([o, c, d, t, kd])
print("MODELOS", len(modelos), "COPIAS", len(copias))

# ── a versão leve de cada modelo: mapa de altura ──
def paredes(me, mn, mx):
    # o plano de cada uma das 4 paredes (a caixa inclui cornija, peitoril e
    # sacada, que ficam pra fora): por lado, o plano mais de fora que junta ao
    # menos 20% da área virada pra aquele lado. A caixa leve fica nesse plano
    # e o que sai dele (cornija, sacada) vira desenho; o mural, colado na
    # parede de verdade, continua na frente.
    lados = {0: {}, 1: {}, 2: {}, 3: {}}  # -x, +x, -y, +y
    for p in me.polygons:
        n = p.normal
        for k, (eixo, sinal) in enumerate(((0, -1), (0, 1), (1, -1), (1, 1))):
            if n[eixo] * sinal > 0.9:
                c = round(p.center[eixo] / 0.05) * 0.05
                lados[k][c] = lados[k].get(c, 0.0) + p.area
    novo_mn, novo_mx = mn.copy(), mx.copy()
    for k, (eixo, sinal) in enumerate(((0, -1), (0, 1), (1, -1), (1, 1))):
        tab = lados[k]
        tot = sum(tab.values())
        if tot <= 0:
            continue
        for c in sorted(tab, key=lambda c: -c * sinal):  # de fora pra dentro
            if tab[c] >= 0.2 * tot:
                if sinal < 0:
                    novo_mn[eixo] = max(mn[eixo], min(c, mn[eixo] + 1.0))
                else:
                    novo_mx[eixo] = min(mx[eixo], max(c, mx[eixo] - 1.0))
                break
    return novo_mn, novo_mx

def versao_leve(o, idx):
    mn, mx = caixa(o.data)
    mn, mx = paredes(o.data, mn, mx)
    d = mx - mn
    nx, ny = max(1, round(d.x / CELULA)), max(1, round(d.y / CELULA))
    cx, cy = d.x / nx, d.y / ny
    bvh = BVHTree.FromObject(o, bpy.context.evaluated_depsgraph_get())
    alt = [[0.0] * ny for _ in range(nx)]
    for i in range(nx):
        for j in range(ny):
            h = 0.0
            for ox, oy in ((0.5, 0.5), (0.2, 0.2), (0.8, 0.2), (0.2, 0.8), (0.8, 0.8)):
                p = Vector((mn.x + (i + ox) * cx, mn.y + (j + oy) * cy, mx.z + 1))
                hit = bvh.ray_cast(p, Vector((0, 0, -1)))
                if hit[0] is not None:
                    h = max(h, hit[0].z - mn.z)
            alt[i][j] = round(h / 0.25) * 0.25 if h > 0.4 else 0.0

    def viz(a, b):
        return alt[a][b] if 0 <= a < nx and 0 <= b < ny else 0.0

    bm = bmesh.new()
    def quad(*cs):
        bm.faces.new([bm.verts.new(c) for c in cs])
    for i in range(nx):
        for j in range(ny):
            h = alt[i][j]
            if h <= 0:
                continue
            x0, x1 = mn.x + i * cx, mn.x + (i + 1) * cx
            y0, y1 = mn.y + j * cy, mn.y + (j + 1) * cy
            z = mn.z + h
            quad((x0, y0, z), (x1, y0, z), (x1, y1, z), (x0, y1, z))
            # parede onde o vizinho é mais baixo (ordem dos cantos: normal pra fora)
            for (vi, vj), a, b in (((i - 1, j), (x0, y1), (x0, y0)), ((i + 1, j), (x1, y0), (x1, y1)),
                                   ((i, j - 1), (x0, y0), (x1, y0)), ((i, j + 1), (x1, y1), (x0, y1))):
                hv = viz(vi, vj)
                if hv < h:
                    zb = mn.z + hv
                    quad((a[0], a[1], zb), (b[0], b[1], zb), (b[0], b[1], z), (a[0], a[1], z))
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.001)
    bmesh.ops.dissolve_limit(bm, angle_limit=math.radians(1), use_dissolve_boundaries=False, verts=bm.verts, edges=bm.edges)
    bmesh.ops.triangulate(bm, faces=bm.faces, quad_method="BEAUTY", ngon_method="BEAUTY")
    me = bpy.data.meshes.new(f"casa_{idx}")
    bm.to_mesh(me)
    bm.free()
    lo = bpy.data.objects.new(f"casa_{idx}", me)
    sc.collection.objects.link(lo)
    return lo

leves = []
for idx, m in enumerate(modelos):
    lo = versao_leve(m[0], idx)
    print("LEVE", m[0].name, m[3], "->", tris(lo.data))
    leves.append(lo)

# ── assa a fachada: junta as leves, UV automático, Cycles cor difusa ──
img = bpy.data.images.new("CASAS", LADO_BAKE, LADO_BAKE, alpha=False)
img.generated_color = (0.12, 0.11, 0.1, 1)
mat_casas = bpy.data.materials.new("CASAS")
mat_casas.use_nodes = True
mat_casas.use_backface_culling = True  # caixa fechada: uma face só (doubleSided falso)
nt = mat_casas.node_tree
bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
bsdf.inputs["Roughness"].default_value = 0.75
bsdf.inputs["Metallic"].default_value = 0.1
tex = nt.nodes.new("ShaderNodeTexImage")
tex.image = img
nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
nt.nodes.active = tex

for o in vl.objects:
    o.select_set(False)
for i, lo in enumerate(leves):
    lo.data.materials.append(mat_casas)
    at = lo.data.attributes.new("casa", "INT", "FACE")
    for k in range(len(lo.data.polygons)):
        at.data[k].value = i
    lo.select_set(True)
vl.objects.active = leves[0]
bpy.ops.object.join()
junta = vl.objects.active
junta.data.uv_layers.new(name="UVMap")
bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.004, area_weight=0.0, scale_to_bounds=False)
bpy.ops.uv.pack_islands(margin=0.004, rotate=True)
bpy.ops.object.mode_set(mode="OBJECT")

sc.render.engine = "CYCLES"
sc.cycles.device = "CPU"
sc.cycles.samples = 4
for o in vl.objects:
    o.select_set(False)
for m in modelos:
    m[0].select_set(True)
junta.select_set(True)
vl.objects.active = junta
print(bpy.ops.object.bake(type="DIFFUSE", pass_filter={"COLOR"}, use_selected_to_active=True,
                          cage_extrusion=1.0, max_ray_distance=2.5, margin=4, use_clear=True))
img.filepath_raw = os.path.join(PASTA, "suburbio-casas-2048.png")
img.file_format = "PNG"
img.save()
img.scale(1024, 1024)
img.pack()

# separa a junta de volta, uma malha por modelo
leves = []
for i in range(len(modelos)):
    me = junta.data.copy()
    bm = bmesh.new()
    bm.from_mesh(me)
    lay = bm.faces.layers.int.get("casa")
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f[lay] != i], context="FACES")
    bm.to_mesh(me)
    bm.free()
    me.attributes.remove(me.attributes["casa"])
    me.name = f"casa_{i}"
    lo = bpy.data.objects.new(f"casa_{i}", me)
    sc.collection.objects.link(lo)
    leves.append(lo)
bpy.data.objects.remove(junta, do_unlink=True)

# as cópias: instância da versão leve, no lugar e giro da casa original
# (a busca leva a cópia pro modelo: q = R(p - c) + mc; a volta é p = R⁻¹(q - mc) + c)
for o, m, k, c in copias:
    i = next(n for n, mm in enumerate(modelos) if mm is m)
    inst = bpy.data.objects.new(f"casa_{i}_{o.name}", leves[i].data)
    sc.collection.objects.link(inst)
    inst.matrix_world = Matrix.Translation(c) @ Matrix.Rotation(-k * math.pi / 2, 4, "Z") @ Matrix.Translation(-m[1])
for o, *_ in casas:
    bpy.data.objects.remove(o, do_unlink=True)
pular = [lo.data.name for lo in leves]  # o meshoptimizer não mexe nessas (glb_simplificar.mjs)

# ── o resto: limpeza ──
emis = bpy.data.images.get("Image_3")  # a emissão do ATLAS_PROPS
emis_px = None
if emis:
    emis_px = np.empty(emis.size[0] * emis.size[1] * 4, dtype=np.float32)
    emis.pixels.foreach_get(emis_px)
    emis_px = emis_px.reshape(emis.size[1], emis.size[0], 4)

def acende(faces, uv):
    if emis_px is None:
        return False
    h, w = emis_px.shape[:2]
    s, n = 0.0, 0
    for f in faces[:60]:
        for l in f.loops:
            u, v = l[uv].uv
            x = min(w - 1, max(0, int((u % 1.0) * w)))
            y = min(h - 1, max(0, int((v % 1.0) * h)))
            s += float(emis_px[y, x, :3].sum())
            n += 1
    return n > 0 and s / n > 0.15

for o in resto:
    me = o.data
    props = bool(me.materials) and me.materials[0].name == "ATLAS_PROPS"
    if props and max(caixa(me)[1] - caixa(me)[0]) <= 20 and me.uv_layers and emis_px is not None:
        # o mural e as placas de neon inteiras: o desenho é o contorno, não mexe
        bmt = bmesh.new()
        bmt.from_mesh(me)
        if acende(list(bmt.faces), bmt.loops.layers.uv.active):
            pular.append(me.name)
            bmt.free()
            continue
        bmt.free()
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.002)
    bmesh.ops.dissolve_degenerate(bm, edges=bm.edges, dist=0.0005)
    fundo = [f for f in bm.faces if f.normal.z < -0.95 and f.calc_center_median().z < 0.25]
    bmesh.ops.delete(bm, geom=fundo, context="FACES")
    uv = bm.loops.layers.uv.active
    # só nos objetos espalhados pelo bairro (postes, lixeiras, bancos juntos);
    # peça inteira e pequena (o mural, uma placa) fica como está
    mn, mx = caixa(me)
    espalhado = max(mx - mn) > 20
    if props and espalhado and uv is not None and PARTE_MIN > 0:
        visto, apagar = set(), []
        for f in bm.faces:
            if f in visto:
                continue
            pilha, comp = [f], []
            visto.add(f)
            while pilha:
                g = pilha.pop()
                comp.append(g)
                for e in g.edges:
                    for hh in e.link_faces:
                        if hh not in visto:
                            visto.add(hh)
                            pilha.append(hh)
            cs = [v.co for g in comp for v in g.verts]
            dmax = max(max(c[i] for c in cs) - min(c[i] for c in cs) for i in range(3))
            if dmax < PARTE_MIN and not acende(comp, uv):
                apagar.extend(comp)
        bmesh.ops.delete(bm, geom=apagar, context="FACES")
    soltos = [v for v in bm.verts if not v.link_faces]
    bmesh.ops.delete(bm, geom=soltos, context="VERTS")
    bmesh.ops.dissolve_limit(bm, angle_limit=math.radians(1.0), use_dissolve_boundaries=False,
                             verts=bm.verts, edges=bm.edges, delimit={"UV", "MATERIAL", "SEAM"})
    bmesh.ops.triangulate(bm, faces=bm.faces, quad_method="BEAUTY", ngon_method="BEAUTY")
    bm.to_mesh(me)
    bm.free()
    me.validate(clean_customdata=False)
for o in list(resto):
    if len(o.data.polygons) == 0:
        bpy.data.objects.remove(o, do_unlink=True)

# ── materiais: sem o mapa especular ──
for m in bpy.data.materials:
    if not m.node_tree:
        continue
    nt = m.node_tree
    for n in list(nt.nodes):
        if n.type != "TEX_IMAGE" or not n.image:
            continue
        # o especular vem do canal alfa da textura, passando por um nó MATH
        ligas = [l for saida in n.outputs for l in saida.links]
        if any(l.to_node.type == "MATH" for l in ligas):
            for l in ligas:
                if l.to_node.type == "MATH":
                    nt.nodes.remove(l.to_node)
            nt.nodes.remove(n)
    b = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None)
    if b is not None:
        b.inputs["Specular IOR Level"].default_value = 0.5

with open(os.path.join(PASTA, "suburbio-pular.txt"), "w") as f:
    f.write(",".join(pular))
print("PULAR", pular[len(modelos):])
tot = sum(tris(o.data) for o in sc.objects if o.type == "MESH")
print("ETAPA_A", tot, "objetos", sum(1 for o in sc.objects if o.type == "MESH"))
for o in sc.objects:
    if o.type == "MESH":
        print("OBJ", o.name, o.data.name, o.data.materials[0].name if o.data.materials else "-", tris(o.data))
for o in vl.objects:
    o.select_set(o.type == "MESH")
bpy.ops.export_scene.gltf(filepath=SAIDA, export_format="GLB", use_selection=True, export_texcoords=True,
                          export_normals=False, export_materials="EXPORT", export_yup=True, export_apply=False,
                          export_image_format="WEBP")
print("exportado", SAIDA)
