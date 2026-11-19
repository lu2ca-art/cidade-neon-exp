# A BALADA da faixa Sexta-Feira por dentro (06/11): a "multidão oca". Antes eram
# caixas (app/linha/interior/salas/Balada.tsx); agora um clube escuro de verdade:
# a pista com o piso de LED em grade (nó `pista`, malha _neon: o jogo pulsa a cor
# do material com a batida), a cabine do DJ no palco baixo do fundo com as duas
# picapes e o mixer, a moldura do telão-feed, os dois paredões de som, a treliça
# do teto com as cabeças móveis de onde saem os feixes, o globo espelhado, o
# camarote alto à esquerda (vidro, sofá de veludo, a escada, o VIP em neon), o
# bar lateral à direita (balcão com neon, a parede de garrafas acesa, banquetas,
# pendentes), as colunas com anéis de neon e a porta dos fundos entreaberta
# (SAÍDA verde, o beco frio do lado de fora).
#
#   blender -b --factory-startup --python blender/scripts/balada.py \
#     [--python blender/scripts/balada_foto.py] -- bruto.glb [foto.png]
#   npx @gltf-transform/cli optimize bruto.glb public/models/balada.glb \
#     --compress meshopt --simplify false --join false --flatten false --instance false --palette false
#
# Tudo nas posições do jogo (a sala 22 × 20 × 7, o palco do DJ [0, 0.6, -8] de
# 5 × 1.2 × 2 com o DJ em [0, 1.2, -8.3], o telão [0, 4, -9.9] 3 × 4.5, o
# camarote [-8, 1.6, -3] 4 × 3.5 com o topo em 1.675, o Mubarak em [8.6, 0, -6.5],
# os feixes em [-6 + 3i, 6.8, -2 + 2(i%2)], a câmera da entrada em z = 10).
# Dois nós na origem: sala (_solido/_luz/_neon/_vidro) e pista (_neon, o LED).
# Orçamento: ≤ 25 mil triângulos, ≤ 600 KB.

import os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(sys.argv[sys.argv.index("--python") + 1])))
from balada_kit import *  # noqa

args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
SAIDA = args[0] if args else "/tmp/balada-bruto.glb"

inicio("Balada")

ROSA, LILAS, CIANO, OURO = "#ff3fb0", "#b38cff", "#2fe8ff", "#ffc857"
METAL, METAL2, PRETO = "#3a3a44", "#24242c", "#0e0c12"
W, D, H = 11.0, 10.0, 7.0  # meia largura, meio fundo, altura

ATUAL[0] = "sala"


# ══════════ a casca: chão, paredes, teto ══════════
def f_chao(c, n, i, j):
    x, z = c.x, -c.y
    if abs(x) < 6.1 and abs(z) < 6.1:
        return "#07060a"
    if hh(math.floor(x / 2), math.floor(z / 2), 4) > 0.85:
        return "#120f17"  # mancha grudenta
    return escolhe(["#1c1822", "#18151e", "#201b26", "#1a1620"], math.floor(x / 1.33), math.floor(z / 1.33), 1)


Placa("solido", (-W, -D, 0), (2 * W, 0, 0), (0, 2 * D, 0), 33, 30, None, f_chao, sujo=0)


def f_espuma(c, n, i, j):
    # painéis de espuma acústica em xadrez, rodapé escuro
    if c.z < 1.0:
        return "#0f0c14"
    return "#1e1529" if (i + j) % 2 else "#170f20"


DX = 8.25
PORTA_X = (DX - 0.75, DX + 0.75)
Placa("solido", (-W, D, 0), (2 * W, 0, 0), (0, 0, H), 44, 14, None, f_espuma,
      filtro=lambda i, j: not (PORTA_X[0] <= -W + 0.5 * i < PORTA_X[1] and j < 5))
Placa("solido", (W, -D, 0), (-2 * W, 0, 0), (0, 0, H), 22, 7, None, f_espuma)


def f_lado(c, n, i, j):
    if c.z < 1.1:
        return "#100c14"
    return "#1a1322" if (i % 3 == 0) else "#150f1c"


