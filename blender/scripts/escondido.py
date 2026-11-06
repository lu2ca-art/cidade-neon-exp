# O LUGAR ESCONDIDO por dentro (06/11): a casa da Ella como o jogo conta hoje
# (06/10, LU2CA: um quarto quente com o grow indoor rastafári). Antes eram
# caixas (app/linha/interior/salas/Escondido.tsx); agora o taco gasto, o
# reboco quente, a bandeira verde-amarela-vermelha ondulando na parede, a
# tenda de cultivo (o lado de fora preto, o de dentro prateado amarrotado, a
# porta enrolada em cima, as varetas), o painel de LED roxo, o filtro de carvão
# com o duto, o ventilador de garra, o vaso de feltro com a terra, o tapete
# redondo, as almofadas, o colchão no chão, os engradados com os discos, as
# plantinhas, o varal de luzinhas, a lâmpada pelada, o incenso, a cortina na
# janela com grade. E pela janela, lá fora na chuva: a laje com a caixa d'água,
# o pedaço de asfalto rachado com a flor murcha e o viaduto da Linha 9 em cima.
# A planta (que levanta), a chuva na janela, a Ella, as gotas e a câmera ficam
# no código.
#
#   blender -b --factory-startup --python blender/scripts/escondido.py \
#     [--python blender/scripts/escondido_foto.py] -- bruto.glb [foto.png]
#   npx @gltf-transform/cli optimize bruto.glb public/models/escondido.glb \
#     --compress meshopt --simplify false --join false --flatten false --instance false --palette false
#
# Coordenadas: as do Escondido.tsx com X = x, Y = -z, Z = y. A sala é a do
# código: 6 × 6 × 2,8 m; a tenda no meio do fundo (centro Y = 0,6), a janela
# na parede da esquerda (X = -3, Y -1,25..0,05, Z 0,95..2,05). Um nó "sala".
# Orçamento: até 12 mil triângulos e 250 KB.

import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sala_kit import *  # noqa

args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
SAIDA = args[0] if args else "/tmp/escondido-bruto.glb"

comecar("Escondido")
ATUAL[0] = "sala"
VERDE, AMARELO, VERMELHO, ROXO = "#1f9a3a", "#f2c230", "#d4302a", "#d070ff"
L, H = 3.0, 2.8
WY0, WY1, WZ0, WZ1 = -1.25, 0.05, 0.95, 2.05


# ── o chão de taco, as paredes, o teto ──
def f_taco(c, n, i, j):
    k = (j + (i % 2) * 2) // 3
    return dim(escolhe(["#4a3020", "#553826", "#41291a", "#5a3c28"], i, k, 3), 0.8 + 0.3 * hh(i, k, 5))


Placa("solido", (-L, -L, 0), (2 * L, 0, 0), (0, 2 * L, 0), 22, 18, None, f_taco, sujo=0)


def f_par(c, n, i, j):
    if c.z < 0.4 and hh(i, j, 3) > 0.5:
        return dim("#2a1a10", 0.9)
    if hh(i, j, 8) > 0.9:
        return "#4a3424"
    return dim("#3a2618", 0.85 + 0.25 * hh(i, j, 1))


def parede(o, U, V, nu, nv):
    Placa("solido", o, U, V, nu, nv, None, f_par, sujo=0.25)


parede((-L, L, 0), (2 * L, 0, 0), (0, 0, H), 12, 6)        # o fundo (a bandeira)
parede((L, -L, 0), (-2 * L, 0, 0), (0, 0, H), 12, 6)       # a da frente
parede((L, L, 0), (0, -2 * L, 0), (0, 0, H), 12, 6)        # a direita
# a esquerda, com o vão da janela
parede((-L, -L, 0), (0, WY0 + L, 0), (0, 0, H), 4, 6)
parede((-L, WY1, 0), (0, L - WY1, 0), (0, 0, H), 6, 6)
parede((-L, WY0, 0), (0, WY1 - WY0, 0), (0, 0, WZ0), 3, 2)
parede((-L, WY0, WZ1), (0, WY1 - WY0, 0), (0, 0, H - WZ1), 3, 2)
B("solido", (-L - 0.1, (WY0 + WY1) / 2, WZ0 - 0.02), (0.3, 1.36, 0.05), "#6a5a48", sujo=0)
B("solido", (-L - 0.1, (WY0 + WY1) / 2, WZ1 + 0.02), (0.22, 1.36, 0.04), "#3a2618", sujo=0)
for y in (WY0 - 0.02, WY1 + 0.02):
    B("solido", (-L - 0.1, y, (WZ0 + WZ1) / 2), (0.22, 0.04, WZ1 - WZ0), "#3a2618", sujo=0)
