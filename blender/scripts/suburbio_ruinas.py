# As RUÍNAS do subúrbio (nota do dono, 03/11: "adicione mais desse modelo do
# subúrbio no mapa [...] modelar uma cidade mais destruída com essa que temos,
# pra poder ter a física certinha ali também com os objetos").
#
#   blender -b --factory-startup --python blender/scripts/suburbio_ruinas.py -- \
#     blender/cenas/suburbio-aberto.glb blender/cenas/ruinas-bruto.glb [pasta dos retratos]
#   npx @gltf-transform/cli optimize blender/cenas/ruinas-bruto.glb public/models/suburbio-ruinas.glb \
#     --compress meshopt --simplify false --join false --instance false --flatten false \
#     --texture-compress webp --texture-size 1024
#
# O que sai:
#  - um KIT (public/models/suburbio-ruinas.glb): os 13 prédios do modelo do
#    subúrbio, cada um na versão leve (o mapa de altura de 0,5 m no plano da
#    parede de verdade, a fachada original assada numa textura de 1024) e
#    duas versões destruídas de cada:
#      "topo": o topo desmorona em diagonal a partir de um canto, em degraus
#              tortos; o canto mais baixo some e vira entulho na base;
#      "andar": um andar inteiro faltando (só os pilares da beirada seguram o
#              resto) e um canto de cima arrancado; entulho na base.
#    Mais 3 montes de entulho soltos. A parede que sobrou usa a MESMA fachada
#    assada do prédio inteiro (o UV vem do plano dela); o que é quebra (topo
#    partido, a laje de baixo, pilar, entulho) usa o concreto pintado na faixa
#    da direita da textura. Escala do jogo (1,4) já aplicada, pivô no centro do
#    pé do prédio, no chão.
#  - app/linha/estrada/ruinasDados.ts (gerado): as caixas de colisão de cada
#    peça e o traçado das quadras no chão do subúrbio (SUBURBIO de
#    disco/historia.ts): ruas de 12 m, quadras de 40 m com 4 lotes de 20 m,
#    sem nada perto do bar, oficina, palco, quadra, túneis (e a rampa),
#    goteira, torre e de onde a pessoa chega a pé.
#  - retratos (Workbench) do kit e do bairro, de cima e na rua.

import bpy, bmesh, sys, os, math, random, json
import numpy as np
from mathutils import Vector, Matrix
from mathutils.kdtree import KDTree
from mathutils.bvhtree import BVHTree

argv = sys.argv[sys.argv.index("--") + 1:]
ENTRADA, SAIDA = argv[0], argv[1]
RETRATOS = argv[2] if len(argv) > 2 else None
PASTA = os.path.dirname(os.path.abspath(SAIDA))
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
CELULA = 0.5
ESCALA = 1.4         # a mesma do modelo do subúrbio no jogo
LADO_BAKE = 2048
FAIXA = 0.875        # u de 0,875 a 1: o concreto e o entulho pintados
rnd = random.Random(503)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=ENTRADA)
sc = bpy.context.scene
vl = bpy.context.view_layer
malhas = [o for o in sc.objects if o.type == "MESH"]
for o in malhas:
    o.data.transform(o.matrix_world)
for o in malhas:
    o.parent = None
    o.matrix_world = Matrix.Identity(4)
for o in list(sc.objects):
    if o.type != "MESH":
        bpy.data.objects.remove(o, do_unlink=True)

def tris(me):
    return sum(len(p.vertices) - 2 for p in me.polygons)

def caixa(me):
    co = np.empty(len(me.vertices) * 3, dtype=np.float64)
    me.vertices.foreach_get("co", co)
    co = co.reshape(-1, 3)
    return Vector(co.min(axis=0)), Vector(co.max(axis=0))

# ── os 13 modelos (a mesma busca do suburbio_reduzir.py) ──
casas = []
for o in list(malhas):
    mat = o.data.materials[0].name if o.data.materials else ""
    mn, mx = caixa(o.data)
    d = mx - mn
    if mat == "ATLAS" and max(d.x, d.y) < 30 and d.z > 5:
        casas.append((o, mn, mx, tris(o.data)))
    else:
        bpy.data.objects.remove(o, do_unlink=True)

