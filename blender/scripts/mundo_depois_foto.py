# A foto do mundo depois (06/11): um prédio alto à noite tomado pela planta do
# Criador (tufos nas janelas, trepadeiras em módulos empilhados, brotos acesos)
# e, ao lado, o poço da torre com uma cabine de vidro subindo. Os materiais
# imitam os do jogo (sem luz: o sólido é a cor do vértice x 0,25, o brilho é a
# cor direta, o vidro e a faixa da cabine tingidos com a cor de "sobe").
#
#   blender -b --factory-startup --python blender/scripts/mundo_depois_foto.py -- bruto.glb docs/blender/mundo-depois.png [1400] [amostras]

import bpy, sys, math, random
from mathutils import Vector, Color

args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
GLB = args[0]
FOTO = args[1] if len(args) > 1 else "/tmp/mundo-depois.png"
LARG = int(args[2]) if len(args) > 2 else 1400
AMOSTRAS = int(args[3]) if len(args) > 3 else 64

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
bpy.ops.import_scene.gltf(filepath=GLB)
rr = random.Random(5)


def lin(h, k=1.0):
    c = Color((int(h[1:3], 16) / 255, int(h[3:5], 16) / 255, int(h[5:7], 16) / 255)).from_srgb_to_scene_linear()
    return (c.r * k, c.g * k, c.b * k, 1.0)


def emissao(nome, cor=None, vc=None, k=1.0, alfa=None):
    m = bpy.data.materials.new(nome)
    try:
        m.use_nodes = True
    except Exception:
        pass
    nt = m.node_tree
    for n in list(nt.nodes):
        if n.type != "OUTPUT_MATERIAL":
            nt.nodes.remove(n)
    out = next(n for n in nt.nodes if n.type == "OUTPUT_MATERIAL")
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Strength"].default_value = k
    if vc is not None:
        a = nt.nodes.new("ShaderNodeVertexColor")
        a.layer_name = vc
        if cor is not None:
            mu = nt.nodes.new("ShaderNodeMix")
            mu.data_type = "RGBA"
            mu.blend_type = "MULTIPLY"
            mu.inputs["Factor"].default_value = 1.0
            nt.links.new(a.outputs["Color"], mu.inputs["A"])
            mu.inputs["B"].default_value = cor
            nt.links.new(mu.outputs["Result"], em.inputs["Color"])
        else:
            nt.links.new(a.outputs["Color"], em.inputs["Color"])
    else:
        em.inputs["Color"].default_value = cor
    sh = em
    if alfa is not None:
        tr = nt.nodes.new("ShaderNodeBsdfTransparent")
        mx = nt.nodes.new("ShaderNodeMixShader")
        mx.inputs["Fac"].default_value = alfa
        nt.links.new(tr.outputs[0], mx.inputs[1])
        nt.links.new(em.outputs[0], mx.inputs[2])
        sh = mx
    nt.links.new(sh.outputs[0], out.inputs["Surface"])
    return m


SOBE = lin("#ffe2a8")
for o in list(sc.objects):
    if o.type != "MESH":
        continue
    vc = o.data.color_attributes[0].name if len(o.data.color_attributes) else None
    if o.name.endswith("_solido"):
        m = emissao("f_" + o.name, (0.25, 0.25, 0.25, 1), vc)
    elif o.name.endswith("_luz"):
        m = emissao("f_" + o.name, SOBE if o.name.startswith("cabine") else None, vc, 1.6 if o.name.startswith("broto") else 1.2)
    else:
        m = emissao("f_" + o.name, SOBE, vc, 1.0, alfa=0.35)
    o.data.materials.clear()
    o.data.materials.append(m)

PECAS = {o.name: o for o in sc.objects if o.type == "EMPTY"}
for e in PECAS.values():
    e.hide_render = True
    for c in e.children:
        c.hide_render = True


def inst(peca, loc, rotz=0.0, esc=(1, 1, 1)):
    src = PECAS[peca]
    e = bpy.data.objects.new(peca + "_i", None)
    sc.collection.objects.link(e)
    e.location, e.rotation_euler, e.scale = loc, (0, 0, rotz), esc
    for ch in src.children:
        o = ch.copy()
        o.hide_render = False
        sc.collection.objects.link(o)
        o.parent = e
        o.matrix_parent_inverse = ch.matrix_parent_inverse.copy()
    return e


