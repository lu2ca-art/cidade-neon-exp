# A CASA DE SHOWS por dentro (06/11): o lugar do último show antes do apagão.
# Antes eram caixas (app/linha/interior/salas/Shows.tsx); agora uma casa de
# shows de verdade, vazia e parada no tempo: o palco de madeira com o saiote
# preto, a cortina pesada pregueada e as pernas laterais, a treliça (duas torres
# e a ponte da frente com os refletores), os dois telões apagados nas torres
# (uma faixa de pixel morto), os paredões no chão dos lados, os retornos no
# palco, o tablado da bateria vazio e os cabos; a grade de contenção na frente do
# palco, a mesa de som no meio da pista (o técnico foi embora), a plateia em
# degraus no fundo, o bar à direita, as saídas com a luz verde e os copos
# esquecidos no chão.
#
#   blender -b --factory-startup --python blender/scripts/shows.py \
#     [--python blender/scripts/shows_foto.py] -- bruto.glb [foto.png]
#   npx @gltf-transform/cli optimize bruto.glb public/models/shows.glb \
#     --compress meshopt --simplify false --join false --flatten false --instance false --palette false
#
# Tudo nas posições do jogo: a sala 16 × 18 × 8; o palco [0, 0.5, -6.5] de
# 12 × 1 × 5 (topo em 1, a beira em z -4, onde o Alohan senta em [0, 0.55, -4.25]
# com o caderno em [0.55, 1.02, -4.3]); a cortina em z -8.8 (y 1 a 8) e as pernas
# em x ±5.5; a ribalta (o Neon do jogo) em [0, 1.04, -4.02]; o pedestal em
# [0, 1.75, -6]; o poste no meio da pista em [0, 0, 1] (é do jogo, pisca); o
# letreiro ONT M em [0, 7, -8.6]. As câmeras (entrada [0, 2, 7.5], alohan
# [1.4, 1.5, -1.6], poste [2.5, 1.4, 4.5], palco [0, 1.7, 2.5]) ficam livres.
# Um nó na origem: sala (_solido/_luz/_neon/_vidro). O jogo apaga o _neon e o
# _luz junto com o poste, no fim.
# Orçamento: ≤ 25 mil triângulos, ≤ 600 KB.

import os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(sys.argv[sys.argv.index("--python") + 1])))
from balada_kit import *  # noqa

args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
SAIDA = args[0] if args else "/tmp/shows-bruto.glb"

inicio("Shows")

OURO = "#ffc857"
QUENTE = "#ffe0a8"
METAL, METAL2 = "#4a4a52", "#2a2a30"
W, D, H = 8.0, 9.0, 8.0

ATUAL[0] = "sala"


# ══════════ a casca ══════════
def f_chao(c, n, i, j):
    x, z = c.x, -c.y
    if hh(math.floor(x / 1.5), math.floor(z / 1.5), 2) > 0.88:
        return "#1a1410"
    return escolhe(["#2a221c", "#241d18", "#2e2620", "#272019"], math.floor(x / 0.9), math.floor(z / 0.9), 1)


Placa("solido", (-W, -D, 0), (2 * W, 0, 0), (0, 2 * D, 0), 24, 27, None, f_chao, sujo=0)


def f_tijolo(c, n, i, j):
    # tijolo pintado de preto, descascando
    if c.z < 0.9:
        return "#120e0c"
    return escolhe(["#1e1814", "#1a1512", "#231c16", "#2a1e18"], i, j, 7)


SAIDAS = ((-W, 4.6), (W, -6.5))  # (parede, z do centro da porta)


Placa("solido", (-W, D, 0), (2 * W, 0, 0), (0, 0, H), 16, 8, None, f_tijolo)
Placa("solido", (W, -D, 0), (-2 * W, 0, 0), (0, 0, H), 16, 8, None, f_tijolo)
# os lados: 24 colunas de 0.75 (z de -9 a 9)
Placa("solido", (-W, -D, 0), (0, 2 * D, 0), (0, 0, H), 24, 10, None, f_tijolo,
      filtro=lambda i, j: not (abs((D - 0.75 * (i + 0.5)) - 4.6) < 0.75 and j < 3))
