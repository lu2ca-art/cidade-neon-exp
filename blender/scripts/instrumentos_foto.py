# Depois do instrumentos_bake.py (no mesmo Blender): arruma os 11 juntos num
# chão de tábua escura, luz quente, fundo escuro quente, e renderiza a foto
# (Eevee). Saída: o 2º argumento depois de "--" (ou docs/blender/instrumentos.png).

import bpy, sys, math
from mathutils import Vector

FOTO = "/Users/lu2ca/cidade-neon-blend-inst/docs/blender/instrumentos.png"
args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
if len(args) > 1:
    FOTO = args[1]
LARG = int(args[2]) if len(args) > 2 else 1200

# x, y, giro em z, inclinação (em x, pra trás), inclinação em y
POSE = {
    "sitar": (-0.78, 0.42, 0.35, -0.10, 0.06),
    "djembe": (-0.22, 0.38, 0.4, 0, 0),
    "udu": (0.22, 0.42, -0.6, 0, 0),
    "didgeridoo": (0.62, 0.62, 0, -0.08, -0.05),
    "berimbau": (0.95, 0.55, -0.5, -0.07, 0.0),
    "tambor-agua": (-0.36, -0.12, 0.2, 0, 0),
    "handpan": (0.38, -0.08, 0.3, 0, 0),
    "kalimba": (-0.78, -0.42, 0.35, 0, 0),
    "caxixi": (-0.50, -0.55, 0.0, 0, 0),
    "flauta-bambu": (0.0, -0.58, -0.12, 0, 0),
    "ocarina": (0.42, -0.62, -0.5, 0, 0),
}
for k, (x, y, rz, rx, ry) in POSE.items():
    e = bpy.data.objects[k]
    e.location = (x, y, 0)
    e.rotation_euler = (rx, ry, rz)

sc = bpy.context.scene
for o in list(sc.objects):
    if o.type in ("CAMERA", "LIGHT") or o.name.startswith("foto_"):
        bpy.data.objects.remove(o, do_unlink=True)


def luz(nome, tipo, pos, alvo, energia, cor, tam=1.0):
    d = bpy.data.lights.new(nome, tipo)
    d.energy = energia
    d.color = cor
    if tipo == "AREA":
        d.size = tam
    o = bpy.data.objects.new("foto_" + nome, d)
    sc.collection.objects.link(o)
    o.location = pos
    o.rotation_euler = (Vector(alvo) - Vector(pos)).to_track_quat("-Z", "Y").to_euler()
    return o


luz("chave", "AREA", (-1.6, -2.0, 2.4), (0, 0.1, 0.3), 260, (1.0, 0.72, 0.45), 1.6)
luz("recorte", "AREA", (1.8, 1.8, 1.6), (0, 0.2, 0.5), 160, (1.0, 0.5, 0.25), 1.2)
luz("enche", "AREA", (1.8, -2.2, 0.9), (0, 0, 0.3), 40, (0.85, 0.75, 0.7), 2.0)

# chão de tábua e parede, escuros e quentes
m = bpy.data.materials.new("foto_chao")
try:
    m.use_nodes = True
except Exception:
    pass
b = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
b.inputs["Base Color"].default_value = (0.03, 0.017, 0.01, 1)
b.inputs["Roughness"].default_value = 0.55
for nome, verts in (("chao", [(-4, -4, 0), (4, -4, 0), (4, 4, 0), (-4, 4, 0)]),
                    ("parede", [(-6, 2.6, 0), (6, 2.6, 0), (6, 2.6, 5), (-6, 2.6, 5)])):
    me = bpy.data.meshes.new("foto_" + nome)
    me.from_pydata(verts, [], [(0, 1, 2, 3)])
    o = bpy.data.objects.new("foto_" + nome, me)
    sc.collection.objects.link(o)
    me.materials.append(m)

if sc.world is None:
    sc.world = bpy.data.worlds.new("Mundo")
sc.world.use_nodes = True
bg = next(n for n in sc.world.node_tree.nodes if n.type == "BACKGROUND")
bg.inputs["Color"].default_value = (0.018, 0.009, 0.005, 1)
bg.inputs["Strength"].default_value = 1.0

cd = bpy.data.cameras.new("foto_cam")
cd.lens = 38
cam = bpy.data.objects.new("foto_cam", cd)
sc.collection.objects.link(cam)
cam.location = (0.08, -3.4, 1.25)
cam.rotation_euler = (Vector((0.08, 0.1, 0.52)) - cam.location).to_track_quat("-Z", "Y").to_euler()
sc.camera = cam

try:
    sc.render.engine = "BLENDER_EEVEE"
except TypeError as e:
    print("engine", e)
try:
    sc.eevee.taa_render_samples = 64
    sc.eevee.use_shadows = True
    sc.eevee.use_raytracing = True
except Exception as e:
    print("eevee", e)
sc.view_settings.view_transform = "AgX"
try:
    sc.view_settings.look = "AgX - Medium High Contrast"
except TypeError as e:
    print("look", e)
sc.render.resolution_x = LARG
sc.render.resolution_y = int(LARG * 0.7)
sc.render.resolution_percentage = 100
sc.render.image_settings.file_format = "PNG"
sc.render.filepath = FOTO
bpy.ops.render.render(write_still=True)
print("FOTO", FOTO)
