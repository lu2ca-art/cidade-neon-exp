# O TERRAÇO DO NOTTI por dentro (06/11): a cobertura do prédio mais alto do
# mirante, onde a faixa DopaminA mora. Antes eram caixas (app/linha/interior/
# salas/Topo.tsx); agora o terraço de quem acorda as máquinas: piso cerâmico
# molhado com poças, a mureta com a faixa DOPAMINA pintada à mão, a casa de
# máquinas com a porta da escada aberta (a luz quente) e a caixa d'água azul em
# cima, a antena de treliça com as antenas de TV e a parabólica, os fios de
# luzes de festa entre os postes, a máquina do fliperama em destaque (marquise
# DOPAMINA, tela de 8 bits acesa) e as outras duas (uma morta, um pinball fraco),
# o sofá velho virado pra cidade, as TVs de tubo nos engradados com os consoles
# velhos, o sequenciador da trilha de 8 bits num engradado, cadeira de plástico,
# vasos, cabos pelo chão e a fachada do prédio descendo com as janelas acesas.
#
#   blender -b --factory-startup --python blender/scripts/topo.py \
#     [--python blender/scripts/topo_foto.py] -- bruto.glb [foto.png]
#   npx @gltf-transform/cli optimize bruto.glb public/models/topo.glb \
#     --compress meshopt --simplify false --join false --flatten false --instance false --palette false
#
# Coordenadas: as do Topo.tsx, com X = x, Y = -z, Z = y (a mureta da frente,
# com a cidade atrás, fica em +Y; a câmera "chegada" em Y = -5). Um nó:
#   sala   o terraço inteiro: sala_solido / sala_luz / sala_neon / sala_vidro
# A antena acaba em 6 m (o Pisca do código, vermelho, fica em cima, 6,05 m).
# Orçamento: até 22 mil triângulos e 500 KB.

import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sala_kit import *  # noqa
import sala_kit as kit

args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
SAIDA = args[0] if args else "/tmp/topo-bruto.glb"

comecar("Topo")
ATUAL[0] = "sala"
kit.CORES_FESTA[:] = ["#ffe0a8", "#5dffa0", "#ffe0a8", "#ff3fb0", "#ffe0a8", "#7fe8ff", "#ffc857", "#ffe0a8", "#b38cff"]

VERDE, ROSA, CIANO, OURO, ROXO = "#5dffa0", "#ff3fb0", "#7fe8ff", "#ffc857", "#b38cff"
CONC, CONC2, CAP = "#4a4b52", "#3a3b42", "#6a6b70"


# ── o piso: cerâmica vermelha gasta, rejunte escuro, limo nos cantos ──
def f_piso(c, n, i, j):
    borda = min(c.x + 4.85, 4.85 - c.x, c.y + 7.35, 2.35 - c.y)
    if borda < 0.5 and hh(i, j, 3) > 0.45:
        return dim("#3e4a34", 0.8 + 0.3 * hh(i, j))
    base = escolhe(["#6a3a30", "#5e342c", "#733f33", "#58302a"], i, j, 1)
    if hh(i, j, 9) > 0.93:
        return "#3a3a40"  # remendo de cimento
    return dim(base, 0.95 + 0.3 * hh(i, j, 2))


Placa("solido", (-4.85, -7.35, 0), (9.7, 0, 0), (0, 9.7, 0), 20, 20, None, f_piso, sujo=0)
# as poças (o brilho rosa da cidade e o azul do céu)
for x, y, rx, ry, cor in ((-0.6, 0.4, 0.7, 0.4, "#2a1a3a"), (1.2, -1.4, 0.5, 0.3, "#1a2238"), (-3.0, -1.0, 0.45, 0.6, "#241a34"),
                          (0.8, 1.9, 0.6, 0.25, "#301a34"), (-2.2, -4.4, 0.8, 0.5, "#1a2234")):
    Disco("vidro", (x, y, 0.006), 1.0, 14, cor, S(rx, ry, 1))