for k in range(1, 5):
    y = WY0 + (WY1 - WY0) * k / 5
    Viga("solido", (-L - 0.18, y, WZ0), (-L - 0.18, y, WZ1), 0.016, "#1a1a1c", 0)
Viga("solido", (-L - 0.18, WY0, 1.5), (-L - 0.18, WY1, 1.5), 0.016, "#1a1a1c", 0)
Placa("solido", (-L, L, H), (2 * L, 0, 0), (0, -2 * L, 0), 8, 8, None,
      lambda c, n, i, j: dim("#1c120c", 0.8 + 0.3 * hh(i, j)), sujo=0)
for p, s in (((0, L - 0.01, 0.05), (2 * L, 0.02, 0.1)), ((L - 0.01, 0, 0.05), (0.02, 2 * L, 0.1))):
    B("solido", p, s, "#24160e", sujo=0)

# a cortina rasta dos lados da janela (presa num cano)
Viga("solido", (-L + 0.06, WY0 - 0.35, 2.2), (-L + 0.06, WY1 + 0.35, 2.2), 0.025, "#2a1a10", 0)
for y0, w in ((WY0 - 0.35, 0.32), (WY1 + 0.03, 0.32)):
    Pano("solido", (-L + 0.08, y0, 0.7), (0, w, 0), (0, 0, 1.48), 3, 8, 0.05, VERDE,
         cf=lambda c, n, i, j: [VERMELHO, AMARELO, VERDE][min(2, int((c.z - 0.7) / 1.48 * 3))], seed=y0, normal=(1, 0, 0))