# ── o prédio (16 x 14 x 52 m), janelas acesas em grade ──
W, D, H = 16.0, 14.0, 52.0
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, H / 2))
pr = bpy.context.object
pr.scale = (W, D, H)
m = bpy.data.materials.new("predio")
try:
    m.use_nodes = True
except Exception:
    pass
nt = m.node_tree
for n in list(nt.nodes):
    if n.type != "OUTPUT_MATERIAL":
        nt.nodes.remove(n)
out = next(n for n in nt.nodes if n.type == "OUTPUT_MATERIAL")
tc = nt.nodes.new("ShaderNodeTexCoord")
br = nt.nodes.new("ShaderNodeTexBrick")
br.inputs["Scale"].default_value = 1.0
br.inputs["Mortar Size"].default_value = 0.35
br.inputs["Brick Width"].default_value = 2.0
br.inputs["Row Height"].default_value = 3.5
br.offset = 0.0
br.inputs["Color1"].default_value = lin("#ffd9a0", 0.22)
br.inputs["Color2"].default_value = lin("#7fd0ff", 0.1)
br.inputs["Mortar"].default_value = lin("#0d0b16")
sep = nt.nodes.new("ShaderNodeSeparateXYZ")
cmb = nt.nodes.new("ShaderNodeCombineXYZ")
mt = nt.nodes.new("ShaderNodeVectorMath")
mt.operation = "ADD"
nt.links.new(tc.outputs["Object"], sep.inputs[0])
# a fachada em metros: x (ou y) ao longo, z pra cima
sx = nt.nodes.new("ShaderNodeMath"); sx.operation = "MULTIPLY"; sx.inputs[1].default_value = W
sy = nt.nodes.new("ShaderNodeMath"); sy.operation = "MULTIPLY"; sy.inputs[1].default_value = D
sz = nt.nodes.new("ShaderNodeMath"); sz.operation = "MULTIPLY"; sz.inputs[1].default_value = H
nt.links.new(sep.outputs[0], sx.inputs[0]); nt.links.new(sep.outputs[1], sy.inputs[0]); nt.links.new(sep.outputs[2], sz.inputs[0])
ad = nt.nodes.new("ShaderNodeMath"); ad.operation = "ADD"
nt.links.new(sx.outputs[0], ad.inputs[0]); nt.links.new(sy.outputs[0], ad.inputs[1])
nt.links.new(ad.outputs[0], cmb.inputs[0]); nt.links.new(sz.outputs[0], cmb.inputs[1])
nt.links.new(cmb.outputs[0], br.inputs["Vector"])
em = nt.nodes.new("ShaderNodeEmission")
nt.links.new(br.outputs["Color"], em.inputs["Color"])
em.inputs["Strength"].default_value = 1.0
nt.links.new(em.outputs[0], out.inputs["Surface"])
pr.data.materials.append(m)

# o chão
bpy.ops.mesh.primitive_plane_add(size=1, location=(10, -20, 0))
bpy.context.object.scale = (120, 120, 1)
bpy.context.object.data.materials.append(emissao("chao", lin("#141020")))

