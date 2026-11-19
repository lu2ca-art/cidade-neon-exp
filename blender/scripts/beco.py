# O BECO DOS TRÊS LETREIROS por dentro (06/11). Antes eram caixas
# (app/linha/interior/salas/Beco.tsx: dois paredões, o fundo, o papelão);
# agora o beco de cidade suja e molhada: o asfalto remendado com a canaleta e
# o bueiro, as poças com o neon dos três letreiros e a lâmpada amarela
# refletindo, os paredões de reboco descascado com o tijolo aparecendo, a
# umidade e os escorridos, os canos, os aparelhos de ar pingando, a escada de
# incêndio, os fios de gato atravessando, os lambe-lambes, a caçamba, os sacos
# de lixo, o carrinho de mercado, os pneus, os engradados, a porta de ferro no
# fundo, a lâmpada no braço com a cúpula, o papelão e o cobertor da moradora.
# Os letreiros (texto + luz), o giz, a chuva, a moradora e a câmera ficam no
# código; aqui só as molduras e os tubos de neon na borda deles.
#
#   blender -b --factory-startup --python blender/scripts/beco.py \
#     [--python blender/scripts/beco_foto.py] -- bruto.glb [foto.png]
#   npx @gltf-transform/cli optimize bruto.glb public/models/beco.glb \
#     --compress meshopt --simplify false --join false --flatten false --instance false --palette false
#
# Coordenadas: as do Beco.tsx com X = x, Y = -z, Z = y (o fundo, a moradora,
# fica em +Y; a boca com os letreiros em -Y). Paredões em X = ±1,85 (face de
# dentro), fundo em Y = 4,45. Um nó: sala_solido / _luz / _neon / _vidro.
# Orçamento: até 12 mil triângulos e 250 KB.

import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sala_kit import *  # noqa

args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
SAIDA = args[0] if args else "/tmp/beco-bruto.glb"

comecar("Beco")
ATUAL[0] = "sala"
ROSA, OURO, CIANO, LAMP = "#ff3fb0", "#ffc857", "#2fe8ff", "#ffd9a0"
GRITOS = [(ROSA, -0.35, 3.1), (OURO, 0.0, 3.95), (CIANO, 0.35, 4.8)]
W, Y0, Y1, H = 1.85, -8.2, 4.45, 8.0   # meia largura, boca, fundo, altura


