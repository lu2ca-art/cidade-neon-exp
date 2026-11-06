# O QUARTO DO DREWBOY por dentro (06/11): AP 222, o quarto do Drew (o do
# streetwear, que comprou o tênis pra sair e nunca saiu). Antes eram caixas
# (app/linha/interior/salas/Quarto.tsx); agora o quarto de quem vive de roupa e
# de som: chão de taco gasto, parede roxa escura descascando, a cama baixa de
# paletes com o colchão e o edredom amarrotado, o varal de roupa estilosa na
# parede (jaqueta, moletom com capuz, a regata 22, camisas) com as caixas de
# tênis empilhadas embaixo, a prateleira de tênis com a fita de LED, o tênis
# novo ainda na caixa (a tampa encostada), a roupa pelo chão, as duas caixas de
# som de pé, o toca-discos e o mixer em cima dos engradados com os discos, o
# fone, a janela com grade e a cidade lá fora (a SEXTA piscando ao longe), os
# pôsteres, as fotos presas na moldura do espelho, o skate, a bola de basquete.
# O espelho (a luz do quarto), os grafites (DREW, 222) e a gente ficam no código.
#
#   blender -b --factory-startup --python blender/scripts/quarto.py \
#     [--python blender/scripts/quarto_foto.py] -- bruto.glb [foto.png]
#   npx @gltf-transform/cli optimize bruto.glb public/models/quarto.glb \
#     --compress meshopt --simplify false --join false --flatten false --instance false --palette false
#
# Coordenadas: as do Quarto.tsx, com X = x, Y = -z, Z = y (o espelho, no fundo,
# fica em +Y; a porta em -Y). A sala é a do código: 4 × 4,6 × 2,6 m. A parede da
# porta tem um lado só (a câmera "porta" fica do lado de fora dela). Um nó:
#   sala   sala_solido / sala_luz / sala_neon / sala_vidro
# Orçamento: até 22 mil triângulos e 500 KB.

import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sala_kit import *  # noqa

args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
SAIDA = args[0] if args else "/tmp/quarto-bruto.glb"

comecar("Quarto")
ATUAL[0] = "sala"
ROSA, CIANO, OURO, VERDE, ROXO = "#ff3fb0", "#7fe8ff", "#ffc857", "#5dffa0", "#b38cff"
PAREDE = "#3a3046"
L, F, H = 2.0, 2.3, 2.6


# ── o chão de taco, as paredes, o teto ──
def f_taco(c, n, i, j):
    k = (j + (i % 2) * 2) // 3
    base = escolhe(["#5a3e2c", "#4e3626", "#664632", "#46301f"], i, k, 2)
    return dim(base, 0.85 + 0.3 * hh(i, k, 5))


Placa("solido", (-L, -F, 0), (2 * L, 0, 0), (0, 2 * F, 0), 20, 18, None, f_taco, sujo=0)


def f_parede(c, n, i, j):
    if c.z < 0.5 and hh(i, j, 3) > 0.55:
        return dim("#2a2430", 0.9)            # a umidade embaixo
    if hh(i, j, 8) > 0.9:
        return "#4a4250"                      # o reboco aparecendo
    return dim(PAREDE, 0.85 + 0.25 * hh(i, j, 1))


def parede(o, U, V, nu, nv):
    Placa("solido", o, U, V, nu, nv, None, f_parede, sujo=0.25)


parede((-L, F, 0), (2 * L, 0, 0), (0, 0, H), 12, 8)            # o fundo (o espelho)
parede((L, -F, 0), (-2 * L, 0, 0), (0, 0, H), 12, 8)           # a da porta (um lado só)
parede((-L, -F, 0), (0, 2 * F, 0), (0, 0, H), 14, 8)           # a esquerda (o grafite)
# a direita, com o vão da janela (Y -0.8..0.4, Z 1.0..2.0)
WY0, WY1, WZ0, WZ1 = -0.8, 0.4, 1.0, 2.0
parede((L, F, 0), (0, -(F - WY1), 0), (0, 0, H), 6, 8)
parede((L, WY0, 0), (0, -(WY0 + F), 0), (0, 0, H), 5, 8)
parede((L, WY1, 0), (0, WY0 - WY1, 0), (0, 0, WZ0), 4, 3)
parede((L, WY1, WZ1), (0, WY0 - WY1, 0), (0, 0, H - WZ1), 4, 2)
Placa("solido", (-L, F, H), (2 * L, 0, 0), (0, -2 * F, 0), 8, 9, None,
      lambda c, n, i, j: dim("#24202a", 0.8 + 0.3 * hh(i, j)), sujo=0)