def amostra(me, n=300):
    vs = me.vertices
    k = max(1, len(vs) // n)
    return [vs[i].co.copy() for i in range(0, len(vs), k)]

modelos = []
for o, mn, mx, t in casas:
    c, d = (mn + mx) / 2, mx - mn
    achou = False
    for mo, mc, md, mt, kd in modelos:
        if abs(mt - t) > 0.06 * mt or abs(md.z - d.z) > 0.3:
            continue
        if abs(sorted([md.x, md.y])[0] - sorted([d.x, d.y])[0]) > 0.5:
            continue
        pts = amostra(o.data)
        melhor = min(sum(kd.find(Matrix.Rotation(k * math.pi / 2, 3, "Z") @ (p - c) + mc)[2] for p in pts) / len(pts) for k in range(4))
        if melhor < 0.2:
            achou = True
            break
    if achou:
        bpy.data.objects.remove(o, do_unlink=True)
        continue
    vs = o.data.vertices
    kd = KDTree(len(vs))
    for i, v in enumerate(vs):
        kd.insert(v.co, i)
    kd.balance()
    modelos.append((o, c, d, t, kd))
print("MODELOS", len(modelos))

def paredes(me, mn, mx):
    lados = {0: {}, 1: {}, 2: {}, 3: {}}
    for p in me.polygons:
        n = p.normal
        for k, (eixo, sinal) in enumerate(((0, -1), (0, 1), (1, -1), (1, 1))):
            if n[eixo] * sinal > 0.9:
                c = round(p.center[eixo] / 0.05) * 0.05
                lados[k][c] = lados[k].get(c, 0.0) + p.area
    a, b = mn.copy(), mx.copy()
    for k, (eixo, sinal) in enumerate(((0, -1), (0, 1), (1, -1), (1, 1))):
        tab = lados[k]
        tot = sum(tab.values())
        if tot <= 0:
            continue
        for c in sorted(tab, key=lambda c: -c * sinal):
            if tab[c] >= 0.2 * tot:
                if sinal < 0:
                    a[eixo] = max(mn[eixo], min(c, mn[eixo] + 1.0))
                else:
                    b[eixo] = min(mx[eixo], max(c, mx[eixo] - 1.0))
                break
    return a, b

def mapa_altura(o):
    mn, mx = caixa(o.data)
    mn, mx = paredes(o.data, mn, mx)
    d = mx - mn
    nx, ny = max(1, round(d.x / CELULA)), max(1, round(d.y / CELULA))
    cx, cy = d.x / nx, d.y / ny
    bvh = BVHTree.FromObject(o, bpy.context.evaluated_depsgraph_get())
    alt = np.zeros((nx, ny))
    for i in range(nx):
        for j in range(ny):
            h = 0.0
            for ox, oy in ((0.5, 0.5), (0.2, 0.2), (0.8, 0.2), (0.2, 0.8), (0.8, 0.8)):
                hit = bvh.ray_cast(Vector((mn.x + (i + ox) * cx, mn.y + (j + oy) * cy, mx.z + 1)), Vector((0, 0, -1)))
                if hit[0] is not None:
                    h = max(h, hit[0].z - mn.z)
            alt[i, j] = round(h / 0.25) * 0.25 if h > 0.4 else 0.0
    return dict(mn=mn, mx=mx, nx=nx, ny=ny, cx=cx, cy=cy, alt=alt)

# ── malha a partir de células com faixas sólidas (permite o vão do andar que falta) ──
def sobra(a0, a1, cobre):
    # o pedaço de [a0, a1] que nenhuma faixa de `cobre` tapa
    partes = [(a0, a1)]
    for c0, c1 in cobre:
        nov = []
        for p0, p1 in partes:
            if c1 <= p0 or c0 >= p1:
                nov.append((p0, p1))
                continue
            if c0 > p0:
                nov.append((p0, c0))
            if c1 < p1:
                nov.append((c1, p1))
        partes = nov
    return [(p0, p1) for p0, p1 in partes if p1 - p0 > 1e-3]

def malha_faixas(nome, H, faixas):
    # faixas[i][j] = [(z0, z1), ...] (em metros acima do chão do prédio)
    mn, nx, ny, cx, cy = H["mn"], H["nx"], H["ny"], H["cx"], H["cy"]
    bm = bmesh.new()
    def quad(*cs):
        bm.faces.new([bm.verts.new(c) for c in cs])
    def viz(i, j):
        return faixas[i][j] if 0 <= i < nx and 0 <= j < ny else []
    for i in range(nx):
        for j in range(ny):
            x0, x1 = mn.x + i * cx, mn.x + (i + 1) * cx
            y0, y1 = mn.y + j * cy, mn.y + (j + 1) * cy
            fs = faixas[i][j]
            for z0, z1 in fs:
                if not any(abs(a - z1) < 1e-4 for a, _ in fs):
                    quad((x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1))
                if z0 > 1e-3 and not any(abs(b - z0) < 1e-4 for _, b in fs):
                    quad((x0, y1, z0), (x1, y1, z0), (x1, y0, z0), (x0, y0, z0))
                for (vi, vj), a, b in (((i - 1, j), (x0, y1), (x0, y0)), ((i + 1, j), (x1, y0), (x1, y1)),
                                       ((i, j - 1), (x0, y0), (x1, y0)), ((i, j + 1), (x1, y1), (x0, y1))):
                    for s0, s1 in sobra(z0, z1, viz(vi, vj)):
                        quad((a[0], a[1], s0), (b[0], b[1], s0), (b[0], b[1], s1), (a[0], a[1], s1))
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.001)
    for f in bm.faces:
        f.normal_update()
    # as faces viradas pra baixo encostadas no chão não aparecem
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.normal.z < -0.9 and f.calc_center_median().z < mn.z + 0.01], context="FACES")
    bmesh.ops.dissolve_limit(bm, angle_limit=math.radians(1), use_dissolve_boundaries=False, verts=bm.verts, edges=bm.edges)
    bmesh.ops.triangulate(bm, faces=bm.faces, quad_method="BEAUTY", ngon_method="BEAUTY")
    me = bpy.data.meshes.new(nome)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = False
    ob = bpy.data.objects.new(nome, me)
    sc.collection.objects.link(ob)
    return ob

