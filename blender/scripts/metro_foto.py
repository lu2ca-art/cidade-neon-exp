# As fotos do metrô (blender/scripts/metro.py): abre o .glb bruto e monta uma cena.
#   fora    o trem (3 carros) parado na plataforma escura da linha 9, vista da plataforma
#   dentro  o vagão por dentro, do plano "dentro" do Vagao.tsx (pos [0.5, 1.62, 4.5]
#           olhando [-0.1, 1.3, -6], fov 60), com as pointLights que o jogo tem
#   fuga    um vagão da fuga (só pra conferir)
#
#   blender -b --factory-startup --python blender/scripts/metro_foto.py -- bruto.glb foto.png fora|dentro|fuga [1280] [96]

import bpy, sys, math
from mathutils import Vector, Color

args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
GLB = args[0]
FOTO = args[1]
MODO = args[2] if len(args) > 2 else "fora"
LARG = int(args[3]) if len(args) > 3 else 1280
AMOSTRAS = int(args[4]) if len(args) > 4 else 96

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
bpy.ops.import_scene.gltf(filepath=GLB)


def lin(h):
    c = Color((int(h[1:3], 16) / 255, int(h[3:5], 16) / 255, int(h[5:7], 16) / 255)).from_srgb_to_scene_linear()
    return (c.r, c.g, c.b, 1.0)


def J(x, y, z):
    return Vector((x, -z, y))


FORCA = {"brilho": 2.2, "farol": 5.0, "luz": 7.0, "pisca": 7.0, "neon": 4.0}


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
        b.inputs["Roughness"].default_value = 0.45
        b.inputs["Metallic"].default_value = 0.25
    else:
        b.inputs["Base Color"].default_value = (0, 0, 0, 1)
        nt.links.new(a.outputs["Color"], b.inputs["Emission Color"])
        b.inputs["Emission Strength"].default_value = FORCA[tipo]
    return m


def cor_mat(nome, cor, emis=0.0, rough=0.7):
    m = bpy.data.materials.new(nome)
    try:
        m.use_nodes = True
    except Exception:
        pass
    b = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    if emis:
        b.inputs["Base Color"].default_value = (0, 0, 0, 1)
        b.inputs["Emission Color"].default_value = lin(cor)
        b.inputs["Emission Strength"].default_value = emis
    else:
        b.inputs["Base Color"].default_value = lin(cor)
        b.inputs["Roughness"].default_value = rough
    return m


for o in list(bpy.data.objects):
    if o.type != "MESH":
        continue
    tipo = o.name.split("_")[-1].split(".")[0]
    camada = o.data.color_attributes[0].name if len(o.data.color_attributes) else "Col"
    o.data.materials.clear()
    o.data.materials.append(mat("foto_" + o.name, camada, tipo))
    no = o.name.split("_")[0]
    quer = {"fora": ("carro",), "dentro": ("vagao",), "fuga": ("fuga", "fugaporta")}[MODO]
    if no not in quer:
        o.hide_render = True


def caixa(nome, centro, tam, m):
    bpy.ops.mesh.primitive_cube_add(size=1, location=centro)
    o = bpy.context.active_object
    o.name = nome
    o.scale = tam
    o.data.materials.append(m)
    return o


def luz(nome, p, cor, w, raio=0.05, tipo="POINT"):
    d = bpy.data.lights.new(nome, tipo)
    d.energy = w
    d.color = lin(cor)[:3]
    if tipo == "AREA":
        d.size = raio
    else:
        d.shadow_soft_size = raio
    lo = bpy.data.objects.new(nome, d)
    sc.collection.objects.link(lo)
    lo.location = p
    return lo


if sc.world is None:
    sc.world = bpy.data.worlds.new("Mundo")
sc.world.use_nodes = True
bg = next(n for n in sc.world.node_tree.nodes if n.type == "BACKGROUND")

