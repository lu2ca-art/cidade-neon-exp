# A foto do bar do prólogo do ponto de vista da câmera do jogo (o plano
# "entrada" do Bar.tsx: pos [0.6, 1.7, 3.8] olhando [-0.4, 1.35, -3], fov 60).
# Abre o .glb bruto do bar.py (ou usa a cena, se rodar no mesmo Blender), põe
# as luzes que o jogo tem (as três lâmpadas do balcão, o letreiro, os neons) e
# o texto O COPO no letreiro (no jogo é uma textura), Cycles.
#
#   blender -b --factory-startup --python blender/scripts/bar_foto.py -- bruto.glb docs/blender/bar.png [1280] [128]

import bpy, sys, math
from mathutils import Vector, Color

args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
GLB = args[0]
FOTO = args[1] if len(args) > 1 else "/tmp/bar.png"
LARG = int(args[2]) if len(args) > 2 else 1280
AMOSTRAS = int(args[3]) if len(args) > 3 else 128

sc = bpy.context.scene
if "sala_solido" not in bpy.data.objects:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    bpy.ops.import_scene.gltf(filepath=GLB)


def lin(h):
    c = Color((int(h[1:3], 16) / 255, int(h[3:5], 16) / 255, int(h[5:7], 16) / 255)).from_srgb_to_scene_linear()
    return (c.r, c.g, c.b, 1.0)


def J(x, y, z):  # do jogo (Y pra cima) pro Blender
    return Vector((x, -z, y))


def mat(nome, camada, tipo):
    m = bpy.data.materials.new(nome)
    try:
        m.use_nodes = True
    except Exception:
        pass
    nt = m.node_tree
    b = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    a = nt.nodes.new("ShaderNodeVertexColor")
    a.layer_name = camada
    if tipo == "solido":
        nt.links.new(a.outputs["Color"], b.inputs["Base Color"])
        b.inputs["Roughness"].default_value = 0.8
    else:
        b.inputs["Base Color"].default_value = (0, 0, 0, 1)
        nt.links.new(a.outputs["Color"], b.inputs["Emission Color"])
        b.inputs["Emission Strength"].default_value = {"luz": 3.0, "neon": 6.0, "vidro": 1.2}[tipo]
        if tipo == "vidro":
            b.inputs["Alpha"].default_value = 0.8
    return m


for o in list(bpy.data.objects):
    if o.type != "MESH":
        continue
    tipo = o.name.split("_")[-1].split(".")[0]
    if tipo not in ("solido", "luz", "neon", "vidro"):
        continue
    camada = o.data.color_attributes[0].name if len(o.data.color_attributes) else "Col"
    o.data.materials.clear()
    o.data.materials.append(mat("foto_" + o.name, camada, tipo))


def luz(nome, p, cor, w, raio=0.05):
    d = bpy.data.lights.new(nome, "POINT")
    d.energy = w
    d.color = lin(cor)[:3]
    d.shadow_soft_size = raio
    lo = bpy.data.objects.new(nome, d)
    sc.collection.objects.link(lo)
    lo.location = p


# as do jogo: as três do balcão, o letreiro, o neon do balcão e da prateleira, o palco
for x in (-3, -0.5, 2):
    luz(f"lamp{x}", J(x, 2.7, -2.2), "#ffcf8a", 45)
luz("letreiro", J(-0.5, 3.15, -4.35), "#ff6a35", 30, 0.4)
for x in (-3.5, -0.5, 2.5):
    luz(f"friso{x}", J(x, 0.12, -2.0), "#ff6a35", 6, 0.2)
luz("prateleira", J(-0.5, 1.33, -4.4), "#ffc857", 12, 0.6)
luz("palco", J(4.4, 0.5, -1.8), "#ff3f7a", 6, 0.3)
# as lâmpadas das mesas e da sinuca brilham só pelo material no jogo; aqui um pouco
for x, z in ((4, 1), (-3.3, 1.6), (4.2, -0.9), (-4.6, -0.4)):
    luz(f"mesa{x}", J(x, 1.82, z), "#ffd9a0", 8, 0.05)