def suave(a, b, x):
    t = max(0.0, min(1.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)

def var_topo(H):
    # o topo desmorona em diagonal a partir de um canto
    alt, nx, ny = H["alt"], H["nx"], H["ny"]
    ci, cj = rnd.choice([(0, 0), (nx - 1, 0), (0, ny - 1), (nx - 1, ny - 1)])
    L = math.hypot(nx, ny)
    topo_h = alt.max()
    ruido = {}
    fx = []
    for i in range(nx):
        linha = []
        for j in range(ny):
            h = alt[i, j]
            if h <= 0:
                linha.append([])
                continue
            # por blocos de 2 m (4 x 4 células): o topo quebra em degraus grandes, não em farelo
            g = (i // 4, j // 4)
            if g not in ruido:
                t = math.hypot(g[0] * 4 + 1.5 - ci, g[1] * 4 + 1.5 - cj) / L
                ruido[g] = (t, rnd.uniform(0, 2.5))
            t, rr = ruido[g]
            novo = topo_h * (0.15 + 0.85 * suave(0.12, 0.95, t)) - rr * (1 - suave(0.7, 1.0, t))
            novo = min(h, round(novo))
            linha.append([(0.0, novo)] if novo >= 1.0 else [])
        fx.append(linha)
    return fx, (ci, cj)

def var_andar(H):
    # um andar inteiro faltando: pilares na beirada seguram o resto; um canto de cima arrancado
    alt, nx, ny = H["alt"], H["nx"], H["ny"]
    topo = alt.max()
    h1 = round(topo * rnd.uniform(0.3, 0.45) / 0.5) * 0.5
    h2 = h1 + 3.0
    ci, cj = rnd.choice([(0, 0), (nx - 1, 0), (0, ny - 1), (nx - 1, ny - 1)])
    ri, rj = max(2, int(nx * 0.35)), max(2, int(ny * 0.35))
    fx = []
    for i in range(nx):
        linha = []
        for j in range(ny):
            h = alt[i, j]
            if h <= 0:
                linha.append([])
                continue
            borda = i in (0, nx - 1) or j in (0, ny - 1)
            pilar = borda and ((i % 10 == 0 or i == nx - 1) and (j % 10 == 0 or j == ny - 1))
            canto = abs(i - ci) < ri and abs(j - cj) < rj
            if pilar and h > h2 and not canto:
                linha.append([(0.0, h)])
            elif h > h2 + 1.0 and not canto:
                linha.append([(0.0, min(h, h1)), (h2, h)])
            else:
                linha.append([(0.0, min(h, h1))])
        fx.append(linha)
    return fx, (ci, cj)

def entulho(nome, cx, cy, rx, ry, alto, z0):
    # um monte baixo e torto (grade 7 x 7 numa elipse), na faixa do entulho
    bm = bmesh.new()
    n = 4
    vs = {}
    for a in range(n + 1):
        for b in range(n + 1):
            u, v = a / n * 2 - 1, b / n * 2 - 1
            r = min(1.0, math.hypot(u, v))
            h = alto * (1 - r * r) * rnd.uniform(0.6, 1.15) if r < 0.999 else 0.0
            ang = math.atan2(v, u)
            k = 1 + 0.18 * math.sin(ang * 3 + rnd.uniform(0, 6))
            vs[a, b] = bm.verts.new((cx + u * rx * k, cy + v * ry * k, z0 + max(0.0, h)))
    for a in range(n):
        for b in range(n):
            bm.faces.new((vs[a, b], vs[a + 1, b], vs[a + 1, b + 1], vs[a, b + 1]))
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.001)
    bmesh.ops.dissolve_degenerate(bm, edges=bm.edges, dist=0.01)
    bmesh.ops.triangulate(bm, faces=bm.faces)
    me = bpy.data.meshes.new(nome)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(nome, me)
    sc.collection.objects.link(ob)
    ob["entulho"] = 1
    return ob

# ── monta as peças ──
pecas = []  # dict(nome, obj, H, tipo, modelo, montes=[(cx, cy, rx, ry, alto)])
for mi, (o, *_r) in enumerate(modelos):
    H = mapa_altura(o)
    nx, ny = H["nx"], H["ny"]
    inteira = [[[(0.0, H["alt"][i, j])] if H["alt"][i, j] > 0 else [] for j in range(ny)] for i in range(nx)]
    ob = malha_faixas(f"m{mi:02d}", H, inteira)
    pecas.append(dict(nome=f"m{mi:02d}", obj=ob, H=H, tipo="inteira", modelo=mi, montes=[]))
    for tipo, fn in (("topo", var_topo), ("andar", var_andar)):
        fx, (ci, cj) = fn(H)
        ob = malha_faixas(f"m{mi:02d}_{tipo}", H, fx)
        # o entulho cai do lado do canto quebrado, encostado na base
        mn, mx = H["mn"], H["mx"]
        px = mn.x + (ci + 0.5) * H["cx"]
        py = mn.y + (cj + 0.5) * H["cy"]
        sx = 1 if ci == 0 else -1
        sy = 1 if cj == 0 else -1
        if tipo == "topo":
            # o canto que caiu: o monte em cima do pé dele, e um menor escorrendo pra fora
            montes = [(px + sx * 2.0, py + sy * 2.0, 2.6, 2.2, 2.2), (px - sx * 0.6, py - sy * 0.6, 1.4, 1.2, 1.0)]
        else:
            montes = [(px - sx * 0.8, py - sy * 0.8, 1.8, 1.5, 1.4)]
        pecas.append(dict(nome=f"m{mi:02d}_{tipo}", obj=ob, H=H, tipo=tipo, modelo=mi, montes=montes))
for k in range(3):
    pecas.append(dict(nome=f"entulho_{k}", obj=None, H=None, tipo="entulho", modelo=-1,
                      montes=[(0, 0, rnd.uniform(3.0, 4.2), rnd.uniform(2.4, 3.4), rnd.uniform(1.4, 2.4)),
                              (rnd.uniform(-2, 2), rnd.uniform(2, 3), rnd.uniform(1.4, 2.0), rnd.uniform(1.1, 1.6), rnd.uniform(0.8, 1.3))]))
for p in pecas:
    print("PECA", p["nome"], tris(p["obj"].data) if p["obj"] else 0)

# ── UV e assar as 13 inteiras (as destruídas reaproveitam o UV da parede) ──
img = bpy.data.images.new("CASAS_RUINAS", LADO_BAKE, LADO_BAKE, alpha=False)
img.generated_color = (0.12, 0.11, 0.1, 1)
mat = bpy.data.materials.new("RUINAS")
mat.use_nodes = True
mat.use_backface_culling = True
nt = mat.node_tree
bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
bsdf.inputs["Roughness"].default_value = 0.8
bsdf.inputs["Metallic"].default_value = 0.05
tex = nt.nodes.new("ShaderNodeTexImage")
tex.image = img
nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
nt.nodes.active = tex

inteiras = [p for p in pecas if p["tipo"] == "inteira"]
copias_inteiras = []
for o in sc.objects:
    o.select_set(False)
for i, p in enumerate(inteiras):
    c = p["obj"].copy()
    c.data = p["obj"].data.copy()
    sc.collection.objects.link(c)
    c.data.materials.append(mat)
    at = c.data.attributes.new("casa", "INT", "FACE")
    for k in range(len(c.data.polygons)):
        at.data[k].value = i
    c.select_set(True)
    copias_inteiras.append(c)
vl.objects.active = copias_inteiras[0]
bpy.ops.object.join()
junta = vl.objects.active
junta.data.uv_layers.new(name="UVMap")
bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.004, area_weight=0.0, scale_to_bounds=False)
bpy.ops.uv.pack_islands(margin=0.004, rotate=True)
bpy.ops.object.mode_set(mode="OBJECT")
uvl = junta.data.uv_layers.active.data
for d in uvl:
    d.uv = (d.uv[0] * FAIXA, d.uv[1] * FAIXA)