Placa("solido", (W, D, 0), (0, -2 * D, 0), (0, 0, H), 24, 10, None, f_tijolo,
      filtro=lambda i, j: not (abs((-D + 0.75 * (i + 0.5)) - (-6.5)) < 0.75 and j < 3))
Placa("solido", (-W, -D, H), (0, 2 * D, 0), (2 * W, 0, 0), 12, 16, "#0a090c", sujo=0)
# as vigas do teto
for z in (-6.0, -2.0, 2.0, 6.0):
    Bj("solido", (0, H - 0.2, z), (16, 0.4, 0.3), "#16141a", d=(2.0, 1, 1), sujo=0)

# ══════════ o palco ══════════
Bj("solido", (0, 0.5, -6.5), (12, 1.0, 5), None, d=(0.5, 1.0, 0.5),
   cf=lambda c, n, i, j: ("#4a3424" if (i % 2) else "#3e2c1e") if n.z > 0.5 else "#0e0c0c")
# o saiote preto na frente e a beira com a fita
Bj("solido", (0, 0.48, -3.985), (12, 0.96, 0.03), None, d=(0.24, 1.0, 1),
   cf=lambda c, n, i, j: "#100c0e" if i % 2 else "#18121a", sujo=0.1)
Bj("solido", (0, 1.005, -4.06), (12, 0.012, 0.08), "#c8c0a8", sujo=0)
# as marcas de fita no chão do palco
for x, z in ((-1.2, -5.2), (1.5, -5.6), (0.0, -6.2), (-3.0, -6.8), (3.2, -6.5)):
    Bj("solido", (x, 1.006, z), (0.22, 0.004, 0.04), "#d8d040", sujo=0)
    Bj("solido", (x, 1.006, z), (0.04, 0.004, 0.22), "#d8d040", sujo=0)
# a escada do lado do palco (direita)
for k in range(4):
    h = 1.0 * (4 - k) / 5
    Bj("solido", (6.3, h / 2, -5.0 + 0.3 * k + 0.15), (0.6, h, 0.3), "#2a2018")
# a cortina pesada no fundo e as pernas
Cortina(-6, 6, -8.8, 1.0, 8.0, 40, "#4a0e14", 0.14)
for x in (-5.5, 5.5):
    Cortina(x - 0.6, x + 0.6, -8.4, 1.0, 8.0, 6, "#3a0a10", 0.12)
Bj("solido", (0, 7.6, -8.3), (12.4, 0.8, 0.2), None, d=(0.4, 0.8, 1),
   cf=lambda c, n, i, j: "#3a0a10" if i % 2 else "#300810", sujo=0)
# o tablado da bateria vazio, os retornos, o amplificador e os cabos
Bj("solido", (0.4, 1.2, -7.4), (2.6, 0.4, 1.8), "#1a1416", d=0.6)
Bj("solido", (0.4, 1.405, -7.4), (2.4, 0.01, 1.6), "#2a2226", sujo=0)
Cj("solido", (0.7, 1.4, -7.5), 0.18, 0.2, 0.05, 12, "#18161a", sujo=0)
Cj("solido", (0.7, 1.45, -7.5), 0.02, 0.02, 0.5, 6, "#8a8a92", sujo=0)
for x in (-2.4, 2.4):
    Bj("solido", (x, 1.18, -4.6), (0.7, 0.36, 0.5), "#141216", rx=0.5)
    Bj("solido", (x, 1.22, -4.44), (0.5, 0.24, 0.02), "#0a0a0c", rx=0.5, sujo=0)
Bj("solido", (-3.4, 1.42, -7.2), (0.8, 0.85, 0.45), "#1a1618")
Bj("solido", (-3.4, 1.62, -6.97), (0.7, 0.35, 0.01), None, d=(0.07, 0.07, 1),
   cf=lambda c, n, i, j: "#2a2420" if (i + j) % 2 else "#1a1612", sujo=0)
