# O POSTO por dentro da cena (06/11): o último posto antes da estrada acabar,
# com a loja de conveniência 24h. Antes eram caixas (app/linha/interior/salas/
# Posto.tsx: o chão, a cobertura, as colunas, duas bombas, a caixa da loja com
# o vidro); agora as placas de concreto com as juntas e as manchas de óleo, as
# poças com a luz fria, a cobertura com os painéis de luz e a faixa lilás de
# neon, as colunas, as ilhas com a faixa zebrada e os frades, as bombas com a
# tela, o preço, o número em neon, as mangueiras e os bicos, o meio-fio do
# LU2CA, o calibrador, a lixeira, o freezer do GELO, e a loja: a fachada com o
# POSTO 24H em neon, o vidro com os reflexos e a porta automática, e por dentro
# (luz fria, assada no próprio vértice: sala_luz) o piso branco, as gôndolas
# com os produtos, a parede de geladeiras com as bebidas, o balcão vazio com o
# caixa, a estante de cigarro, a máquina de café, a estufa de salgado, o caixa
# eletrônico e o cartaz no teto. A Kombi, o LU2CA e a câmera ficam no código.
#
#   blender -b --factory-startup --python blender/scripts/posto_loja.py \
#     [--python blender/scripts/posto_loja_foto.py] -- bruto.glb [foto.png]
#   npx @gltf-transform/cli optimize bruto.glb public/models/posto-loja.glb \
#     --compress meshopt --simplify false --join false --flatten false --instance false --palette false
#
# Coordenadas: as do Posto.tsx com X = x, Y = -z, Z = y. A cobertura no meio
# (12 × 8, Z 4,95..5,45), as bombas em X = ±2,2, Y = 2,5 (a 5 na esquerda), a
# loja em X -7..3, Y 7..11 (a frente de vidro em Y = 7). Um nó "sala".
# Orçamento: até 12 mil triângulos e 250 KB.

import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sala_kit import *  # noqa

args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
SAIDA = args[0] if args else "/tmp/posto-loja-bruto.glb"

comecar("PostoLoja")
ATUAL[0] = "sala"
LILAS, FRIO = "#b38cff", "#dfe9ff"


# a luz de dentro da loja (sem luz no jogo): o tubo frio no teto, por face
def frio(cor, k=1.0):
    def cf(c, n, i, j):
        f = 0.95 if n.z > 0.5 else 0.42 if n.z < -0.5 else 0.72
        f *= 0.85 + 0.15 * max(0.0, 1 - abs(c.y - 8.8) / 2.5)
        return dim(cor, f * k)
    return cf


def LB(p, s, cor, k=1.0, r=(0, 0, 0)):
    B("luz", p, s, None, r=r, cf=frio(cor, k), sujo=0)


# ── o chão: as placas de concreto, o asfalto em volta, as manchas ──
def f_chao(c, n, i, j):
    if abs(c.x) < 7 and -5 < c.y < 7:
        if hh(i, j, 3) > 0.85:
            return dim("#14161a", 0.9)                        # a mancha de óleo
        return dim("#3a3c42", 0.7 + 0.25 * hh(i, j, 1))
    return dim("#1a1b20", 0.75 + 0.3 * hh(i, j, 2))


Placa("solido", (-16, -14, 0), (32, 0, 0), (0, 28, 0), 16, 14, None, f_chao, sujo=0)
for x in range(-7, 8, 2):
    B("solido", (x, 1, 0.004), (0.04, 12, 0.008), "#1a1a1e", sujo=0)
for y in range(-5, 8, 2):
    B("solido", (0, y, 0.004), (14, 0.04, 0.008), "#1a1a1e", sujo=0)
for x in (-5.5, -1.0, 1.0, 5.5):
    B("solido", (x, -2.5, 0.006), (0.12, 3.5, 0.01), "#c8c8c0", sujo=0)  # as faixas das vagas
