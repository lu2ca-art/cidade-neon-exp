# A foto do parque à noite (docs/blender/parque.png): roda no mesmo Blender
# depois do parque.py (usa as peças da cena). Monta um pedaço de trilho como o
# jogo monta (os dois trilhos e a espinha gerados da curva, os dormentes, os
# pilares empilhados com a sela), o carrinho no morro com você e a Nizzy, a
# roda-gigante com as 16 cabines e a estação com o portão e a bilheteria.
#
#   blender -b --factory-startup --python blender/scripts/parque.py \
#     --python blender/scripts/parque_foto.py -- bruto.glb docs/blender/parque.png [1400] [96]

import bpy, sys, math
from mathutils import Vector, Matrix, Color

args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
FOTO = args[1] if len(args) > 1 else "/tmp/parque.png"
LARG = int(args[2]) if len(args) > 2 else 1400
AMOSTRAS = int(args[3]) if len(args) > 3 else 96
sc = bpy.context.scene
TAU = 2 * math.pi


def lin(h):
    c = Color((int(h[1:3], 16) / 255, int(h[3:5], 16) / 255, int(h[5:7], 16) / 255)).from_srgb_to_scene_linear()
    return (c.r, c.g, c.b, 1.0)


def mat(nome, cor=None, emite=0.0, rough=0.5, metal=0.0, vc=False, tinta=None):
    m = bpy.data.materials.new(nome)
    try:
        m.use_nodes = True
    except Exception:
        pass
    nt = m.node_tree
    b = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    src = None
    if vc:
        a = nt.nodes.new("ShaderNodeVertexColor")
        a.layer_name = "Col"
        src = a.outputs["Color"]
        if tinta:
            mx = nt.nodes.new("ShaderNodeMix")
            mx.data_type = "RGBA"
            mx.blend_type = "MULTIPLY"
            mx.inputs["Factor"].default_value = 1.0
            nt.links.new(src, mx.inputs[6])
            mx.inputs[7].default_value = lin(tinta)
            src = mx.outputs[2]
    if emite:
        b.inputs["Base Color"].default_value = (0, 0, 0, 1)
        if src:
            nt.links.new(src, b.inputs["Emission Color"])
        else:
            b.inputs["Emission Color"].default_value = lin(cor)
        b.inputs["Emission Strength"].default_value = emite
    else:
        if src:
            nt.links.new(src, b.inputs["Base Color"])
        else:
            b.inputs["Base Color"].default_value = lin(cor)
    return m


M_SOL = mat("f_sol", vc=True, rough=0.4, metal=0.3)
M_LUZ = mat("f_luz", vc=True, emite=4.0)
for o in list(bpy.data.objects):
    if o.type == "MESH" and o.name.endswith("_solido"):
        o.data.materials.clear(); o.data.materials.append(M_SOL)
    elif o.type == "MESH" and o.name.endswith("_luz"):
        o.data.materials.clear(); o.data.materials.append(M_LUZ)
    if o.type == "MESH" or o.type == "EMPTY":
        o.hide_render = True


def copia(nome, M, material=None):
    src = bpy.data.objects[nome]
    o = bpy.data.objects.new(nome + "_c", src.data)
    sc.collection.objects.link(o)
    o.matrix_world = M
    if material:
        o.material_slots[0].link = "OBJECT"
        o.material_slots[0].material = material
    return o


def peca(no, M, mats=None):
    for g in ("solido", "luz"):
        if f"{no}_{g}" in bpy.data.objects:
            copia(f"{no}_{g}", M, (mats or {}).get(g))


def Rz(a):
    return Matrix.Rotation(a, 4, "Z")


# ── o chão ──
me = bpy.data.meshes.new("f_chao")
me.from_pydata([(-600, -600, 0), (600, -600, 0), (600, 600, 0), (-600, 600, 0)], [], [(0, 1, 2, 3)])
me.materials.append(mat("f_chao_m", "#0d0f16", rough=0.35, metal=0.2))
sc.collection.objects.link(bpy.data.objects.new("f_chao", me))

