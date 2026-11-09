# A foto da casa da Ella por fora, de noite, da rua: abre o bruto do
# lugares_cidade.py, deixa só o nó casa-ella e pinta o neon com a cor do lugar.
#
#   blender -b --factory-startup --python blender/scripts/casa_ella_foto.py -- bruto.glb foto.png [largura] [amostras]

import bpy, math, sys
from mathutils import Vector

args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
GLB, FOTO = args[0], args[1]
LARG = int(args[2]) if len(args) > 2 else 1400
AMOSTRAS = int(args[3]) if len(args) > 3 else 96
NEON = (0.03, 0.8, 1.0, 1)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
bpy.ops.import_scene.gltf(filepath=GLB)
raiz = bpy.data.objects["casa-ella"]
ficam = {raiz} | set(raiz.children_recursive)
for o in list(bpy.data.objects):
    if o not in ficam:
        bpy.data.objects.remove(o)


def mat(nome, g, camada):
    m = bpy.data.materials.new(nome)
    try:
        m.use_nodes = True
    except Exception:
        pass
    nt = m.node_tree
    b = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    if g in ("neon", "pen"):
        b.inputs["Base Color"].default_value = (0, 0, 0, 1)
        b.inputs["Emission Color"].default_value = NEON
        b.inputs["Emission Strength"].default_value = 5.0
        return m
    a = nt.nodes.new("ShaderNodeVertexColor")
    a.layer_name = camada
    if g == "luz":
        b.inputs["Base Color"].default_value = (0, 0, 0, 1)
        nt.links.new(a.outputs["Color"], b.inputs["Emission Color"])
        b.inputs["Emission Strength"].default_value = 2.5
    else:
        nt.links.new(a.outputs["Color"], b.inputs["Base Color"])
        b.inputs["Roughness"].default_value = 0.1 if g == "vidro" else 0.75
        if g == "vidro":
            b.inputs["Alpha"].default_value = 0.3
    return m


for o in ficam:
    if o.type == "MESH":
        g = o.name.rsplit("_", 1)[-1].split(".")[0]
        cam = o.data.color_attributes[0].name if o.data.color_attributes else ""
        o.data.materials.clear()
        o.data.materials.append(mat("f_" + o.name, g, cam))

try:
    sc.render.engine = "CYCLES"
except TypeError as e:
    print("engine", e)
sc.cycles.samples = AMOSTRAS
try:
    pr = bpy.context.preferences.addons["cycles"].preferences
    pr.compute_device_type = "METAL"
    pr.get_devices()
    for d in pr.devices:
        d.use = True
    sc.cycles.device = "GPU"
except Exception as e:
    print("gpu", e)

sc.world = bpy.data.worlds.new("Mundo")
sc.world.use_nodes = True
bg = next(n for n in sc.world.node_tree.nodes if n.type == "BACKGROUND")
bg.inputs["Color"].default_value = (0.03, 0.04, 0.09, 1)
bg.inputs["Strength"].default_value = 1.0


def luz(tipo, p, cor, w, raio=1.0):
    d = bpy.data.lights.new("l", tipo)
    d.energy = w
    d.color = cor
    if tipo == "POINT":
        d.shadow_soft_size = raio
    o = bpy.data.objects.new("l", d)
    sc.collection.objects.link(o)
    o.location = p
    return o


sol = luz("SUN", (0, 0, 30), (0.55, 0.65, 1.0), 0.5)
sol.rotation_euler = (math.radians(62), 0, math.radians(-28))
luz("POINT", (0, -7, 5), (1.0, 0.85, 0.7), 220, 3)
luz("POINT", (5.5, -3.4, 3.4), (0.4, 0.8, 1.0), 30, 0.5)

bpy.ops.mesh.primitive_plane_add(size=120, location=(0, 0, -0.5))
ch = bpy.context.active_object
mc = bpy.data.materials.new("chao")
try:
    mc.use_nodes = True
except Exception:
    pass
next(n for n in mc.node_tree.nodes if n.type == "BSDF_PRINCIPLED").inputs["Base Color"].default_value = (0.03, 0.03, 0.04, 1)
ch.data.materials.append(mc)

cd = bpy.data.cameras.new("foto")
cd.sensor_fit = "VERTICAL"
cd.angle_y = math.radians(38)
c = bpy.data.objects.new("foto", cd)
sc.collection.objects.link(c)
c.location = (-8.5, -19, 3.6)
c.rotation_euler = (Vector((0, 0, 3.6)) - c.location).to_track_quat("-Z", "Y").to_euler()
sc.camera = c
sc.view_settings.view_transform = "Standard"
sc.view_settings.look = "None"
sc.render.resolution_x, sc.render.resolution_y = LARG, int(LARG * 0.62)
sc.render.image_settings.file_format = "PNG"
sc.render.filepath = FOTO
bpy.ops.render.render(write_still=True)
