# A foto da casa da Ella (o lugar escondido) da câmera do jogo (o plano
# "chegada" do Escondido.tsx: pos [1.9, 1.7, 2.5] olhando [-0.2, 1.0, -0.6],
# fov 58), com as luzes que o jogo tem (a luz roxa da tenda, a rosa embaixo) e
# uma luz fraca no lugar da ambiente quente. A planta (do código) não aparece.
#
#   blender -b --factory-startup --python blender/scripts/escondido.py --python blender/scripts/escondido_foto.py -- bruto.glb docs/blender/escondido.png

import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sala_kit as kit

args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
FOTO = args[1] if len(args) > 1 else "/tmp/escondido.png"

kit.foto(FOTO, (1.9, 1.7, 2.5), (-0.2, 1.0, -0.6), 58, [
    ((0, 1.8, -0.6), "#c070ff", 60, 0.3),
    ((0, 0.9, 0.0), "#ff70d0", 12, 0.2),
    ((0.6, 2.3, 0.8), "#ffcf9a", 25, 0.1),
    ((0, 2.5, 1.5), "#ffd9b0", 20, 2.0),
], fundo=(0.05, 0.035, 0.025))
