# Gera a gente das salas: public/models/pessoa.glb (em pé), pessoa-sentada.glb
# e pessoa-danca.glb. Corpo estilizado (manequim), escuro no jogo com a cor
# de quem é no contorno. Frente = -Y no Blender (vira +Z no three).
# Roda da raiz do repo:
# /Applications/Blender.app/Contents/MacOS/Blender -b --python blender/scripts/gente.py
import bpy, math
from mathutils import Vector

def cil_entre(a, b, r1, r2, partes, v=10):
    a, b = Vector(a), Vector(b)
    d = b - a
    bpy.ops.mesh.primitive_cone_add(vertices=v, radius1=r1, radius2=r2, depth=d.length, location=(a + b) / 2)
    o = bpy.context.active_object
    o.rotation_mode = 'QUATERNION'
    o.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d.normalized())
    partes.append(o)

def esf(r, loc, partes, esc=(1, 1, 1)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=r, location=loc)
    o = bpy.context.active_object; o.scale = esc; partes.append(o)

def corpo(pose):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    p = []
    sentado = pose == "sentada"
    quadril = 0.5 if sentado else 0.9
    # tronco e cabeça (sobem junto com o quadril)
    ombro = quadril + 0.5
    esf(0.17, (0, 0, quadril), p, (1.05, 0.75, 0.6))
    cil_entre((0, 0, quadril + 0.02), (0, 0, ombro), 0.15, 0.2, p, v=12)
    p[-1].scale = (1, 0.68, 1)
    cil_entre((0, 0, ombro), (0, 0, ombro + 0.1), 0.05, 0.045, p)
    esf(0.115, (0, 0, ombro + 0.22), p, (0.9, 1.0, 1.12))
    for s in (-1, 1):
        sh = (s * 0.2, 0, ombro - 0.03)
        esf(0.07, sh, p)
        if pose == "danca":
            # braços pra cima, um mais aberto que o outro
            cot = (s * 0.32, -0.04, ombro + 0.22 + (0.06 if s > 0 else 0))
            mao = (s * (0.36 if s > 0 else 0.26), -0.06, ombro + 0.52 + (0.08 if s > 0 else 0))
        elif sentado:
            # mãos no colo / no balcão
            cot = (s * 0.23, -0.12, ombro - 0.3)
            mao = (s * 0.16, -0.38, ombro - 0.34)
        else:
            cot = (s * 0.245, 0.0, ombro - 0.31)
            mao = (s * 0.26, -0.03, ombro - 0.6)
        cil_entre(sh, cot, 0.055, 0.045, p)
        cil_entre(cot, mao, 0.045, 0.035, p)
        esf(0.045, mao, p, (0.8, 0.6, 1.2))
        hip = (s * 0.1, 0, quadril - 0.05)
        if sentado:
            joelho = (s * 0.11, -0.44, quadril - 0.02)
            pe = (s * 0.11, -0.47, 0.05)
        else:
            abre = 0.04 if pose == "danca" else 0
            joelho = (s * (0.1 + abre), -0.01, quadril - 0.48)
            pe = (s * (0.1 + abre * 1.5), 0, 0.06)
        cil_entre(hip, joelho, 0.085, 0.065, p)
        cil_entre(joelho, pe, 0.06, 0.045, p)
        esf(0.06, (pe[0], pe[1] - 0.05, 0.03), p, (0.75, 1.6, 0.45))
    bpy.ops.object.select_all(action='DESELECT')
    for o in p: o.select_set(True)
    bpy.context.view_layer.objects.active = p[0]
    bpy.ops.object.join()
    c = bpy.context.active_object
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    bpy.ops.object.shade_smooth()
    m = bpy.data.materials.new("corpo"); c.data.materials.append(m)
    nome = {"em-pe": "pessoa", "sentada": "pessoa-sentada", "danca": "pessoa-danca"}[pose]
    bpy.ops.export_scene.gltf(filepath=f"public/models/{nome}.glb", export_format='GLB', export_apply=True, export_yup=True)

def leve():
    # a multidão (balada): o corpo em pé com ~1/4 dos triângulos
    corpo("em-pe")
    o = [x for x in bpy.context.scene.objects if x.type == "MESH"][0]
    bpy.context.view_layer.objects.active = o
    mod = o.modifiers.new("menos", "DECIMATE"); mod.ratio = 0.25
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.ops.export_scene.gltf(filepath="public/models/pessoa-leve.glb", export_format='GLB', export_apply=True, export_yup=True)
    print("TRIS LEVE", sum(len(p.vertices) - 2 for p in o.data.polygons))

for pose in ("em-pe", "sentada", "danca"):
    corpo(pose)
leve()
