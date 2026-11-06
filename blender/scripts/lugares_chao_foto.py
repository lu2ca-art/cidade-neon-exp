# A foto dos 6 lugares do chão lado a lado, à noite, com os letreiros acesos.
# Abre o .glb bruto do lugares_chao.py (ou usa a cena, se rodar no mesmo
# Blender), põe cada um com a cor do jogo no neon e o nome no letreiro (aqui
# um texto em 3D; no jogo é o atlas), chão de terra escura, lua azul, Cycles.
#
#   blender -b --factory-startup --python blender/scripts/lugares_chao_foto.py -- bruto.glb docs/blender/lugares-chao.png [1200]

import bpy, sys, math
from mathutils import Vector

args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
GLB = args[0]
FOTO = args[1] if len(args) > 1 else "/tmp/lugares-chao.png"
LARG = int(args[2]) if len(args) > 2 else 1200
AMOSTRAS = int(args[3]) if len(args) > 3 else 160

IDS = ["ginasio", "galeria", "discos", "batida", "flores", "brecho"]
# os mesmos do jogo (disco/historia.ts, CHAO_LUGARES)
NOME = {"ginasio": "GINÁSIO", "galeria": "GALERIA", "discos": "DISCOS", "batida": "BATIDA", "flores": "FLORES", "brecho": "BRECHÓ"}
COR = {"ginasio": "#ff9000", "galeria": "#3d7bff", "discos": "#ffc857", "batida": "#ff6b6b", "flores": "#5dffa0", "brecho": "#ff3fb0"}
# onde vai o texto (altura, frente) — os mesmos do lugares_chao.py (let_z, let_f)
LET = {"ginasio": (5.15, 0.55), "galeria": (4.25, 0.07), "discos": (3.95, -0.33),
       "batida": (4.4, -0.4), "flores": (3.2, -0.07), "brecho": (4.3, 0.2)}

sc = bpy.context.scene
if "ginasio" not in bpy.data.objects:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    bpy.ops.import_scene.gltf(filepath=GLB)


def lin(h):
    from mathutils import Color
    c = Color((int(h[1:3], 16) / 255, int(h[3:5], 16) / 255, int(h[5:7], 16) / 255)).from_srgb_to_scene_linear()
    return (c.r, c.g, c.b, 1.0)


def mat_vc(nome, camada, emite=0.0, rough=0.85):
    m = bpy.data.materials.new(nome)
    try:
        m.use_nodes = True
    except Exception:
        pass
    nt = m.node_tree
    b = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    a = nt.nodes.new("ShaderNodeVertexColor")
    a.layer_name = camada
    if emite:
        b.inputs["Base Color"].default_value = (0, 0, 0, 1)
        nt.links.new(a.outputs["Color"], b.inputs["Emission Color"])
        b.inputs["Emission Strength"].default_value = emite
    else:
        nt.links.new(a.outputs["Color"], b.inputs["Base Color"])
        b.inputs["Roughness"].default_value = rough
    return m


def mat_cor(nome, cor, emite=0.0, rough=0.9):
    m = bpy.data.materials.new(nome)
    try:
        m.use_nodes = True
    except Exception:
        pass
    b = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    if emite:
        b.inputs["Base Color"].default_value = (0, 0, 0, 1)
        b.inputs["Emission Color"].default_value = cor
        b.inputs["Emission Strength"].default_value = emite
    else:
        b.inputs["Base Color"].default_value = cor
        b.inputs["Roughness"].default_value = rough
    return m