for k, (x, y, rx, ry) in enumerate(((-3.5, -1.0, 1.0, 0.6), (1.0, 4.5, 0.8, 0.5), (4.5, -3.2, 0.9, 0.7), (-5.0, 4.8, 0.7, 0.4))):
    def fil(i, j, k=k):
        u, v = (i + 0.5) / 8 * 2 - 1, (j + 0.5) / 6 * 2 - 1
        return u * u + v * v < 0.8 + 0.25 * math.sin(i * 1.3 + j + k)
    Placa("vidro", (x - rx, y - ry, 0.01), (2 * rx, 0, 0), (0, 2 * ry, 0), 8, 6, None,
          lambda c, n, i, j: dim("#3a4258", 0.8), fil, sujo=0)
# a calçada da loja
B("solido", (-2, 6.5, 0.07), (11, 1.0, 0.14), None, d=(1.0, 1.0, 0.14),
  cf=lambda c, n, i, j: dim("#5a5c64", 0.7 + 0.2 * hh(i, j)), sujo=0.1)
# o meio-fio do LU2CA (era a caixa de [3.3, 0.07, 0.5])
B("solido", (3.3, -0.5, 0.07), (1.6, 0.5, 0.14), None, d=(0.4, 0.5, 0.14),
  cf=lambda c, n, i, j: "#c8a020" if i % 2 and n.z < 0.5 else "#5a5c64", sujo=0.1)

# ── a cobertura: o caixão, os painéis de luz, a faixa lilás ──
B("solido", (0, 0, 5.2), (12, 8, 0.5), None, d=(12, 8, 0.25),
  cf=lambda c, n, i, j: "#e8ecf4" if n.z > -0.5 and j == 1 else "#8a8e98", sujo=0)
for k, y in enumerate((-4.03, 4.03)):
    B("neon", (0, y, 5.12), (12.02, 0.05, 0.1), LILAS, sujo=0)
for x in (-6.03, 6.03):
    B("neon", (x, 0, 5.12), (0.05, 8.02, 0.1), LILAS, sujo=0)
for ix in range(3):
    for iy in range(2):
        B("luz", (-3.9 + ix * 3.9, -1.9 + iy * 3.8, 4.93), (3.2, 3.0, 0.02), FRIO)
Texto("neon", "POSTO", T(0, -4.06, 5.3), 0.26, LILAS)
# as colunas com o pé
for x in (-4.5, 4.5):
    B("solido", (x, 0, 2.5), (0.4, 0.4, 5.0), None, d=(0.4, 0.4, 0.5),
      cf=lambda c, n, i, j: "#c8ccd8" if j % 4 else "#8a8e98", sujo=0.15)
    B("solido", (x, 0, 0.2), (0.6, 0.6, 0.4), "#5a5c64", sujo=0.1)
    B("neon", (x, -0.205, 2.5), (0.05, 0.01, 4.0), LILAS, sujo=0)


# ── as bombas ──
def Bomba(x, y, n):
    with em(T(x, y, 0)):
        B("solido", (0, 0, 0.09), (1.4, 1.0, 0.18), None, d=(0.2, 1.0, 0.18),
          cf=lambda c, nn, i, j: ("#c8a020" if (i % 2) else "#1a1a1e") if abs(c.x - x) > 0.5 else "#6a6c74", sujo=0.1)
        for dx in (-0.62, 0.62):
            Cil("solido", (dx, -0.4, 0.18), 0.06, 0.06, 0.7, 8, "#c8a020", sujo=0.1)
        B("solido", (0, 0, 0.18 + 0.9), (0.8, 0.5, 1.8), None, d=(0.8, 0.5, 0.3),
          cf=lambda c, nn, i, j: "#d8dce8" if j < 5 else LILAS, sujo=0.2)
        B("solido", (0, -0.255, 1.48), (0.5, 0.02, 0.35), "#101218", sujo=0)
        B("luz", (0, -0.266, 1.5), (0.4, 0.01, 0.14), dim("#6ae8c8", 0.6))
        B("luz", (0, -0.266, 1.36), (0.4, 0.01, 0.06), dim("#ff9a3a", 0.6))
        Texto("neon", str(n), T(0, -0.27, 1.84), 0.26, LILAS)
        for s in (-1, 1):
            B("solido", (s * 0.42, -0.1, 1.0), (0.06, 0.16, 0.2), "#2a2a30", sujo=0)
            Tubo("solido", [(s * 0.4, 0.1, 1.9), (s * 0.55, -0.1, 1.6), (s * 0.5, -0.2, 1.1), (s * 0.45, -0.12, 1.0)], 0.02, 5, "#1a1a1e", 0)
            B("solido", (s * 0.47, -0.16, 1.05), (0.05, 0.2, 0.05), "#2a2a30", r=(0.4, 0, 0), sujo=0)