# o ralo
B("solido", (0.2, -3.2, 0.004), (0.25, 0.25, 0.01), "#22242a", sujo=0)

# ── as muretas (1 m, com a pingadeira em cima) ──
def mureta(p, s):
    B("solido", p, s, CONC, d=0.3, cf=lambda c, n, i, j: dim(CONC, 0.8 + 0.3 * hh(i, j, 5)), sujo=0.3)
    B("solido", (p[0], p[1], 1.03), (s[0] + 0.08, s[1] + 0.08, 0.06), CAP, d=0.5, sujo=0)


mureta((0, 2.5, 0.5), (10.3, 0.3, 1.0))
mureta((-5.0, -2.5, 0.5), (0.3, 10.0, 1.0))
mureta((5.0, -2.5, 0.5), (0.3, 10.0, 1.0))
mureta((0, -7.5, 0.5), (10.3, 0.3, 1.0))

# ── a fachada descendo (a cidade lá embaixo vê o prédio): concreto e janelas ──
Placa("solido", (5.15, 2.65, -30), (-10.3, 0, 0), (0, 0, 30), 8, 12, None,
      lambda c, n, i, j: dim("#24242c", 0.7 + 0.3 * hh(i, j, 4)), sujo=0)
B("solido", (0, 2.72, -0.12), (10.5, 0.16, 0.16), CONC2, sujo=0)
JANELAS = ["#ffcf8a", "#ffcf8a", "#7fe8ff", "#ff3fb0", "#ffc857", "#b38cff"]
for k in range(9):
    z = -2.2 - k * 3.0
    for m in range(7):
        x = -4.2 + m * 1.4
        o = (x + 0.45, 2.66, z), (-0.9, 0, 0), (0, 0, 1.3)
        if hh(k, m, 7) > 0.55:
            Placa("luz", o[0], o[1], o[2], 1, 1, dim(escolhe(JANELAS, k, m), 0.45 + 0.3 * hh(k, m)), sujo=0)
        else:
            Placa("solido", o[0], o[1], o[2], 1, 1, "#0e1018", sujo=0)

# ── a casa de máquinas (a escada chega aqui) e a caixa d'água em cima ──
def f_reboco(c, n, i, j):
    if hh(i, j, 11) > 0.82:
        return dim("#5a5650", 0.8)
    return dim("#6e6a62", 0.75 + 0.25 * hh(i, j))


B("solido", (3.65, -3.3, 1.25), (2.1, 2.2, 2.5), None, d=0.3, cf=f_reboco, sujo=0.35)
B("solido", (3.65, -3.3, 2.55), (2.3, 2.4, 0.1), CONC2, sujo=0)
# a porta aberta: o vão aceso (a luz da escada) e a folha de chapa virada pra fora
Placa("luz", (2.9, -2.19, 0.02), (0.72, 0, 0), (0, 0, 1.92), 1, 2, "#8a6a40", sujo=0)
B("solido", (3.26, -2.17, 1.99), (0.86, 0.06, 0.08), "#2a3440", sujo=0)
for x in (2.84, 3.68):
    B("solido", (x, -2.17, 1.0), (0.06, 0.06, 2.0), "#2a3440", sujo=0)
a = math.radians(-60)
B("solido", (3.68 + 0.39 * math.cos(a), -2.2 + 0.39 * math.sin(a), 0.99), (0.78, 0.04, 1.94), None, r=(0, 0, a), d=0.4,
  cf=lambda c, n, i, j: dim("#3d5c7c" if hh(i, j) > 0.25 else "#7a4429", 0.7 + 0.2 * hh(j, 2)))