Bj("luz", (-3.7, 1.92, -6.97), (0.04, 0.03, 0.01), "#ff3020")
Tj("solido", [(0, 1.02, -5.9), (0.6, 1.02, -5.6), (1.4, 1.02, -6.1), (2.4, 1.02, -5.8), (2.4, 1.02, -4.8)], 0.012, 4, "#0a0a0c", 0)
Tj("solido", [(-3.4, 1.02, -6.9), (-2.4, 1.02, -6.2), (-1.0, 1.02, -6.4), (0, 1.02, -6.0)], 0.012, 4, "#0a0a0c", 0)
Tj("solido", [(-2.4, 1.02, -4.9), (-3.6, 1.02, -5.4), (-4.8, 1.02, -5.0), (-5.6, 1.02, -6.2)], 0.012, 4, "#0a0a0c", 0)

# ══════════ a treliça: duas torres e a ponte da frente, os refletores ══════════
TX, TZ, TY = 6.4, -4.3, 7.3
for x in (-TX, TX):
    Treli((x, 0.0, TZ), (x, TY + 0.15, TZ), 0.3, 0.5, METAL)
    Bj("solido", (x, 0.02, TZ), (0.6, 0.04, 0.6), METAL2, sujo=0)
Treli((-TX - 0.15, TY, TZ), (TX + 0.15, TY, TZ), 0.3, 0.5, METAL)
Treli((-TX + 0.15, TY, TZ), (-TX + 0.15, TY, -7.9), 0.3, 0.5, METAL)
Treli((TX - 0.15, TY, TZ), (TX - 0.15, TY, -7.9), 0.3, 0.5, METAL)
for k in range(8):  # os refletores PAR pendurados na ponte, virados pro palco
    x = -5.25 + k * 1.5
    Bj("solido", (x, TY - 0.22, TZ), (0.04, 0.2, 0.04), "#111114", sujo=0)
    Cj("solido", (x, TY - 0.4, TZ + 0.12), 0.11, 0.11, 0.32, 10, "#16151a", eixo="z", ry=math.pi, sujo=0)
    Cj("solido", (x, TY - 0.4, TZ - 0.21), 0.085, 0.085, 0.01, 10, "#3a3020", eixo="z", ry=math.pi, sujo=0)
# os telões apagados nas torres, virados pra plateia
for s in (-1, 1):
    x = s * 7.15
    ry = -s * 0.35
    Bj("solido", (x, 4.4, TZ + 0.1), (1.5, 2.1, 0.12), METAL2, ry=ry, sujo=0)
    Bj("luz", (x - s * 0.02, 4.4, TZ + 0.17), (1.36, 1.96, 0.01), None, ry=ry, d=(0.17, 0.14, 1),
       cf=lambda c, n, i, j, s=s: ("#1a2a3a" if s > 0 else "#14181e") if j == 9 else ("#0a0c10" if (i + j) % 3 else "#0c1014"))
    for y in (5.5, 3.3):
        Vj("solido", (x, y, TZ + 0.05), (s * TX, y, TZ), 0.03, METAL)
# os paredões no chão, dos lados do palco
for s in (-1, 1):
    for k in range(3):
        Bj("solido", (s * 7.1, 0.45 + 0.9 * k, -2.9), (1.2, 0.88, 0.9), "#141216")
        for q in (-0.28, 0.28):
            Cj("solido", (s * 7.1 + q, 0.45 + 0.9 * k, -2.45), 0.23, 0.23, 0.02, 12, "#2a2a30", eixo="z", sujo=0)
            Cj("solido", (s * 7.1 + q, 0.45 + 0.9 * k, -2.47), 0.19, 0.05, 0.05, 12, "#0a0a0e", eixo="z", sujo=0)

