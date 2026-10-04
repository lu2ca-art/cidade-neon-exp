# Gera public/models/pessoa.glb (a gente na porta dos lugares). Roda da raiz do repo:
# /Applications/Blender.app/Contents/MacOS/Blender -b --python blender/scripts/pessoa.py
import bpy, math
bpy.ops.wm.read_factory_settings(use_empty=True)
partes = []
def add(obj):
    partes.append(obj); return obj
def cil(r1, r2, h, loc, rot=(0,0,0), v=10):
    bpy.ops.mesh.primitive_cone_add(vertices=v, radius1=r1, radius2=r2, depth=h, location=loc, rotation=rot)
    return add(bpy.context.active_object)
def esf(r, loc, esc=(1,1,1), seg=12):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=8, radius=r, location=loc)
    o = bpy.context.active_object; o.scale = esc
    return add(o)
# Y pra cima no Blender é Z: o corpo fica em pé no eixo Z, altura ~1,72 m
esf(0.115, (0, 0, 1.6), (0.9, 1.0, 1.12))          # cabeça
cil(0.05, 0.045, 0.12, (0, 0, 1.45))               # pescoço
t=cil(0.2, 0.15, 0.5, (0, 0, 1.15), v=12); t.scale=(1,0.68,1)  # tronco (ombro mais largo que cintura)
esf(0.17, (0, 0, 0.88), (1.05, 0.75, 0.6))         # quadril
for s in (-1, 1):
    # ombro, braço e antebraço, levemente afastados e relaxados
    esf(0.07, (s*0.2, 0, 1.37))
    cil(0.055, 0.045, 0.32, (s*0.225, 0, 1.19), rot=(0, s*0.08, 0))
    cil(0.045, 0.035, 0.3, (s*0.25, 0.02, 0.89), rot=(0.08, s*0.05, 0))
    esf(0.045, (s*0.255, 0.03, 0.72), (0.8, 0.6, 1.2)) # mão
    # coxa, canela, pé
    cil(0.085, 0.065, 0.45, (s*0.1, 0, 0.6))
    cil(0.06, 0.045, 0.42, (s*0.1, 0, 0.2))
    esf(0.06, (s*0.1, 0.05, 0.03), (0.75, 1.6, 0.45)) # pé
bpy.ops.object.select_all(action='DESELECT')
for o in partes: o.select_set(True)
bpy.context.view_layer.objects.active = partes[0]
bpy.ops.object.join()
corpo = bpy.context.active_object
corpo.name = "pessoa"
bpy.ops.object.shade_smooth()
m = bpy.data.materials.new("corpo"); m.use_nodes = True
corpo.data.materials.append(m)
bpy.ops.export_scene.gltf(filepath="public/models/pessoa.glb", export_format='GLB', export_apply=True, export_yup=True)
print("TRIS", sum(len(p.vertices) - 2 for p in corpo.data.polygons))
