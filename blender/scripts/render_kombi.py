# Retrato do interior da Kombi (Workbench, cor dos vértices), duas vistas lado a
# lado: do olho do motorista pra frente e de dentro pro estúdio no fundo.
#   blender -b --factory-startup --python blender/scripts/render_kombi.py -- in.glb out.png
# (o .glb precisa estar sem meshopt: blender/scripts/glb_abrir.mjs)
import bpy, sys, math
import numpy as np
from mathutils import Vector

ent, sai = sys.argv[sys.argv.index("--") + 1:][:2]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=ent)
sc = bpy.context.scene
tot = 0
for o in sc.objects:
    if o.type == "MESH":
        tot += sum(len(p.vertices) - 2 for p in o.data.polygons)
        print("NO", o.name, sum(len(p.vertices) - 2 for p in o.data.polygons))
print("TRIS", tot)
sc.render.engine = "BLENDER_WORKBENCH"
sh = sc.display.shading
sh.light = "STUDIO"
sh.color_type = "VERTEX"
sh.show_cavity = True
sc.render.resolution_x, sc.render.resolution_y = 960, 640
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
sc.collection.objects.link(cam)
sc.camera = cam
cam.data.sensor_fit = "VERTICAL"
cam.data.angle_y = math.radians(80)
vistas = [((-0.176, 0.194, 1.795), (-0.1, -1.6, 1.35)),   # olho -> painel
          ((0.2, -0.9, 1.75), (-0.2, 2.2, 0.9))]          # do banco -> estúdio
partes = []
for i, (pos, alvo) in enumerate(vistas):
    cam.location = Vector(pos)
    cam.rotation_euler = (Vector(alvo) - Vector(pos)).to_track_quat("-Z", "Y").to_euler()
    f = sai.replace(".png", f"_{i}.png")
    sc.render.filepath = f
    bpy.ops.render.render(write_still=True)
    im = bpy.data.images.load(f)
    a = np.array(im.pixels[:], dtype=np.float32).reshape(im.size[1], im.size[0], 4)
    partes.append(a)
junto = np.concatenate(partes, axis=1)
h, w = junto.shape[:2]
out = bpy.data.images.new("junto", w, h)
out.pixels = junto.ravel()
out.filepath_raw = sai
out.file_format = "PNG"
out.save()
import os
for i in range(len(vistas)):
    os.remove(sai.replace(".png", f"_{i}.png"))
print("render", sai)