# os rodapés
for p, s in (((0, F - 0.01, 0.05), (2 * L, 0.02, 0.1)), ((-L + 0.01, 0, 0.05), (0.02, 2 * F, 0.1)),
             ((L - 0.01, 1.35, 0.05), (0.02, 1.9, 0.1)), ((L - 0.01, -1.55, 0.05), (0.02, 1.5, 0.1))):
    B("solido", p, s, "#1a161e", sujo=0)
# a lâmpada do teto, apagada (o soquete pendurado)
Tubo("solido", [(0.1, -0.3, H), (0.1, -0.3, 2.3)], 0.006, 3, "#1a1a1e", 0)
Cil("solido", (0.1, -0.3, 2.22), 0.02, 0.02, 0.08, 8, "#2a2a30", sujo=0)
Esfera("solido", (0.1, -0.3, 2.19), 0.04, 8, 6, "#8a8a80")

# ── a janela com grade e a cidade lá fora ──
for a, b in (((L, WY0, WZ0), (L, WY1, WZ0)), ((L, WY0, WZ1), (L, WY1, WZ1)),
             ((L, WY0, WZ0), (L, WY0, WZ1)), ((L, WY1, WZ0), (L, WY1, WZ1))):
    Viga("solido", a, b, 0.06, "#8a8a92", 0)
B("solido", (L - 0.06, (WY0 + WY1) / 2, WZ0 - 0.03), (0.16, 1.3, 0.05), "#6a6868", sujo=0)  # o peitoril
Viga("solido", (L + 0.01, (WY0 + WY1) / 2, WZ0), (L + 0.01, (WY0 + WY1) / 2, WZ1), 0.03, "#8a8a92", 0)
for k in range(1, 6):  # a grade
    y = WY0 + (WY1 - WY0) * k / 6
    Viga("solido", (L - 0.07, y, WZ0), (L - 0.07, y, WZ1), 0.014, "#2a2a30", 0)
for z in (WZ0 + 0.33, WZ0 + 0.66):
    Viga("solido", (L - 0.07, WY0, z), (L - 0.07, WY1, z), 0.014, "#2a2a30", 0)
Placa("vidro", (L + 0.02, WY1, WZ0), (0, WY0 - WY1, 0), (0, 0, WZ1 - WZ0), 1, 1, "#1a2440", sujo=0)
NUC, NVC = 18, 14


