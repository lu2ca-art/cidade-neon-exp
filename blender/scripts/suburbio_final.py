# Subúrbio, etapa final (depois do suburbio_reduzir.py e do glb_simplificar.mjs):
# refaz a normal (aresta viva acima de 30 graus: as caixas ficam retas, o que é
# curvo fica liso), conta os triângulos que vão pra tela (cópias contam), tira
# o retrato "depois" (mesma câmera do "antes") e exporta com normal.
#   blender -b --factory-startup --python blender/scripts/suburbio_final.py -- in.glb out.glb [depois.png]

import bpy, sys, math
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:]
ENTRADA, SAIDA = argv[0], argv[1]
PNG = argv[2] if len(argv) > 2 and argv[2] else None

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=ENTRADA)
sc = bpy.context.scene
malhas = [o for o in sc.objects if o.type == "MESH"]

feitas = set()
for o in malhas:
    me = o.data
    if me.name in feitas:
        continue
    feitas.add(me.name)
    for p in me.polygons:
        p.use_smooth = True
    me.set_sharp_from_angle(angle=math.radians(30))

def tris(me):
    return sum(len(p.vertices) - 2 for p in me.polygons)

tela = sum(tris(o.data) for o in malhas)
unicas = {}
for o in malhas:
    unicas[o.data.name] = tris(o.data)
por_mat = {}
for o in malhas:
    k = o.data.materials[0].name if o.data.materials else "-"
    por_mat[k] = por_mat.get(k, 0) + tris(o.data)
print("TELA", tela, "UNICAS", sum(unicas.values()), "objetos", len(malhas), "malhas", len(unicas))
print("POR_MATERIAL", por_mat)

if PNG:
    # a mesma câmera do retrato "antes" (a caixa do modelo é a mesma)
    mn = Vector((1e9, 1e9, 1e9)); mx = -mn
    for o in malhas:
        for c in o.bound_box:
            w = o.matrix_world @ Vector(c)
            mn = Vector(map(min, mn, w)); mx = Vector(map(max, mx, w))
    if len(argv) > 3:
        cen = Vector(map(float, argv[3].split(",")))
        raio = float(argv[4])
    else:
        cen, raio = (mn + mx) / 2, (mx - mn).length / 2
    print("CAMERA", tuple(round(x, 3) for x in cen), round(raio, 3))
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
    cam.data.lens = 35
    sc.collection.objects.link(cam)
    d = Vector((0.55, -0.75, 0.62)).normalized()
    cam.location = cen + d * raio * 1.45
    cam.rotation_euler = (cen - cam.location).to_track_quat("-Z", "Y").to_euler()
    sc.camera = cam
    sc.render.engine = "BLENDER_WORKBENCH"
    sh = sc.display.shading
    sh.light = "STUDIO"
    sh.color_type = "TEXTURE"
    sh.show_cavity = True
    sh.cavity_type = "WORLD"
    sc.render.resolution_x, sc.render.resolution_y = 1600, 1000
    sc.render.image_settings.file_format = "PNG"
    sc.render.filepath = PNG
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(cam, do_unlink=True)

for o in sc.objects:
    o.select_set(o.type == "MESH")
bpy.ops.export_scene.gltf(filepath=SAIDA, export_format="GLB", use_selection=True, export_texcoords=True,
                          export_normals=True, export_materials="EXPORT", export_yup=True, export_apply=False,
                          export_image_format="WEBP")
print("exportado", SAIDA)