B("solido", (3.26, -1.95, 0.06), (1.0, 0.5, 0.12), CONC2, sujo=0)  # o degrau
# a lâmpada de gaiola em cima da porta (a luz do código, [2.5, 2.6, 2])
Viga("solido", (3.2, -2.2, 2.3), (3.2, -2.0, 2.3), 0.03, "#22242a", 0)
Esfera("luz", (3.2, -2.0, 2.24), 0.07, 8, 6, "#ffe0a8")
for k in range(4):
    a = TAU * k / 4
    Viga("solido", (3.2 + 0.08 * math.cos(a), -2.0 + 0.08 * math.sin(a), 2.32), (3.2 + 0.08 * math.cos(a), -2.0 + 0.08 * math.sin(a), 2.16), 0.012, "#22242a", 0)
# a escada de marinheiro no lado
for y in (-3.0, -3.45):
    Viga("solido", (2.56, y, 0.0), (2.56, y, 2.7), 0.04, "#5a5e68", 0)
for k in range(8):
    Viga("solido", (2.56, -3.0, 0.3 + k * 0.3), (2.56, -3.45, 0.3 + k * 0.3), 0.025, "#5a5e68", 0)
# a caixa d'água azul de fibra
Cil("solido", (3.75, -3.4, 2.6), 0.62, 0.78, 0.85, 16, "#2f5f9a", sujo=0.2)
Cil("solido", (3.75, -3.4, 3.45), 0.82, 0.3, 0.18, 16, "#2a5288", sujo=0)
Tubo("solido", [(4.3, -2.95, 2.8), (4.75, -2.6, 2.6), (4.78, -2.6, 0.05), (4.78, -1.6, 0.05)], 0.035, 6, "#c8c4b8", 0)
# um pôster velho do show do fliperama colado na casa de máquinas
Placa("solido", (3.8, -2.19, 0.7), (0.7, 0, 0), (0, 0, 1.1), 4, 6, None,
      lambda c, n, i, j: ["#ff3fb0", "#1a1028", "#5dffa0", "#1a1028", "#ffc857", "#1a1028"][(i + j * 2) % 6] if j > 1 else "#d8cfb0", sujo=0)
Texto("solido", "8 BITS", T(4.15, -2.18, 0.85), 0.1, "#1a1028")

# ── a antena de treliça: três pernas, as antenas de TV e a parabólica ──
AX, AY = -3.5, -3.0
B("solido", (AX, AY, 0.15), (0.8, 0.8, 0.3), CONC2, sujo=0.2)


def perna(k, z):
    r = 0.26 - 0.18 * (z / 5.9)
    a = TAU * k / 3 + 0.3
    return (AX + r * math.cos(a), AY + r * math.sin(a), 0.3 + z)


for k in range(3):
    Viga("solido", perna(k, 0), perna(k, 5.6), 0.035, "#6a6e78", 0)
    for s in range(10):
        z0, z1 = s * 0.56, (s + 1) * 0.56
        Viga("solido", perna(k, z0), perna((k + 1) % 3, z1), 0.018, "#5a5e68", 0)
Viga("solido", (AX, AY, 5.6), (AX, AY, 6.0), 0.05, "#6a6e78", 0)
B("solido", (AX, AY, 5.95), (0.08, 0.08, 0.06), "#3a1010", sujo=0)
for z, L in ((4.7, 1.3), (5.35, 1.0)):
    Viga("solido", (AX - L / 2, AY, z), (AX + L / 2, AY, z), 0.025, "#8a8e98", 0)
    for e in range(6):
        x = AX - L / 2 + 0.1 + e * (L - 0.2) / 5
        w = 0.5 - e * 0.05
        Viga("solido", (x, AY - w / 2, z), (x, AY + w / 2, z), 0.012, "#8a8e98", 0)
