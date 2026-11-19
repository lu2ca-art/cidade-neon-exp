# A foto de um andar do elevador de terror (T47): de dentro da cabine parada, com
# a grade pantográfica quase dobrada, olhando pro andar escuro; a luz verde das
# cápsulas, o vermelho de emergência, as cibercamas e as máquinas "dormindo".
# Junta os tipos num andar só (no jogo cada andar tem um tipo). Na cama, uma
# silhueta escura de caixa (no jogo, o robô vem do Tripo). Cycles, névoa leve.
#
#   blender -b --factory-startup --python blender/scripts/terror_foto.py -- bruto.glb docs/blender/terror.png [1200] [amostras]

import bpy, sys, math
from mathutils import Matrix, Vector, Color

args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
GLB = args[0]
FOTO = args[1] if len(args) > 1 else "/tmp/terror.png"
LARG = int(args[2]) if len(args) > 2 else 1200
AMOSTRAS = int(args[3]) if len(args) > 3 else 128

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
bpy.ops.import_scene.gltf(filepath=GLB)


def lin(h, k=1.0):
    c = Color((int(h[1:3], 16) / 255, int(h[3:5], 16) / 255, int(h[5:7], 16) / 255)).from_srgb_to_scene_linear()
    return (c.r * k, c.g * k, c.b * k, 1.0)


def novo(nome):
    m = bpy.data.materials.new(nome)
    try:
        m.use_nodes = True
    except Exception:
        pass
    return m, m.node_tree, next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")


def vc(nt, me):
    a = nt.nodes.new("ShaderNodeVertexColor")
    a.layer_name = me.color_attributes[0].name if len(me.color_attributes) else ""
    return a


def mat_para(o):
    me, nome = o.data, o.name
    if nome.endswith("_solido"):
        m, nt, b = novo("f_" + nome)
        s = nt.nodes.new("ShaderNodeVectorMath")
        s.operation = "SCALE"
        s.inputs["Scale"].default_value = 0.25  # o GANHO do terror.py
        nt.links.new(vc(nt, me).outputs["Color"], s.inputs[0])
        nt.links.new(s.outputs["Vector"], b.inputs["Base Color"])
        b.inputs["Roughness"].default_value = 0.7
    elif nome.endswith("_luz"):
        m, nt, b = novo("f_" + nome)
        b.inputs["Base Color"].default_value = (0, 0, 0, 1)
        nt.links.new(vc(nt, me).outputs["Color"], b.inputs["Emission Color"])
        b.inputs["Emission Strength"].default_value = 1.2 if nome.startswith("cabine") else 6.0
    elif nome.endswith("_neon"):
        m, nt, b = novo("f_" + nome)
        cor = {"cabine": "#ff2a2a", "cama": "#4ff3ff", "maquina": "#ff5c8a"}[nome.split("_")[0]]
        b.inputs["Base Color"].default_value = (0, 0, 0, 1)
        b.inputs["Emission Color"].default_value = lin(cor)
        b.inputs["Emission Strength"].default_value = 10.0 if nome.startswith("cabine") else 2.5
    else:  # o vidro: o líquido verde brilha e deixa ver a silhueta
        m, nt, b = novo("f_" + nome)
        b.inputs["Base Color"].default_value = (0, 0, 0, 1)
        nt.links.new(vc(nt, me).outputs["Color"], b.inputs["Emission Color"])
        b.inputs["Emission Strength"].default_value = 1.6
        b.inputs["Alpha"].default_value = 0.45
    me.materials.clear()
    me.materials.append(m)


PECAS = {}
for nome in ("cabine", "porta", "cama", "capsula", "maquina", "andar", "poco"):
    e = bpy.data.objects[nome]
    PECAS[nome] = [c for c in e.children if c.type == "MESH"]
    for c in PECAS[nome]:
        mat_para(c)
        c.hide_render = True
        c.hide_viewport = True


def T(x, y, z):
    return Matrix.Translation((x, y, z))


def inst(nome, M):
    for c in PECAS[nome]:
        o = bpy.data.objects.new(c.name + ".i", c.data)
        sc.collection.objects.link(o)
        o.matrix_world = M @ c.matrix_world


# o andar, o poço (um embaixo, um na altura, um em cima), a cabine parada no andar
inst("andar", T(0, 0, 0))
inst("andar", T(0, 0, 4.2))
for k in (-1, 0, 1):
    inst("poco", T(0, 0, k * 4.2))