Bomba(-2.2, 2.5, 5)
Bomba(2.2, 2.5, 6)
# o calibrador, a lixeira, o freezer do gelo
with em(T(5.2, 1.0, 0)):
    B("solido", (0, 0, 0.6), (0.3, 0.25, 1.2), "#c83a3a", sujo=0.2)
    B("luz", (0, -0.13, 1.0), (0.2, 0.01, 0.12), dim("#5dffa0", 0.5))
    Tubo("solido", [(0.15, 0, 0.8), (0.35, -0.1, 0.4), (0.3, -0.2, 0.05), (0.1, -0.3, 0.02)], 0.012, 4, "#101012", 0)
Cil("solido", (-4.9, 0.6, 0), 0.22, 0.22, 0.85, 10, "#3a3c44", sujo=0.2)
Cil("solido", (-4.9, 0.6, 0.85), 0.24, 0.24, 0.05, 10, "#2a2c32", sujo=0)
with em(T(1.9, 6.4, 0.14)):
    B("solido", (0, 0, 0.45), (1.3, 0.7, 0.9), None, d=(1.3, 0.7, 0.3),
      cf=lambda c, n, i, j: "#e8ecf4" if j != 1 else "#2a5ac8", sujo=0.15)
    Texto("solido", "GELO", T(0, -0.36, 0.45), 0.2, "#e8ecf4")

# ── a loja: as paredes de fora, a fachada, o letreiro ──
LX0, LX1, LY0, LY1, LZ = -7.0, 3.0, 7.0, 11.0, 3.2
GX0, GX1, GZ0, GZ1 = -6.0, 2.0, 0.3, 2.5
B("solido", (LX0 + 0.1, (LY0 + LY1) / 2, LZ / 2), (0.2, 4, LZ), "#1a1c24", sujo=0.2)
B("solido", (LX1 - 0.1, (LY0 + LY1) / 2, LZ / 2), (0.2, 4, LZ), "#1a1c24", sujo=0.2)
B("solido", (-2, LY1 - 0.1, LZ / 2), (10, 0.2, LZ), "#1a1c24", sujo=0.2)
B("solido", (-2, (LY0 + LY1) / 2, LZ + 0.05), (10.2, 4.2, 0.1), "#22242c", sujo=0)
B("solido", ((LX0 + GX0) / 2, LY0 + 0.05, LZ / 2), (GX0 - LX0, 0.1, LZ), "#1e2028", sujo=0.2)
B("solido", ((GX1 + LX1) / 2, LY0 + 0.05, LZ / 2), (LX1 - GX1, 0.1, LZ), "#1e2028", sujo=0.2)
B("solido", (-2, LY0 + 0.05, GZ0 / 2), (GX1 - GX0, 0.1, GZ0), "#2a2c34", sujo=0.1)
B("solido", (-2, LY0 + 0.05, (GZ1 + LZ) / 2), (GX1 - GX0, 0.1, LZ - GZ1), "#e8ecf4", sujo=0)
B("neon", (-2, LY0 - 0.01, GZ1 + 0.06), (GX1 - GX0, 0.03, 0.05), LILAS, sujo=0)
Texto("luz", "CONVENIENCIA 24H", T(-2, LY0 - 0.01, 2.85), 0.32, "#3a3c60")
# os montantes do vidro e a porta automática (no meio)
for x in (-6.0, -4.0, -3.0, -1.0, 0.0, 2.0):
    B("solido", (x, LY0, (GZ0 + GZ1) / 2), (0.08, 0.06, GZ1 - GZ0), "#2a2c34", sujo=0)