Placa("solido", (-W, -D, 0), (0, 2 * D, 0), (0, 0, H), 30, 7, None, f_lado)
Placa("solido", (W, D, 0), (0, -2 * D, 0), (0, 0, H), 30, 7, None, f_lado)
Placa("solido", (-W, -D, H), (0, 2 * D, 0), (2 * W, 0, 0), 20, 22, "#09070c", sujo=0)

# neon corrido nas paredes do lado (alto) e o rodapé de luz
for x, cor in ((-W + 0.03, LILAS), (W - 0.03, ROSA)):
    Bj("neon", (x, 4.6, 0), (0.03, 0.04, 19.6), cor)
    Bj("neon", (x, 4.75, 0), (0.03, 0.02, 19.6), dim(cor, 0.5))
# faixas verticais rosa ladeando o telão no fundo
for x in (-2.15, 2.15):
    Bj("neon", (x, 3.9, -D + 0.03), (0.05, 5.0, 0.03), ROSA)

# ══════════ a pista de LED (o nó pista) ══════════
ATUAL[0] = "pista"
CORES_LED = [ROSA, LILAS, CIANO]
for i in range(12):
    for k in range(12):
        x, z = -5.5 + i, -5.5 + k
        anel = int(max(abs(x), abs(z)))
        cor = CORES_LED[anel % 3]
        h = hh(i, k, 3)
        kk = 0.18 if h < 0.12 else 0.5 + 0.5 * hh(i, k, 9)
        Placa("neon", G(x - 0.46, 0.015, z + 0.46), (0.92, 0, 0), (0, 0.92, 0), 1, 1, dim(cor, kk))
ATUAL[0] = "sala"
# a borda de metal da pista
for s in (-1, 1):
    Bj("solido", (s * 6.05, 0.025, 0), (0.1, 0.05, 12.2), "#4a4652", sujo=0)
    Bj("solido", (0, 0.025, s * 6.05), (12.0, 0.05, 0.1), "#4a4652", sujo=0)

# ══════════ o palco baixo do DJ, a cabine e o telão ══════════
Bj("solido", (0, 0.6, -8), (5, 1.2, 2), "#1a1424", d=0.6)
for k in range(7):
    Bj("neon", (-2.1 + k * 0.7, 0.62, -6.985), (0.035, 0.95, 0.02), LILAS)
# a escada do lado direito
for k, h in enumerate((0.9, 0.6, 0.3)):
    Bj("solido", (2.7 + 0.4 * k, h / 2, -7.8), (0.4, h, 1.1), "#2a2232")
    Bj("solido", (2.7 + 0.4 * k, h + 0.01, -7.32), (0.4, 0.02, 0.05), "#8a8070", sujo=0)
# a mesa (a frente vira pra pista; o DJ fica atrás, em z -8.3)
Bj("solido", (0, 1.675, -7.5), (2.6, 0.95, 0.55), "#121018", d=(0.65, 0.5, 0.55))
Bj("solido", (0, 2.17, -7.5), (2.8, 0.04, 0.7), "#2c2834", sujo=0)
Bj("luz", (0, 1.7, -7.215), (2.3, 0.62, 0.01), None,
  cf=lambda c, n, i, j: dim(ROSA, 0.5) if (i + j) % 2 else dim(LILAS, 0.35), d=(0.23, 0.155, 1))
for x in (-0.75, 0.75):
    Bj("solido", (x, 2.23, -7.5), (0.34, 0.08, 0.42), "#1c1c22", sujo=0)
    Cj("solido", (x, 2.27, -7.44), 0.13, 0.13, 0.02, 14, "#3a3a44", sujo=0)
    Cj("luz", (x, 2.29, -7.44), 0.04, 0.04, 0.005, 8, CIANO)
    Bj("luz", (x, 2.275, -7.66), (0.14, 0.01, 0.06), "#4ab0ff")
Bj("solido", (0, 2.23, -7.5), (0.34, 0.08, 0.4), "#18161c", sujo=0)
for k in range(4):
    for q in range(3):
        Bj("luz", (-0.11 + k * 0.073, 2.275, -7.62 + q * 0.11), (0.03, 0.01, 0.03), [ROSA, CIANO, OURO][q])
