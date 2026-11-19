# A foto da casa-galeria da Ella do ponto de vista da câmera do jogo (o plano
# "entrada" do GaleriaElla.tsx: pos [0, 1.7, 7.4] olhando [0, 2.7, -4], fov 62;
# ou outro plano: o 5º argumento "filme" = pos [0.3, 1.45, -4.1] olhando [0, 1.35, -6.2], fov 46).
# Abre o .glb bruto do galeria_ella.py (ou usa a cena, se rodar no mesmo Blender),
# põe as luzes que o jogo tem (a da planta; o ambiente) e, só pra foto, o que o
# jogo desenha em código: a copa da planta, as pinturas nas telas (manchas nas
# cores de cada quadro), a tela em branco no cavalete e a água dos baldes. Cycles.
#
#   blender -b --factory-startup --python blender/scripts/galeria_ella_foto.py -- bruto.glb docs/blender/galeria-ella.png [1280] [128] [entrada|filme]

import bpy, sys, math, os, re
from mathutils import Vector, Color

args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
GLB = args[0]
FOTO = args[1] if len(args) > 1 else "/tmp/galeria-ella.png"
LARG = int(args[2]) if len(args) > 2 else 1280
AMOSTRAS = int(args[3]) if len(args) > 3 else 128
PLANO = args[4] if len(args) > 4 else "entrada"

sc = bpy.context.scene
if "galeria_solido" not in bpy.data.objects:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    bpy.ops.import_scene.gltf(filepath=GLB)


def lin(h):
    c = Color((int(h[1:3], 16) / 255, int(h[3:5], 16) / 255, int(h[5:7], 16) / 255)).from_srgb_to_scene_linear()
    return (c.r, c.g, c.b, 1.0)


def J(x, y, z):  # do jogo (Y pra cima) pro Blender
    return Vector((x, -z, y))


def bsdf(m):
    try:
        m.use_nodes = True
    except Exception:
        pass
    return m.node_tree, next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")


def mat(nome, camada, tipo):
    m = bpy.data.materials.new(nome)
    nt, b = bsdf(m)
    a = nt.nodes.new("ShaderNodeVertexColor")
    a.layer_name = camada
    if tipo == "solido":
        nt.links.new(a.outputs["Color"], b.inputs["Base Color"])
        b.inputs["Roughness"].default_value = 0.8
    else:
        b.inputs["Base Color"].default_value = (0, 0, 0, 1)
        nt.links.new(a.outputs["Color"], b.inputs["Emission Color"])
        b.inputs["Emission Strength"].default_value = {"luz": 3.0, "neon": 5.0, "vidro": 0.5}[tipo]
        if tipo == "vidro":
            b.inputs["Alpha"].default_value = 0.16
    return m


def emissivo(nome, cor, forca, alfa=1.0):
    m = bpy.data.materials.new(nome)
    nt, b = bsdf(m)
    b.inputs["Base Color"].default_value = (0, 0, 0, 1)
    b.inputs["Emission Color"].default_value = lin(cor)
    b.inputs["Emission Strength"].default_value = forca
    b.inputs["Alpha"].default_value = alfa
    return m


def ler_cores():
    try:
        src = open(os.path.join(os.getcwd(), "app/linha/disco/ella.ts"), encoding="utf-8").read()
        return {m[1]: re.findall(r'"(#[0-9a-fA-F]{6})"', m[2]) for m in re.finditer(r'\{\s*id:\s*"(\w+)",[^\[]*cores:\s*\[([^\]]*)\]', src)}
    except Exception as e:
        print("cores", e)
        return {}


CORES = ler_cores()


def pintura(nome, cores):
    """as manchas da pintura (no jogo é uma CanvasTexture desenhada em código): ruído nas cores do quadro, sem luz."""
    m = bpy.data.materials.new("foto_" + nome)
    nt, b = bsdf(m)
    b.inputs["Base Color"].default_value = (0, 0, 0, 1)
    tc = nt.nodes.new("ShaderNodeTexCoord")
    nz = nt.nodes.new("ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = 3.5
    nz.inputs["Detail"].default_value = 6.0
    nt.links.new(tc.outputs["UV"], nz.inputs["Vector"])
    rp = nt.nodes.new("ShaderNodeValToRGB")
    els = rp.color_ramp.elements
    cs = cores or ["#888888"]
    if len(cs) == 1:
        cs = cs * 2
    while len(els) < len(cs):
        els.new(0.5)
    for i, c in enumerate(cs):
        els[i].position = 0.3 + 0.4 * i / (len(cs) - 1)
        els[i].color = lin(c)
    nt.links.new(nz.outputs["Fac"], rp.inputs["Fac"])
    nt.links.new(rp.outputs["Color"], b.inputs["Emission Color"])
    b.inputs["Emission Strength"].default_value = 0.8
    return m


for o in list(bpy.data.objects):
    if o.type != "MESH":
        continue
    if o.name.startswith("tela_"):
        qid = o.name[5:].split(".")[0]
        o.data.materials.clear()
        o.data.materials.append(pintura(qid, CORES.get(qid)))
        continue
    tipo = o.name.split("_")[-1].split(".")[0]
    if tipo not in ("solido", "luz", "neon", "vidro"):
        continue
    camada = o.data.color_attributes[0].name if len(o.data.color_attributes) else "Col"
    o.data.materials.clear()
    o.data.materials.append(mat("foto_" + o.name, camada, tipo))

# ── o que o jogo desenha em código (só pra foto) ──
col = sc.collection


def malha(nome, m, loc, escala=(1, 1, 1), rot=(0, 0, 0), tipo="esfera", **kw):
    if tipo == "esfera":
        bpy.ops.mesh.primitive_uv_sphere_add(segments=10, ring_count=6, radius=1.0, location=loc)
    elif tipo == "cil":
        bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=1.0, depth=1.0, location=loc)
    elif tipo == "plano":
        bpy.ops.mesh.primitive_plane_add(size=1.0, location=loc)
    elif tipo == "disco":
        bpy.ops.mesh.primitive_circle_add(vertices=18, radius=1.0, fill_type="NGON", location=loc)
    o = bpy.context.active_object
    o.name = "foto_" + nome
    o.scale = escala
    o.rotation_euler = rot
    o.data.materials.append(m)
    return o