B("solido", (-2, LY0, GZ1 - 0.05), (GX1 - GX0, 0.06, 0.08), "#2a2c34", sujo=0)
B("solido", (-2, LY0 - 0.01, 1.4), (0.02, 0.04, 2.2), "#3a3c44", sujo=0)
B("solido", (-2, LY0 - 0.6, 0.15), (1.8, 0.9, 0.02), "#1a1a20", sujo=0)  # o capacho
# os reflexos no vidro (faixas finas)
for k, (x, w) in enumerate(((-5.4, 0.3), (-3.6, 0.15), (-0.6, 0.35), (1.2, 0.18))):
    Placa("vidro", (x, LY0 - 0.03, GZ0), (w, 0, 0), (0.7, 0, GZ1 - GZ0), 1, 1, dim("#8090b0", 0.45), sujo=0)
# o letreiro em cima (o POSTO 24H em neon na placa)
B("solido", (-2, LY0 + 0.1, 3.6), (4.8, 0.15, 1.0), "#101218", sujo=0)
for x in (-4.0, 0.0):
    Viga("solido", (x, LY0 + 0.15, LZ), (x, LY0 + 0.15, 3.1), 0.06, "#3a3c44", 0)
Texto("neon", "POSTO 24H", T(-2, LY0 + 0.01, 3.6), 0.6, LILAS)

# ── a loja por dentro (luz fria assada: sala_luz) ──
IX0, IX1, IY0, IY1 = LX0 + 0.2, LX1 - 0.2, LY0 + 0.1, LY1 - 0.2
Placa("luz", (IX0, IY0, 0.01), (IX1 - IX0, 0, 0), (0, IY1 - IY0, 0), 16, 6, None,
      lambda c, n, i, j: dim("#c8ccd4" if (i + j) % 2 else "#b0b4be", 0.85 if abs(c.y - 8.8) < 0.6 else 0.65), sujo=0)
Placa("luz", (IX0, IY1, LZ - 0.01), (IX1 - IX0, 0, 0), (0, IY0 - IY1, 0), 10, 4, None,
      lambda c, n, i, j: dim("#f4f8ff", 1.0) if j in (1, 2) and i % 3 == 1 else dim("#9aa0aa", 0.55), sujo=0)
Placa("luz", (IX0, IY1, 0), (IX1 - IX0, 0, 0), (0, 0, LZ), 10, 3, None,
      lambda c, n, i, j: dim("#a8b0be", 0.7), sujo=0)
