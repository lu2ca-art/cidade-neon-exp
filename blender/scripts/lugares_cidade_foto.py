# A foto dos 6 tipos de lugar da cidade lado a lado, à noite: abre o .glb
# bruto do lugares_cidade.py (ou usa a cena, se rodar no mesmo Blender), pinta
# o neon com a cor de um lugar de cada tipo, mistura a cor no vidro, estica o pé
# (5 m até a água escura) e põe o letreiro como texto 3D (no jogo é o atlas).
#
#   blender -b --factory-startup --python blender/scripts/lugares_cidade_foto.py -- bruto.glb docs/blender/lugares-cidade.png [1400] [128]

import bpy, sys, math
from mathutils import Vector

args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
GLB = args[0]
FOTO = args[1] if len(args) > 1 else "/tmp/lugares-cidade.png"
LARG = int(args[2]) if len(args) > 2 else 1400
AMOSTRAS = int(args[3]) if len(args) > 3 else 128

IDS = ["palco", "estacao", "terraco", "casa-drew", "balada", "casa-ella"]
# o texto e a cor de um lugar de cada tipo (lugares.ts)
NOME = {"palco": "PALCO", "estacao": "LINHA 9 · 6", "terraco": "TERRAÇO", "casa-drew": "AP 222", "balada": "ONTEM", "casa-ella": "· · ·"}
COR = {"palco": "#e0ff4f", "estacao": "#e6f0ff", "terraco": "#5dffa0", "casa-drew": "#ff3fb0", "balada": "#ffc857", "casa-ella": "#2fe8ff"}
# onde vai o letreiro: x, altura, frente, largura (os do lugares_cidade.py, "let")
LET = {"palco": (0, 10.55, 4.33, 7.0), "estacao": (0, 4.75, 4.71, 7.0), "terraco": (0, 7.9, 3.79, 9.0),
       "casa-drew": (-2.0, 5.0, 3.93, 5.5), "balada": (-2.0, 5.0, 5.03, 6.0), "casa-ella": (0, 3.32, 1.48, 2.4)}
PE = 5.0  # o pé até a água, na foto

sc = bpy.context.scene
if "palco" not in bpy.data.objects:
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
RAIO, PASSO = 78.0, math.radians(12.6)
for i, tipo in enumerate(IDS):
    e = bpy.data.objects[tipo]
    th = (i - 2.5) * PASSO
    e.rotation_mode = "XYZ"
    e.location = (RAIO * math.sin(th), -RAIO + RAIO * math.cos(th), 0)
    e.rotation_euler = (0, 0, -th)
    cor = lin(COR[tipo])
    neon = mat_cor("foto_neon_" + tipo, cor, 7.0)
    vid = bpy.data.materials.new("foto_vidro_" + tipo)
    try:
        vid.use_nodes = True
    except Exception:
        pass
    bv = next(n for n in vid.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    bv.inputs["Base Color"].default_value = (0.02, 0.025, 0.04, 1)
    bv.inputs["Roughness"].default_value = 0.08
    bv.inputs["Alpha"].default_value = 0.55
    bv.inputs["Emission Color"].default_value = tuple(0.5 * c for c in cor[:3]) + (1,)
    bv.inputs["Emission Strength"].default_value = 0.35
    for o in e.children_recursive:
        if o.type != "MESH":
            continue
        me = o.data
        camada = me.color_attributes[0].name if len(me.color_attributes) else "Col"
        me.materials.clear()
        g = o.name.split("_")[-1].split(".")[0]
        if g in ("pe", "pen"):
            o.scale = (1, 1, PE)
        if g in ("neon", "pen"):
            me.materials.append(neon)
        elif g == "luz":
            me.materials.append(mat_vc("foto_luz_" + tipo, camada, 5.0))
        elif g == "vidro":
            me.materials.append(vid)
        else:
            me.materials.append(mat_vc("foto_sol_" + tipo, camada, 0.0, 0.55))
    cu = bpy.data.curves.new("foto_txt_" + tipo, "FONT")
    cu.body = NOME[tipo]
    cu.align_x = "CENTER"
    cu.align_y = "CENTER"
    x, z, f, w = LET[tipo]
    cu.size = w * 0.2
    cu.extrude = 0.01
    t = bpy.data.objects.new("foto_txt_" + tipo, cu)
    sc.collection.objects.link(t)
    t.parent = e
    t.location = (x, -f, z)
    t.rotation_euler = (math.pi / 2, 0, 0)
    cu.materials.append(mat_cor("foto_txtm_" + tipo, cor, 9.0))
    d = bpy.data.lights.new("foto_spill_" + tipo, "POINT")
    d.energy = 900
    d.color = cor[:3]
    d.shadow_soft_size = 1.5
    lo = bpy.data.objects.new("foto_spill_" + tipo, d)
    sc.collection.objects.link(lo)
    lo.parent = e
    lo.location = (0, -9.0, 3.0)

# a água escura embaixo (espelha um pouco o neon)
m = bpy.data.materials.new("foto_agua")
try:
    m.use_nodes = True
except Exception:
    pass
b = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
b.inputs["Base Color"].default_value = (0.005, 0.007, 0.012, 1)
b.inputs["Roughness"].default_value = 0.12
b.inputs["Metallic"].default_value = 0.6
me = bpy.data.meshes.new("foto_agua")
me.from_pydata([(-900, -900, -PE), (900, -900, -PE), (900, 900, -PE), (-900, 900, -PE)], [], [(0, 1, 2, 3)])
me.materials.append(m)
sc.collection.objects.link(bpy.data.objects.new("foto_agua", me))

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
rc.location = (0, 30, 45)
rc.rotation_euler = (Vector((0, -10, 0)) - rc.location).to_track_quat("-Z", "Y").to_euler()

cd = bpy.data.cameras.new("foto_cam")
cd.lens = 21
cam = bpy.data.objects.new("foto_cam", cd)
sc.collection.objects.link(cam)
cam.location = (0, -RAIO + 3, 4.5)
cam.rotation_euler = (Vector((0, 0, 5.2)) - cam.location).to_track_quat("-Z", "Y").to_euler()
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
