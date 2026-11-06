# A foto do posto de rua à noite: abre o .glb bruto do posto.py (ou usa a cena,
# se rodar no mesmo Blender), pinta o neon com a cor das bombas (#ffc857), põe a
# pista escura com a faixa, a luz do toldo (a mesma LuzPonto do jogo) e a lua.
#
#   blender -b --factory-startup --python blender/scripts/posto_foto.py -- bruto.glb docs/blender/posto.png [1400] [128]

import bpy, sys, math
from mathutils import Vector, Color

args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
GLB = args[0]
FOTO = args[1] if len(args) > 1 else "/tmp/posto.png"
LARG = int(args[2]) if len(args) > 2 else 1400
AMOSTRAS = int(args[3]) if len(args) > 3 else 128
COR = "#ffc857"

sc = bpy.context.scene
if "posto" not in bpy.data.objects:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    bpy.ops.import_scene.gltf(filepath=GLB)


def lin(h):
    c = Color((int(h[1:3], 16) / 255, int(h[3:5], 16) / 255, int(h[5:7], 16) / 255)).from_srgb_to_scene_linear()
    return (c.r, c.g, c.b, 1.0)


def mat(nome, cor=None, camada=None, emite=0.0, rough=0.6, metal=0.0):
    m = bpy.data.materials.new(nome)
    try:
        m.use_nodes = True
    except Exception:
        pass
    nt = m.node_tree
    b = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    alvo = b.inputs["Emission Color"] if emite else b.inputs["Base Color"]
    if emite:
        b.inputs["Base Color"].default_value = (0, 0, 0, 1)
        b.inputs["Emission Strength"].default_value = emite
    if camada:
        a = nt.nodes.new("ShaderNodeVertexColor")
        a.layer_name = camada
        nt.links.new(a.outputs["Color"], alvo)
    else:
        alvo.default_value = cor
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    return m


e = bpy.data.objects["posto"]
for o in e.children_recursive:
    if o.type != "MESH":
        continue
    me = o.data
    camada = me.color_attributes[0].name if len(me.color_attributes) else "Col"
    me.materials.clear()
    g = o.name.split("_")[-1].split(".")[0]
    if g == "neon":
        me.materials.append(mat("foto_neon", lin(COR), emite=8.0))
    elif g == "luz":
        me.materials.append(mat("foto_luz", camada=camada, emite=5.0))
    else:
        me.materials.append(mat("foto_sol", camada=camada, rough=0.55))

# a pista (asfalto molhado), a faixa do meio e o vazio do outro lado
asf = mat("foto_asf", (0.012, 0.012, 0.016, 1), rough=0.28, metal=0.2)
me = bpy.data.meshes.new("foto_pista")
me.from_pydata([(-14, -60, -0.002), (-2.7, -60, -0.002), (-2.7, 60, -0.002), (-14, 60, -0.002)], [], [(0, 1, 2, 3)])
me.materials.append(asf)
sc.collection.objects.link(bpy.data.objects.new("foto_pista", me))
tinta = mat("foto_tinta", lin("#c9ccd2"), rough=0.6)
for k in range(-6, 7):
    me = bpy.data.meshes.new(f"foto_faixa{k}")
    y = k * 7.0
    me.from_pydata([(-8.6, y, 0.004), (-8.4, y, 0.004), (-8.4, y + 3.5, 0.004), (-8.6, y + 3.5, 0.004)], [], [(0, 1, 2, 3)])
    me.materials.append(tinta)
    sc.collection.objects.link(bpy.data.objects.new(f"foto_faixa{k}", me))

# a luz do toldo (a LuzPonto do jogo: cor do posto, 4,6 m) e o banho dos painéis
d = bpy.data.lights.new("foto_toldo", "POINT")
d.energy = 900
d.color = lin(COR)[:3]
d.shadow_soft_size = 0.8
lo = bpy.data.objects.new("foto_toldo", d)
sc.collection.objects.link(lo)
lo.location = (0, 0, 4.6)
ad = bpy.data.lights.new("foto_paineis", "AREA")
ad.energy = 700
ad.size = 3.5
ad.color = (1.0, 0.93, 0.82)
pa = bpy.data.objects.new("foto_paineis", ad)
sc.collection.objects.link(pa)
pa.location = (0, 0, 5.15)

if sc.world is None:
    sc.world = bpy.data.worlds.new("Mundo")
sc.world.use_nodes = True
bg = next(n for n in sc.world.node_tree.nodes if n.type == "BACKGROUND")
bg.inputs["Color"].default_value = (0.008, 0.011, 0.03, 1)
sd = bpy.data.lights.new("foto_lua", "SUN")
sd.energy = 0.8
sd.color = (0.55, 0.65, 1.0)
lua = bpy.data.objects.new("foto_lua", sd)
sc.collection.objects.link(lua)
lua.rotation_euler = (math.radians(55), 0, math.radians(-120))

cd = bpy.data.cameras.new("foto_cam")
cd.lens = 24
cam = bpy.data.objects.new("foto_cam", cd)
sc.collection.objects.link(cam)
cam.location = (-11.5, -10.5, 3.2)
cam.rotation_euler = (Vector((-1.2, 0.8, 2.3)) - cam.location).to_track_quat("-Z", "Y").to_euler()
sc.camera = cam

try:
    sc.render.engine = "CYCLES"
except TypeError as er:
    print("engine", er)
sc.cycles.samples = AMOSTRAS
sc.cycles.use_denoising = True
try:
    pr = bpy.context.preferences.addons["cycles"].preferences
    pr.compute_device_type = "METAL"
    pr.get_devices()
    for dv in pr.devices:
        dv.use = True
    sc.cycles.device = "GPU"
except Exception as er:
    print("gpu", er)
sc.view_settings.view_transform = "AgX"
try:
    sc.view_settings.look = "AgX - Medium High Contrast"
except TypeError as er:
    print("look", er)
try:
    ng = bpy.data.node_groups.new("foto_comp", "CompositorNodeTree")
    ng.interface.new_socket("Image", in_out="OUTPUT", socket_type="NodeSocketColor")
    rl = ng.nodes.new("CompositorNodeRLayers")
    gl = ng.nodes.new("CompositorNodeGlare")
    out = ng.nodes.new("NodeGroupOutput")
    for nome, v in (("Type", "Fog Glow"), ("Threshold", 0.6), ("Strength", 0.6), ("Size", 0.5)):
        if nome in gl.inputs:
            try:
                gl.inputs[nome].default_value = v
            except Exception as er:
                print("glare", nome, er)
    if hasattr(gl, "glare_type"):
        gl.glare_type = "FOG_GLOW"
    ng.links.new(rl.outputs["Image"], gl.inputs["Image"])
    ng.links.new(gl.outputs["Image"], out.inputs[0])
    sc.compositing_node_group = ng
except Exception as er:
    print("comp", er)

sc.render.resolution_x = LARG
sc.render.resolution_y = int(LARG * 0.6)
sc.render.image_settings.file_format = "PNG"
sc.render.filepath = FOTO
bpy.ops.render.render(write_still=True)
print("FOTO", FOTO)