# lado a lado num arco em volta da câmera (cada um de frente pra ela)
RAIO, PASSO = 74.0, math.radians(10.6)
CAM = Vector((0, -RAIO, 0))
for i, lugar in enumerate(IDS):
    e = bpy.data.objects[lugar]
    th = (i - 2.5) * PASSO
    e.rotation_mode = "XYZ"
    e.location = (RAIO * math.sin(th), -RAIO + RAIO * math.cos(th), 0)
    e.rotation_euler = (0, 0, -th)
    neon = mat_cor("foto_neon_" + lugar, lin(COR[lugar]), 7.0)
    for o in e.children_recursive:
        if o.type != "MESH":
            continue
        me = o.data
        camada = me.color_attributes[0].name if len(me.color_attributes) else "Col"
        me.materials.clear()
        if o.name.startswith(lugar + "_neon"):
            me.materials.append(neon)
        elif o.name.startswith(lugar + "_luz"):
            me.materials.append(mat_vc("foto_luz_" + lugar, camada, 6.0))
        else:
            me.materials.append(mat_vc("foto_sol_" + lugar, camada))
    # o texto do letreiro (no jogo é o atlas: o nome na cor do lugar)
    cu = bpy.data.curves.new("foto_txt_" + lugar, "FONT")
    cu.body = NOME[lugar]
    cu.align_x = "CENTER"
    cu.align_y = "CENTER"
    cu.size = 1.25
    cu.extrude = 0.01
    t = bpy.data.objects.new("foto_txt_" + lugar, cu)
    sc.collection.objects.link(t)
    z, f = LET[lugar]
    t.parent = e
    t.location = (0, -f, z)
    t.rotation_euler = (math.pi / 2, 0, 0)
    cu.materials.append(mat_cor("foto_txtm_" + lugar, lin(COR[lugar]), 9.0))
    # um pouco da luz do letreiro no chão e na fachada
    d = bpy.data.lights.new("foto_spill_" + lugar, "POINT")
    d.energy = 700
    d.color = lin(COR[lugar])[:3]
    d.shadow_soft_size = 1.5
    lo = bpy.data.objects.new("foto_spill_" + lugar, d)
    sc.collection.objects.link(lo)
    lo.parent = e
    lo.location = (0, -f - 3.0, z - 0.5)

# o chão de terra escura (com manchas)
m = bpy.data.materials.new("foto_chao")
try:
    m.use_nodes = True
except Exception:
    pass
nt = m.node_tree
b = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
nz = nt.nodes.new("ShaderNodeTexNoise")
nz.inputs["Scale"].default_value = 0.35
mix = nt.nodes.new("ShaderNodeMix")
mix.data_type = "RGBA"
nt.links.new(nz.outputs["Fac"], mix.inputs["Factor"])
mix.inputs["A"].default_value = (0.012, 0.010, 0.010, 1)
mix.inputs["B"].default_value = (0.035, 0.028, 0.024, 1)
nt.links.new(mix.outputs["Result"], b.inputs["Base Color"])
b.inputs["Roughness"].default_value = 0.95
me = bpy.data.meshes.new("foto_chao")
me.from_pydata([(-900, -900, 0), (900, -900, 0), (900, 900, 0), (-900, 900, 0)], [], [(0, 1, 2, 3)])
me.materials.append(m)
sc.collection.objects.link(bpy.data.objects.new("foto_chao", me))

# a noite: céu azul-escuro e a lua
if sc.world is None:
    sc.world = bpy.data.worlds.new("Mundo")
sc.world.use_nodes = True
bg = next(n for n in sc.world.node_tree.nodes if n.type == "BACKGROUND")
bg.inputs["Color"].default_value = (0.010, 0.014, 0.036, 1)
bg.inputs["Strength"].default_value = 1.0
sd = bpy.data.lights.new("foto_lua", "SUN")
sd.energy = 2.2
sd.color = (0.55, 0.65, 1.0)
sd.angle = 0.02
lua = bpy.data.objects.new("foto_lua", sd)
sc.collection.objects.link(lua)
lua.rotation_euler = (math.radians(58), 0, math.radians(-28))
# um contraluz frio de cima (separa as silhuetas do céu)
ad = bpy.data.lights.new("foto_recorte", "AREA")
ad.energy = 60000
ad.size = 40
ad.color = (0.5, 0.55, 1.0)
rc = bpy.data.objects.new("foto_recorte", ad)
sc.collection.objects.link(rc)
rc.location = (0, 30, 40)
rc.rotation_euler = (Vector((0, -10, 0)) - rc.location).to_track_quat("-Z", "Y").to_euler()

cd = bpy.data.cameras.new("foto_cam")
cd.lens = 26
cam = bpy.data.objects.new("foto_cam", cd)
sc.collection.objects.link(cam)
cam.location = (0, -RAIO + 6, 8.5)
cam.rotation_euler = (Vector((0, 0, 5.4)) - cam.location).to_track_quat("-Z", "Y").to_euler()
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

# o brilho do neon (compositor do 5.x; se a API mudar, sai sem)
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
sc.render.resolution_y = int(LARG * 0.45)
sc.render.resolution_percentage = 100
sc.render.image_settings.file_format = "PNG"
sc.render.filepath = FOTO
bpy.ops.render.render(write_still=True)
print("FOTO", FOTO)