# ── a bandeira ondulando no fundo ──
Pano("solido", (0.1, L - 0.03, 0.9), (2.2, 0, 0), (0, 0, 1.26), 10, 9, 0.03, VERDE,
     cf=lambda c, n, i, j: dim([VERMELHO, AMARELO, VERDE][min(2, j // 3)], 0.95), seed=1, normal=(0, -1, 0))
Disco("solido", (1.2, L - 0.07, 1.53), 0.28, 16, "#1a120c", R(rx=math.pi / 2))
Disco("solido", (1.2, L - 0.075, 1.53), 0.12, 10, "#c8a020", R(rx=math.pi / 2))

# ── a tenda de cultivo (centro em Y = 0,6) ──
TX, TY0, TY1, TZ = 0.85, -0.25, 1.45, 2.2
for x in (-TX, TX):
    for y in (TY0, TY1):
        Viga("solido", (x, y, 0), (x, y, TZ), 0.025, "#d8d8dc", 0)
    Viga("solido", (x, TY0, TZ), (x, TY1, TZ), 0.025, "#d8d8dc", 0)
for y in (TY0, TY1):
    Viga("solido", (-TX, y, TZ), (TX, y, TZ), 0.025, "#d8d8dc", 0)
PRATA = lambda c, n, i, j: dim("#c8c8d0", 0.8 + 0.15 * hh(i, j, 7))
# por dentro: o prateado amarrotado
Pano("solido", (-TX + 0.01, TY0, 0), (0, TY1 - TY0, 0), (0, 0, TZ), 8, 10, 0.025, "#c8c8d0", cf=PRATA, seed=2, normal=(1, 0, 0))
Pano("solido", (TX - 0.01, TY1, 0), (0, TY0 - TY1, 0), (0, 0, TZ), 8, 10, 0.025, "#c8c8d0", cf=PRATA, seed=3, normal=(-1, 0, 0))
Pano("solido", (-TX, TY1 - 0.01, 0), (2 * TX, 0, 0), (0, 0, TZ), 8, 10, 0.025, "#c8c8d0", cf=PRATA, seed=4, normal=(0, -1, 0))
# por fora: o tecido preto
Placa("solido", (-TX - 0.01, TY1, 0), (0, TY0 - TY1, 0), (0, 0, TZ), 2, 3, "#141416", sujo=0.1)
Placa("solido", (TX + 0.01, TY0, 0), (0, TY1 - TY0, 0), (0, 0, TZ), 2, 3, "#141416", sujo=0.1)
Placa("solido", (-TX, TY0, TZ + 0.01), (2 * TX, 0, 0), (0, TY1 - TY0, 0), 1, 1, "#141416", sujo=0)
Placa("solido", (-TX, TY1, TZ - 0.01), (2 * TX, 0, 0), (0, TY0 - TY1, 0), 1, 1, "#1a1a20", sujo=0)
# a porta enrolada em cima, as abas abertas dos lados
Cil("solido", (-TX, TY0 - 0.06, TZ - 0.1), 0.07, 0.07, 2 * TX, 10, "#18181a", r=(0, math.pi / 2, 0), sujo=0)
for s in (-1, 1):
    Lona("solido", (s * TX, TY0 - 0.02, 0.05), (s * 0.22, -0.08, 0), (0, 0, TZ - 0.25), 2, 6, 0.03, "#18181a", sdir=(0, -1, 0))
# o painel de LED, as catracas
B("solido", (0, 0.6, 2.11), (1.12, 0.72, 0.03), "#1a1a20", sujo=0)
Placa("luz", (-0.55, 0.95, 2.09), (1.1, 0, 0), (0, -0.7, 0), 10, 6, None,
      lambda c, n, i, j: ROXO if (i + j) % 2 else "#ff70d0", sujo=0)
for x in (-0.5, 0.5):
    Viga("solido", (x, 0.6, 2.13), (x, 0.6, TZ), 0.008, "#2a2a2e", 0)
# o filtro de carvão e o duto até a parede
Cil("solido", (-0.65, 1.2, 1.9), 0.1, 0.1, 0.4, 10, "#2a2a30", r=(0, math.pi / 2, 0), sujo=0)
Tubo("solido", [(-0.25, 1.2, 1.95), (0.3, 1.3, 2.05), (0.6, 1.5, 2.3), (0.9, 2.4, 2.5), (0.9, L, 2.5)], 0.06, 8, "#8a8a90", 0)
# o ventilador de garra na vareta
Tor("solido", (TX - 0.05, 0.1, 1.5), 0.13, 0.012, 14, 4, "#e8e8ec", r=(0, math.pi / 2 - 0.5, 0))
Disco("solido", (TX - 0.05, 0.1, 1.5), 0.12, 10, "#3a3a40", R(ry=-math.pi / 2 - 0.5))
Cil("solido", (TX - 0.06, 0.1, 1.5), 0.04, 0.04, 0.1, 8, "#e8e8ec", r=(0, -math.pi / 2 - 0.5, 0), sujo=0)
# o vaso de feltro, a terra, a bandeja
B("solido", (0, 0.6, 0.02), (0.9, 0.9, 0.04), "#1a1a1c", sujo=0)
Cil("solido", (0, 0.6, 0.0), 0.22, 0.28, 0.4, 16, "#2a1a10", sujo=0.1)
Disco("solido", (0, 0.6, 0.385), 0.265, 16, "#1c120a")
# os cabos e o timer na vareta da frente
Tubo("solido", [(TX, TY0, 1.9), (TX + 0.1, TY0 - 0.1, 1.0), (TX + 0.3, TY0 - 0.2, 0.02), (1.6, 0.0, 0.02)], 0.008, 3, "#101012", 0)
B("solido", (TX + 0.06, TY0, 1.2), (0.06, 0.06, 0.1), "#e8e4dc", sujo=0)

# ── o tapete redondo, as almofadas, o colchão no chão ──
for k, (r, cor) in enumerate(((1.0, VERDE), (0.78, AMARELO), (0.56, VERMELHO), (0.3, "#2a1a10"))):
    Disco("solido", (-1.25, -0.9, 0.004 + k * 0.002), r, 24, dim(cor, 0.6))
for x, y, cor in ((-1.6, -1.2, VERMELHO), (-1.0, -1.5, AMARELO), (-1.9, -0.5, VERDE)):
    Esfera("solido", (x, y, 0.12), 0.32, 12, 8, cor, S(1, 1, 0.45))
with em(T(2.2, 1.6, 0)):
    B("solido", (0, 0, 0.1), (1.3, 2.0, 0.2), None, d=(0.3, 0.3, 0.2),
      cf=lambda c, n, i, j: "#b8ac98" if n.z > 0.5 else "#8a7e6a", sujo=0.1)
    Pano("solido", (-0.66, -0.6, 0.2), (1.32, 0, 0), (0, 1.3, 0), 8, 8, 0.07, "#2a5a3a",
         cf=lambda c, n, i, j: [VERDE, AMARELO, VERMELHO][(i // 2) % 3] if j % 4 == 0 else dim("#2a5a3a", 0.8 + 0.3 * hh(i, j)), seed=6)
    B("solido", (0, 0.8, 0.3), (0.6, 0.3, 0.14), "#d8ccb8", r=(0, 0, 0.1), sujo=0)

# ── os engradados com os discos, as plantinhas, a caixa de som ──
for k, (y, z) in enumerate(((-1.6, 0.16), (-1.6, 0.48), (-0.95, 0.16))):
    with em(T(2.75, y, z)):
        B("solido", (0, 0, 0), (0.4, 0.6, 0.32), None, d=(0.1, 0.1, 0.08),
          cf=lambda c, n, i, j, k=k: dim(escolhe(["#c8a020", "#2a7a3a", "#a8302a"], k), 0.4) if (i + j) % 2 and abs(n.z) < 0.5 else dim(escolhe(["#c8a020", "#2a7a3a", "#a8302a"], k), 0.75), sujo=0.15)
        for q in range(6):
            B("solido", (0.04, -0.24 + q * 0.09, 0.02), (0.3, 0.012, 0.29), escolhe(["#1a1a1e", "#e8d8b0", "#3a2a5a", "#d4302a", "#1f9a3a"], q, k), sujo=0)
Cil("solido", (2.7, -0.95, 0.32), 0.13, 0.11, 0.18, 10, "#8a4a2a", sujo=0)
for q in range(7):
    a = q * 0.9
    Esfera("solido", (2.7 + 0.1 * math.cos(a), -0.95 + 0.1 * math.sin(a), 0.62 + 0.05 * (q % 3)), 0.11, 6, 4, dim(VERDE, 0.6 + 0.1 * (q % 3)), S(1, 1, 1.3))
with em(T(2.65, -2.4, 0)):
    B("solido", (0, 0, 0.4), (0.4, 0.4, 0.8), "#1a1618", sujo=0.1)
    for z, r in ((0.55, 0.13), (0.22, 0.09)):
        Disco("solido", (-0.205, 0, z), r, 14, "#2a2a30", R(ry=-math.pi / 2))
# a plantinha pendurada no canto e o pôster
Tubo("solido", [(-2.3, 2.3, H), (-2.3, 2.3, 2.2)], 0.005, 3, "#8a7a5a", 0)
Cil("solido", (-2.3, 2.3, 2.0), 0.13, 0.15, 0.2, 10, "#8a4a2a", sujo=0)
for q in range(9):
    a = q * 0.7
    Tubo("solido", [(-2.3 + 0.12 * math.cos(a), 2.3 + 0.12 * math.sin(a), 2.2), (-2.3 + 0.22 * math.cos(a), 2.3 + 0.22 * math.sin(a), 1.7 - 0.08 * (q % 3))], 0.03, 3, dim(VERDE, 0.7), 0)
Placa("solido", (L - 0.01, 0.2, 1.1), (0, -0.7, 0), (0, 0, 1.0), 3, 4, None,
      lambda c, n, i, j: [VERMELHO, AMARELO, VERDE][j % 3] if j < 3 else dim("#1a120c", 1.0) if i == 1 else dim(AMARELO, 0.6), sujo=0)

# ── o incenso, a lâmpada pelada, o varal de luzinhas ──
with em(T(1.8, -1.4, 0)):
    B("solido", (0, 0, 0.25), (0.4, 0.4, 0.5), None, d=(0.2, 0.2, 0.25),
      cf=lambda c, n, i, j: dim("#2a1a10", 0.8 + 0.3 * hh(i, j)), sujo=0.1)
    B("solido", (0, 0, 0.51), (0.3, 0.06, 0.02), "#6a4a2a", sujo=0)
    Viga("solido", (0, 0, 0.52), (0.05, 0, 0.87), 0.006, "#5a3a20", 0)
    Esfera("luz", (0.05, 0, 0.88), 0.012, 6, 4, "#ff7a3a")
Tubo("solido", [(0.6, -0.8, H), (0.6, -0.8, 2.45)], 0.006, 3, "#1a1a1e", 0)
Cil("solido", (0.6, -0.8, 2.37), 0.02, 0.02, 0.08, 8, "#2a2a30", sujo=0)
Esfera("luz", (0.6, -0.8, 2.33), 0.045, 8, 6, "#ffcf9a")
Varal((-2.9, -2.9, 2.6), (2.9, -2.6, 2.55), 12, 0.25, 1)
Varal((-2.9, 2.9, 2.6), (-2.9, -2.4, 2.55), 10, 0.2, 4)

# ════════════════════════ lá fora (pela janela): a laje, a caixa d'água, a Linha 9 ════════════════════════
X0 = -L - 0.2
Placa("solido", (-10, -6, -0.05), (10 + X0, 0, 0), (0, 12, 0), 10, 10, None,
      lambda c, n, i, j: dim("#3a3a3e", 0.55 + 0.35 * hh(i, j, 3)) if hh(i, j, 5) > 0.2 else dim("#2a2a2e", 0.6), sujo=0)
for y, w in ((-1.0, 1.4), (1.6, 1.0)):
    Placa("vidro", (-6.4, y - w / 2, -0.04), (1.6, 0, 0), (0, w, 0), 2, 2, dim("#3a4a70", 0.6), sujo=0)
B("solido", (-10.1, 0, 0.45), (0.2, 12, 0.9), None, d=(0.2, 1.0, 0.45),
  cf=lambda c, n, i, j: dim("#4a4a50", 0.6 + 0.3 * hh(i, j)), sujo=0.2)
# a caixa d'água azul em cima da base de tijolo
B("solido", (-6.4, 0.5, 0.2), (1.4, 1.4, 0.4), None, d=(0.35, 0.35, 0.2),
  cf=lambda c, n, i, j: dim(escolhe(["#5a3428", "#4a2c22"], i, j), 0.8), sujo=0.2)
Cil("solido", (-6.4, 0.5, 0.4), 0.62, 0.72, 0.95, 16, "#2a5a9a", sujo=0.1)
Cil("solido", (-6.4, 0.5, 1.35), 0.74, 0.3, 0.15, 16, "#2a5090", sujo=0)
Tubo("solido", [(-5.8, 0.9, 0.6), (-5.2, 1.2, 0.3), (-4.0, 1.3, 0.05)], 0.03, 5, "#d8d8d0", 0)
# o asfalto rachado com a flor murcha
Placa("solido", (-5.1, -1.9, -0.035), (1.0, 0, 0), (0, 0.8, 0), 5, 4, None,
      lambda c, n, i, j: dim("#0e0e10", 1.0) if (i + j) % 3 == 0 or i == 2 else dim("#1c1c20", 0.9), sujo=0)
Tubo("solido", [(-4.62, -1.5, -0.03), (-4.6, -1.48, 0.14), (-4.55, -1.45, 0.2)], 0.005, 3, "#4a5a2a", 0)
Esfera("solido", (-4.53, -1.44, 0.18), 0.03, 6, 4, "#8a4a5a")
# o viaduto da Linha 9 em cima, com a faixa de neon e o pilar
B("solido", (-8.6, 0, 3.0), (1.8, 14, 0.7), None, d=(1.8, 1.4, 0.35),
  cf=lambda c, n, i, j: dim("#3a3a42", 0.5 + 0.3 * hh(i, j)), sujo=0)
B("neon", (-7.68, 0, 2.75), (0.03, 14, 0.06), "#2fe8ff", sujo=0)
for y in (-2.5, 3.5):
    Cil("solido", (-8.6, y, -0.05), 0.35, 0.35, 2.7, 10, "#3a3a40", sujo=0.2)
Texto("luz", "LINHA 9", T(-7.66, 1.2, 3.05) @ R(rz=math.pi / 2), 0.22, "#7fe8ff")
# a cidade lá longe atrás de tudo
Placa("luz", (-14, -6, -1.0), (0, 12, 0), (0, 0, 5.0), 14, 6, None,
      lambda c, n, i, j: dim(escolhe(["#ffcf8a", "#7fe8ff", "#ff3fb0"], i, j), 0.35) if hh(i, j, 4) > 0.75 and j < 4 else (0.01, 0.008, 0.02, 1), sujo=0)

# ════════════════════════ a luz assada (sem luz nova no jogo) ════════════════════════
FONTES = [
    ((0, 0.6, 1.9), c3("#c070ff", 1.3), 1.2),
    ((0, 0.0, 0.9), c3("#ff70d0", 0.4), 0.8),
    ((0.6, -0.8, 2.3), c3("#ffcf9a", 0.7), 2.4),
    ((-2.9, -0.6, 1.5), c3("#6a8ac0", 0.35), 1.0),
    ((1.85, -1.4, 0.9), c3("#ff7a3a", 0.25), 0.4),
    ((-7.6, 0, 2.7), c3("#2fe8ff", 0.5), 2.0),
]
terminar(["sala"], FONTES, SAIDA, "escondido", dist=0.6, piso=0.5)
