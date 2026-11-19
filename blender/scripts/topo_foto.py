# A foto do terraço do Notti da câmera do jogo (o plano "chegada" do Topo.tsx:
# pos [0, 1.7, 5] olhando [0, 1.2, -1], fov 60), com as luzes que o jogo tem
# (a da cidade lá embaixo, a da escada) e a cidade de caixas em volta (no jogo
# é o <Cidade>). Roda logo depois do topo.py, no mesmo Blender:
#
#   blender -b --factory-startup --python blender/scripts/topo.py --python blender/scripts/topo_foto.py -- bruto.glb docs/blender/topo.png

import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sala_kit as kit
import bpy, math

args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
FOTO = args[1] if len(args) > 1 else "/tmp/topo.png"


def cidade():
    s = [9]

    def r():
        s[0] = (s[0] * 16807) % 2147483647
        return s[0] / 2147483647
    cores = ["#5dffa0", "#2fe8ff", "#ffc857", "#b38cff", "#5dffa0"]
    corpo = bpy.data.materials.new("cid_corpo")
    corpo.use_nodes = True
    next(n for n in corpo.node_tree.nodes if n.type == "BSDF_PRINCIPLED").inputs["Base Color"].default_value = (0.012, 0.012, 0.02, 1)
    for i in range(110):
        a = i / 110 * math.pi * 2 + r() * 0.05
        d = 70 * (0.8 + r() * 0.5)
        x, z, w, h, c = math.cos(a) * d, math.sin(a) * d, 4 + r() * 6, 10 + r() * 40, cores[int(r() * 5)]
        bpy.ops.mesh.primitive_cube_add(size=1, location=kit.J(x, -28 + h / 2, z))
        o = bpy.context.object
        o.scale = (w, w, h)
        o.data.materials.append(corpo)
        bpy.ops.mesh.primitive_cube_add(size=1, location=kit.J(x, -28 + h + 0.2, z))
        t = bpy.context.object
        t.scale = (w * 0.9, w * 0.9, 0.3)
        m = bpy.data.materials.new(f"cid_{i}")
        m.use_nodes = True
        b = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
        b.inputs["Base Color"].default_value = (0, 0, 0, 1)
        b.inputs["Emission Color"].default_value = kit.lin(c)
        b.inputs["Emission Strength"].default_value = 4.0
        t.data.materials.append(m)
    # a luz vermelha da antena (o Pisca do código)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.1, location=kit.J(-3.5, 6.05, 3))
    m = bpy.data.materials.new("pisca")
    m.use_nodes = True
    b = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    b.inputs["Emission Color"].default_value = kit.lin("#ff2a2a")
    b.inputs["Emission Strength"].default_value = 8.0
    bpy.context.object.data.materials.append(m)


kit.foto(FOTO, (0, 1.7, 5), (0, 1.2, -1), 60, [
    ((0, -4, -8), "#ff3fb0", 4000, 2.0),
    ((2.5, 2.4, 2.1), "#ffe0a8", 40, 0.1),
    ((0, 6, 4), "#a8c0ff", 150, 3.0),
    ((0, 12, 2), "#7f9ccf", 900, 6.0),
], fundo=(0.008, 0.007, 0.03), prep=cidade)