# o notebook
Bj("solido", (0.25, 2.2, -7.86), (0.34, 0.02, 0.24), "#3a3a44", sujo=0)
Bj("luz", (0.25, 2.33, -7.98), (0.32, 0.22, 0.01), "#8ab0ff", rx=-0.3)
# a moldura do telão (atrás do plano do feed, que é do jogo)
for x in (-1.6, 1.6):
    Bj("solido", (x, 4, -9.95), (0.2, 4.9, 0.08), METAL2, sujo=0)
for y in (1.65, 6.35):
    Bj("solido", (0, y, -9.95), (3.4, 0.2, 0.08), METAL2, sujo=0)
Bj("solido", (0, 6.2, -9.96), (4.6, 1.2, 0.04), "#0c0a10", sujo=0)


# ══════════ os paredões de som ══════════
def falante(x, y, zf, r):
    Cj("solido", (x, y, zf), r, r, 0.015, 12, "#2c2c34", eixo="z", sujo=0)
    Cj("solido", (x, y, zf - 0.04), r * 0.82, r * 0.2, 0.06, 12, "#0a0a0e", eixo="z", sujo=0)
    Cj("solido", (x, y, zf + 0.01), r * 0.2, r * 0.18, 0.02, 8, "#1c1c22", eixo="z", sujo=0)


def paredao(xc):
    z0 = -8.8
    for k in range(2):  # subs
        y = 0.45 + k * 0.9
        Bj("solido", (xc, y, z0), (1.5, 0.88, 1.0), "#141218")
        falante(xc - 0.36, y, z0 + 0.5, 0.3)
        falante(xc + 0.36, y, z0 + 0.5, 0.3)
    for k in range(3):  # médios e cornetas
        y = 2.2 + k * 0.62
        Bj("solido", (xc, y, z0 - 0.1), (1.3, 0.6, 0.8), "#18161c")
        falante(xc - 0.35, y, z0 + 0.3, 0.17)
        falante(xc + 0.05, y, z0 + 0.3, 0.17)
        Bj("solido", (xc + 0.43, y, z0 + 0.3), (0.26, 0.16, 0.04), "#0a0a0e", sujo=0)
        Bj("luz", (xc + 0.55, y - 0.22, z0 + 0.305), (0.03, 0.03, 0.01), "#5dffa0")
    Bj("solido", (xc, 4.1, z0 - 0.1), (1.4, 0.06, 0.9), METAL2, sujo=0)
    Bj("neon", (xc, 0.03, z0 + 0.55), (1.5, 0.03, 0.03), ROSA)


paredao(-4.6)
paredao(4.6)

# ══════════ o teto: treliças, cabeças móveis, o globo ══════════
for z in (-2.0, 0.0):
    Treli((-9.5, 6.8, z), (9.5, 6.8, z), 0.3, 0.65, METAL)
    for x in (-9.0, 9.0):
        Vj("solido", (x, 6.95, z), (x, H, z), 0.03, METAL)
FEIXES = [ROSA, LILAS, CIANO, ROSA, OURO]
for i, cor in enumerate(FEIXES):
    x, z = -6 + i * 3, -2 + (i % 2) * 2
    Bj("solido", (x, 6.6, z), (0.36, 0.05, 0.2), "#16141a", sujo=0)
    for s in (-1, 1):
        Bj("solido", (x + s * 0.17, 6.45, z), (0.03, 0.3, 0.16), "#16141a", sujo=0)
    Cj("solido", (x, 6.2, z), 0.12, 0.14, 0.28, 10, "#1e1c22", sujo=0)
    Cj("luz", (x, 6.19, z), 0.09, 0.09, 0.01, 10, cor)
# o globo
Vj("solido", (0, H, 0.5), (0, 6.18, 0.5), 0.015, "#6a6a74")
Cj("solido", (0, 6.15, 0.5), 0.05, 0.05, 0.08, 8, "#2a2a30", sujo=0)


def f_globo(c, n, i, j):
    h = ph(c, 5)
    if h < 0.12:
        return "#ffffff"
    if h < 0.22:
        return "#ff9fe0"
    if h < 0.3:
        return "#c8b0ff"
    return dim("#9a9ab0", 0.25 + 0.5 * ph(c, 6))


Esfera("luz", G(0, 5.7, 0.5), 0.45, 18, 12, None, cf=f_globo)