# ── a estação e o portão (o portão olha pra câmera) ──
EST = Vector((-30, 6, 0))
peca("estacao", Matrix.Translation(EST) @ Rz(-math.pi / 2))

# ── o trilho: reto na estação, o morro, a descida em curva ──
CP = [(-48, 6, 1.5), (-30, 6, 1.5), (-16, 6, 1.5), (-4, 6, 6), (8, 7, 16), (18, 9, 20), (27, 12, 15),
      (35, 18, 5), (42, 28, 2.5), (46, 40, 4), (46, 52, 8)]
CP = [Vector(p) for p in CP]


def cr(i, t):
    p0, p1, p2, p3 = (CP[max(0, min(len(CP) - 1, k))] for k in (i - 1, i, i + 1, i + 2))
    return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3)


bruto = [cr(i, k / 40) for i in range(len(CP) - 1) for k in range(40)] + [CP[-1]]
# reamostra a cada 0,25 m
pts, acc = [bruto[0]], 0.0
for a, b in zip(bruto, bruto[1:]):
    d = (b - a).length
    acc += d
    while acc >= 0.25:
        acc -= 0.25
        pts.append(b - (b - a).normalized() * acc)
fr = []
for i, p in enumerate(pts):
    t = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
    up = (Vector((0, 0, 1)) - t * t.z).normalized()
    fr.append((p, t, up, t.cross(up).normalized()))


def curva(nome, lista, raio, m):
    cu = bpy.data.curves.new(nome, "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = raio
    cu.bevel_resolution = 1
    sp = cu.splines.new("POLY")
    sp.points.add(len(lista) - 1)
    for k, p in enumerate(lista):
        sp.points[k].co = (p.x, p.y, p.z, 1)
    cu.materials.append(m)
    sc.collection.objects.link(bpy.data.objects.new(nome, cu))


m_trilho = mat("f_trilho", emite=0.0, cor="#d9dde8", rough=0.3, metal=0.7)
m_trilho_e = mat("f_trilho_e", "#2fe8ff", emite=1.6)
m_esp = mat("f_espinha", "#ff5b5b", emite=1.2)
for s in (-0.55, 0.55):
    curva(f"f_trilho{s}", [p + l * s for p, t, u, l in fr], 0.08, m_trilho_e)
curva("f_espinha", [p - u * 0.35 for p, t, u, l in fr], 0.16, m_esp)


def base(p, t, u, l):
    return Matrix(((l.x, t.x, u.x, p.x), (l.y, t.y, u.y, p.y), (l.z, t.z, u.z, p.z), (0, 0, 0, 1)))


for i in range(0, len(fr), 4):
    p, t, u, l = fr[i]
    peca("dormente", base(p - u * 0.15, t, u, l))
for i in range(20, len(fr), 40):
    p, t, u, l = fr[i]
    h = p.z - 0.5
    if h < 2:
        continue
    n = max(1, round(h / 3))
    yaw = math.atan2(-t.x, t.y)
    for k in range(n):
        peca("pilar", Matrix.Translation((p.x, p.y, k * h / n)) @ Rz(yaw) @ Matrix.Diagonal((1, 1, h / (n * 3), 1)))
    peca("pilartopo", Matrix.Translation((p.x, p.y, h)) @ Rz(yaw))

# ── o carrinho subindo o morro, com você e a Nizzy de braços pra cima ──
ic = int(len(fr) * 0.36)
p, t, u, l = fr[ic]
MC = base(p, t, u, l)
peca("carro", MC)
for x, cor in ((-0.4, "#ff3fb0"), (0.4, "#ff5b5b")):
    m_g = mat("f_gente" + cor, "#14152a", rough=0.6)
    m_ge = mat("f_gentee" + cor, cor, emite=0.6)
    for nome, loc, esc in (("corpo", (x, -0.2, 1.05), (0.22, 0.22, 0.47)), ("cabeca", (x, -0.2, 1.6), (0.18, 0.18, 0.18))):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8)
        o = bpy.context.active_object
        o.matrix_world = MC @ Matrix.Translation(loc) @ Matrix.Diagonal(esc + (1,))
        o.data.materials.append(m_g)
    for sx in (-1, 1):
        bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=0.06, depth=0.6)
        o = bpy.context.active_object
        o.matrix_world = MC @ Matrix.Translation((x + sx * 0.3, -0.2, 1.75)) @ Matrix.Rotation(sx * 0.25, 4, "Y")
        o.data.materials.append(m_ge)