Placa("luz", (IX0, IY0, 0), (0, IY1 - IY0, 0), (0, 0, LZ), 4, 3, None, lambda c, n, i, j: dim("#9aa4b4", 0.6), sujo=0)
Placa("luz", (IX1, IY1, 0), (0, IY0 - IY1, 0), (0, 0, LZ), 4, 3, None, lambda c, n, i, j: dim("#9aa4b4", 0.6), sujo=0)
# a parede de geladeiras no fundo (portas de vidro com as bebidas)
BEB = ["#c8302a", "#e8e0d0", "#2a8a3a", "#f2c230", "#3a6ac8", "#1a1a1e", "#ff7a3a", "#7fe8ff", "#b38cff"]
for k in range(6):
    x0 = -6.6 + k * 1.0
    LB((x0 + 0.5, IY1 - 0.35, 1.1), (1.0, 0.7, 2.2), "#d8dce4", 0.8)
    Placa("luz", (x0 + 0.06, IY1 - 0.71, 0.15), (0.88, 0, 0), (0, 0, 1.9), 8, 5, None,
          lambda c, n, i, j, k=k: dim(escolhe(BEB, i // 2, j, k), 0.75) if (i % 2 == 0 or hh(i, j, k) > 0.4) else dim("#e8f0ff", 0.9), sujo=0)
    LB((x0 + 0.03, IY1 - 0.72, 1.1), (0.04, 0.03, 2.1), "#2a2c34", 0.8)
LB((-3.6, IY1 - 0.4, 2.4), (6.0, 0.6, 0.3), "#2a5ac8", 0.9)
Texto("luz", "GELADA", T(-3.6, IY1 - 0.72, 2.4), 0.18, "#f4f8ff")


# as gôndolas: a base, o meio, as prateleiras e os produtos (só a frente)
def Gondola(x0, x1, y):
    w = x1 - x0
    LB(((x0 + x1) / 2, y, 0.06), (w, 0.6, 0.12), "#e8ecf4", 0.9)
    LB(((x0 + x1) / 2, y + 0.05, 0.75), (w, 0.06, 1.5), "#d8dce4", 0.75)
    for s, yy in ((-1, y - 0.22), (1, y + 0.22)):
        for lv in range(4):
            z = 0.15 + lv * 0.36
            LB(((x0 + x1) / 2, yy, z), (w, 0.3, 0.025), "#e8ecf4")
            if s < 0:
                Placa("luz", (x0 + 0.04, yy - 0.12, z + 0.015), (w - 0.08, 0, 0), (0, 0, 0.28), 22, 2, None,
                      lambda c, n, i, j, lv=lv: dim(escolhe(BEB, i // 2, lv), 0.65 + 0.2 * hh(i, lv)) if j == 0 or hh(i, lv, 3) > 0.45
                      else dim("#d8dce4", 0.55), sujo=0)
    LB((x0 - 0.02, y, 0.8), (0.04, 0.62, 1.6), LILAS, 0.7)


Gondola(-6.2, -3.4, 8.2)
Gondola(-6.2, -3.4, 9.3)
Gondola(-2.8, -0.6, 9.3)
# o balcão vazio, o caixa, a estante de cigarro, o café, a estufa, o caixa eletrônico
LB((1.4, 7.9, 0.5), (2.4, 0.7, 1.0), "#3a3c48", 0.9)
LB((1.4, 7.56, 0.5), (2.4, 0.02, 0.12), LILAS, 1.0)
LB((1.4, 7.9, 1.02), (2.5, 0.75, 0.04), "#e8ecf4")
LB((0.9, 7.95, 1.18), (0.35, 0.3, 0.28), "#1a1a20", 0.8, r=(0, 0, 0.2))
B("luz", (0.88, 7.8, 1.25), (0.28, 0.01, 0.16), dim("#7fe8ff", 0.7), r=(0, 0, 0.2))
LB((2.0, 7.9, 1.2), (0.45, 0.4, 0.32), "#c8ccd4", 0.9)  # a estufa
B("luz", (2.0, 7.69, 1.2), (0.42, 0.01, 0.26), dim("#ffb060", 0.8))
Placa("luz", (0.2, IY1 - 0.28, 1.2), (2.4, 0, 0), (0, 0, 1.1), 12, 6, None,
      lambda c, n, i, j: dim(escolhe(["#e8e0d0", "#c8302a", "#1a1a1e", "#f2c230", "#3a6ac8"], i, j), 0.7), sujo=0)
LB((1.4, IY1 - 0.15, 1.75), (2.6, 0.25, 1.2), "#2a2c34", 0.6)
LB((0.0, IY1 - 0.35, 0.5), (0.5, 0.4, 1.0), "#3a3c44", 0.8)  # o café
LB((0.0, IY1 - 0.35, 1.2), (0.45, 0.35, 0.4), "#1a1a20", 0.8)
B("luz", (0.0, IY1 - 0.53, 1.28), (0.3, 0.01, 0.1), dim("#5dffa0", 0.6))
LB((-6.5, 7.45, 0.85), (0.6, 0.5, 1.7), "#3a6ac8", 0.8)  # o caixa eletrônico
B("luz", (-6.5, 7.19, 1.25), (0.35, 0.01, 0.25), dim("#7fe8ff", 0.6))
# o cartaz pendurado no teto
for x in (-4.8, -3.2):
    Viga("luz", (x, 8.6, LZ), (x, 8.6, 2.65), 0.01, dim("#3a3c44", 0.6))
LB((-4.0, 8.6, 2.45), (2.0, 0.03, 0.4), "#c83a3a", 1.0)
Texto("luz", "PROMO 2 POR 1", T(-4.0, 8.58, 2.45), 0.15, "#f4f8ff")

# ════════════════════════ a luz assada (sem luz nova no jogo) ════════════════════════
FONTES = [
    ((-3, 0, 4.6), c3(FRIO, 1.0), 3.2),
    ((3, 0, 4.6), c3(FRIO, 1.0), 3.2),
    ((0, -4.1, 5.1), c3(LILAS, 0.45), 2.0),
    ((-2, 6.6, 1.4), c3(FRIO, 0.8), 2.6),
    ((-2, 6.9, 3.6), c3(LILAS, 0.5), 2.0),
]
terminar(["sala"], FONTES, SAIDA, "posto_loja", dist=0.8, piso=0.35)