def f_cidade(c, n, i, j):
    hb = 4 + int(8 * hh(i // 2, 7)) if i % 5 != 4 else 2 + int(3 * hh(i, 3))
    if i in (11, 12) and j == 9:
        return "#ff3fb0"                       # o letreiro da SEXTA lá longe
    if j < hb:
        if hh(i, j, 4) > 0.72:
            return dim(escolhe(["#ffcf8a", "#ffcf8a", "#7fe8ff", "#ff3fb0", "#ffc857"], i, j), 0.7)
        return "#0c0a16"
    k = (j - hb) / (NVC - hb + 0.01)
    return (0.03 * (1 - k) + 0.008, 0.012, 0.05 * (1 - k) + 0.015, 1)


Placa("luz", (3.2, 1.6, 0.0), (0, -3.8, 0), (0, 0, 3.0), NUC, NVC, None, f_cidade, sujo=0)
for a, b in (((L, WY1, WZ0), (3.2, WY1, WZ0)), ((L, WY1, WZ1), (3.2, WY1, WZ1))):
    pass  # (o vão é fundo: a parede de fora não aparece, a cidade fica a 1,2 m)

# ── a cama baixa de paletes, o colchão, o edredom ──
BX0, BX1, BY0, BY1 = -1.05, 0.45, -0.4, 1.6
for camada in range(2):
    z0 = camada * 0.14
    for k in range(3):
        B("solido", ((BX0 + BX1) / 2, BY0 + 0.08 + k * 0.92, z0 + 0.045), (1.5, 0.14, 0.09), "#7a5a3a", sujo=0.2)
    for k in range(8):
        B("solido", (BX0 + 0.09 + k * 0.188, (BY0 + BY1) / 2, z0 + 0.115), (0.13, 2.0, 0.025), escolhe(["#8a6a44", "#7a5a3a", "#94744c"], k, camada), sujo=0.2)
B("solido", (-0.3, 0.6, 0.38), (1.42, 1.96, 0.2), None, d=(0.2, 0.2, 0.2),
  cf=lambda c, n, i, j: "#c8c4cc" if (i % 2) else "#a8a4b0", sujo=0.1)
Pano("solido", (-1.06, -0.42, 0.48), (1.52, 0, 0), (0, 1.62, 0), 12, 12, 0.09, "#5a4870",
     cf=lambda c, n, i, j: dim("#5a4870", 0.8 + 0.3 * hh(i, j)), seed=2)
B("solido", (-0.65, 1.36, 0.55), (0.62, 0.36, 0.14), "#d8d4e0", r=(0, 0, 0.08), sujo=0.1)
B("solido", (0.05, 1.38, 0.55), (0.5, 0.32, 0.12), "#2a2a34", r=(0, 0.1, -0.12), sujo=0.1)
B("solido", (-0.75, -0.39, 0.3), (0.6, 0.02, 0.3), "#4a3a5e", sujo=0)  # o edredom caindo na frente
B("luz", (0.2, 0.15, 0.565), (0.07, 0.14, 0.008), "#6a8cd0", r=(0, 0, 0.4))  # o celular aceso
B("solido", (0.2, 0.15, 0.558), (0.075, 0.145, 0.008), "#1a1a1e", r=(0, 0, 0.4), sujo=0)
# o boné jogado na cama
Esfera("solido", (-0.95, 0.0, 0.55), 0.1, 10, 5, "#1d2b4a", S(1, 1, 0.6))
B("solido", (-0.95, -0.11, 0.53), (0.16, 0.1, 0.01), "#1d2b4a", r=(0.2, 0, 0), sujo=0)

# ── o tênis novo ainda na caixa (o toque "tenis": [1.3, 0.12, -1.3]) ──
def Tenis(p, rz, cor, sola="#f0ece4", risca=ROSA, M=None):
    with em(T(*p) @ R(rz=rz) @ (M or Matrix.Identity(4))):
        B("solido", (0, 0, 0.016), (0.1, 0.29, 0.032), sola, sujo=0)
        Prisma("solido", [(-0.14, 0.03), (0.14, 0.03), (0.145, 0.06), (0.07, 0.09), (-0.02, 0.095), (-0.08, 0.125), (-0.14, 0.12)],
               0.094, cor, Matrix.Identity(4), sujo=0.1)
        B("solido", (0, 0.02, 0.06), (0.098, 0.12, 0.016), risca, r=(0.25, 0, 0), sujo=0)


B("solido", (1.3, 1.3, 0.06), (0.42, 0.26, 0.12), "#e8e2d8", sujo=0.1)
B("solido", (1.3, 1.3, 0.115), (0.38, 0.22, 0.01), "#d8c8d0", sujo=0)  # o papel de seda
for dx in (-0.055, 0.055):
    Tenis((1.3 + dx * 2, 1.3, 0.09), math.pi / 2, "#f4f0ea", risca=ROSA)
B("solido", (1.32, 1.5, 0.15), (0.44, 0.02, 0.28), "#e8e2d8", r=(-0.35, 0, 0), sujo=0.1)  # a tampa encostada
B("solido", (1.32, 1.49, 0.15), (0.3, 0.005, 0.03), ROSA, r=(-0.35, 0, 0), sujo=0)

# ── a prateleira de tênis na parede da direita, com a fita de LED ──
PAR = [("#1a1a1e", "#e8e2d8", OURO), ("#e8e2d8", "#1a1a1e", ROSA), ("#c83a3a", "#f0ece4", "#1a1a1e"),
       ("#2a4a8a", "#f0ece4", "#e8e2d8"), ("#f0ece4", "#3a8a5a", VERDE), ("#7a5aa8", "#f0ece4", OURO)]
for s, z in enumerate((0.95, 1.4)):
    B("solido", (L - 0.14, 1.4, z), (0.26, 1.5, 0.03), "#c8c0b0", sujo=0)
    Tubo("neon", [(L - 0.03, 0.66, z - 0.022), (L - 0.03, 2.14, z - 0.022)], 0.006, 4, ROSA if s else CIANO, 0)
    for k in range(3):
        cor, sola, risca = PAR[s * 3 + k]
        Tenis((L - 0.15, 0.85 + k * 0.5, z + 0.015), 0.0, cor, sola, risca)
# em cima: as caixas de tênis e um boné
for k, cor in enumerate(("#ff6a35", "#1a1a1e", "#e8e2d8")):
    B("solido", (L - 0.2, 0.9 + k * 0.44, 1.48), (0.3, 0.4, 0.14), cor, sujo=0)
B("solido", (L - 0.2, 1.8, 1.48), (0.3, 0.4, 0.14), "#c83a3a", sujo=0)

# ── o varal de roupa estilosa na parede da esquerda (o Mubarak encosta aqui) ──
VX = -1.85
Viga("solido", (VX, -0.55, 2.05), (VX, 1.75, 2.05), 0.03, "#8a8590", 0)
for y in (-0.5, 1.7):
    Viga("solido", (-L, y, 2.05), (VX, y, 2.05), 0.03, "#8a8590", 0)
PECAS = [(ROSA, 0.55, 0.7, "jaqueta"), ("#1d2b4a", 0.5, 0.75, "moletom"), (OURO, 0.45, 0.62, "regata"),
         ("#2fe8ff", 0.5, 0.68, "camisa"), ("#e8e2d8", 0.42, 0.62, "camisa")]
for i, (cor, w, h, tipo) in enumerate(PECAS):
    y = -0.3 + i * 0.45
    with em(T(VX + 0.02, y, 2.05)):
        Tubo("solido", [(0, 0, 0.0), (0, 0, -0.05), (0, 0.14, -0.1), (0, -0.14, -0.1), (0, 0, -0.05)], 0.004, 3, "#2a2a30", 0)
        B("solido", (0.02, 0, -0.12 - h / 2), (0.07, w, h), cor, d=(0.1, 0.12, 0.12),
          cf=lambda c, n, i2, j2, cor=cor: dim(cor, 0.85 + 0.2 * hh(i2, j2)), sujo=0.15)
        if tipo != "regata":
            for sgn in (-1, 1):
                B("solido", (0.02, sgn * (w / 2 + 0.06), -0.33), (0.06, 0.12, 0.44), cor, r=(sgn * 0.12, 0, 0), sujo=0.15)
        if tipo == "moletom":
            Esfera("solido", (0.06, 0, -0.2), 0.12, 8, 5, dim(cor, 0.8), S(0.5, 1, 1))
            B("solido", (0.06, 0, -0.5), (0.02, w * 0.6, 0.16), dim(cor, 0.7), sujo=0)
        if tipo == "jaqueta":
            B("solido", (0.06, 0, -0.12 - h / 2), (0.01, 0.02, h), "#c0c0c8", sujo=0)
            B("solido", (0.06, 0, -0.13), (0.03, w * 0.9, 0.06), "#2a2a30", sujo=0)
        if tipo == "regata":
            Texto("solido", "22", T(0.06, 0, -0.42) @ R(rz=math.pi / 2), 0.2, "#1a1a1e")
# embaixo do varal: as caixas de tênis empilhadas
for k, (y, z, cor) in enumerate(((0.35, 0.0, "#ff6a35"), (0.35, 0.14, "#1a1a1e"), (0.35, 0.28, "#e8e2d8"),
                                 (0.82, 0.0, "#c83a3a"), (0.82, 0.14, "#ff6a35"), (1.3, 0.0, "#e8e2d8"))):
    B("solido", (-1.74, y + 0.02 * hh(k), z + 0.07), (0.32, 0.44, 0.14), cor, r=(0, 0, 0.05 * (hh(k, 2) - 0.5)), sujo=0.2)

# ── as duas caixas de som de pé (viradas pro meio do quarto) ──
def Som(p, rz):
    with em(T(*p) @ R(rz=rz)):
        B("solido", (0, 0, 0.45), (0.5, 0.42, 0.9), "#141218", d=0.15, sujo=0.3)
        for z, r in ((0.62, 0.09), (0.28, 0.17)):
            Disco("solido", (0, 0, 0), r, 18, "#2a2830", T(0, -0.212, z) @ R(rx=math.pi / 2))
            Disco("solido", (0, 0, 0), r * 0.35, 10, "#4a4850", T(0, -0.214, z) @ R(rx=math.pi / 2))
            Tor("solido", (0, -0.212, z), r, 0.012, 18, 4, "#3a3840", r=(math.pi / 2, 0, 0), sujo=0)
        Esfera("luz", (0, -0.213, 0.83), 0.012, 4, 3, VERDE)


Som((-1.6, 1.8, 0), 0.72)
Som((1.55, -1.5, 0), -2.33)

# ── o toca-discos e o mixer nos engradados, embaixo da janela ──
def Engradado(p, cor, rz=0.0):
    with em(T(*p) @ R(rz=rz)):
        B("solido", (0, 0, 0.16), (0.36, 0.36, 0.32), None, d=(0.06, 0.06, 0.08),
          cf=lambda c, n, i, j: dim(cor, 0.45 if (i % 2 and j % 2) else 1.0), sujo=0.2)


Engradado((1.72, -0.55, 0), "#2a5a9a")
Engradado((1.72, 0.15, 0), "#b8402a")
for k in range(12):  # os discos dentro
    B("solido", (1.72, -0.68 + k * 0.022, 0.17), (0.31, 0.012, 0.31), escolhe(["#1a1a1e", "#c83a3a", "#e8e2d8", "#2a4a8a", OURO, ROSA], k), sujo=0.1)
B("solido", (1.7, -0.2, 0.335), (0.44, 1.2, 0.03), "#5a4a3a", sujo=0)
for y in (-0.5, 0.1):
    B("solido", (1.7, y, 0.39), (0.36, 0.42, 0.08), "#1e1e24", sujo=0)
    Cil("solido", (1.68, y + 0.02, 0.43), 0.15, 0.15, 0.015, 20, "#3a3a40", sujo=0)
    Cil("solido", (1.68, y + 0.02, 0.445), 0.14, 0.14, 0.004, 20, "#0e0e12", sujo=0)
    Cil("solido", (1.68, y + 0.02, 0.449), 0.04, 0.04, 0.002, 10, ROSA if y < 0 else OURO, sujo=0)
    Viga("solido", (1.84, y + 0.16, 0.45), (1.76, y - 0.08, 0.45), 0.01, "#c0c0c8", 0)
B("solido", (1.7, -0.2, 0.4), (0.3, 0.18, 0.1), "#2a2a32", sujo=0)
for k in range(6):
    Esfera("luz", (1.6 + 0.07 * (k % 3), -0.25 + 0.1 * (k // 3), 0.452), 0.01, 4, 3, [CIANO, ROSA, VERDE][k % 3])
Tor("solido", (1.62, 0.45, 0.42), 0.09, 0.012, 12, 4, "#1a1a1e", r=(math.pi / 2, 0, 0.3), sujo=0)  # o fone
Tubo("solido", [(1.7, -0.2, 0.35), (1.6, -0.6, 0.012), (1.55, -1.25, 0.012), (1.55, -1.3, 0.3)], 0.006, 3, "#141416", 0)

# ── a roupa pelo chão, a bola, o skate, latas ──
def roupa(c, w, h, rot, cor, seed):
    cx, cy = c
    U = Vector((math.cos(rot) * w, math.sin(rot) * w, 0))
    V = Vector((-math.sin(rot) * h, math.cos(rot) * h, 0))
    o = Vector((cx, cy, 0.004)) - U / 2 - V / 2
    Pano("solido", o, U, V, 6, 5, 0.05, cor, cf=lambda c2, n, i, j: dim(cor, 0.8 + 0.25 * hh(i, j, seed)), seed=seed)


roupa((0.9, -0.6), 0.6, 0.4, -0.4, "#4a2a40", 1)
roupa((-1.4, -1.2), 0.5, 0.35, 0.7, "#203048", 2)
roupa((0.55, -1.55), 0.25, 0.75, 0.9, "#2a3a5a", 3)    # a calça
roupa((1.0, 0.25), 0.35, 0.3, 0.2, "#d8d4c8", 4)      # a meia e a camiseta
Disco("solido", (0.3, -1.1, 0.003), 0.62, 20, "#1a1418")  # o tapete redondo
Tor("solido", (0.3, -1.1, 0.006), 0.48, 0.03, 20, 3, "#8a2a5a", sujo=0)
Esfera("solido", (-0.85, -1.75, 0.12), 0.12, 10, 7, "#c85a2a")
with em(T(1.25, -2.22, 0) @ R(rx=-0.25)):
    B("solido", (0, 0, 0.4), (0.2, 0.02, 0.78), "#1a1a1e", sujo=0)
    B("solido", (0, -0.012, 0.4), (0.19, 0.004, 0.6), ROSA, sujo=0)
    for z in (0.12, 0.68):
        for x in (-0.06, 0.06):
            Cil("solido", (x, 0.02, z), 0.025, 0.025, 0.03, 8, "#e8e2d8", r=(math.pi / 2, 0, 0), sujo=0)
for k, (x, y) in enumerate(((0.62, 1.5), (0.7, 1.62), (-1.3, -0.6))):
    Cil("solido", (x, y, 0), 0.03, 0.03, 0.12, 8, escolhe([VERDE, ROSA, "#c0c0c8"], k), sujo=0)

# ── os pôsteres e as fotos na moldura do espelho ──
def poster_bola(c, n, i, j):
    u, v = (i + 0.5) / 6, (j + 0.5) / 8
    if (u - 0.5) ** 2 + (v - 0.55) ** 2 < 0.09:
        return "#1a1a1e" if abs(u - 0.5) < 0.04 or abs(v - 0.55) < 0.03 else "#d8642a"
    return "#1a1a1e" if v < 0.15 else "#2a2a4a"


Placa("solido", (-1.9, F - 0.006, 1.45), (0.75, 0, 0), (0, 0, 0.95), 6, 8, None, poster_bola, sujo=0)
Placa("solido", (-1.85, F - 0.006, 0.6), (0.65, 0, 0), (0, 0, 0.7), 4, 5, None,
      lambda c, n, i, j: ["#ff3fb0", "#1a1028", "#ffc857"][(i + j) % 3] if j < 2 else "#140e22", sujo=0)
Texto("luz", "SEXTA", T(-1.52, F - 0.012, 1.05), 0.13, "#d0308a")
Texto("solido", "222", T(-1.52, F - 0.012, 0.75), 0.11, "#ffc857")
# na direita, depois da caixa de som
Placa("solido", (L - 0.006, -0.95, 1.2), (0, -1.2, 0), (0, 0, 0.9), 6, 5, None,
      lambda c, n, i, j: "#e8e2d8" if j > 3 else escolhe(["#1a1a1e", "#c83a3a", "#2a4a8a", "#c83a3a"], i, j, 6), sujo=0)
Texto("solido", "DREW", T(L - 0.012, -1.55, 1.95) @ R(rz=-math.pi / 2), 0.14, "#1a1a1e")
# a moldura do espelho (o espelho e o neon são do código) e as fotos presas nela
MX, MZ, MW, MH = -0.2, 1.4, 1.1, 1.9
for a, b in (((MX - MW / 2 - 0.03, MZ - MH / 2 - 0.03), (MX + MW / 2 + 0.03, MZ - MH / 2 - 0.03)),
             ((MX - MW / 2 - 0.03, MZ + MH / 2 + 0.03), (MX + MW / 2 + 0.03, MZ + MH / 2 + 0.03)),
             ((MX - MW / 2 - 0.03, MZ - MH / 2 - 0.03), (MX - MW / 2 - 0.03, MZ + MH / 2 + 0.03)),
             ((MX + MW / 2 + 0.03, MZ - MH / 2 - 0.03), (MX + MW / 2 + 0.03, MZ + MH / 2 + 0.03))):
    Viga("solido", (a[0], F - 0.03, a[1]), (b[0], F - 0.03, b[1]), 0.06, "#1a1820", 0)
for k, (x, z, rr) in enumerate(((MX - MW / 2 - 0.02, 1.9, 0.2), (MX - MW / 2 + 0.06, 1.7, -0.15), (MX + MW / 2 - 0.04, 2.15, 0.1),
                                (MX + MW / 2 + 0.02, 0.8, -0.2))):
    with em(T(x, F - 0.065, z) @ R(ry=rr)):
        Placa("solido", (-0.05, 0, -0.06), (0.1, 0, 0), (0, 0, 0.12), 1, 1, "#e8e2d8", sujo=0)
        Placa("solido", (-0.04, -0.002, -0.035), (0.08, 0, 0), (0, 0, 0.085), 1, 1, escolhe(["#3a6a8a", "#8a3a5a", "#6a5a2a", "#2a5a3a"], k), sujo=0)

# ════════════════════════ a luz assada (sem luz nova no jogo) ════════════════════════
FONTES = [
    ((-0.2, 1.6, 1.4), c3("#7fe8ff", 0.9), 1.5),
    ((-0.2, 2.1, 2.4), c3("#7fe8ff", 0.5), 0.9),
    ((1.6, -0.2, 1.5), c3("#ff3fb0", 0.45), 1.1),
    ((-1.2, -0.6, 2.1), c3("#ffc857", 0.45), 1.5),
    ((1.9, 1.4, 0.92), c3("#7fe8ff", 0.25), 0.5),
    ((1.9, 1.4, 1.37), c3("#ff3fb0", 0.25), 0.5),
]
terminar(["sala"], FONTES, SAIDA, "quarto", dist=0.6, piso=0.5)