# ══════════ a grade de contenção (na frente do palco) ══════════
GZ = -2.9
for k in range(11):
    x0 = -5.5 + k
    Vj("solido", (x0 + 0.03, 1.12, GZ), (x0 + 0.97, 1.12, GZ), 0.045, "#7a7a84")
    Vj("solido", (x0 + 0.03, 0.12, GZ), (x0 + 0.97, 0.12, GZ), 0.035, "#7a7a84")
    for q in range(1, 7):
        Vj("solido", (x0 + q / 7, 0.12, GZ), (x0 + q / 7, 1.12, GZ), 0.018, "#6a6a74")
    for xx in (x0 + 0.03, x0 + 0.97):
        Vj("solido", (xx, 0.0, GZ), (xx, 1.15, GZ), 0.04, "#7a7a84")
    # o pé (a chapa que a plateia pisa), virado pra plateia
    Vj("solido", (x0 + 0.03, 0.02, GZ), (x0 + 0.03, 0.02, GZ + 0.7), 0.04, "#5a5a62")
    Vj("solido", (x0 + 0.97, 0.02, GZ), (x0 + 0.97, 0.02, GZ + 0.7), 0.04, "#5a5a62")
    Bj("solido", (x0 + 0.5, 0.01, GZ + 0.45), (0.94, 0.02, 0.5), "#3a3a40", sujo=0)
    Vj("solido", (x0 + 0.03, 1.12, GZ), (x0 + 0.03, 0.02, GZ + 0.7), 0.025, "#6a6a74")

# ══════════ a mesa de som no meio da pista ══════════
MX, MZ = -3.0, 3.8
Bj("solido", (MX, 0.12, MZ), (2.6, 0.24, 2.0), "#1e1a18", d=0.65)
Bj("solido", (MX, 0.62, MZ - 0.35), (2.0, 0.76, 0.8), "#141216")
Bj("solido", (MX, 1.06, MZ - 0.35), (2.0, 0.08, 0.86), None, rx=0.18, d=(0.1, 1, 0.215),
   cf=lambda c, n, i, j: ("#2a2a30" if (i % 2) else "#1a1a20") if n.z > 0.5 else "#141216", sujo=0)
for k in range(16):
    Bj("luz", (MX - 0.9 + k * 0.12, 1.12, MZ - 0.6 + 0.05 * (k % 3) * 0), (0.02, 0.01, 0.02),
       "#5dffa0" if k % 5 else "#ff3020")
Bj("luz", (MX + 0.6, 1.45, MZ - 0.05), (0.5, 0.32, 0.02), "#0c1420", rx=-0.25)
Bj("solido", (MX + 0.6, 1.3, MZ - 0.02), (0.06, 0.3, 0.04), "#1a1a20", sujo=0)
Bj("solido", (MX + 0.95, 0.75, MZ + 0.5), (0.55, 1.05, 0.55), "#18161a")
for k in range(5):
    Bj("luz", (MX + 0.72, 0.4 + k * 0.18, MZ + 0.5), (0.01, 0.02, 0.3), "#3a8a4a" if k % 2 else "#2a3a5a")
# a cadeira do técnico (vazia, afastada)
Cj("solido", (MX - 0.4, 0.24, MZ + 0.4), 0.2, 0.2, 0.05, 10, "#202024", sujo=0)
Cj("solido", (MX - 0.4, 0.29, MZ + 0.4), 0.025, 0.025, 0.4, 6, "#6a6a72", sujo=0)
Cj("solido", (MX - 0.4, 0.69, MZ + 0.4), 0.22, 0.22, 0.07, 12, "#1a1a1e", sujo=0)
# o cercadinho da mesa
for (a, b) in (((MX - 1.3, MZ - 1.0), (MX + 1.3, MZ - 1.0)), ((MX - 1.3, MZ - 1.0), (MX - 1.3, MZ + 1.0)),
               ((MX + 1.3, MZ - 1.0), (MX + 1.3, MZ + 0.2))):
    Vj("solido", (a[0], 1.24, a[1]), (b[0], 1.24, b[1]), 0.04, "#7a7a84")
    Vj("solido", (a[0], 0.24, a[1]), (a[0], 1.26, a[1]), 0.04, "#7a7a84")
    Vj("solido", (b[0], 0.24, b[1]), (b[0], 1.26, b[1]), 0.04, "#7a7a84")
# o cabo da mesa até o palco, pelo chão
Tj("solido", [(MX, 0.02, MZ - 1.0), (MX + 0.6, 0.02, 1.5), (-1.6, 0.02, -1.0), (-1.2, 0.02, -2.7), (-1.2, 0.6, -3.95)], 0.025, 5, "#0a0a0c", 0)

