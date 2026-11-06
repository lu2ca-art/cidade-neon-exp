# A foto da balada da câmera do jogo (o plano "entrada" do Balada.tsx: pos
# [0.5, 2.4, 10] olhando [0, 1.6, -2], fov 62). Abre o glb bruto do balada.py
# (ou usa a cena, se rodar no mesmo Blender), põe as luzes do jogo, o SEXTA, o
# telão-feed, os feixes e a roda de gente com o celular levantado (no jogo é a
# Multidao; aqui cápsulas), Cycles.
#
#   blender -b --factory-startup --python blender/scripts/balada_foto.py -- bruto.glb docs/blender/balada.png [1280] [96]

import os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(sys.argv[sys.argv.index("--python") + 1])))
for i, a in enumerate(sys.argv):
    if a == "--python" and sys.argv[i + 1].endswith("balada_foto.py"):
        sys.path.insert(0, os.path.dirname(os.path.abspath(sys.argv[i + 1])))
import bpy
from balada_kit import foto, gente_foto, Jv, lin

args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
GLB = args[0]
FOTO = args[1] if len(args) > 1 else "/tmp/balada.png"
LARG = int(args[2]) if len(args) > 2 else 1280
AMOSTRAS = int(args[3]) if len(args) > 3 else 96

if "sala_solido" not in bpy.data.objects:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=GLB)

ROSA, LILAS = "#ff3fb0", "#b38cff"


def plano_emissivo(nome, p, w, h, cor, forca, alfa=None):
    bpy.ops.mesh.primitive_plane_add(size=1, location=Jv(*p), rotation=(math.pi / 2, 0, 0))
    o = bpy.context.active_object
    o.name = nome
    o.scale = (w, h, 1)
    m = bpy.data.materials.new(nome)
    m.use_nodes = True
    b = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    b.inputs["Base Color"].default_value = (0, 0, 0, 1)
    b.inputs["Emission Color"].default_value = lin(cor)
    b.inputs["Emission Strength"].default_value = forca
    o.data.materials.append(m)
    return o


def extra():
    sc = bpy.context.scene
    # o telão: faixas do feed
    cores = ["#ff3fb0", "#2a2040", "#b38cff", "#e6f0ff", "#2a2040", "#ffc857", "#2a2040"]
    plano_emissivo("feed_fundo", (0, 4, -9.91), 3, 4.5, "#140e20", 1.0)
    for k in range(16):
        plano_emissivo(f"feed{k}", (0, 1.75 + 4.5 * (k + 0.6) / 16, -9.9), 2.6, 0.2, cores[k % 7], 2.5)
    # os feixes (cones de luz aditiva)
    for i, cor in enumerate([ROSA, LILAS, "#2fe8ff", ROSA, "#ffc857"]):
        x, z = -6 + i * 3, -2 + (i % 2) * 2
        bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=1.1, radius2=0.02, depth=7, location=Jv(x, 3.3, z),
                                        end_fill_type="NOTHING")
        o = bpy.context.active_object
        o.rotation_euler = (math.sin(i * 1.7) * 0.35, math.sin(i * 1.7) * 0.4, 0)
        m = bpy.data.materials.new(f"feixe{i}")
        m.use_nodes = True
        nt = m.node_tree
        for n in list(nt.nodes):
            if n.type != "OUTPUT_MATERIAL":
                nt.nodes.remove(n)
        out = next(n for n in nt.nodes if n.type == "OUTPUT_MATERIAL")
        tr = nt.nodes.new("ShaderNodeBsdfTransparent")
        em = nt.nodes.new("ShaderNodeEmission")
        em.inputs["Color"].default_value = lin(cor)
        em.inputs["Strength"].default_value = 0.35
        ad = nt.nodes.new("ShaderNodeAddShader")
        nt.links.new(tr.outputs[0], ad.inputs[0])
        nt.links.new(em.outputs[0], ad.inputs[1])
        nt.links.new(ad.outputs[0], out.inputs["Surface"])
        o.data.materials.append(m)
        o.visible_shadow = False
    # a gente: a mesma roda do Balada.tsx (semente 21), todo mundo filmando
    seed = [21]

    def r():
        seed[0] = (seed[0] * 16807) % 2147483647
        return seed[0] / 2147483647
    cores_g = [ROSA, LILAS, "#2fe8ff", "#ffc857", "#5dffa0", "#ff6a35"]
    pts = []
    for anel in range(3):
        n = [12, 16, 20][anel]
        raio = 2.4 + anel * 1.3
        for i in range(n):
            a = (i / n) * math.pi * 2 + anel * 0.3 + r() * 0.15
            if math.sin(a) > 0.82 and anel == 0:
                continue
            x = math.cos(a) * (raio + r() * 0.4)
            z = math.sin(a) * (raio + r() * 0.4)
            pts.append((x, 0, z, cores_g[int(r() * len(cores_g))], True))
    pts.append((0, 0, 0, ROSA, False))          # o Drewboy
    pts.append((0, 1.2, -8.3, LILAS, False))    # o DJ
    gente_foto(pts)


LUZES = [
    ((0, 1.3, -6.8), ROSA, 30, 0.5),        # o neon da cabine
    ((-6, 1.75, -3), ROSA, 20, 0.4),        # o neon do camarote
    ((0, 4, -8.4), LILAS, 60, 0.8),         # a luz do telão
    ((3, 5, 8), "#9fb4ff", 120, 1.5),       # a direcional do jogo, de leve
    ((0, 5.5, 4), "#c8b0ff", 60, 3.0),      # o ambiente/hemisfério
]
foto(FOTO, (0.5, 2.4, 10), (0, 1.6, -2), 62, LUZES, (0.03, 0.02, 0.05, 1),
     textos=[("SEXTA", (0, 6.2, -9.85), 0.95, ROSA, 9.0)], extra=extra, larg=LARG, amostras=AMOSTRAS,
     brilho={"neon": 5.0, "luz": 3.0, "pista_neon": 1.1})
