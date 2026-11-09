# A foto da fachada do bar (o nó "bar" do lugares-chao.glb), à noite, com o letreiro
# aceso (aqui o texto em 3D; no jogo é o letreiro de sempre, "O COPO"), como quem chega
# do deserto. Cycles.
#
#   blender -b --factory-startup --python blender/scripts/bar_fachada_foto.py -- bruto.glb docs/blender/bar-fachada.png [1600] [160] [frente|perto|lado]

import bpy, sys, math
from mathutils import Vector, Color

args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
GLB = args[0]
FOTO = args[1] if len(args) > 1 else "/tmp/bar-fachada.png"
LARG = int(args[2]) if len(args) > 2 else 1600
AMOSTRAS = int(args[3]) if len(args) > 3 else 160
VISTA = args[4] if len(args) > 4 else "frente"
COR, NOME = "#ff6a35", "O COPO"  # os mesmos do jogo (disco/historia.ts, CHAO_LUGARES.bar)
Z_LET, F_LET = 6.3, 0.1

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
bpy.ops.import_scene.gltf(filepath=GLB)


def lin(h):
    c = Color((int(h[1:3], 16) / 255, int(h[3:5], 16) / 255, int(h[5:7], 16) / 255)).from_srgb_to_scene_linear()
    return (c.r, c.g, c.b, 1.0)


def mat(nome):
    m = bpy.data.materials.new(nome)
    try:
        m.use_nodes = True
    except Exception:
        pass
    return m, next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")


def mat_vc(nome, camada, emite=0.0):
    m, b = mat(nome)
    a = m.node_tree.nodes.new("ShaderNodeVertexColor")
    a.layer_name = camada
    if emite:
        b.inputs["Base Color"].default_value = (0, 0, 0, 1)
        m.node_tree.links.new(a.outputs["Color"], b.inputs["Emission Color"])
        b.inputs["Emission Strength"].default_value = emite
    else:
        m.node_tree.links.new(a.outputs["Color"], b.inputs["Base Color"])
        b.inputs["Roughness"].default_value = 0.85
    return m


def mat_neon(nome, cor, emite):
    m, b = mat(nome)
    b.inputs["Base Color"].default_value = (0, 0, 0, 1)
    b.inputs["Emission Color"].default_value = cor
    b.inputs["Emission Strength"].default_value = emite
    return m


e = bpy.data.objects["bar"]
# o .glb tem todos os lugares na origem: fica só o bar
for o in list(bpy.data.objects):
    if o is not e and e not in o.children_recursive and o not in e.children_recursive:
        bpy.data.objects.remove(o, do_unlink=True)
neon = mat_neon("foto_neon", lin(COR), 7.0)
for o in e.children_recursive:
    if o.type != "MESH":
        continue
    me = o.data
    camada = me.color_attributes[0].name if len(me.color_attributes) else "Col"
    me.materials.clear()
    if o.name.startswith("bar_neon"):
        me.materials.append(neon)
    elif o.name.startswith("bar_luz"):
        me.materials.append(mat_vc("foto_luz", camada, 2.6))
    else:
        me.materials.append(mat_vc("foto_sol", camada))

cu = bpy.data.curves.new("foto_txt", "FONT")
cu.body = NOME
cu.align_x = "CENTER"
cu.align_y = "CENTER"
cu.size = 1.45
cu.extrude = 0.01
t = bpy.data.objects.new("foto_txt", cu)
sc.collection.objects.link(t)
t.parent = e
t.location = (0, -F_LET, Z_LET)
t.rotation_euler = (math.pi / 2, 0, 0)
cu.materials.append(mat_neon("foto_txtm", lin(COR), 9.0))

# as luzes de cena: o mesmo do jogo é emissivo; aqui o "spill" da gambiarra, do balcão e do letreiro
def luz(nome, tipo, en, cor, loc, tam=None):
    d = bpy.data.lights.new(nome, tipo)
    d.energy = en
    d.color = cor
    if tam and tipo == "POINT":
        d.shadow_soft_size = tam
    o = bpy.data.objects.new(nome, d)
    sc.collection.objects.link(o)
    o.location = loc
    return o