# ══════════ a plateia em degraus (no fundo) ══════════
for k in range(4):
    z0 = 5.8 + 0.8 * k
    h = 0.35 * (k + 1)
    Bj("solido", (0, h / 2, z0 + 0.4 + (D - z0 - 0.8) / 2 * 0), (2 * W, h, 0.8), None, d=(1.0, h, 0.8),
       cf=lambda c, n, i, j, k=k: ("#3a3430" if (i % 2) else "#34302c") if n.z > 0.5 else "#1e1a18")
    Bj("solido", (0, h + 0.004, z0 + 0.04), (2 * W, 0.008, 0.05), "#c8b040", sujo=0)
Bj("solido", (0, 0.7, 8.9), (2 * W, 1.4, 0.2), "#1e1a18")
for x in (-6.0, 6.0):
    Tj("solido", [(x, 1.0, 5.6), (x, 1.0, 5.85), (x, 1.35 + 1.0, 8.8)], 0.028, 6, "#8a8a92")
Tj("solido", [(-W + 0.1, 1.0, 5.8), (-1.5, 1.0, 5.8)], 0.028, 6, "#8a8a92")
Tj("solido", [(1.5, 1.0, 5.8), (W - 0.1, 1.0, 5.8)], 0.028, 6, "#8a8a92")
for x in (-W + 0.1, -1.5, 1.5, W - 0.1):
    Cj("solido", (x, 0, 5.8), 0.025, 0.025, 1.0, 6, "#8a8a92", sujo=0)

# ══════════ o bar (à direita) ══════════
BZ0, BZ1 = -1.0, 4.4
BZC, BZL = (BZ0 + BZ1) / 2, BZ1 - BZ0
Bj("solido", (7.25, 0.53, BZC), (0.7, 1.06, BZL), None, d=(0.7, 0.53, 0.3),
   cf=lambda c, n, i, j: "#3a2a1e" if (i % 2) else "#2e2218")
Bj("solido", (7.2, 1.09, BZC), (0.9, 0.06, BZL + 0.1), "#4a3a2c", sujo=0)
Bj("neon", (6.88, 0.1, BZC), (0.03, 0.03, BZL), OURO)
Bj("luz", (7.96, 2.0, BZC), (0.02, 1.2, BZL - 0.4), None, d=(1, 0.4, 0.6),
   cf=lambda c, n, i, j: dim("#ffb060", 0.25 + 0.2 * hh(i, j, 4)))
for q, y in enumerate((1.5, 2.1)):
    Bj("solido", (7.8, y - 0.02, BZC), (0.3, 0.04, BZL - 0.3), "#2a2018", sujo=0)
    for k in range(14):
        z = BZ0 + 0.4 + k * 0.34 + 0.05 * hh(k, q)
        hgt = 0.22 + 0.08 * hh(k, q, 3)
        cor = escolhe(["#5dffa0", "#ffc857", "#ff6a35", "#e6f0ff", "#a0703a"], k, q)
        if hh(k, q, 8) > 0.25:
            Cj("vidro", (7.8, y, z), 0.04, 0.04, hgt, 6, cor)
            Cj("vidro", (7.8, y + hgt, z), 0.04, 0.014, 0.07, 6, cor)
# o BAR em neon na parede (no plano x = 7.96; de frente pra ela, a leitura vai de -z pra +z)
NX = 7.96
NB = [(NX, 3.4, 1.4), (NX, 2.9, 1.4), (NX, 2.9, 1.7), (NX, 3.05, 1.75), (NX, 3.15, 1.4), (NX, 3.25, 1.7), (NX, 3.4, 1.7), (NX, 3.4, 1.4)]
Tj("neon", NB, 0.03, 5, OURO)
Tj("neon", [(NX, 2.9, 1.95), (NX, 3.4, 2.2), (NX, 2.9, 2.45)], 0.03, 5, OURO)
Tj("neon", [(NX, 3.15, 2.05), (NX, 3.15, 2.35)], 0.03, 5, OURO)
Tj("neon", [(NX, 2.9, 2.7), (NX, 3.4, 2.7), (NX, 3.4, 3.0), (NX, 3.15, 3.0), (NX, 3.15, 2.7), (NX, 2.9, 3.05)], 0.03, 5, OURO)
for z in (0.0, 1.4, 2.8):
    Vj("solido", (7.2, H - 0.4, z), (7.2, 2.95, z), 0.012, "#111111")
    Cj("solido", (7.2, 2.75, z), 0.18, 0.05, 0.2, 12, "#2a2018", sujo=0)
    Esfera("luz", G(7.2, 2.76, z), 0.055, 8, 6, QUENTE)