# ══════════ as colunas com anéis de neon ══════════
for x in (-7.5, 7.5):
    Bj("solido", (x, H / 2, 4.5), (0.6, H, 0.6), "#1a1520", d=(0.6, 1.0, 0.6))
    for y in (2.4, 4.6):
        Bj("neon", (x, y, 4.5), (0.64, 0.05, 0.64), ROSA if x < 0 else LILAS)

# ══════════ o camarote (à esquerda, alto) ══════════
CY = 1.675
Bj("solido", (-8, 1.6, -3), (4, 0.15, 3.5), "#2a1a2a", d=0.7)
Bj("solido", (-8, CY + 0.005, -3), (3.9, 0.01, 3.4), "#3a1832", sujo=0,
   cf=lambda c, n, i, j: "#2e1228" if ph(c, 2) > 0.5 else "#3a1832", d=0.5)
for x, z in ((-6.3, -4.5), (-6.3, -1.5), (-10.6, -1.5)):
    Cj("solido", (x, 0, z), 0.09, 0.09, 1.53, 10, METAL)
# a escada (de frente pra pista, subindo pra trás)
for k in range(7):
    h = CY * (7 - k) / 8
    Bj("solido", (-9.3, h / 2, -1.25 + 0.28 * (k + 0.5)), (1.0, h, 0.28), "#221828")
    Bj("neon", (-9.3, h + 0.005, -1.25 + 0.28 * k + 0.26), (1.0, 0.01, 0.02), dim(ROSA, 0.6))
Tj("solido", [(-8.78, CY + 0.95, -1.3), (-8.78, 0.95, 0.85)], 0.025, 6, METAL)
# o guarda-corpo de vidro: lado da pista (x = -6) e frente (z = -1.25)
Bj("vidro", (-6.06, CY + 0.47, -3), (0.02, 0.9, 3.4), "#2a2040")
Bj("vidro", (-7.42, CY + 0.47, -1.27), (2.7, 0.9, 0.02), "#2a2040")
Bj("vidro", (-8.5, CY + 0.47, -4.73), (4.9, 0.9, 0.02), "#2a2040")
Tj("solido", [(-8.75, CY + 0.95, -1.27), (-6.06, CY + 0.95, -1.27), (-6.06, CY + 0.95, -4.73), (-10.95, CY + 0.95, -4.73)], 0.03, 6, "#8a8a96")
for x, z in ((-6.06, -1.27), (-6.06, -3.0), (-6.06, -4.73), (-7.4, -1.27), (-8.75, -1.27), (-8.5, -4.73)):
    Cj("solido", (x, CY, z), 0.025, 0.025, 0.95, 6, "#8a8a96", sujo=0)
# o sofá de veludo em L e a mesinha com o balde
Bj("solido", (-10.55, CY + 0.22, -3.1), (0.75, 0.44, 3.0), "#4a0f34", d=0.5)
Bj("solido", (-10.88, CY + 0.6, -3.1), (0.2, 0.8, 3.0), "#3a0a28", d=0.5)
Bj("solido", (-9.6, CY + 0.22, -4.35), (1.3, 0.44, 0.7), "#4a0f34", d=0.5)
Bj("solido", (-9.6, CY + 0.6, -4.65), (1.3, 0.8, 0.15), "#3a0a28", d=0.5)
Cj("solido", (-9.5, CY, -3.2), 0.05, 0.05, 0.42, 8, METAL)
Cj("solido", (-9.5, CY + 0.42, -3.2), 0.38, 0.38, 0.03, 16, "#20182a", sujo=0)
Cj("solido", (-9.45, CY + 0.45, -3.2), 0.12, 0.1, 0.2, 10, "#9a9aa8", sujo=0)
for k, cor in enumerate(("#5dffa0", "#ffc857")):
    Cj("vidro", (-9.42 + 0.06 * k, CY + 0.5, -3.18 - 0.04 * k), 0.035, 0.035, 0.26, 6, cor)