inst("cabine", T(0, 0, 0))
inst("porta", T(1.8, -1.8, 0) @ Matrix.Diagonal((0.14, 1, 1, 1)))
# as peças: a 1ª fileira mistura, a 2ª é de cápsulas (o verde no fundo)
fil1 = {-5.5: "capsula", -2.75: "maquina", 0.0: "cama", 2.75: "capsula", 5.5: "maquina"}
for x, p in fil1.items():
    inst(p, T(x, -5, 0))
for x in (-4.125, -1.375, 1.375, 4.125):
    inst("capsula", T(x, -10, 0))
inst("cama", T(6.875, -10, 0))
silh, ntS, bS = novo("silhueta")
bS.inputs["Base Color"].default_value = lin("#0a0810")
for x, y in ((0.0, -5), (6.875, -10)):  # a forma de caixa do robô de hoje (o modelo vem do Tripo)
    for p, s in (((0, -0.1, 0.63), (0.5, 1.5, 0.26)), ((0, 0.82, 0.66), (0.34, 0.34, 0.3))):
        bpy.ops.mesh.primitive_cube_add(size=1, location=(x + p[0], y + p[1], p[2]))
        o = bpy.context.object
        o.scale = s
        o.data.materials.append(silh)

# as luzes de verdade (no jogo é a cor dos materiais): verde nas cápsulas, vermelho
def luz(p, cor, w, r=0.2):
    d = bpy.data.lights.new("l", "POINT")
    d.color = lin(cor)[:3]
    d.energy = w
    d.shadow_soft_size = r
    o = bpy.data.objects.new("l", d)
    sc.collection.objects.link(o)
    o.location = p


for x, p in fil1.items():
    if p == "capsula":
        luz((x, -5, 1.3), "#3dff9a", 60, 0.3)
for x in (-4.125, -1.375, 1.375, 4.125):
    luz((x, -10, 1.3), "#3dff9a", 60, 0.3)
for x, y in ((-4.1, -7.5), (4.1, -7.5), (-4.1, -13.5), (4.1, -13.5)):
    luz((x, y + 0.4, 2.7), "#ff2a2a", 10, 0.05)
for x in (-5.0, 0.0, 5.0):
    luz((x, -17.0, 2.9), "#ff2a2a", 12, 0.05)
luz((1.55, 1.55, 2.4), "#ff2a2a", 60, 0.05)  # a emergência da cabine
luz((-0.8, -3.2, 1.0), "#4ff3ff", 2, 0.3)     # o monitor das camas, fraquinho

# a névoa
mv = bpy.data.materials.new("nevoa")
try:
    mv.use_nodes = True
except Exception:
    pass
nt = mv.node_tree
for n in list(nt.nodes):
    if n.type != "OUTPUT_MATERIAL":
        nt.nodes.remove(n)
vs = nt.nodes.new("ShaderNodeVolumeScatter")
vs.inputs["Density"].default_value = 0.024
nt.links.new(vs.outputs[0], next(n for n in nt.nodes if n.type == "OUTPUT_MATERIAL").inputs["Volume"])
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, -7.5, 2.0))
cx = bpy.context.object
cx.scale = (16.3, 20.5, 4.4)
cx.data.materials.append(mv)

if sc.world is None:
    sc.world = bpy.data.worlds.new("Mundo")
w = sc.world
try:
    w.use_nodes = True
except Exception:
    pass
bg = next(n for n in w.node_tree.nodes if n.type == "BACKGROUND")
bg.inputs["Color"].default_value = lin("#06040b")
bg.inputs["Strength"].default_value = 0.4

cd = bpy.data.cameras.new("cam")
cd.lens = 20
cam = bpy.data.objects.new("cam", cd)
sc.collection.objects.link(cam)
sc.camera = cam
cam.location = (-0.35, 0.6, 1.6)
alvo = Vector((0.4, -9.0, 1.25))
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
    pr = bpy.context.preferences.addons["cycles"].preferences
    pr.compute_device_type = "METAL"
    pr.get_devices()
    for d in pr.devices:
        d.use = True
    sc.cycles.device = "GPU"
except Exception as e:
    print("gpu", e)
try:
    sc.view_settings.view_transform = "AgX"
except TypeError:
    pass
sc.view_settings.exposure = 0.6
sc.render.resolution_x = LARG
sc.render.resolution_y = int(LARG * 2 / 3)
sc.render.filepath = FOTO
bpy.ops.render.render(write_still=True)
print("FOTO", FOTO)