if MODO == "fora":
    # mais dois carros atrás (o primeiro tem o farol)
    carro = [o for o in bpy.data.objects if o.type == "MESH" and o.name.startswith("carro_")]
    for k in (1, 2):
        for o in carro:
            if "farol" in o.name:
                continue
            c = o.copy()
            sc.collection.objects.link(c)
            c.location = o.location + J(0, 0, -13.8 * k)
    escuro = cor_mat("concreto", "#3a3c44", rough=0.85)
    claro = cor_mat("plataforma", "#6a6e78", rough=0.7)
    caixa("viga", J(0, -0.8, -14), (1.3, 50, 1.6), escuro)
    for l in (-1, 1):
        caixa(f"plat{l}", J(l * 3.4, -0.15, -14), (3.2, 34, 0.5), claro)
        caixa(f"faixa{l}", J(l * 1.95, 0.105, -14), (0.25, 34, 0.012), cor_mat(f"am{l}", "#c9a632", rough=0.6))
        caixa(f"tira{l}", J(l * 5.2, 5.1, -14), (0.15, 34, 0.12), cor_mat(f"tl{l}", "#eaf4ff", emis=3.0))
    caixa("cobertura", J(0, 5.4, -14), (11, 34, 0.35), escuro)
    for z in (6, -2, -10, -18, -26):
        caixa(f"pil{z}", J(5.6, 2.6, z), (0.3, 0.3, 5.2), escuro)
    for z in (4, -6, -16, -26):
        luz(f"teto{z}", J(4.2, 5.0, z), "#dfe8ff", 90, 0.6)
    luz("frente", J(0, 2.5, 12), "#9fb4ff", 60, 1.5)
    bg.inputs["Color"].default_value = (0.012, 0.014, 0.03, 1)
    bg.inputs["Strength"].default_value = 1.0
    pos, olha, fov = J(5.6, 1.9, 9.5), J(-0.3, 2.2, -5), 58
elif MODO == "dentro":
    for z in (-6, -2, 2, 6):
        luz(f"tubo{z}", J(0, 2.16, z), "#e8f0ff", 22, 0.3)
    luz("plataforma", J(4, 3, 1), "#b38cff", 60, 0.4)
    # a cidade correndo nas janelas (no jogo é uma textura que anda)
    preto = cor_mat("janela", "#05060b", rough=1)
    for z in (-6.5, -3, 3, 6.5):
        caixa(f"jan{z}", J(-1.5, 1.5, z), (0.01, 2.6, 0.8), preto)
        for k, c in enumerate(("#ff3fb0", "#2fe8ff", "#ffc857", "#b38cff")):
            caixa(f"st{z}{k}", J(-1.49, 1.25 + k * 0.15, z - 1 + k * 0.55), (0.005, 0.25 + 0.1 * k, 0.02), cor_mat(f"s{z}{k}", c, emis=6))
    caixa("plat", J(4, 0.05, 0), (5, 18, 0.1), cor_mat("platm", "#2a2c38"))
    bg.inputs["Color"].default_value = (0.03, 0.033, 0.045, 1)
    bg.inputs["Strength"].default_value = 1.0
    pos, olha, fov = J(0.5, 1.62, 4.5), J(-0.1, 1.3, -6), 60
else:
    for k in range(5):
        for x in (-0.42, 0.42):
            luz(f"l{k}{x}", J(x, 2.2, 1.6 + k * 2.9), "#f3f6ff", 12, 0.3)
    bg.inputs["Color"].default_value = (0.05, 0.05, 0.06, 1)
    bg.inputs["Strength"].default_value = 1.0
    pos, olha, fov = J(0.35, 1.72, 0.4), J(-0.1, 1.2, 14), 68

cd = bpy.data.cameras.new("foto_cam")
cd.sensor_fit = "VERTICAL"
cd.angle_y = math.radians(fov)
cd.clip_start = 0.05
cam = bpy.data.objects.new("foto_cam", cd)
sc.collection.objects.link(cam)
cam.location = pos
cam.rotation_euler = (olha - pos).to_track_quat("-Z", "Y").to_euler()
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
    for nome, v in (("Type", "Fog Glow"), ("Threshold", 0.8), ("Strength", 0.4), ("Size", 0.5)):
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
