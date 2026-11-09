# A foto da planta da Ella: as duas versões lado a lado, sem luz, como o jogo
# desenha (MeshBasic: cor do vértice x 0,25), e um detalhe da folha da detalhada.
#
#   blender -b --factory-startup --python blender/scripts/planta_ella_foto.py -- bruto.glb foto.png [largura]

import bpy, math, sys
from mathutils import Vector

args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
GLB = args[0]
FOTO = args[1] if len(args) > 1 else "/tmp/planta-ella.png"
LARG = int(args[2]) if len(args) > 2 else 1400
PERTO = len(args) > 3 and args[3] == "perto"  # o detalhe da flor e da folha
GANHO = 0.25

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
bpy.ops.import_scene.gltf(filepath=GLB)

m = bpy.data.materials.new("foto")
try:
    m.use_nodes = True
except Exception:
    pass
nt = m.node_tree
bs = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
a = nt.nodes.new("ShaderNodeVertexColor")
a.layer_name = "Col"
bs.inputs["Base Color"].default_value = (0, 0, 0, 1)
nt.links.new(a.outputs["Color"], bs.inputs["Emission Color"])
bs.inputs["Emission Strength"].default_value = GANHO

for pid, x in (("planta_casa", -0.9), ("planta_leve", 0.9)):
    bpy.data.objects[pid].location = (x, 0, 0)
    me = bpy.data.objects[pid + "_solido"]
    me.data.materials.clear()
    me.data.materials.append(m)
    if not me.data.color_attributes:
        print("sem cor", pid)
    else:
        print("cor", pid, [c.name for c in me.data.color_attributes])
    a.layer_name = me.data.color_attributes[0].name

try:
    sc.render.engine = "CYCLES"
except TypeError as e:
    print("engine", e)
sc.cycles.samples = 32
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
sc.world.use_nodes = True
bg = next(n for n in sc.world.node_tree.nodes if n.type == "BACKGROUND")
bg.inputs["Color"].default_value = (0.05, 0.05, 0.07, 1)
bg.inputs["Strength"].default_value = 1.0

# o chão escuro
bpy.ops.mesh.primitive_plane_add(size=20, location=(0, 0, 0))
ch = bpy.context.active_object
mc = bpy.data.materials.new("chao")
try:
    mc.use_nodes = True
except Exception:
    pass
b2 = next(n for n in mc.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
b2.inputs["Base Color"].default_value = (0.05, 0.04, 0.03, 1)
ch.data.materials.append(mc)

cd = bpy.data.cameras.new("foto")
cd.sensor_fit = "VERTICAL"
cd.angle_y = math.radians(34)
cam = bpy.data.objects.new("foto", cd)
sc.collection.objects.link(cam)
cam.location = (-0.9, -1.5, 1.45) if PERTO else (0, -4.4, 1.55)
cam.rotation_euler = (Vector((-0.9, 0, 1.15) if PERTO else (0, 0, 0.82)) - cam.location).to_track_quat("-Z", "Y").to_euler()
sc.camera = cam

sc.view_settings.view_transform = "Standard"
sc.view_settings.look = "None"
sc.render.film_transparent = False
sc.render.resolution_x, sc.render.resolution_y = LARG, int(LARG * 0.6)
sc.render.image_settings.file_format = "PNG"
sc.render.filepath = FOTO
bpy.ops.render.render(write_still=True)
