# A foto da casa de shows da câmera do jogo (o plano "entrada" do Shows.tsx:
# pos [0, 2, 7.5] olhando [0, 1.6, -5], fov 62). Abre o glb bruto do shows.py
# (ou usa a cena), põe as luzes do jogo (a ribalta, o foco, a de cima, o poste
# aceso), o ONT M, o poste, o pedestal e o Alohan sentado (cápsula), Cycles.
#
#   blender -b --factory-startup --python blender/scripts/shows_foto.py -- bruto.glb docs/blender/shows.png [1280] [96]

import os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(sys.argv[sys.argv.index("--python") + 1])))
import bpy
from balada_kit import foto, gente_foto, Jv, lin

args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
GLB = args[0]
FOTO = args[1] if len(args) > 1 else "/tmp/shows.png"
LARG = int(args[2]) if len(args) > 2 else 1280
AMOSTRAS = int(args[3]) if len(args) > 3 else 96

if "sala_solido" not in bpy.data.objects:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=GLB)

OURO = "#ffc857"


def m_cor(nome, cor, emis=0.0):
    m = bpy.data.materials.new(nome)
    m.use_nodes = True
    b = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    b.inputs["Base Color"].default_value = lin(cor)
    if emis:
        b.inputs["Emission Color"].default_value = lin(cor)
        b.inputs["Emission Strength"].default_value = emis
    return m


def extra():
    # a ribalta (Neon do jogo), o poste aceso, o pedestal
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.035, depth=11.6, location=Jv(0, 1.04, -4.02), rotation=(0, math.pi / 2, 0))
    bpy.context.active_object.data.materials.append(m_cor("rib", OURO, 8))
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.07, depth=4, location=Jv(0, 2, 1))
    bpy.context.active_object.data.materials.append(m_cor("poste", "#2a2a30"))
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=0.18, location=Jv(0, 4.05, 1))
    bpy.context.active_object.data.materials.append(m_cor("bulbo", "#fff0c8", 12))
    bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=0.015, depth=1.5, location=Jv(0, 1.75, -6))
    bpy.context.active_object.data.materials.append(m_cor("pedestal", "#888888"))
    gente_foto([(0, 0.45, -4.25, OURO, False)])
    bpy.ops.mesh.primitive_cube_add(size=1, location=Jv(0.55, 1.02, -4.3))
    c = bpy.context.active_object
    c.scale = (0.3, 0.22, 0.03)
    c.data.materials.append(m_cor("caderno", "#f4efe2"))


LUZES = [
    ((0, 1.1, -3.9), OURO, 120, 2.0),        # a ribalta
    ((0.3, 3.4, -3.2), "#ffe0a8", 150, 0.3),  # o foco
    ((0, 6, -5), OURO, 200, 0.5),
    ((0, 3.8, 1), "#ffe0a8", 250, 0.2),      # o poste
    ((0, 5, 5), "#ffd9a0", 160, 3.0),         # ambiente/hemisfério
]
foto(FOTO, (0, 2, 7.5), (0, 1.6, -5), 62, LUZES, (0.07, 0.055, 0.04, 1),
     textos=[("ONT M", (0, 7, -8.55), 0.8, OURO, 9.0)], extra=extra, larg=LARG, amostras=AMOSTRAS,
     brilho={"neon": 5.0, "luz": 3.0})
