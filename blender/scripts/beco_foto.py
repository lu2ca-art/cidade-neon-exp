# A foto do beco da câmera do jogo (o plano "boca" do Beco.tsx: pos [0, 1.6, 8.5]
# olhando [0, 2.4, -3], fov 62), com as luzes que o jogo tem (os três letreiros,
# a lâmpada da moradora) e os letreiros acesos (no jogo são do código).
#
#   blender -b --factory-startup --python blender/scripts/beco.py --python blender/scripts/beco_foto.py -- bruto.glb docs/blender/beco.png

import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sala_kit as kit
import bpy

args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
FOTO = args[1] if len(args) > 1 else "/tmp/beco.png"
GRITOS = [("#ff3fb0", -0.35, 3.1), ("#ffc857", 0.0, 3.95), ("#2fe8ff", 0.35, 4.8)]


def letreiros():
    for k, (cor, x, z) in enumerate(GRITOS):
        bpy.ops.mesh.primitive_cube_add(size=1, location=(x, -4.6, z))
        o = bpy.context.object
        o.scale = (2.6, 0.01, 0.3)
        m = bpy.data.materials.new(f"grito{k}")
        m.use_nodes = True
        b = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
        b.inputs["Base Color"].default_value = (0, 0, 0, 1)
        b.inputs["Emission Color"].default_value = kit.lin(cor)
        b.inputs["Emission Strength"].default_value = 5.0
        o.data.materials.append(m)


kit.foto(FOTO, (0, 1.6, 8.5), (0, 2.4, -3), 62, [
    ((x, z, 4.4), cor, 120, 0.4) for cor, x, z in GRITOS
] + [((0, 2.4, -3.9), "#ffd9a0", 60, 0.1)], fundo=(0.004, 0.004, 0.008), prep=letreiros)