for z in (-0.4, 0.8, 2.0, 3.2):
    Cj("solido", (6.5, 0, z), 0.18, 0.18, 0.03, 12, METAL2, sujo=0)
    Cj("solido", (6.5, 0.03, z), 0.025, 0.025, 0.7, 6, "#8a8a92", sujo=0)
    Cj("solido", (6.5, 0.73, z), 0.19, 0.18, 0.06, 12, "#3a1a14", sujo=0)

# ══════════ as saídas (luz verde) ══════════
for xw, zc in SAIDAS:
    s = 1 if xw < 0 else -1
    Bj("solido", (xw + s * 0.06, 1.15, zc), (0.12, 2.3, 1.5), "#202428")
    Bj("solido", (xw + s * 0.13, 1.05, zc), (0.03, 0.05, 1.2), "#9a9aa4", sujo=0)
    Bj("luz", (xw + s * 0.05, 2.62, zc), (0.06, 0.22, 0.6), None, d=(1, 0.11, 0.15),
       cf=lambda c, n, i, j: "#e8fff0" if (j == 1 and 0 < i < 3) else "#1fd36a")

# ══════════ o que ficou no chão depois do último show ══════════
for k in range(34):
    x = -6.5 + 13 * hh(k, 1)
    z = -2.3 + 8.0 * hh(k, 2)
    if abs(x) < 0.5 and abs(z - 1) < 0.5:
        continue
    if abs(x - MX) < 1.4 and abs(z - MZ) < 1.1:
        continue
    if hh(k, 3) > 0.45:
        Cj("solido", (x, 0, z), 0.04, 0.035, 0.11, 7, "#c8c0b0" if hh(k, 4) > 0.5 else "#d84030", sujo=0) if hh(k, 5) > 0.5 else \
            Cj("solido", (x, 0.04, z), 0.04, 0.035, 0.11, 7, "#c8c0b0", eixo="x", ry=TAU * hh(k, 6), sujo=0)
    else:
        Bj("solido", (x, 0.003, z), (0.12, 0.004, 0.08), escolhe(["#e8e0c8", "#ffc857", "#ff3f7a"], k), ry=TAU * hh(k, 7), sujo=0)

# ══════════ a luz assada ══════════
FONTES = [
    (G(0, 1.05, -4.0), c3(OURO, 0.8), 2.2),
    (G(-4, 1.05, -4.0), c3(OURO, 0.6), 1.8),
    (G(4, 1.05, -4.0), c3(OURO, 0.6), 1.8),
    (G(0.3, 3.4, -3.2), c3(QUENTE, 0.7), 2.4),
    (G(0, 6, -5), c3(OURO, 0.6), 3.0),
    (G(0, 3.8, 1), c3(QUENTE, 0.6), 3.0),
    (G(7.9, 2.0, 1.7), c3("#ffb060", 0.5), 2.0),
    (G(7.2, 2.6, 1.4), c3(QUENTE, 0.5), 2.0),
    (G(-W + 0.1, 2.6, 4.6), c3("#1fd36a", 0.45), 1.0),
    (G(W - 0.1, 2.6, -6.5), c3("#1fd36a", 0.45), 1.0),
    (G(MX, 1.3, MZ - 0.4), c3("#5dffa0", 0.2), 1.0),
    (G(7.9, 3.15, 2.2), c3(OURO, 0.5), 1.5),
]
fim(SAIDA, ("sala",), FONTES, "shows", amb=0.8, ao_dist=0.9)