luz("spill_letreiro", "POINT", 500, lin(COR)[:3], (0, -3.2, 5.8), 1.5)
luz("spill_balcao", "POINT", 90, (1.0, 0.72, 0.42), (-3.6, -1.7, 1.9), 0.4)
luz("spill_porta", "POINT", 120, (1.0, 0.72, 0.42), (1.2, -0.9, 1.0), 0.4)
for x, y, z in ((-3.5, -5.2, 3.5), (3.5, -5.2, 3.5), (-3.4, -2.6, 3.3), (3.4, -2.6, 3.3)):
    luz("spill_lamp", "POINT", 42, (1.0, 0.82, 0.55), (x, y, z), 0.2)

mc, bc = mat("foto_chao")
nt = mc.node_tree
nz = nt.nodes.new("ShaderNodeTexNoise")
nz.inputs["Scale"].default_value = 0.35
mix = nt.nodes.new("ShaderNodeMix")
mix.data_type = "RGBA"
nt.links.new(nz.outputs["Fac"], mix.inputs["Factor"])
mix.inputs["A"].default_value = (0.012, 0.010, 0.010, 1)
mix.inputs["B"].default_value = (0.035, 0.028, 0.024, 1)
nt.links.new(mix.outputs["Result"], bc.inputs["Base Color"])
bc.inputs["Roughness"].default_value = 0.95
me = bpy.data.meshes.new("foto_chao")
me.from_pydata([(-300, -300, 0), (300, -300, 0), (300, 300, 0), (-300, 300, 0)], [], [(0, 1, 2, 3)])
me.materials.append(mc)
sc.collection.objects.link(bpy.data.objects.new("foto_chao", me))

if sc.world is None:
    sc.world = bpy.data.worlds.new("Mundo")
sc.world.use_nodes = True
bg = next(n for n in sc.world.node_tree.nodes if n.type == "BACKGROUND")
bg.inputs["Color"].default_value = (0.010, 0.014, 0.036, 1)
bg.inputs["Strength"].default_value = 1.0
sd = bpy.data.lights.new("foto_lua", "SUN")
sd.energy = 2.0
sd.color = (0.55, 0.65, 1.0)
sd.angle = 0.02
lua = bpy.data.objects.new("foto_lua", sd)
sc.collection.objects.link(lua)
lua.rotation_euler = (math.radians(62), 0, math.radians(-32))

cd = bpy.data.cameras.new("foto_cam")
cam = bpy.data.objects.new("foto_cam", cd)
sc.collection.objects.link(cam)
if VISTA == "perto":
    cd.lens = 34
    cam.location = (3.4, -10.5, 1.55)
    alvo = Vector((-0.8, -1.4, 1.5))
elif VISTA == "lado":
    cd.lens = 28
    cam.location = (15, -13, 3.2)
    alvo = Vector((1, 1.5, 3.2))
else:
    cd.lens = 38
    cam.location = (-4.5, -20, 2.6)
    alvo = Vector((0, -1.5, 3.5))
cam.rotation_euler = (alvo - cam.location).to_track_quat("-Z", "Y").to_euler()
sc.camera = cam

try:
    sc.render.engine = "CYCLES"
except TypeError as err:
    print("engine", err)
sc.cycles.samples = AMOSTRAS
sc.cycles.use_denoising = True
try:
    pr = bpy.context.preferences.addons["cycles"].preferences
    pr.compute_device_type = "METAL"
    pr.get_devices()
    for d in pr.devices:
        d.use = True
    sc.cycles.device = "GPU"
except Exception as err:
    print("gpu", err)
sc.view_settings.view_transform = "AgX"
try:
    sc.view_settings.look = "AgX - Medium High Contrast"
except TypeError as err:
    print("look", err)
sc.render.resolution_x = LARG
sc.render.resolution_y = int(LARG * 0.6)
sc.render.resolution_percentage = 100
sc.render.image_settings.file_format = "PNG"
sc.render.filepath = FOTO
bpy.ops.render.render(write_still=True)
print("FOTO", FOTO)