sc.render.engine = "CYCLES"
sc.cycles.device = "CPU"
sc.cycles.samples = 4
for o in sc.objects:
    o.select_set(False)
for m in modelos:
    m[0].select_set(True)
junta.select_set(True)
vl.objects.active = junta
print(bpy.ops.object.bake(type="DIFFUSE", pass_filter={"COLOR"}, use_selected_to_active=True,
                          cage_extrusion=1.0, max_ray_distance=2.5, margin=4, use_clear=True))

# o UV assado volta pra cada inteira (as faces estão na mesma ordem da cópia)
ini = 0
lay = junta.data.attributes["casa"].data
for i, p in enumerate(inteiras):
    me = p["obj"].data
    uv = me.uv_layers.new(name="UVMap")
    faces_j = [f for f in junta.data.polygons if lay[f.index].value == i]
    for fp, fj in zip(me.polygons, faces_j):
        for lp, lj in zip(fp.loop_indices, fj.loop_indices):
            uv.data[lp].uv = uvl[lj].uv
bpy.data.objects.remove(junta, do_unlink=True)
for m in modelos:
    bpy.data.objects.remove(m[0], do_unlink=True)

# ── a faixa do concreto (u de 0,875 a 1): concreto partido em cima, entulho embaixo ──
px = np.empty(LADO_BAKE * LADO_BAKE * 4, dtype=np.float32)
img.pixels.foreach_get(px)
px = px.reshape(LADO_BAKE, LADO_BAKE, 4)
usado = px[:, : int(FAIXA * LADO_BAKE), :3]
media = usado[usado.sum(axis=2) > 0.05].mean(axis=0) if (usado.sum(axis=2) > 0.05).any() else np.array([0.2, 0.18, 0.16])
u0 = int(FAIXA * LADO_BAKE) + 6
W = LADO_BAKE - u0
gen = np.random.default_rng(7)
def ruido(h, w, escala):
    base = gen.random((h // escala + 2, w // escala + 2))
    ys = np.linspace(0, base.shape[0] - 1.001, h)
    xs = np.linspace(0, base.shape[1] - 1.001, w)
    y0, x0 = ys.astype(int), xs.astype(int)
    fy, fx = (ys - y0)[:, None], (xs - x0)[None, :]
    a = base[y0][:, x0] * (1 - fx) + base[y0][:, x0 + 1] * fx
    b = base[y0 + 1][:, x0] * (1 - fx) + base[y0 + 1][:, x0 + 1] * fx
    return a * (1 - fy) + b * fy
meio = LADO_BAKE // 2
# concreto (v de 0,5 a 1): cinza puxado pra paleta do bairro, manchas, rachas escuras, ferro
hc = LADO_BAKE - meio
conc = 0.75 * media[None, None, :] + 0.25 * np.array([0.32, 0.3, 0.28])[None, None, :]
n = 0.55 * ruido(hc, W, 64) + 0.3 * ruido(hc, W, 16) + 0.15 * ruido(hc, W, 4)
conc = conc * (0.7 + 0.6 * n[..., None])
rachas = (np.abs(ruido(hc, W, 40) - 0.5) < 0.018) | (np.abs(ruido(hc, W, 90) - 0.5) < 0.012)
conc[rachas] *= 0.35
for k in range(0, W, 23):
    conc[:, k:k + 2] = conc[:, k:k + 2] * 0.5 + np.array([0.18, 0.08, 0.05]) * 0.5
px[meio:, u0:, :3] = conc
# entulho (v de 0 a 0,5): pedaços claros e escuros, poeira
he = meio
ent = 0.6 * media[None, None, :] + 0.4 * np.array([0.27, 0.25, 0.22])[None, None, :]
pedra = ruido(he, W, 6)
ent = ent * (0.45 + 0.9 * pedra[..., None]) * (0.85 + 0.3 * ruido(he, W, 48)[..., None])
px[:meio, u0:, :3] = ent
px[:, u0 - 6:u0, :3] = px[:, u0:u0 + 1, :3]
img.pixels.foreach_set(px.ravel())
img.filepath_raw = os.path.join(PASTA, "ruinas-2048.png")
img.file_format = "PNG"
img.save()
img.scale(1024, 1024)
img.pack()

REG_CONC = (FAIXA + 0.01, 0.52, 0.995, 0.99)  # u0, v0, u1, v1
REG_ENT = (FAIXA + 0.01, 0.01, 0.995, 0.48)

def uv_regiao(me, uv, polys, reg):
    # cada face no seu pedaço da região, projetada no eixo dominante (o concreto
    # é ruído: a emenda não aparece)
    u0, v0, u1, v1 = reg
    for p in polys:
        n = p.normal
        ax = max(range(3), key=lambda k: abs(n[k]))
        a, b = [k for k in range(3) if k != ax]
        cs = [me.vertices[me.loops[li].vertex_index].co for li in p.loop_indices]
        lado = 6.0  # m que cabem na região
        for li, c in zip(p.loop_indices, cs):
            s = c[a] / lado
            t = c[b] / lado
            uv.data[li].uv = (s, t)
        # leva a face inteira pra dentro da região, sem esticar além dela
        us = [uv.data[li].uv[0] for li in p.loop_indices]
        vs = [uv.data[li].uv[1] for li in p.loop_indices]
        du, dv = math.floor(min(us)), math.floor(min(vs))
        k = min(1.0, 1.0 / max(1e-6, max(us) - min(us)), 1.0 / max(1e-6, max(vs) - min(vs)))
        for li in p.loop_indices:
            x, y = uv.data[li].uv
            x = (x - du) * k if k < 1 else x - du
            y = (y - dv) * k if k < 1 else y - dv
            uv.data[li].uv = (u0 + min(1, x) * (u1 - u0), v0 + min(1, y) * (v1 - v0))

# as destruídas: parede que coincide com a inteira usa o UV dela (o plano é afim);
# o resto é concreto
for p in pecas:
    if p["tipo"] not in ("topo", "andar"):
        continue
    base = next(q for q in inteiras if q["modelo"] == p["modelo"])["obj"].data
    me = p["obj"].data
    uv = me.uv_layers.new(name="UVMap")
    buv = base.uv_layers["UVMap"].data
    afins = []
    for f in base.polygons:
        vs = [base.vertices[base.loops[li].vertex_index].co for li in f.loop_indices]
        us = [buv[li].uv for li in f.loop_indices]
        afins.append((f.normal.copy(), f.normal.dot(vs[0]), vs, us, f))
    bvh = BVHTree.FromPolygons([v.co for v in base.vertices], [list(f.vertices) for f in base.polygons])
    quebra = []
    for f in me.polygons:
        c = f.center
        hit = bvh.find_nearest(c)
        ok = False
        if hit[0] is not None and hit[3] < 0.02:
            fi = hit[2]
            nb, d0, vs, us, fb = afins[fi]
            if nb.dot(f.normal) > 0.999:
                # afim do triângulo da inteira: pos -> uv
                A, B, C = vs[0], vs[1], vs[2]
                e1, e2 = B - A, C - A
                M = Matrix(((e1.x, e2.x, nb.x), (e1.y, e2.y, nb.y), (e1.z, e2.z, nb.z)))
                try:
                    Mi = M.inverted()
                    for li in f.loop_indices:
                        q = Mi @ (me.vertices[me.loops[li].vertex_index].co - A)
                        uv.data[li].uv = us[0] + (us[1] - us[0]) * q.x + (us[2] - us[0]) * q.y
                    ok = True
                except ValueError:
                    ok = False
        if not ok:
            quebra.append(f)
    uv_regiao(me, uv, quebra, REG_CONC)
    print("UV", p["nome"], "parede", len(me.polygons) - len(quebra), "quebra", len(quebra))

# os montes de entulho: malha, UV na região do entulho, junta na peça
for p in pecas:
    if not p["montes"]:
        continue
    z0 = p["H"]["mn"].z if p["H"] else 0.0
    obs = []
    for k, (cx, cy, rx, ry, alto) in enumerate(p["montes"]):
        e = entulho(f"{p['nome']}_e{k}", cx, cy, rx, ry, alto, z0 - 0.05)
        uv = e.data.uv_layers.new(name="UVMap")
        uv_regiao(e.data, uv, list(e.data.polygons), REG_ENT)
        obs.append(e)
    if p["obj"] is None:
        for o in sc.objects:
            o.select_set(False)
        for e in obs:
            e.select_set(True)
        vl.objects.active = obs[0]
        bpy.ops.object.join()
        p["obj"] = vl.objects.active
        p["obj"].name = p["nome"]
        p["obj"].data.name = p["nome"]
    else:
        for o in sc.objects:
            o.select_set(False)
        p["obj"].select_set(True)
        for e in obs:
            e.select_set(True)
        vl.objects.active = p["obj"]
        bpy.ops.object.join()

# ── pivô no centro do pé, no chão; escala do jogo; colisores ──
# (Blender x, y, z) -> jogo (x, z = -y, y = z)
dados_pecas = []
for p in pecas:
    o = p["obj"]
    me = o.data
    me.materials.clear()
    me.materials.append(mat)
    if p["H"]:
        mn, mx = p["H"]["mn"], p["H"]["mx"]
        piv = Vector(((mn.x + mx.x) / 2, (mn.y + mx.y) / 2, mn.z))
    else:
        piv = Vector((0, 0, 0))
    me.transform(Matrix.Scale(ESCALA, 4) @ Matrix.Translation(-piv))
    me.update()
    for f in me.polygons:
        f.use_smooth = False
    caixas = []
    if p["H"]:
        # o prédio: a caixa do que ficou em pé (o maior topo), no plano das paredes
        cos = [v.co for v in me.vertices if v.co.z > 2.6]
        if cos:
            x0, x1 = min(c.x for c in cos), max(c.x for c in cos)
            y0, y1 = min(c.y for c in cos), max(c.y for c in cos)
            topo = max(c.z for c in cos)
            caixas.append([(x0 + x1) / 2, -(y0 + y1) / 2, (x1 - x0) / 2, (y1 - y0) / 2, topo])
    for cx, cy, rx, ry, alto in p["montes"]:
        q = (Vector((cx, cy, 0)) - Vector((piv.x, piv.y, 0))) * ESCALA
        caixas.append([q.x, -q.y, rx * ESCALA * 0.75, ry * ESCALA * 0.75, alto * ESCALA * 0.8])
    co = [v.co for v in me.vertices]
    raio = max(math.hypot(c.x, c.y) for c in co)
    dados_pecas.append(dict(nome=p["nome"], tipo=p["tipo"], tri=tris(me), raio=round(raio, 2),
                            caixas=[[round(x, 2) for x in c] for c in caixas]))
    print("FINAL", p["nome"], tris(me), "raio", round(raio, 1), "caixas", len(caixas))

# ── o traçado das quadras no chão do subúrbio (coordenadas do jogo, x e z) ──
SUB = (-740.0, -680.0, 260.0)
LUGARES = {"bar": (-737, -675), "oficina": (-560, -626), "palco": (-891, -536), "quadra": (-860, -790),
           "tuneis": (-610, -830), "goteira": (-620, -730), "torre": (-960, -700), "chegada": (-700, -620)}
FOLGA_LUGAR = {"quadra": 44, "chegada": 30}
def dist_seg(px_, pz_, ax, az, bx, bz):
    vx, vz = bx - ax, bz - az
    t = max(0.0, min(1.0, ((px_ - ax) * vx + (pz_ - az) * vz) / (vx * vx + vz * vz)))
    return math.hypot(px_ - ax - vx * t, pz_ - az - vz * t)
BL = math.hypot(LUGARES["tuneis"][0] - SUB[0], LUGARES["tuneis"][1] - SUB[1])
RAMPA = (LUGARES["tuneis"][0], LUGARES["tuneis"][1],
         LUGARES["tuneis"][0] - (LUGARES["tuneis"][0] - SUB[0]) / BL * 55, LUGARES["tuneis"][1] - (LUGARES["tuneis"][1] - SUB[1]) / BL * 55)
RUA, QUADRA_M = 12.0, 40.0
PASSO = RUA + QUADRA_M
LOTE = QUADRA_M / 2
indice = {d["nome"]: k for k, d in enumerate(dados_pecas)}
grupos = {"inteira": [d["nome"] for d in dados_pecas if d["tipo"] == "inteira"],
          "topo": [d["nome"] for d in dados_pecas if d["tipo"] == "topo"],
          "andar": [d["nome"] for d in dados_pecas if d["tipo"] == "andar"],
          "entulho": [d["nome"] for d in dados_pecas if d["tipo"] == "entulho"]}
traco = []
n = int(SUB[2] / PASSO) + 2
lay_rnd = random.Random(1103)
for qi in range(-n, n + 1):
    for qj in range(-n, n + 1):
        # o bar fica numa esquina (o meio do bairro é cruzamento)
        bx0 = SUB[0] + RUA / 2 + qi * PASSO
        bz0 = SUB[1] + RUA / 2 + qj * PASSO
        for li in range(2):
            for lj in range(2):
                x = bx0 + (li + 0.5) * LOTE
                z = bz0 + (lj + 0.5) * LOTE
                sorteio = lay_rnd.random()
                tipo = "entulho" if sorteio < 0.12 else "inteira" if sorteio < 0.37 else "topo" if sorteio < 0.7 else "andar"
                # a peça cabe no lote (o pé do prédio, girado, até a beira do lote)
                for _ in range(8):
                    nome = lay_rnd.choice(grupos[tipo])
                    k = lay_rnd.randrange(4)
                    d = dados_pecas[indice[nome]]
                    cx_, cz_, hx_, hz_, _t = d["caixas"][0]
                    if k % 2:
                        cx_, cz_, hx_, hz_ = cz_, cx_, hz_, hx_
                    if max(abs(cx_) + hx_, abs(cz_) + hz_) <= LOTE / 2 + 0.3:
                        break
                else:
                    continue
                r = d["raio"]
                if math.hypot(x - SUB[0], z - SUB[1]) > SUB[2] - r - 6:
                    continue
                if any(math.hypot(x - lx, z - lz) < FOLGA_LUGAR.get(nm, 30) + r for nm, (lx, lz) in LUGARES.items()):
                    continue
                if dist_seg(x, z, *RAMPA) < 12 + r:
                    continue
                traco.append((indice[nome], round(x, 2), round(z, 2), k))
print("TRACO", len(traco), "prédios", sum(1 for t in traco if dados_pecas[t[0]]["tipo"] != "entulho"))

# a conferência: a menor distância de cada lugar até a parede/entulho mais perto
def caixas_no_mundo(t):
    pi, x, z, k = t
    th = k * math.pi / 2
    s, c = math.sin(th), math.cos(th)
    out = []
    for cx, cz, hx, hz, topo in dados_pecas[pi]["caixas"]:
        wx, wz = x + cx * c + cz * s, z - cx * s + cz * c
        out.append((wx, wz, s, c, hx, hz, topo))
    return out
def dist_caixa(px_, pz_, b):
    wx, wz, tx, tz, hw, hd, _ = b
    dx, dz = px_ - wx, pz_ - wz
    lx, lz = dx * tz - dz * tx, dx * tx + dz * tz
    return math.hypot(max(0, abs(lx) - hw), max(0, abs(lz) - hd))
conf = {}
for nm, (lx, lz) in LUGARES.items():
    conf[nm] = round(min(dist_caixa(lx, lz, b) for t in traco for b in caixas_no_mundo(t)), 1)
print("CONFERE", conf)

tela = sum(dados_pecas[t[0]]["tri"] for t in traco)
print("TRI_TELA", tela, "TRI_KIT", sum(d["tri"] for d in dados_pecas))

ts = os.path.join(RAIZ, "app", "linha", "estrada", "ruinasDados.ts")
with open(ts, "w") as f:
    f.write("// GERADO por blender/scripts/suburbio_ruinas.py: não editar à mão.\n")
    f.write("// As peças do kit public/models/suburbio-ruinas.glb (nó = nome) e as caixas de\n")
    f.write("// colisão de cada uma (no espaço da peça, em metros do jogo: centro x, centro z,\n")
    f.write("// meia largura em x, meio fundo em z, topo), e o traçado das ruínas no chão do\n")
    f.write("// subúrbio: [peça, x, z, giro em quartos de volta], de 4 em 4.\n")
    f.write(f"// Conferência (m da parede mais perto até cada lugar): {json.dumps(conf, ensure_ascii=False)}\n")
    f.write("export const PECAS_RUINAS: { nome: string; tri: number; raio: number; caixas: number[][] }[] = [\n")
    for d in dados_pecas:
        f.write(f"  {{ nome: {json.dumps(d['nome'])}, tri: {d['tri']}, raio: {d['raio']}, caixas: {json.dumps(d['caixas'])} }},\n")
    f.write("]\n")
    f.write("export const TRACO_RUINAS: number[] = [\n")
    for t in traco:
        f.write(f"  {t[0]}, {t[1]}, {t[2]}, {t[3]},\n")
    f.write("]\n")
print("escrito", ts)

# ── exporta o kit ──
for o in sc.objects:
    o.select_set(False)
for p in pecas:
    p["obj"].select_set(True)
    p["obj"].matrix_world = Matrix.Identity(4)
bpy.ops.export_scene.gltf(filepath=SAIDA, export_format="GLB", use_selection=True, export_texcoords=True,
                          export_normals=True, export_materials="EXPORT", export_yup=True, export_apply=False,
                          export_image_format="WEBP")
print("exportado", SAIDA)

# ── retratos ──
if RETRATOS:
    os.makedirs(RETRATOS, exist_ok=True)
    sc.render.engine = "BLENDER_WORKBENCH"
    sh = sc.display.shading
    sh.light = "STUDIO"
    sh.color_type = "TEXTURE"
    sh.show_cavity = True
    sh.cavity_type = "WORLD"
    sc.render.resolution_x, sc.render.resolution_y = 1600, 1000
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
    sc.collection.objects.link(cam)
    sc.camera = cam
    def foto(nome, de, para, lente=35):
        cam.location = Vector(de)
        cam.rotation_euler = (Vector(para) - cam.location).to_track_quat("-Z", "Y").to_euler()
        cam.data.lens = lente
        sc.render.filepath = os.path.join(RETRATOS, nome)
        bpy.ops.render.render(write_still=True)
    # o kit enfileirado: cada modelo, inteiro / topo / andar
    vis = []
    for p in pecas:
        if p["H"]:
            q = bpy.data.objects.new("v_" + p["nome"], p["obj"].data)
            sc.collection.objects.link(q)
            col = ["inteira", "topo", "andar"].index(p["tipo"])
            q.location = (p["modelo"] * 30.0, -col * 34.0, 0)
            vis.append(q)
    for p in pecas:
        p["obj"].hide_render = True
    chao = bpy.data.meshes.new("chao")
    bmc = bmesh.new()
    bmesh.ops.create_grid(bmc, x_segments=1, y_segments=1, size=1)
    bmc.to_mesh(chao)
    bmc.free()
    ch = bpy.data.objects.new("chao", chao)
    sc.collection.objects.link(ch)
    ch.scale = (240, 80, 1)
    ch.location = (180, -34, -0.02)
    foto("ruinas-kit.png", (180, -260, 150), (180, -34, 5), 24)
    for q in vis:
        q.hide_render = True
    # o bairro: o chão do subúrbio (raio 260), as ruas e os lugares (marcadores)
    ch.scale = (SUB[2] + 40, SUB[2] + 40, 1)
    ch.location = (SUB[0], -SUB[1], -0.02)
    disco = bpy.data.meshes.new("sub")
    bmd = bmesh.new()
    bmesh.ops.create_circle(bmd, cap_ends=True, segments=64, radius=SUB[2])
    bmd.to_mesh(disco)
    bmd.free()
    dob = bpy.data.objects.new("sub", disco)
    sc.collection.objects.link(dob)
    dob.location = (SUB[0], -SUB[1], 0)
    mk = []
    for nm, (lx, lz) in LUGARES.items():
        bmm = bmesh.new()
        bmesh.ops.create_cone(bmm, cap_ends=True, segments=12, radius1=6, radius2=6, depth=30)
        mm = bpy.data.meshes.new("mk_" + nm)
        bmm.to_mesh(mm)
        bmm.free()
        q = bpy.data.objects.new("mk_" + nm, mm)
        sc.collection.objects.link(q)
        q.location = (lx, -lz, 15)
        mk.append(q)
    centro = (SUB[0], -SUB[1], 0)
    de_cima = (SUB[0] + 230, -SUB[1] - 330, 300)
    # no meio de uma rua norte-sul (as ruas passam em SUB + k x PASSO), olhando ao longo dela
    na_rua = (SUB[0] - PASSO, -(SUB[1] - PASSO * 0.5), 1.8)
    para_rua = (SUB[0] - PASSO, -(SUB[1] + PASSO * 3), 6)
    foto("ruinas-bairro-antes.png", de_cima, centro, 30)
    foto("ruinas-rua-antes.png", na_rua, para_rua, 20)
    for t in traco:
        d = dados_pecas[t[0]]
        q = bpy.data.objects.new("t", next(p for p in pecas if p["nome"] == d["nome"])["obj"].data)
        sc.collection.objects.link(q)
        q.location = (t[1], -t[2], 0)
        q.rotation_euler = (0, 0, t[3] * math.pi / 2)
    foto("ruinas-bairro-depois.png", de_cima, centro, 30)
    foto("ruinas-rua-depois.png", na_rua, para_rua, 20)
