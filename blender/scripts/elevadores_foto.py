# A foto dos elevadores (06/11): à esquerda, a ENTRADA encostada na torre do
# salão (o cilindro escuro, raio 6), com o número 1 e as faixas do grupo 1
# (Nectar, Sexta-Feira, Ojalá); à direita, a CHEGADA no anel da torre da ponta,
# encostada no prédio do meio, com a passarela esticada. Cycles, névoa leve.
#
#   blender -b --factory-startup --python blender/scripts/elevadores_foto.py -- bruto.glb docs/blender/elevadores.png [1400] [amostras]

import bpy, sys, math
from mathutils import Vector, Color

args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
GLB = args[0]
FOTO = args[1] if len(args) > 1 else "/tmp/elevadores.png"
LARG = int(args[2]) if len(args) > 2 else 1400
AMOSTRAS = int(args[3]) if len(args) > 3 else 96

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


NEON = {"entrada": "#9b8cff", "e_num1": "#9b8cff", "e_fx1": "#e0ff4f", "e_fx2": "#6d7bff", "e_fx3": "#b38cff",
        "chegada": "#ff6a35", "c_letreiro": "#ff6a35", "c_num1": "#ff6a35", "c_fx1": "#e0ff4f", "c_fx2": "#6d7bff",
        "c_fx3": "#b38cff", "passarela": "#ff6a35"}
for o in list(sc.objects):
    if o.type != "MESH":
        continue
    pai = o.parent.name if o.parent else o.name.rsplit("_", 1)[0]
    if pai not in NEON:
        o.hide_render = True
        continue
    me, nome = o.data, o.name
    if nome.endswith("_solido"):
        m, nt, b = novo("f_" + nome)
        s = nt.nodes.new("ShaderNodeVectorMath")
        s.operation = "SCALE"
        s.inputs["Scale"].default_value = 0.25
        nt.links.new(vc(nt, me).outputs["Color"], s.inputs[0])
        nt.links.new(s.outputs["Vector"], b.inputs["Base Color"])
        b.inputs["Roughness"].default_value = 0.55
        b.inputs["Metallic"].default_value = 0.3
    elif nome.endswith("_luz"):
        m, nt, b = novo("f_" + nome)
        b.inputs["Base Color"].default_value = (0, 0, 0, 1)
        nt.links.new(vc(nt, me).outputs["Color"], b.inputs["Emission Color"])
        b.inputs["Emission Strength"].default_value = 4.0
    elif nome.endswith("_neon"):
        m, nt, b = novo("f_" + nome)
        b.inputs["Base Color"].default_value = (0, 0, 0, 1)
        b.inputs["Emission Color"].default_value = lin(NEON[pai])
        b.inputs["Emission Strength"].default_value = 8.0
    else:
        m, nt, b = novo("f_" + nome)
        b.inputs["Base Color"].default_value = lin("#4f7f9a")
        b.inputs["Roughness"].default_value = 0.05
        b.inputs["Alpha"].default_value = 0.3
    me.materials.clear()
    me.materials.append(m)

# a chegada e a passarela vão pra direita; a passarela estica 7 m
XC = 15.0
for n in ("chegada", "c_letreiro", "c_num1", "c_fx1", "c_fx2", "c_fx3"):
    bpy.data.objects[n].location = (XC, 0, 0)
pas = bpy.data.objects["passarela"]
pas.location = (XC, 0, 0)
pas.scale = (1, 7, 1)


def solido(nome, cor, rough=0.8):
    m, nt, b = novo(nome)
    b.inputs["Base Color"].default_value = lin(cor)
    b.inputs["Roughness"].default_value = rough
    return m


# a torre do salão (raio 6, atrás da entrada) e o chão do salão
bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=6, depth=30, location=(0, 6.75, 15))
bpy.context.object.data.materials.append(solido("torre", "#3a3058"))
bpy.ops.mesh.primitive_plane_add(size=1, location=(0, -4, -0.01))
bpy.context.object.scale = (24, 20, 1)
bpy.context.object.data.materials.append(solido("chao", "#2a2230"))
# o prédio do meio da torre da ponta (atrás da casinha) e o asfalto do anel lá na frente
bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=26, depth=40, location=(XC, 4.25 + 26, 10))
bpy.context.object.data.materials.append(solido("predio", "#0b0a16", 0.3))
bpy.ops.mesh.primitive_cube_add(size=1, location=(XC, -7 - 4, -0.2))
bpy.context.object.scale = (16, 8, 0.4)
bpy.context.object.data.materials.append(solido("asfalto", "#141218", 0.6))


def luz(p, cor, w, r=0.2):
    d = bpy.data.lights.new("l", "POINT")
    d.color = lin(cor)[:3]
    d.energy = w
    d.shadow_soft_size = r
    o = bpy.data.objects.new("l", d)
    sc.collection.objects.link(o)
    o.location = p


luz((0, -3.5, 4.5), "#ffcf8a", 260, 1.0)
luz((-3, -1.5, 1.5), "#9b8cff", 60, 0.5)
luz((XC, -4, 5.5), "#ffcf8a", 260, 1.0)
luz((XC + 3.5, -2, 2), "#ff6a35", 80, 0.5)
luz((7.5, -14, 9), "#bfc8ff", 900, 3.0)

if sc.world is None:
    sc.world = bpy.data.worlds.new("Mundo")
w = sc.world
try:
    w.use_nodes = True
except Exception:
    pass
bg = next(n for n in w.node_tree.nodes if n.type == "BACKGROUND")
bg.inputs["Color"].default_value = lin("#0a0812")
bg.inputs["Strength"].default_value = 0.6

cd = bpy.data.cameras.new("cam")
cd.lens = 30
cam = bpy.data.objects.new("cam", cd)
sc.collection.objects.link(cam)
sc.camera = cam
cam.location = (7.5, -17.5, 3.4)
alvo = Vector((7.5, 0, 3.0))
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
sc.view_settings.exposure = 1.0
sc.render.resolution_x = LARG
sc.render.resolution_y = int(LARG * 9 / 16)
sc.render.filepath = FOTO
bpy.ops.render.render(write_still=True)
print("FOTO", FOTO)
