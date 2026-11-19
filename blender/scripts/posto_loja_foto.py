# A foto do posto com a loja da câmera do jogo (o plano "loja" do Posto.tsx:
# pos [3.5, 1.7, 5] olhando [-2, 1.5, -6], fov 56), com as luzes que o jogo
# tem (as duas da cobertura). A Kombi e o LU2CA (do código) não aparecem.
#
#   blender -b --factory-startup --python blender/scripts/posto_loja.py --python blender/scripts/posto_loja_foto.py -- bruto.glb docs/blender/posto-loja.png

import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sala_kit as kit

args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
FOTO = args[1] if len(args) > 1 else "/tmp/posto-loja.png"

kit.foto(FOTO, (3.5, 1.7, 5), (-2, 1.5, -6), 56, [
    ((-3, 4.6, 0), "#dfe9ff", 250, 1.0),
    ((3, 4.6, 0), "#dfe9ff", 250, 1.0),
], fundo=(0.01, 0.012, 0.02), ganho={"luz": 1.3, "neon": 6.0, "vidro": 1.0})
