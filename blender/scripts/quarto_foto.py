# A foto do quarto do Drewboy da câmera do jogo (o plano "quarto" do
# Quarto.tsx: pos [-1.7, 1.9, 2.2] olhando [0.6, 0.8, -0.9], fov 75), com as
# luzes que o jogo tem (o espelho, a janela, a lâmpada amarela) e o espelho
# aceso (no jogo é do código). Os grafites (textura do código) não aparecem.
#
#   blender -b --factory-startup --python blender/scripts/quarto.py --python blender/scripts/quarto_foto.py -- bruto.glb docs/blender/quarto.png

import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sala_kit as kit
import bpy

args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
FOTO = args[1] if len(args) > 1 else "/tmp/quarto.png"


def espelho():
    for nome, loc, esc, cor, forca in (("espelho", kit.J(-0.2, 1.4, -2.27), (1.1, 0.04, 1.9), "#9fb8e8", 0.6),
                                       ("neon", kit.J(-0.2, 2.4, -2.22), (1.1, 0.07, 0.07), "#7fe8ff", 8.0)):
        bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
        o = bpy.context.object
        o.scale = esc
        m = bpy.data.materials.new(nome)
        m.use_nodes = True
        b = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
        b.inputs["Base Color"].default_value = kit.lin(cor)
        b.inputs["Metallic"].default_value = 0.9
        b.inputs["Roughness"].default_value = 0.05
        b.inputs["Emission Color"].default_value = kit.lin(cor)
        b.inputs["Emission Strength"].default_value = forca
        o.data.materials.append(m)


kit.foto(FOTO, (-1.7, 1.9, 2.2), (0.6, 0.8, -0.9), 75, [
    ((-0.2, 1.4, -1.47), "#7fe8ff", 60, 0.3),
    ((1.48, 1.5, 0.2), "#ff3fb0", 15, 0.2),
    ((-1.2, 2.1, 0.6), "#ffc857", 20, 0.1),
    ((0, 2.2, 0), "#b0c8ff", 12, 1.5),
], fundo=(0.004, 0.004, 0.01), prep=espelho)