# o VIP em neon na parede (no plano x = -10.97, olhando pra +x)
VX = -10.95
Tj("neon", [(VX, 3.3, -4.2), (VX, 4.3, -4.2), (VX, 4.3, -1.8), (VX, 3.3, -1.8), (VX, 3.3, -4.2)], 0.025, 5, LILAS)
Tj("neon", [(VX, 4.05, -2.2), (VX, 3.5, -2.45), (VX, 4.05, -2.7)], 0.035, 5, ROSA)       # V
Tj("neon", [(VX, 4.05, -3.0), (VX, 3.5, -3.0)], 0.035, 5, ROSA)                           # I
Tj("neon", [(VX, 3.5, -3.35), (VX, 4.05, -3.35), (VX, 4.05, -3.7), (VX, 3.78, -3.75),
            (VX, 3.77, -3.35)], 0.035, 5, ROSA)                                           # P

# ══════════ o bar lateral (à direita) ══════════
BZ0, BZ1 = -5.6, 2.4
BZC, BZL = (BZ0 + BZ1) / 2, BZ1 - BZ0
Bj("solido", (9.35, 0.53, BZC), (0.7, 1.06, BZL), None, d=(0.7, 0.53, 0.25),
   cf=lambda c, n, i, j: "#1e1626" if (i + j) % 2 else "#241a2e")
Bj("solido", (9.3, 1.09, BZC), (0.95, 0.06, BZL + 0.1), "#3c3444", sujo=0)
Bj("neon", (8.985, 0.12, BZC), (0.03, 0.03, BZL), LILAS)
Bj("neon", (8.82, 1.055, BZC), (0.02, 0.02, BZL + 0.1), ROSA)
for k in range(4):  # as torneiras de chope
    Cj("solido", (9.4, 1.12, -3.0 + k * 0.25), 0.02, 0.02, 0.32, 6, "#b8b8c4", sujo=0)
    Bj("solido", (9.35, 1.43, -3.0 + k * 0.25), (0.12, 0.03, 0.03), "#b8b8c4", sujo=0)
# o fundo do bar: geladeira baixa, o painel aceso, as prateleiras e as garrafas
Bj("solido", (10.6, 0.45, -1.7), (0.7, 0.9, 6.6), "#141218", d=(0.7, 0.9, 1.1))
for k in range(6):
    Bj("luz", (10.24, 0.48, -4.7 + k * 1.1), (0.01, 0.6, 0.9), "#2a3a5a")
Bj("luz", (10.97, 1.9, -1.7), (0.02, 1.6, 6.4), None, d=(1, 0.4, 0.8),
   cf=lambda c, n, i, j: dim("#ffb070", 0.45 + 0.25 * hh(i, j, 2)))
CORES_GARRAFA = ["#5dffa0", "#ffc857", "#ff6a35", "#7fe8ff", "#b38cff", "#ff3f7a", "#e6f0ff"]
for q, y in enumerate((1.3, 1.85, 2.4)):
    Bj("solido", (10.78, y - 0.02, -1.7), (0.36, 0.04, 6.5), "#2a2430", sujo=0)
    Bj("neon", (10.62, y - 0.045, -1.7), (0.02, 0.015, 6.4), OURO)
    for k in range(20):
        z = -4.8 + k * 0.32 + 0.06 * hh(k, q)
        h = 0.22 + 0.1 * hh(k, q, 2)
        cor = escolhe(CORES_GARRAFA, k, q)
        Cj("vidro", (10.8, y, z), 0.045, 0.045, h, 6, cor)
        Cj("vidro", (10.8, y + h, z), 0.045, 0.015, 0.08, 6, cor)
Bj("solido", (10.95, 3.1, -1.7), (0.1, 0.5, 6.6), "#120e16", sujo=0)
# banquetas
for z in (-4.2, -2.8, -1.4, 0.0, 1.4):
    Cj("solido", (8.55, 0, z), 0.2, 0.2, 0.03, 12, METAL2, sujo=0)
    Cj("solido", (8.55, 0.03, z), 0.03, 0.03, 0.72, 6, "#8a8a96", sujo=0)
    Cj("solido", (8.55, 0.75, z), 0.2, 0.19, 0.07, 12, "#4a0f34", sujo=0)
# os pendentes em cima do balcão
for z in (-4.2, -1.6, 1.0):
    Vj("solido", (9.35, H, z), (9.35, 3.05, z), 0.012, "#111111")
    Cj("solido", (9.35, 2.85, z), 0.2, 0.05, 0.22, 12, "#1c1824", sujo=0)
    Esfera("luz", G(9.35, 2.86, z), 0.06, 8, 6, "#ffd9a0")