luz("sinuca", J(-5.15, 1.6, -3.4), "#ffd9a0", 12, 0.2)
luz("jukebox", J(5.0, 1.3, 3.2), "#ff3fb0", 8, 0.3)
# o preenchimento (o ambiente + o hemisfério do jogo) e a luz da porta
if sc.world is None:
    sc.world = bpy.data.worlds.new("Mundo")
sc.world.use_nodes = True
bg = next(n for n in sc.world.node_tree.nodes if n.type == "BACKGROUND")
bg.inputs["Color"].default_value = (0.05, 0.036, 0.028, 1)
bg.inputs["Strength"].default_value = 1.0
luz("porta", J(1.5, 2.0, 4.6), "#9fb4ff", 25, 0.5)

# o texto do letreiro (no jogo é uma textura): O COPO em laranja
cu = bpy.data.curves.new("foto_txt", "FONT")
cu.body = "O COPO"
cu.align_x = "CENTER"
cu.align_y = "CENTER"
cu.size = 0.62
cu.extrude = 0.005
t = bpy.data.objects.new("foto_txt", cu)
sc.collection.objects.link(t)
t.location = J(-0.5, 3.15, -4.94)
t.rotation_euler = (math.pi / 2, 0, 0)
mt = bpy.data.materials.new("foto_txtm")
mt.use_nodes = True
bt = next(n for n in mt.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
bt.inputs["Base Color"].default_value = (0, 0, 0, 1)
bt.inputs["Emission Color"].default_value = lin("#ff6a35")
bt.inputs["Emission Strength"].default_value = 8.0
cu.materials.append(mt)

cd = bpy.data.cameras.new("foto_cam")
cd.sensor_fit = "VERTICAL"
cd.angle_y = math.radians(60)
cd.clip_start = 0.05
cam = bpy.data.objects.new("foto_cam", cd)
sc.collection.objects.link(cam)
cam.location = J(0.6, 1.7, 3.8)
cam.rotation_euler = (J(-0.4, 1.35, -3) - cam.location).to_track_quat("-Z", "Y").to_euler()
sc.camera = cam

try:
    sc.render.engine = "CYCLES"
except TypeError as e:
    print("engine", e)
sc.cycles.samples = AMOSTRAS
sc.cycles.use_denoising = True
try:
    pr = bpy.context.preferences.addons["cycles"].preferences
    pr.compute_device_type = "METAL"
    pr.get_devices()
    for d in pr.devices:
        d.use = True
    sc.cycles.device = "GPU"
except Exception as e:
    print("gpu", e)
sc.view_settings.view_transform = "AgX"
try:
    sc.view_settings.look = "AgX - Medium High Contrast"
except TypeError as e:
    print("look", e)
try:
    ng = bpy.data.node_groups.new("foto_comp", "CompositorNodeTree")
    ng.interface.new_socket("Image", in_out="OUTPUT", socket_type="NodeSocketColor")
    rl = ng.nodes.new("CompositorNodeRLayers")
    gl = ng.nodes.new("CompositorNodeGlare")
    out = ng.nodes.new("NodeGroupOutput")
    for nome, v in (("Type", "Fog Glow"), ("Threshold", 0.7), ("Strength", 0.5), ("Size", 0.5)):
        if nome in gl.inputs:
            try:
                gl.inputs[nome].default_value = v
            except Exception as e:
                print("glare", nome, e)
    if hasattr(gl, "glare_type"):
        gl.glare_type = "FOG_GLOW"
    ng.links.new(rl.outputs["Image"], gl.inputs["Image"])
    ng.links.new(gl.outputs["Image"], out.inputs[0])
    sc.compositing_node_group = ng
except Exception as e:
    print("comp", e)

sc.render.resolution_x = LARG
sc.render.resolution_y = int(LARG * 9 / 16)
sc.render.resolution_percentage = 100
sc.render.image_settings.file_format = "PNG"
sc.render.filepath = FOTO
bpy.ops.render.render(write_still=True)
print("FOTO", FOTO)