# a copa da planta: o caule e as 44 folhas em espiral (as do Planta() do jogo)
m_folha = bpy.data.materials.new("foto_folha")
nt, b = bsdf(m_folha)
b.inputs["Base Color"].default_value = lin("#2fbf6e")
b.inputs["Emission Color"].default_value = lin("#5dffa0")
b.inputs["Emission Strength"].default_value = 0.45
PX, PZ = 0.0, -6.2
malha("caule", m_folha, J(PX, 0.75 + 0.6, PZ), (0.016, 0.016, 1.2), tipo="cil")
for i in range(44):
    k = i / 44
    y, a, incl, tam = 0.25 + k * 1.05, i * 2.4, 0.5 + (1 - k) * 0.5, 0.75 - k * 0.45
    d = Vector((math.cos(a), math.sin(a), 0))
    c = J(PX, 0.75 + y, PZ) + d * tam * 0.34 * math.cos(incl) + Vector((0, 0, tam * 0.34 * math.sin(incl) * 0.4))
    o = malha(f"folha{i}", m_folha, c, (tam * 0.34, tam * 0.11, 0.03))
    o.rotation_euler = (0, -incl * 0.6, a)
# a tela em branco no cavalete
cav, rot = J(-1.05, 1.5, -5.35), 0.5
malha("tela_cavalete", emissivo("foto_telab", "#eefff3", 0.55), cav, (0.8, 1.0, 1), (math.pi / 2, 0, rot), tipo="plano")
# a água dos baldes
for bx, bz in ((2.7, 3.0), (-2.4, -0.4), (2.2, -3.6)):
    malha(f"agua{bx}", emissivo(f"foto_agua{bx}", "#0d2238", 0.6), J(bx, 0.3, bz), (0.2, 0.2, 1), tipo="disco")
# o halo da planta (aditivo no jogo): uma bola de luz fraca
halo = malha("halo", emissivo("foto_halo", "#c8ffdc", 0.25, 0.08), J(PX, 1.3, PZ), (0.5, 0.5, 0.5))


def luz(nome, p, cor, w, raio=0.05):
    d = bpy.data.lights.new(nome, "POINT")
    d.energy = w
    d.color = lin(cor)[:3]
    d.shadow_soft_size = raio
    lo = bpy.data.objects.new(nome, d)
    col.objects.link(lo)
    lo.location = p


# a luz do jogo: a única pontual (a da planta); o ambiente e o hemisfério viram o mundo
luz("planta", J(0, 1.45, -5.95), "#c8ffdc", 70, 0.2)
luz("cultivo", J(0, 2.68, -6.2), "#b38cff", 15, 0.4)
if sc.world is None:
    sc.world = bpy.data.worlds.new("Mundo")
sc.world.use_nodes = True
bg = next(n for n in sc.world.node_tree.nodes if n.type == "BACKGROUND")
bg.inputs["Color"].default_value = (0.16, 0.19, 0.26, 1)
bg.inputs["Strength"].default_value = 1.0
# um pouco da noite caindo pelo vidro do teto
d = bpy.data.lights.new("vidro", "AREA")
d.energy = 420
d.size = 3.0
d.shape = "RECTANGLE"
d.size_y = 15.0
d.color = lin("#9fb8e0")[:3]
lo = bpy.data.objects.new("vidro", d)
col.objects.link(lo)
lo.location = (0, 0, 7.3)

PLANOS = {
    "entrada": ((0, 1.7, 7.4), (0, 2.7, -4), 62),
    "filme": ((0.3, 1.45, -4.1), (0, 1.35, -6.2), 46),
    "quadros": ((0, 1.75, 4.6), (0, 2.2, -2), 64),
}
pos, olha, fov = PLANOS.get(PLANO, PLANOS["entrada"])
cd = bpy.data.cameras.new("foto_cam")
cd.sensor_fit = "VERTICAL"
cd.angle_y = math.radians(fov)
cd.clip_start = 0.05
cam = bpy.data.objects.new("foto_cam", cd)
col.objects.link(cam)
cam.location = J(*pos)
cam.rotation_euler = (J(*olha) - cam.location).to_track_quat("-Z", "Y").to_euler()
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
    for dv in pr.devices:
        dv.use = True
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