# a parabólica, virada pro céu do lado da cidade
bm = bm_torno([(0.0, 0.0), (0.2, 0.02), (0.4, 0.08), (0.55, 0.16)], 14)
add(bm, "solido", "#b8b4a8", T(AX + 0.45, AY + 0.2, 2.4) @ R(rx=-1.0, rz=0.4), None, 0)
Viga("solido", (AX + 0.1, AY + 0.05, 2.2), (AX + 0.45, AY + 0.2, 2.4), 0.04, "#6a6e78", 0)
# os estais
for q in ((-4.8, -6.6, 1.06), (-1.6, -5.2, 0.02), (-4.8, -1.0, 1.06)):
    Tubo("solido", [(AX, AY, 5.4), q], 0.006, 3, "#2a2a30", 0)

# ── os postes das luzes de festa e os fios ──
for x in (-4.9, 4.9):
    Viga("solido", (x, 2.42, 1.06), (x, 2.42, 3.0), 0.05, "#5a5e68", 0)
Varal((-4.9, 2.42, 2.95), (4.9, 2.42, 2.95), 18, 0.35, 0)
Varal((AX, AY, 3.3), (4.9, 2.42, 2.92), 20, 0.55, 3)
Varal((2.6, -2.2, 2.6), (-4.9, 2.42, 2.9), 16, 0.45, 5)
Varal((4.7, -2.2, 2.6), (4.9, 2.42, 2.9), 8, 0.25, 1)

# ── a faixa DOPAMINA pintada à mão, amarrada na mureta (do lado da Notti) ──
Pano("solido", (0.8, 2.31, 0.95), (2.8, 0, 0), (0, 0, 0.82), 12, 4, 0.03, "#d8d0bc",
     cf=lambda c, n, i, j: dim("#d8d0bc", 0.75 + 0.25 * hh(i, j)), normal=(0, -1, 0))
Texto("luz", "DOPAMINA", T(2.2, 2.25, 1.45), 0.4, "#2fc878")
Texto("luz", "a trilha de 8 bits", T(2.2, 2.25, 1.11), 0.12, "#d0308a")
for x in (0.75, 3.65):
    Viga("solido", (x, 2.36, 1.06), (x, 2.36, 1.9), 0.035, "#8a7a50", 0)


# ── as máquinas do fliperama ──
def tela8(semente, viva):
    def f(c, n, i, j):
        if not viva:
            return dim("#1a2030", 0.5 + 0.4 * hh(i, j, semente))
        if j == 13:
            return "#e8e8f0" if (i % 3 != 2 and 2 < i < 13 and hh(i, semente) > 0.3) else "#0a0820"
        if j < 2:
            return "#2fa860" if (i + j) % 2 else "#1f7a44"
        if 3 <= i <= 4 and 2 <= j <= 4:
            return "#ff3fb0" if j != 4 or i == 3 else "#ffe0c0"
        if i == 11 and 2 <= j <= 3 or i == 12 and j == 3:
            return "#7fe8ff"
        if j == 7 and i % 3 == 1:
            return "#ffc857"
        if 6 <= i <= 9 and j == 5:
            return "#b38cff"
        return "#120c2a" if hh(i, j, semente) > 0.06 else "#5a5aa0"
    return f