# ── a roda-gigante (o plano da roda de frente pra câmera, meio de lado) ──
RG, HG = 22.0, 24.0
PR = Vector((22, 70, 0))
rot = Rz(math.radians(-18))
peca("roda", Matrix.Translation(PR) @ rot)
giro = 0.3
peca("aro", Matrix.Translation(PR) @ rot @ Matrix.Translation((0, 0, HG)) @ Matrix.Rotation(giro, 4, "Y"))
m_cab = {c: mat("f_cab" + c, vc=True, emite=4.0, tinta=c) for c in ("#ff3fb0", "#5dffa0")}
for i in range(16):
    a = TAU * i / 16 + giro
    piv = Vector((RG * math.cos(a), 0, RG * math.sin(a) + HG))
    peca("cabine", Matrix.Translation(PR) @ rot @ Matrix.Translation(piv), {"luz": m_cab["#ff3fb0" if i % 2 else "#5dffa0"]})

# ── a noite ──
if sc.world is None:
    sc.world = bpy.data.worlds.new("Mundo")
sc.world.use_nodes = True
bg = next(n for n in sc.world.node_tree.nodes if n.type == "BACKGROUND")
bg.inputs["Color"].default_value = (0.008, 0.011, 0.03, 1)
bg.inputs["Strength"].default_value = 1.0


def luz(nome, tipo, energia, cor, loc, alvo=None, tam=1.0):
    d = bpy.data.lights.new(nome, tipo)
    d.energy = energia
    d.color = cor
    if tipo == "AREA":
        d.size = tam
    else:
        d.shadow_soft_size = tam
    o = bpy.data.objects.new(nome, d)
    sc.collection.objects.link(o)
    o.location = loc
    if alvo:
        o.rotation_euler = (Vector(alvo) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()


luz("f_lua", "SUN", 1.6, (0.55, 0.65, 1.0), (0, 0, 50), (20, 40, 0))
bpy.data.objects["f_lua"].rotation_euler = (math.radians(55), 0, math.radians(-30))
luz("f_parque", "POINT", 300000, (1.0, 0.36, 0.36), (EST.x, EST.y, 30), tam=3)   # a LuzPonto do jogo, por cima da estação
luz("f_portao", "POINT", 3000, (1.0, 0.8, 0.55), (EST.x - 1, EST.y - 26, 6), tam=1.5)
luz("f_roda", "POINT", 40000, (1.0, 0.8, 0.45), (PR.x, PR.y - 10, 14), tam=4)
luz("f_carro", "POINT", 1500, (0.3, 0.9, 1.0), tuple(p + Vector((0, -4, 4))), tam=1)
luz("f_recorte", "AREA", 50000, (0.5, 0.55, 1.0), (10, 90, 50), (0, 0, 0), tam=60)

cd = bpy.data.cameras.new("f_cam")
cd.lens = 19
cam = bpy.data.objects.new("f_cam", cd)
sc.collection.objects.link(cam)
cam.location = (-24, -50, 6.5)
cam.rotation_euler = (Vector((-2, 20, 11)) - cam.location).to_track_quat("-Z", "Y").to_euler()
sc.camera = cam

try:
    sc.render.engine = "CYCLES"
except TypeError as e:
    print("engine", e)
sc.cycles.samples = AMOSTRAS
sc.cycles.use_denoising = True
sc.view_settings.view_transform = "AgX"
try:
    sc.view_settings.look = "AgX - Medium High Contrast"
except TypeError:
    pass
sc.render.resolution_x = LARG
sc.render.resolution_y = int(LARG * 0.5625)
sc.render.image_settings.file_format = "PNG"
sc.render.filepath = FOTO
bpy.ops.render.render(write_still=True)
print("FOTO", FOTO)
