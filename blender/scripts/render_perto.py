# Retrato de perto (Workbench, textura) de um .glb sem meshopt, câmera dada:
#   blender -b --factory-startup --python blender/scripts/render_perto.py -- in.glb out.png cx,cy,cz ax,ay,az [lente]
# (coordenadas do Blender, Z pra cima; c = câmera, a = pra onde olha)
import bpy, sys
from mathutils import Vector
a = sys.argv[sys.argv.index("--") + 1:]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=a[0])
sc = bpy.context.scene
if a[2] == "?":
    o = bpy.data.objects[a[3]]
    print("CENTRO", o.name, sum((o.matrix_world @ Vector(c) for c in o.bound_box), Vector()) / 8)
    sys.exit(0)
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
cam.data.lens = float(a[4]) if len(a) > 4 else 24
sc.collection.objects.link(cam)
cam.location = Vector(map(float, a[2].split(",")))
cam.rotation_euler = (Vector(map(float, a[3].split(","))) - cam.location).to_track_quat("-Z", "Y").to_euler()
sc.camera = cam
sc.render.engine = "BLENDER_WORKBENCH"
sh = sc.display.shading
sh.light = "STUDIO"
sh.color_type = "TEXTURE"
sh.show_cavity = True
sh.cavity_type = "WORLD"
sc.render.resolution_x, sc.render.resolution_y = 1600, 1000
sc.render.filepath = a[1]
bpy.ops.render.render(write_still=True)