# ── o chão: asfalto molhado remendado, a canaleta no meio ──
def f_asf(c, n, i, j):
    if abs(c.x) < 0.2:
        return dim("#101014", 0.8)                        # a canaleta
    if hh(i // 2, j // 3, 4) > 0.8:
        return dim("#1c1c22", 0.9 + 0.2 * hh(i, j))       # o remendo
    return dim("#141418", 0.75 + 0.35 * hh(i, j, 1))


Placa("solido", (-W, Y0, 0), (2 * W, 0, 0), (0, Y1 - Y0, 0), 9, 26, None, f_asf, sujo=0)
# o bueiro na canaleta
B("solido", (0, -1.2, 0.006), (0.36, 0.6, 0.012), None, d=(0.36, 0.06, 1),
  cf=lambda c, n, i, j: "#0a0a0c" if j % 2 else "#2a2a2e", sujo=0)
# o meio-fio dos dois lados
for s in (-1, 1):
    B("solido", (s * (W - 0.09), (Y0 + Y1) / 2, 0.05), (0.18, Y1 - Y0, 0.1), "#3a3a40", sujo=0.1)


# as poças: a forma (filtro em elipse torta) e o reflexo (cf)
def Poca(cx, cy, rx, ry, nu, nv, cor_de, seed=0):
    def fil(i, j):
        u, v = (i + 0.5) / nu * 2 - 1, (j + 0.5) / nv * 2 - 1
        return u * u + v * v < 0.85 + 0.25 * math.sin(i * 1.7 + j * 0.9 + seed)
    Placa("vidro", (cx - rx, cy - ry, 0.012), (2 * rx, 0, 0), (0, 2 * ry, 0), nu, nv, None,
          lambda c, n, i, j: cor_de(c, i, j), fil, sujo=0)


def mistura(fundo, faixas, c):
    """o reflexo esticado: cada faixa (x, largura, cor, força) some suave pros lados."""
    r, g, b, _ = lin(fundo)
    for x, w, cor, k in faixas:
        q = max(0.0, 1 - abs(c.x - x) / w) ** 1.5 * k
        cc = lin(cor)
        r, g, b = r + cc[0] * q, g + cc[1] * q, b + cc[2] * q
    return (min(r, 1), min(g, 1), min(b, 1), 1)


BOCA = [(-0.9, 0.9, ROSA, 0.35), (0.1, 0.7, OURO, 0.3), (0.9, 0.8, CIANO, 0.3)]


def refl_boca(c, i, j):
    return mistura("#0c0d16", BOCA, c)


def refl_lamp(c, i, j):
    return mistura("#0e0d0c", [(0.0, 0.3, LAMP, 0.12)], c)


Poca(0.0, -6.9, 1.6, 1.0, 22, 10, refl_boca, 1)
Poca(-1.0, -5.3, 0.6, 0.5, 8, 5, refl_boca, 2)
Poca(0.9, -4.9, 0.5, 0.4, 7, 4, refl_boca, 6)
Poca(0.05, -3.3, 0.8, 1.2, 14, 12, refl_lamp, 3)
Poca(1.1, 0.6, 0.5, 0.4, 6, 4, lambda c, i, j: mistura("#0c0d14", [(1.1, 0.4, LAMP, 0.08)], c), 4)
Poca(-0.7, 1.6, 0.45, 0.6, 6, 5, lambda c, i, j: mistura("#0c0d14", [(-0.6, 0.3, LAMP, 0.18)], c), 5)


# ── os paredões: reboco cinza, o tijolo aparecendo, a umidade, os escorridos ──
def f_par(s):
    def f(c, n, i, j):
        z, y = c.z, c.y
        if s < 0 and 0.9 < z < 2.4 and -2.1 < y < -0.9:
            return dim("#24252c", 0.95)                       # o pedaço liso do giz
        k = 0.8 + 0.3 * hh(i, j, s)
        if hh(i, 11, s) > 0.72:
            k *= 0.7                                          # o escorrido da chuva
        if z < 0.9:
            return dim("#1e2224", k * 0.85)                   # a umidade embaixo (o limo)
        return dim("#2c2d34" if s < 0 else "#282930", k)
    return f


Placa("solido", (-W, Y0, 0), (0, Y1 - Y0, 0), (0, 0, H), 24, 14, None, f_par(-1), sujo=0.3)
Placa("solido", (W, Y1, 0), (0, Y0 - Y1, 0), (0, 0, H), 24, 14, None, f_par(1), sujo=0.3)
# o fundo
Placa("solido", (-W, Y1, 0), (2 * W, 0, 0), (0, 0, H), 8, 14, None,
      lambda c, n, i, j: dim("#1e1f24", 0.8 + 0.3 * hh(i, j)), sujo=0.3)


# o tijolo aparecendo onde o reboco caiu (fileiras desencontradas)
def Tijolo(o, U, V, nu, nv, seed):
    o, U, V = Vector(o), Vector(U), Vector(V)
    Nn = U.cross(V).normalized() * 0.006

    def fil(i, j):
        u, v = (i + 0.5) / nu * 2 - 1, (j + 0.5) / nv * 2 - 1
        return u * u + v * v < 0.7 + 0.35 * hh(i, j, seed)

    def cf(c, n, i, j):
        if (i + (j % 2)) % 3 == 2:
            return dim("#2a2622", 0.8)                       # o rejunte
        return dim(escolhe(["#4a2c22", "#56332a", "#3e261e"], i, j, seed), 0.7 + 0.3 * hh(i, j, seed))
    Placa("solido", o + Nn, U, V, nu, nv, None, cf, fil, sujo=0.2)


for k, (y, z, w, h) in enumerate(((-6.4, 3.4, 0.9, 0.6), (-0.2, 3.0, 0.7, 0.5), (2.8, 0.7, 0.8, 0.5), (-4.0, 5.2, 1.0, 0.7))):
    Tijolo((-W, y - w / 2, z - h / 2), (0, w, 0), (0, 0, h), 9, 7, k)
for k, (y, z, w, h) in enumerate(((-6.0, 1.0, 0.8, 0.6), (1.2, 2.2, 0.9, 0.6), (-2.0, 5.4, 0.8, 0.5), (3.8, 3.4, 0.6, 0.5))):
    Tijolo((W, y + w / 2, z - h / 2), (0, -w, 0), (0, 0, h), 9, 7, k + 5)
Tijolo((-1.4, Y1, 1.4), (1.1, 0, 0), (0, 0, 0.8), 12, 10, 11)
Tijolo((-0.4, Y1, 4.3), (1.4, 0, 0), (0, 0, 0.9), 14, 10, 12)
# as pontas dos paredões na boca e as fachadas da rua dos lados
for s in (-1, 1):
    B("solido", (s * 2.0, Y0, H / 2), (0.3, 0.04, H), "#26272e", sujo=0.2)
    x0, x1 = (2.15, 6.5) if s > 0 else (-6.5, -2.15)

    def f_fach(c, n, i, j, s=s):
        if c.z < 2.6 and abs(abs(c.x) - 4.0) < 1.3:
            return dim("#3a3c44", 0.7 + 0.2 * (j % 2))        # a porta de aço da loja fechada
        if 3.4 < c.z < 4.4 and hh(i, s) > 0.5:
            return dim("#ffcf8a", 0.12)                       # uma janela com luz
        return dim("#2a2a32", 0.75 + 0.3 * hh(i, j, s))
    Placa("solido", (x0, Y0, 0), (x1 - x0, 0, 0), (0, 0, H), 8, 12, None, f_fach, sujo=0.2)
    B("solido", (s * 4.0, Y0 - 0.2, 2.75), (2.8, 0.4, 0.08), "#1a1a20", sujo=0)   # a marquise

# ── a boca: as molduras dos letreiros, os suportes, os tubos de neon na borda ──
for cor, x, z in GRITOS:
    B("solido", (x, -4.53, z), (3.08, 0.05, 0.66), "#141418", sujo=0)
    for dx in (-1.2, 1.2):
        Viga("solido", (x + dx, -4.52, z + 0.33), (x + dx, -4.3, z + 0.7), 0.03, "#2a2a30", 0)
    for dz in (-0.315, 0.315):
        Tubo("neon", [(x - 1.5, -4.62, z + dz), (x + 1.5, -4.62, z + dz)], 0.012, 4, cor, 0)
    for dx in (-1.5, 1.5):
        Tubo("neon", [(x + dx, -4.62, z - 0.315), (x + dx, -4.62, z + 0.315)], 0.012, 4, cor, 0)
    # o cabo de cada letreiro descendo pela parede
    xs = W - 0.03 if x >= 0 else -W + 0.03
    Tubo("solido", [(x + (1.5 if x >= 0 else -1.5), -4.5, z), (xs, -4.4, z - 0.1), (xs, -4.4, 0.3)], 0.01, 3, "#121214", 0)

# ── os canos, os aparelhos de ar, a escada de incêndio ──
for x, y in ((-W + 0.08, 3.4), (W - 0.08, -3.6), (W - 0.08, 2.2)):
    Cil("solido", (x, y, 0), 0.055, 0.055, H, 8, "#3a3c40", sujo=0.2)
    for z in (1.2, 3.6, 6.0):
        Cil("solido", (x, y, z), 0.07, 0.07, 0.06, 8, "#2a2c30", sujo=0)
Tubo("solido", [(-W + 0.06, -6.5, 5.6), (-W + 0.06, 3.4, 5.6)], 0.04, 6, "#2e3034", 0.1)
Tubo("solido", [(W - 0.06, -6.5, 6.4), (W - 0.06, 4.2, 6.4)], 0.035, 6, "#33302c", 0.1)


def ArCond(x, y, z, s):
    with em(T(x, y, z) @ R(rz=0 if s > 0 else math.pi)):
        B("solido", (-0.28, 0, 0), (0.56, 0.8, 0.5), None, d=(0.56, 0.8, 0.07),
          cf=lambda c, n, i, j: "#6a6c70" if n.x < -0.5 and j % 2 else "#8a8c90", sujo=0.1)
        for dy in (-0.3, 0.3):
            Viga("solido", (0, dy, -0.3), (-0.45, dy, -0.3), 0.03, "#3a3a3e", 0)
        Tubo("solido", [(-0.5, 0.35, -0.2), (-0.52, 0.35, -1.0), (-0.05, 0.35, -2.2)], 0.01, 3, "#1a1a1c", 0)


ArCond(W, -1.2, 3.5, 1)
ArCond(W, 3.0, 4.6, 1)
ArCond(-W, 1.4, 4.4, -1)
ArCond(-W, -5.2, 3.2, -1)
# a escada de incêndio no paredão da direita (a plataforma e a escada)
EX, EY0, EY1 = W - 0.45, -3.2, -0.2
for z in (4.0, 6.6):
    B("solido", (EX, (EY0 + EY1) / 2, z), (0.9, EY1 - EY0, 0.04), None, d=(0.12, 0.12, 1),
      cf=lambda c, n, i, j: "#2a2420" if (i + j) % 2 else "#3a2e26", sujo=0)
    Viga("solido", (EX - 0.45, EY0, z + 0.9), (EX - 0.45, EY1, z + 0.9), 0.03, "#3a2e26", 0)
    for y in (EY0, (EY0 + EY1) / 2, EY1):
        Viga("solido", (EX - 0.45, y, z), (EX - 0.45, y, z + 0.9), 0.03, "#3a2e26", 0)
for k in range(2):
    a, b = (EX - 0.3, EY1, 4.0 + k * 2.6), (EX - 0.3, EY0 + 0.6, 6.6 + k * 2.6)
    for dx in (-0.12, 0.12):
        Viga("solido", (a[0] + dx, a[1], a[2]), (b[0] + dx, b[1], b[2]), 0.035, "#3a2e26", 0)
for k in range(8):
    t = k / 7
    y = EY0 + 0.15 + t * 0.8
    Viga("solido", (EX - 0.9, y, 4.0 - 0.3 - t * 3.2), (EX - 0.5, y, 4.0 - 0.3 - t * 3.2), 0.025, "#3a2e26", 0)
for dx in (-0.9, -0.5):
    Viga("solido", (EX + dx, EY0 + 0.15, 3.7), (EX + dx, EY0 + 0.95, 0.5), 0.03, "#3a2e26", 0)

# ── os fios de gato atravessando (caídos no meio) ──
for k, (ya, yb, za, zb, sag) in enumerate(((-6.0, -5.2, 6.2, 5.6, 0.5), (-2.8, -3.6, 5.3, 6.0, 0.4), (-0.5, 0.8, 6.8, 6.2, 0.6),
                                           (1.8, 2.6, 5.0, 5.8, 0.35), (-4.0, -1.0, 7.2, 7.0, 0.7), (3.3, 3.0, 6.0, 4.9, 0.3))):
    a, b = Vector((-W + 0.02, ya, za)), Vector((W - 0.02, yb, zb))
    pts = [a.lerp(b, q / 8) + Vector((0, 0, -sag * 4 * (q / 8) * (1 - q / 8))) for q in range(9)]
    Tubo("solido", pts, 0.009, 3, "#0c0c0e", 0)
# um tênis pendurado num fio (o par jogado)
for dx in (-0.05, 0.08):
    B("solido", (0.1 + dx, 0.15, 6.05 - abs(dx) * 3), (0.08, 0.24, 0.1), "#c8c4bc", r=(0.3, 0, 0), sujo=0)

# ── os lambe-lambes e os pixos ──
for k, (y, z, w, h) in enumerate(((-6.2, 1.6, 0.6, 0.8), (-5.5, 1.4, 0.5, 0.7), (-5.9, 2.4, 0.55, 0.5), (-3.4, 1.5, 0.6, 0.8), (-2.8, 1.7, 0.4, 0.6))):
    cor = escolhe(["#8a6a3a", "#5a4a6a", "#7a3a3a", "#6a7a6a", "#a8a090"], k)
    Placa("solido", (-W + 0.008, y - w / 2, z - h / 2), (0, w, 0), (0, 0, h), 2, 3, None,
          lambda c, n, i, j, cor=cor, k=k: dim(cor, 0.35) if hh(i, j, k) > 0.3 else dim("#c8c0b0", 0.22), sujo=0.1)
for k, (y, z) in enumerate(((-6.6, 2.0), (-1.0, 2.4), (3.3, 1.2))):
    Placa("solido", (W - 0.008, y + 0.25, z - 0.35), (0, -0.5, 0), (0, 0, 0.7), 2, 3, None,
          lambda c, n, i, j, k=k: dim(escolhe(["#a83a3a", "#3a6a8a", "#c8c0a0"], k), 0.32) if hh(i, j, k, 4) > 0.25 else dim("#b8b0a0", 0.2), sujo=0.1)
Texto("solido", "222", T(W - 0.01, 0.6, 1.0) @ R(rz=-math.pi / 2), 0.5, "#6a2a4a")
Texto("solido", "NINGUEM VE", T(W - 0.01, -5.4, 3.0) @ R(rz=-math.pi / 2), 0.28, "#3a4a5a")
Texto("solido", "?", T(-W + 0.01, 2.6, 2.9) @ R(rz=math.pi / 2), 0.6, "#4a3a2a")

# ── a caçamba, os sacos, os pneus, os engradados, o palete ──
with em(T(1.25, -2.2, 0)):
    B("solido", (0, 0, 0.62), (1.0, 1.7, 1.0), None, d=(1.0, 0.2, 0.25),
      cf=lambda c, n, i, j: dim("#2e4a3a", 0.7 + 0.3 * hh(i, j)) if hh(i, j, 6) > 0.18 else dim("#6a4a2a", 0.6), sujo=0.3)
    B("solido", (-0.08, 0, 1.18), (1.08, 1.76, 0.05), "#24382c", r=(0, -0.18, 0), sujo=0)
    for dy in (-0.7, 0.7):
        for dx in (-0.35, 0.35):
            Cil("solido", (dx, dy, 0), 0.06, 0.06, 0.12, 6, "#101012", sujo=0)
SACOS = ((0.7, -1.2, 0.18, 0.3), (0.95, -0.9, 0.15, 0.25), (1.4, -3.3, 0.2, 0.32), (0.9, -3.4, 0.14, 0.24),
         (-1.5, -2.9, 0.16, 0.27), (-1.35, -3.3, 0.13, 0.22), (1.5, 1.4, 0.15, 0.25))
for k, (x, y, z, r) in enumerate(SACOS):
    Esfera("solido", (x, y, z), r, 8, 6, escolhe(["#0e0e12", "#16161c", "#1a2a3a"], k), S(1, 1.1, 0.75) @ R(rz=k))
for k in range(2):
    Tor("solido", (-1.45, 0.4, 0.09 + k * 0.17), 0.26, 0.09, 12, 6, "#0c0c0e", r=(0, 0, k * 0.4))
for k, (x, y, z, c) in enumerate(((-1.55, -3.9, 0.15, "#a8302a"), (-1.55, -3.9, 0.45, "#c8a020"), (-1.2, -4.0, 0.15, "#a8302a"))):
    B("solido", (x, y, z), (0.4, 0.3, 0.3), None, d=(0.1, 0.1, 0.1),
      cf=lambda c2, n, i, j, c=c: dim(c, 0.3) if (i + j) % 2 and abs(n.z) < 0.5 else dim(c, 0.8), sujo=0.2)
with em(T(1.7, 0.4, 0) @ R(ry=-0.2)):
    for k in range(5):
        B("solido", (0, -0.5 + k * 0.25, 0.6), (0.03, 0.12, 1.2), "#5a4a36", sujo=0.3)
    for z in (0.15, 0.6, 1.05):
        B("solido", (-0.04, 0, z), (0.05, 1.2, 0.1), "#4a3c2c", sujo=0.3)

# ── o fundo: a porta de ferro, a lâmpada no braço, a janelinha com grade ──
B("solido", (1.05, Y1 - 0.04, 1.08), (1.0, 0.06, 2.15), None, d=(0.5, 1, 0.3),
  cf=lambda c, n, i, j: dim("#4a3a30", 0.7 + 0.3 * hh(i, j)) if hh(i, j, 8) > 0.3 else dim("#6a3a22", 0.8), sujo=0.25)
B("solido", (1.05, Y1 - 0.02, 2.2), (1.15, 0.05, 0.08), "#2a2a2c", sujo=0)
Cil("solido", (0.65, Y1 - 0.09, 1.05), 0.02, 0.02, 0.04, 6, "#8a8070", r=(math.pi / 2, 0, 0), sujo=0)
Viga("solido", (0, Y1, 2.85), (0, 4.28, 2.85), 0.03, "#2a2a2c", 0)
Viga("solido", (0, 4.28, 2.85), (0, 4.28, 2.73), 0.02, "#2a2a2c", 0)
Cone2("solido", (0, 4.3, 2.6), 0.15, 0.05, 0.13, 12, "#2a3a30", "#c8b890")
Esfera("luz", (0, 4.3, 2.6), 0.06, 8, 6, LAMP)
Tubo("solido", [(0, Y1 - 0.01, 2.85), (-0.4, Y1 - 0.01, 3.4), (-1.6, Y1 - 0.01, 3.6), (-W + 0.02, 3.0, 5.0)], 0.008, 3, "#121214", 0)
Placa("luz", (-1.3, Y1 - 0.01, 3.5), (0.5, 0, 0), (0, 0, 0.4), 1, 1, dim("#ffcf8a", 0.18), sujo=0)
for k in range(4):
    Viga("solido", (-1.25 + k * 0.13, Y1 - 0.04, 3.5), (-1.25 + k * 0.13, Y1 - 0.04, 3.9), 0.015, "#1a1a1c", 0)

# ── o canto da moradora: o papelão, o cobertor enrolado, o carrinho ──
B("solido", (-0.2, 3.7, 0.016), (1.4, 1.2, 0.03), None, d=(0.35, 0.3, 1),
  cf=lambda c, n, i, j: dim("#6a5236", 0.75 + 0.3 * hh(i, j)) if hh(i, j, 2) > 0.2 else dim("#4a3826", 0.8), sujo=0.1)
B("solido", (0.6, 3.5, 0.02), (0.5, 0.6, 0.02), "#7a6040", r=(0, 0, 0.3), sujo=0.1)
Cil("solido", (-0.66, 4.05, 0.24), 0.22, 0.24, 0.92, 10, "#5a5048", r=(0, math.pi / 2, 0), sujo=0.1)
Pano("solido", (-0.95, 3.15, 0.035), (1.2, 0, 0), (0, 0.55, 0), 6, 4, 0.05, "#5a5048",
     cf=lambda c, n, i, j: dim("#7a3a2a", 0.8) if i % 3 == 0 else dim("#5a5048", 0.85 + 0.2 * hh(i, j)), seed=3)
B("solido", (-1.35, 4.1, 0.22), (0.5, 0.4, 0.44), None, d=(0.25, 0.2, 0.22),
  cf=lambda c, n, i, j: dim("#7a6040", 0.7 + 0.3 * hh(i, j)), r=(0, 0, 0.15), sujo=0.2)
Cil("solido", (-1.1, 3.4, 0.03), 0.04, 0.035, 0.18, 8, "#c8d0d8", sujo=0)  # a garrafa d'água
Cil("solido", (-0.95, 3.5, 0.03), 0.06, 0.05, 0.07, 8, "#8a8a8e", sujo=0)  # a caneca
with em(T(1.15, 3.7, 0) @ R(rz=0.35)):
    for x in (-0.28, 0.28):
        for y in (-0.42, 0.42):
            Viga("solido", (x, y, 0.55), (x * 0.85, y * 0.9, 0.95), 0.015, "#8a8c90", 0)
            Viga("solido", (x * 0.85, y * 0.9, 0.08), (x, y, 0.55), 0.015, "#8a8c90", 0)
            Cil("solido", (x * 0.85, y * 0.9, 0), 0.04, 0.04, 0.03, 6, "#101012", sujo=0)
    for z in (0.55, 0.75, 0.95):
        k = 1 if z > 0.6 else 0.9
        for a, b in (((-0.28, -0.42), (0.28, -0.42)), ((0.28, -0.42), (0.28, 0.42)), ((0.28, 0.42), (-0.28, 0.42)), ((-0.28, 0.42), (-0.28, -0.42))):
            Viga("solido", (a[0] * k, a[1], z), (b[0] * k, b[1], z), 0.012, "#8a8c90", 0)
    Viga("solido", (-0.3, 0.5, 1.0), (0.3, 0.5, 1.0), 0.03, "#a8302a", 0)
    for k, (x, y, r) in enumerate(((0, -0.15, 0.22), (0.08, 0.2, 0.2), (-0.1, 0.1, 0.18))):
        Esfera("solido", (x, y, 0.85), r, 8, 6, escolhe(["#e8e4dc", "#3a4a6a", "#2a2a30"], k), S(1, 1, 0.8))

# ════════════════════════ a luz assada (sem luz nova no jogo) ════════════════════════
FONTES = [((x, -4.6, z), c3(cor, 0.9), 2.4) for cor, x, z in GRITOS] + [
    ((0, 4.0, 2.4), c3(LAMP, 1.1), 1.9),
    ((0, -6.5, 1.0), c3("#ff3fb0", 0.25), 2.0),
]
terminar(["sala"], FONTES, SAIDA, "beco", dist=0.8, piso=0.42)