# ══════════ a porta dos fundos (entreaberta) e a entrada ══════════
for x in (DX - 0.8, DX + 0.8):
    Bj("solido", (x, 1.27, -9.97), (0.1, 2.54, 0.12), METAL)
Bj("solido", (DX, 2.55, -9.97), (1.7, 0.1, 0.12), METAL)
TH = 0.45
HX = DX - 0.7
Bj("solido", (HX + 0.65 * math.cos(TH), 1.2, -10.05 - 0.65 * math.sin(TH)), (1.3, 2.35, 0.05), "#2a2e36", ry=TH)
Bj("solido", (HX + 0.7 * math.cos(TH) + 0.03 * math.sin(TH), 1.05, -10.0 - 0.7 * math.sin(TH)), (0.9, 0.05, 0.05),
   "#9a9aa4", ry=TH, sujo=0)
Bj("luz", (DX, 2.82, -9.95), (0.62, 0.22, 0.05), None, d=(0.155, 0.11, 1),
   cf=lambda c, n, i, j: "#e8fff0" if (j == 1 and 0 < i < 3) else "#1fd36a")
# o beco lá fora (frio)
for x in (DX - 0.85, DX + 0.85):
    Bj("solido", (x, 1.5, -10.8), (0.1, 3.0, 1.6), "#1a1c22")
Placa("solido", G(DX - 0.9, 0, -10), (1.8, 0, 0), (0, 1.6, 0), 2, 2, "#15171c", sujo=0)
Bj("luz", (DX, 1.5, -11.55), (1.8, 3.0, 0.02), None, d=(0.6, 0.75, 1),
   cf=lambda c, n, i, j: dim("#3a5a8a", 0.18 + 0.12 * j / 4))
# a entrada (atrás da câmera): porta dupla acolchoada
Bj("solido", (-6.0, 1.3, 9.94), (2.2, 2.6, 0.1), "#2a0f22", d=0.37)
for x in (-6.5, -5.5):
    Bj("luz", (x, 1.25, 9.88), (0.06, 0.3, 0.02), "#ffd9a0")
Bj("luz", (-6.0, 2.85, 9.93), (0.62, 0.22, 0.05), "#1fd36a")

# ══════════ a luz assada (o jogo só tem as luzes de sempre) ══════════
FONTES = [
    (G(0, 1.22, -6.9), c3(ROSA, 0.9), 2.0),
    (G(0, 4.0, -9.3), c3(LILAS, 0.9), 3.0),
    (G(-6, 1.7, -3), c3(ROSA, 0.7), 1.6),
    (G(9.4, 2.9, -4.2), c3("#ffd9a0", 0.6), 1.4),
    (G(9.4, 2.9, -1.6), c3("#ffd9a0", 0.6), 1.4),
    (G(9.4, 2.9, 1.0), c3("#ffd9a0", 0.6), 1.4),
    (G(10.6, 1.9, -1.7), c3("#ffb070", 0.6), 2.2),
    (G(DX, 2.8, -9.8), c3("#1fd36a", 0.5), 1.0),
    (G(DX, 1.2, -10.6), c3("#5a7aaa", 0.4), 1.2),
    (G(-10.8, 3.8, -3), c3(ROSA, 0.6), 1.6),
    (G(0, 5.7, 0.5), c3("#ffffff", 0.3), 2.0),
]
for x in (-4, 0, 4):
    for z in (-4, 0, 4):
        FONTES.append((G(x, 0.3, z), c3(CORES_LED[int(max(abs(x), abs(z))) % 3], 0.35), 2.5))
for z in (-6, 0, 6):
    FONTES.append((G(-10.8, 4.6, z), c3(LILAS, 0.4), 2.0))
    FONTES.append((G(10.8, 4.6, z), c3(ROSA, 0.4), 2.0))
for x in (-7.5, 7.5):
    FONTES.append((G(x, 3.5, 4.5), c3(ROSA if x < 0 else LILAS, 0.45), 1.4))
for i, cor in enumerate(FEIXES):
    FONTES.append((G(-6 + i * 3, 6.1, -2 + (i % 2) * 2), c3(cor, 0.3), 1.0))

fim(SAIDA, ("sala", "pista"), FONTES, "balada", amb=0.5, ao_dist=0.9)