# ── as plantas: frente (y = -D/2, olha -Y) e lado direito (x = W/2, olha +X) ──
FACES = [((0, -D / 2), 0.0, (1, 0), W), ((W / 2, 0), math.pi / 2, (0, 1), D)]
for (c, rot, ax, L) in FACES:
    for andar in range(2, 15):
        z = andar * 3.5 + 0.9
        for col in range(int(L / 2)):
            if rr.random() > 0.38:
                continue
            a = -L / 2 + 1 + col * 2 + 1
            p = Vector((c[0] + ax[0] * a, c[1] + ax[1] * a, z))
            k = rr.uniform(0.9, 1.4)
            v = rr.choice(("tufo_a", "tufo_b", "tufo_c"))
            inst(v, p, rot, (k, k * rr.uniform(0.85, 1.15), k))
            if rr.random() < 0.7:
                q = p + Vector((math.cos(rot - math.pi / 2), math.sin(rot - math.pi / 2), 0)) * 0.8 * k
                inst("broto", q + Vector((ax[0], ax[1], 0)) * rr.uniform(-0.8, 0.8) * k + Vector((0, 0, rr.uniform(-0.2, 0.4))), rot, (k * 1.3,) * 3)
    # trepadeiras
    for a in ([-5.5, 2.0, 6.0] if rot == 0 else [-3.0, 4.5]):
        s = rr.uniform(0.85, 1.15)
        Hv = rr.uniform(18, 38)
        n = max(1, round((Hv / s - 3.0 - 2.5) / 6.0))
        sy_ = Hv / (3.0 + 6.0 * n + 2.5)
        base = Vector((c[0] + ax[0] * a, c[1] + ax[1] * a, 0))
        inst("trep_base", base, rot, (s, s, sy_))
        for i in range(n):
            pz = (3.0 + 6.0 * i) * sy_
            inst("trep_meio", base + Vector((0, 0, pz)), rot, (s, s, sy_))
            fora = Vector((math.cos(rot - math.pi / 2), math.sin(rot - math.pi / 2), 0))
            inst("broto", base + fora * 0.5 * s + Vector((ax[0], ax[1], 0)) * rr.uniform(-0.6, 0.6) * s + Vector((0, 0, pz + rr.uniform(1, 5) * sy_)), rot, (1.3,) * 3)
        inst("trep_topo", base + Vector((0, 0, (3.0 + 6.0 * n) * sy_)), rot, (s, s, sy_))

# ── o poço da torre e a cabine subindo (o núcleo atrás, a frente olha +X... aqui pra câmera) ──
TX, TY = 27.0, -2.0
bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=3.0, depth=70, location=(TX - 5.6, TY + 3.0, 35))
bpy.context.object.data.materials.append(emissao("nucleo", lin("#1a1428")))
ang = math.radians(-80)  # a frente da cabine (o +X dela) aponta da torre pra fora, meio pra câmera
cab = inst("cabine", (TX - 5.6 + math.cos(ang) * 5.6, TY + 3.0 + math.sin(ang) * 5.6, 17.0), ang, (1, 1, 1))
bpy.ops.mesh.primitive_cube_add(size=1, location=(TX - 5.6 + math.cos(ang) * 7.1, TY + 3.0 + math.sin(ang) * 7.1, 35))
tr = bpy.context.object
tr.scale = (0.35, 0.35, 70)
tr.rotation_euler = (0, 0, ang)
tr.data.materials.append(emissao("trilho", lin("#7fe8ff", 0.5), alfa=0.35))

if sc.world is None:
    sc.world = bpy.data.worlds.new("Mundo")
w = sc.world
try:
    w.use_nodes = True
except Exception:
    pass
bg = next(n for n in w.node_tree.nodes if n.type == "BACKGROUND")
bg.inputs["Color"].default_value = lin("#0a0a1c")
bg.inputs["Strength"].default_value = 1.0

cd = bpy.data.cameras.new("cam")
cd.lens = 26
cam = bpy.data.objects.new("cam", cd)
sc.collection.objects.link(cam)
sc.camera = cam
cam.location = (30, -44, 7)
alvo = Vector((10, 0, 23))
cam.rotation_euler = (alvo - cam.location).to_track_quat("-Z", "Y").to_euler()

try:
    sc.render.engine = "CYCLES"
except TypeError as e:
    print("engine", e)
sc.cycles.samples = AMOSTRAS
try:
    sc.cycles.use_denoising = True
except Exception:
    pass
try:
    pr_ = bpy.context.preferences.addons["cycles"].preferences
    pr_.compute_device_type = "METAL"
    pr_.get_devices()
    for d in pr_.devices:
        d.use = True
    sc.cycles.device = "GPU"
except Exception as e:
    print("gpu", e)
try:
    sc.view_settings.view_transform = "Standard"
except TypeError:
    pass
sc.render.resolution_x = LARG
sc.render.resolution_y = int(LARG * 9 / 16)
sc.render.filepath = FOTO
bpy.ops.render.render(write_still=True)
print("FOTO", FOTO)