def Fliperama(p, rz, estado="aceso", lado="#2a1446", fita=ROSA, marquise="DOPAMINA"):
    with em(T(*p) @ R(rz=rz)):
        perfil = [(0.42, 0), (-0.36, 0), (-0.36, 0.82), (-0.58, 0.9), (-0.58, 0.98), (-0.28, 1.06),
                  (-0.18, 1.62), (-0.42, 1.66), (-0.42, 1.92), (0.42, 1.92)]
        for x in (-0.33, 0.33):
            Prisma("solido", perfil, 0.04, lado, T(x, 0, 0), sujo=0.25)
            if estado != "morto":
                Tubo("neon", [(x * 1.07, y, z) for y, z in perfil[1:9]], 0.008, 4, fita, 0)
        B("solido", (0, 0.4, 0.96), (0.62, 0.04, 1.92), "#141218")
        B("solido", (0, -0.35, 0.41), (0.62, 0.02, 0.82), "#141218")
        B("solido", (0, 0.03, 1.9), (0.62, 0.78, 0.04), "#141218", sujo=0)
        B("solido", (0, -0.37, 0.5), (0.3, 0.02, 0.36), "#3a3a42", sujo=0)
        for x in (-0.07, 0.07):
            B("luz" if estado != "morto" else "solido", (x, -0.385, 0.6), (0.03, 0.01, 0.06), "#ff6a35" if estado != "morto" else "#2a1a10")
        # o painel de controle inclinado, o manche e os botões
        B("solido", (0, -0.43, 1.0), (0.62, 0.32, 0.04), "#1a1a22", r=(0.26, 0, 0), sujo=0)
        B("solido", (0, -0.57, 0.94), (0.62, 0.02, 0.09), "#2a1446", sujo=0)
        Cil("solido", (-0.13, -0.45, 1.02), 0.012, 0.012, 0.09, 6, "#c0c0c8", sujo=0)
        Esfera("solido", (-0.13, -0.45, 1.12), 0.032, 8, 6, "#d02a3a")
        cores = [VERDE, ROSA, OURO, CIANO, ROXO, VERDE]
        for k in range(6):
            y = -0.49 + 0.07 * (k // 3)
            z = 0.98 + (y + 0.58) * 0.267 + 0.025
            Cil("luz" if estado == "aceso" else "solido", (0.03 + 0.075 * (k % 3), y, z), 0.022, 0.022, 0.014, 8,
                cores[k] if estado == "aceso" else "#3a3a44", sujo=0)
        # a tela de 8 bits (inclinada) com o bisel
        Placa("solido", (-0.31, -0.28, 1.06), (0.62, 0, 0), (0, 0.1, 0.56), 1, 1, "#0a0a0e", sujo=0)
        Placa("luz" if estado != "morto" else "solido", (-0.26, -0.282, 1.1), (0.52, 0, 0), (0, 0.08, 0.48), 16, 14,
              None, tela8(int(p[0] * 7), estado == "aceso"), sujo=0)
        # a marquise
        Placa("luz" if estado != "morto" else "solido", (-0.3, -0.425, 1.68), (0.6, 0, 0), (0, 0, 0.22), 1, 1,
              "#2a0a50" if estado == "aceso" else ("#141030" if estado == "fraco" else "#141218"), sujo=0)
        if marquise:
            Texto("neon", marquise, T(0, -0.432, 1.79), 0.072, VERDE)
    if estado == "aceso":
        pass


# a de destaque, virada pra quem chega (e pro sofá)
FX, FY, FR = -1.5, 1.2, 0.3
Fliperama((FX, FY, 0), FR, "aceso")
# as velhas encostadas na mureta da esquerda: uma morta, um pinball fraco
Fliperama((-4.45, 0.3, 0), math.pi / 2, "morto", lado="#1a2a3a", marquise=None)
B("solido", (-4.1, 0.05, 1.3), (0.02, 0.35, 0.02), "#a8a8a8", r=(0.7, 0, 0), sujo=0)  # a rachadura (uma fita)
with em(T(-4.15, -1.3, 0) @ R(rz=math.pi / 2)):
    for x in (-0.26, 0.26):
        for y in (-0.6, 0.6):
            Viga("solido", (x, y, 0), (x, y, 0.78 + (0.04 if y > 0 else 0)), 0.05, "#2a2a30", 0)
    B("solido", (0, 0, 0.9), (0.62, 1.32, 0.24), "#3a1a2a", r=(0.06, 0, 0))
    Placa("luz", (-0.27, -0.6, 1.0), (0.54, 0, 0), (0, 1.2, 0.07), 6, 10, None,
          lambda c, n, i, j: escolhe(["#1a1030", "#1a1030", "#3a2060", "#602050", "#204060", "#5a4a10"], i, j, 4), sujo=0)
    B("solido", (0, 0.6, 1.35), (0.62, 0.16, 0.66), "#2a1222")
    Placa("luz", (-0.27, 0.515, 1.08), (0.54, 0, 0), (0, 0, 0.54), 3, 3, None,
          lambda c, n, i, j: "#4a1a50" if (i + j) % 2 else "#2a3a6a", sujo=0)
    Cil("solido", (0, -0.68, 0.86), 0.015, 0.015, 0.05, 6, "#c0c0c8", r=(math.pi / 2, 0, 0), sujo=0)

# ── o sequenciador da trilha de 8 bits num engradado, ligado na máquina ──
def Engradado(p, rz=0.0, cor="#2a5a9a", h=0.3):
    with em(T(*p) @ R(rz=rz)):
        B("solido", (0, 0, h / 2), (0.52, 0.36, h), None, d=(0.06, 0.06, 0.1),
          cf=lambda c, n, i, j: dim(cor, 0.5 if (i % 2 and j % 2) else 1.0), sujo=0.2)


Engradado((-0.75, 1.75, 0), 0.1, "#2a5a9a")
with em(T(-0.75, 1.75, 0.3) @ R(rz=0.1 + math.pi)):
    B("solido", (0, 0, 0.03), (0.44, 0.24, 0.06), "#d8d4c8", sujo=0)
    for v in range(4):
        for s in range(8):
            liga = (v == 2 and s % 2 == 0) or hh(v, s, 3) > 0.62
            Placa("luz" if liga else "solido", (-0.19 + s * 0.048, -0.09 + v * 0.045, 0.061), (0.032, 0, 0), (0, 0.03, 0), 1, 1,
                  [VERDE, ROSA, OURO, CIANO][v] if liga else "#5a5860", sujo=0)
Tubo("solido", [(-0.75, 1.6, 0.31), (-0.85, 1.5, 0.012), (-1.2, 1.25, 0.012), (-1.35, 1.32, 0.3)], 0.01, 3, "#1a1a1e", 0)
# a caixinha de som do lado
B("solido", (-0.25, 1.85, 0.16), (0.34, 0.18, 0.32), "#1a1a20")
for z in (0.1, 0.23):
    Disco("solido", (0, 0, 0), 0.055, 10, "#3a3a44", T(-0.25, 1.759, z) @ R(rx=math.pi / 2))
Esfera("luz", (-0.14, 1.758, 0.29), 0.008, 4, 3, VERDE)

# ── o sofá velho virado pra cidade ──
with em(T(3.1, 1.0, 0) @ R(rz=math.pi)):
    VEL = "#5a2034"
    B("solido", (0, 0, 0.2), (2.0, 0.85, 0.32), VEL, d=0.25)
    B("solido", (0, 0.34, 0.62), (2.0, 0.18, 0.62), VEL, r=(-0.12, 0, 0), d=0.25)
    for x in (-0.92, 0.92):
        B("solido", (x, 0, 0.42), (0.18, 0.85, 0.42), "#4a1a2a", d=0.25)
    for k, x in enumerate((-0.55, 0.0, 0.55)):
        B("solido", (x, -0.05, 0.42), (0.54, 0.7, 0.14), "#3d5a3a" if k == 2 else VEL, r=(0, 0.03 * (k - 1), 0.02 * k), d=0.2)
        B("solido", (x, 0.2, 0.72), (0.52, 0.16, 0.42), VEL, r=(-0.25, 0, 0), d=0.2)
    for x in (-0.85, 0.85):
        for y in (-0.35, 0.35):
            Cil("solido", (x, y, 0), 0.03, 0.025, 0.05, 6, "#2a1a14", sujo=0)
    Pano("solido", (0.6, -0.42, 0.5), (0.5, 0, 0), (0, 0.8, 0.35), 6, 6, 0.04, "#d8a040",
         cf=lambda c, n, i, j: "#d8a040" if (i + j) % 3 else "#8a3a2a")
# o cobertor jogado e a caixa de isopor com as latas
B("solido", (4.5, -0.2, 0.18), (0.5, 0.35, 0.36), "#d8d8d0", sujo=0.3)
for k in range(4):
    Cil("solido", (2.2 + 0.18 * k, 0.15 + 0.07 * (k % 2), 0), 0.033, 0.033, 0.12, 8, escolhe([VERDE, ROSA, "#c0c0c8"], k), sujo=0)

# ── as TVs de tubo nos engradados e os consoles velhos ──
def TV(p, rz, tam, tela):
    with em(T(*p) @ R(rz=rz)):
        w, h = tam, tam * 0.85
        B("solido", (0, 0, h / 2), (w, w * 0.9, h), "#3a3836", d=0.2)
        B("solido", (0, w * 0.55, h * 0.48), (w * 0.7, w * 0.4, h * 0.7), "#2a2826", sujo=0)
        Placa("luz", (-w * 0.38, -w * 0.452, h * 0.15), (w * 0.62, 0, 0), (0, 0, h * 0.7), 6, 5, None, tela, sujo=0)
        for k in range(2):
            Cil("solido", (w * 0.4, -w * 0.46, h * (0.3 + 0.2 * k)), 0.018, 0.018, 0.02, 6, "#8a8a90", r=(math.pi / 2, 0, 0), sujo=0)


def chuvisco(c, n, i, j):
    return dim("#9fb0d8", 0.25 + 0.5 * hh(i, j, 31))


def jogo_azul(c, n, i, j):
    if j == 0:
        return "#2fa860"
    return "#ffc857" if (i == 2 and j == 2) else ("#7fe8ff" if j == 4 and i % 2 else "#1a2a7a")


Engradado((4.35, 1.9, 0), -0.9, "#b8402a")
Engradado((4.35, 1.9, 0.3), -0.8, "#2a8a5a")
TV((4.35, 1.85, 0.6), -0.93, 0.5, chuvisco)
TV((3.7, 2.05, 0), -0.7, 0.42, jogo_azul)
Engradado((2.6, 1.95, 0), 0.05, "#d0a030")
with em(T(2.6, 1.95, 0.3) @ R(rz=0.1)):
    B("solido", (-0.08, 0, 0.035), (0.3, 0.22, 0.07), "#8a8a90", sujo=0)
    B("solido", (-0.08, 0.02, 0.1), (0.13, 0.03, 0.08), "#3a5aa0", sujo=0)  # o cartucho espetado
    B("solido", (0.15, -0.02, 0.025), (0.16, 0.18, 0.05), "#1a1a1e", sujo=0)
    Esfera("luz", (-0.18, -0.11, 0.05), 0.008, 4, 3, "#ff2a2a")
    for k in range(3):
        B("solido", (0.22, 0.08 - k * 0.0, 0.07 + k * 0.022), (0.1, 0.12, 0.02), escolhe(["#c84a3a", "#3a7ac8", "#d8c040"], k), r=(0, 0, 0.3 * k), sujo=0)
# os dois controles com os fios até o sofá
for k, (x, y) in enumerate(((2.7, 0.5), (3.3, 0.6))):
    B("solido", (x, y, 0.5), (0.14, 0.06, 0.025), "#2a2a30", r=(0, 0, 0.4 * k), sujo=0)
    Tubo("solido", [(2.55, 1.85, 0.32), (2.5 + 0.3 * k, 1.5, 0.012), (x, 0.9, 0.012), (x, y + 0.05, 0.48)], 0.006, 3, "#1a1a1e", 0)

# ── a cadeira de plástico, vasos, cabos ──
def Cadeira(p, rz, cor, tomb=False):
    M = T(*p) @ R(rz=rz) @ (R(rx=-1.45) @ T(0, 0, 0.0) if tomb else Matrix.Identity(4))
    with em(M):
        B("solido", (0, 0, 0.44), (0.44, 0.42, 0.04), cor, sujo=0.1)
        B("solido", (0, 0.22, 0.68), (0.42, 0.04, 0.42), cor, r=(-0.15, 0, 0), sujo=0.1)
        for x in (-0.19, 0.19):
            for y in (-0.18, 0.18):
                Viga("solido", (x * 1.15, y * 1.15, 0), (x, y, 0.44), 0.035, cor, 0.1)


Cadeira((-2.7, -0.7, 0), math.pi * 0.75, "#d8d4c4")
Cadeira((-1.2, -6.4, 0.22), 0.8, "#b8402a", tomb=True)
for x, y, s in ((-4.5, 2.0, 1.0), (4.5, -1.2, 0.8), (-1.0, -6.9, 1.2), (4.5, -6.9, 0.9)):
    Cil("solido", (x, y, 0), 0.18 * s, 0.22 * s, 0.32 * s, 10, "#5a5a62", sujo=0.2)
    for k in range(3):
        Esfera("solido", (x + 0.08 * math.cos(k * 2.1) * s, y + 0.08 * math.sin(k * 2.1) * s, (0.42 + 0.08 * k) * s), 0.16 * s, 7, 5,
               escolhe(["#2f6a3a", "#3a7a42", "#2a5a30"], k, x))
# os cabos pelo chão: da antena pra máquina e pras TVs, da porta pro sofá
Tubo("solido", [(AX + 0.3, AY + 0.4, 0.02), (-3.0, -1.6, 0.012), (-2.2, 0.2, 0.012), (FX - 0.2, FY + 0.45, 0.012), (FX - 0.1, FY + 0.45, 0.25)], 0.012, 3, "#141416", 0)
Tubo("solido", [(3.1, -2.1, 0.012), (2.2, -0.6, 0.012), (1.9, 0.6, 0.012), (3.9, 1.9, 0.012), (4.2, 1.95, 0.35)], 0.014, 3, "#141416", 0)
Tubo("solido", [(2.2, -1.2, 0.012), (0.2, 0.0, 0.012), (-1.0, 0.9, 0.012), (FX + 0.1, FY + 0.45, 0.2)], 0.012, 3, "#2a2a20", 0)
B("solido", (2.2, -1.2, 0.03), (0.14, 0.08, 0.05), "#d8d4c8", sujo=0)  # o benjamim

# ════════════════════════ a luz assada (sem luz nova no jogo) ════════════════════════
def fx(lx, ly, lz):
    return (FX + lx * math.cos(FR) - ly * math.sin(FR), FY + lx * math.sin(FR) + ly * math.cos(FR), lz)


FONTES = [
    ((3.2, -2.0, 2.24), c3("#ffcf8a", 1.0), 1.6),
    ((3.25, -2.1, 1.0), c3("#ffcf8a", 0.6), 1.1),
    (fx(0, -0.6, 1.3), c3("#7f9cff", 0.7), 0.9),
    (fx(0, -0.6, 1.85), c3("#5dffa0", 0.6), 0.7),
    ((4.0, 1.6, 0.9), c3("#9fb0d8", 0.5), 0.8),
    ((3.5, 1.8, 0.25), c3("#3a5aff", 0.4), 0.6),
    ((-0.75, 1.6, 0.4), c3("#5dffa0", 0.35), 0.4),
    ((2.55, 2.0, 0.5), c3("#5dffa0", 0.35), 0.9),
    ((0, 8.0, -3.0), c3("#ff3fb0", 0.6), 5.0),
    ((-3.6, 0.0, 1.0), c3("#b38cff", 0.3), 0.8),
]
for t in (0.2, 0.4, 0.6, 0.8):
    FONTES.append(((-4.9 + 9.8 * t, 2.4, 2.6), c3("#ffe0a8", 0.25), 1.4))
    FONTES.append(((AX + (4.9 - AX) * t, AY + (2.42 - AY) * t, 2.8), c3("#ffe0a8", 0.2), 1.4))
terminar(["sala"], FONTES, SAIDA, "topo", dist=0.8, piso=0.8)
