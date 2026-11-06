# A foto da moto (06/11): 3/4 de frente, de noite, no asfalto molhado, neon aceso.
# Lê o .blend que o moto.py salva (as peças no lugar, cor × AO, _RM e _EMI) e
# monta o material como o do jogo (cor, roughness, metalness e brilho dos vértices),
# mais o disco neon transparente de cada roda (no jogo é o MAT_MOTO.aro).
#
#   blender -b --factory-startup --python blender/scripts/moto_foto.py -- moto.blend docs/blender/moto.png [largura] [amostras] [vista]
#   vista: frente (padrão) | lado | tras

import bpy, sys
from mathutils import Vector, Color

args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
bpy.ops.wm.open_mainfile(filepath=args[0])
FOTO = args[1] if len(args) > 1 else "/tmp/moto.png"
LARG = int(args[2]) if len(args) > 2 else 1400
AMOSTRAS = int(args[3]) if len(args) > 3 else 128
VISTA = args[4] if len(args) > 4 else "frente"
sc = bpy.context.scene


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


def attr(nt, nome):
    a = nt.nodes.new("ShaderNodeAttribute")
    a.attribute_name = nome
    return a


# o material do jogo, nos vértices
m, nt, b = novo("pecas")
nt.links.new(attr(nt, "Col").outputs["Color"], b.inputs["Base Color"])
sep = nt.nodes.new("ShaderNodeSeparateXYZ")
nt.links.new(attr(nt, "_RM").outputs["Vector"], sep.inputs[0])
nt.links.new(sep.outputs["X"], b.inputs["Roughness"])
nt.links.new(sep.outputs["Y"], b.inputs["Metallic"])
nt.links.new(attr(nt, "_EMI").outputs["Vector"], b.inputs["Emission Color"])
b.inputs["Emission Strength"].default_value = 6.0
for nome in ("roda_t", "roda_f", "garfo", "quadro"):
    o = bpy.data.objects[nome]
    o.data.materials.clear()
    o.data.materials.append(m)

# o disco neon de cada roda (transparente, como no jogo)
ma, nta, ba = novo("aro")
ba.inputs["Base Color"].default_value = (0, 0, 0, 1)
ba.inputs["Emission Color"].default_value = lin("#2fe8ff")
ba.inputs["Emission Strength"].default_value = 1.5
ba.inputs["Alpha"].default_value = 0.35
for nome in ("roda_t", "roda_f"):
    p = bpy.data.objects[nome].location
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.2, depth=0.04, location=p, rotation=(0, 1.5708, 0))
    bpy.context.object.data.materials.append(ma)

# o asfalto molhado
mc, ntc, bc = novo("asfalto")
bc.inputs["Base Color"].default_value = lin("#15131b")
bc.inputs["Roughness"].default_value = 0.22
bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, 0))
bpy.context.object.data.materials.append(mc)
# um muro no fundo, com uma faixa de neon (pra ter reflexo e silhueta)
mw, ntw, bw = novo("muro")
bw.inputs["Base Color"].default_value = lin("#1c1a26")
bw.inputs["Roughness"].default_value = 0.8
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 5.5, 2))
bpy.context.object.scale = (30, 0.3, 4)
bpy.context.object.data.materials.append(mw)
mn, ntn, bn = novo("faixa")
bn.inputs["Base Color"].default_value = (0, 0, 0, 1)
bn.inputs["Emission Color"].default_value = lin("#ff3fb0")
bn.inputs["Emission Strength"].default_value = 6.0
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 5.3, 1.6))
bpy.context.object.scale = (30, 0.05, 0.06)
bpy.context.object.data.materials.append(mn)


def luz(p, cor, w, r=0.3, tipo="POINT"):
    d = bpy.data.lights.new("l", tipo)
    d.color = lin(cor)[:3]
    d.energy = w
    d.shadow_soft_size = r
    o = bpy.data.objects.new("l", d)
    sc.collection.objects.link(o)
    o.location = p
    return o


luz((2.6, -2.2, 2.8), "#bfc8ff", 260, 1.2)          # o poste (frio)
luz((-2.2, 1.6, 1.4), "#ff3fb0", 70, 0.6)          # o contra rosa
luz((1.5, 2.2, 1.0), "#2fe8ff", 45, 0.5)           # o contra ciano
luz((-1.8, -2.4, 1.0), "#9b8cff", 60, 0.8)         # o preenchimento

if sc.world is None:
    sc.world = bpy.data.worlds.new("Mundo")
w = sc.world
try:
    w.use_nodes = True
except Exception:
    pass
bg = next(n for n in w.node_tree.nodes if n.type == "BACKGROUND")
bg.inputs["Color"].default_value = lin("#07060e")
bg.inputs["Strength"].default_value = 0.5

cd = bpy.data.cameras.new("cam")
cd.lens = 50
cam = bpy.data.objects.new("cam", cd)
sc.collection.objects.link(cam)
sc.camera = cam
cam.location = {"frente": (2.1, -2.9, 1.05), "lado": (3.6, 0.0, 0.75), "tras": (-2.0, 3.0, 1.2)}[VISTA]
alvo = Vector((0, 0, 0.62))
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
sc.render.resolution_x = LARG
sc.render.resolution_y = int(LARG * 2 / 3)
sc.render.filepath = FOTO
bpy.ops.render.render(write_still=True)
print("FOTO", FOTO)
