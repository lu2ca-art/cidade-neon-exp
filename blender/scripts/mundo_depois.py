# O MUNDO DEPOIS modelado (06/11, docs/mundo-depois.md): a planta do Criador que
# tomou a cidade depois do final. Peças leves, cada uma instanciada centenas de
# vezes no jogo (app/linha/estrada/MundoDepois.tsx):
#   tufo_a, tufo_b, tufo_c   o tufo da janela: (a) jardineira com folhas caindo,
#                            (b) moita de folhas grandes saindo da janela,
#                            (c) vaso com ramos pendentes          ≤ 300 tri cada
#   trep_base, trep_meio, trep_topo   a trepadeira em módulos: a base (raiz e
#                            touceira, 3 m), o meio que repete (6 m; os caules
#                            entram e saem na mesma posição, encaixa em pilha) e o
#                            topo (2,5 m, os caules se curvam pra fora) ≤ 400 cada
#   broto                    o cacho de flores pequenas com brilho (_luz)  ≤ 60
#   cabine                   a cabine de vidro das torres: estrutura leve, banco,
#                            vasos, planta no teto; _vidro e _luz o jogo tinge
#                            (clara sobe, azul desce)                    ≤ 1500
#
#   blender -b --factory-startup --python blender/scripts/mundo_depois.py -- bruto.glb
#   blender -b --factory-startup --python blender/scripts/mundo_depois_foto.py -- bruto.glb docs/blender/mundo-depois.png
#   npx @gltf-transform/cli optimize bruto.glb public/models/mundo-depois.glb \
#     --compress meshopt --simplify false --join false --flatten false --instance false --palette false
#
# Coordenadas: Blender Z pra cima, metros. Tufos e trepadeira: a PAREDE fica em
# y = 0 e a planta cresce pra -Y (no glTF: +Z, pra fora do prédio); a origem do
# tufo é o peitoril, a dos módulos é o pé do módulo, no meio. Broto: olha pra -Y.
# Cabine: a origem no meio do piso, a frente (vidro) olha pra +X (o jogo põe +X
# pra fora da torre), 2,6 x 2,6 x 3,2 como a caixa de antes.
# Malhas: <id>_solido (cor x AO assada x luz falsa, gravada x4: o jogo usa cor
# 0,25), <id>_luz (brilho, cor direta), <id>_vidro (transparente). Sem normais
# (o jogo desenha sem luz, MeshBasic, dos dois lados).

import bpy, math, random, sys
from mathutils import Vector, Color

TAU = 2 * math.pi
args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
SAIDA = args[0] if args else "/tmp/mundo-depois-bruto.glb"
IDS = ["tufo_a", "tufo_b", "tufo_c", "trep_base", "trep_meio", "trep_topo", "broto", "cabine"]
LUGAR = {"tufo_a": (0, 0, 0), "tufo_b": (5, 0, 0), "tufo_c": (10, 0, 0), "trep_base": (15, 0, 0),
         "trep_meio": (20, 0, 0), "trep_topo": (25, 0, 0), "broto": (30, 0, 0), "cabine": (60, -20, 0)}

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
COL = bpy.data.collections.new("MundoDepois")
sc.collection.children.link(COL)


def lin(h, k=1.0):
    c = Color((int(h[1:3], 16) / 255, int(h[3:5], 16) / 255, int(h[5:7], 16) / 255)).from_srgb_to_scene_linear()
    return Vector((c.r * k, c.g * k, c.b * k))


def mix(a, b, t):
    return a * (1 - t) + b * t


# paleta (sRGB; o sólido vai x4 no arquivo e x0,25 no jogo: tons até ~#8a)
F_ESC, F_MED, F_CLA = lin("#1f4a24"), lin("#2f6b2c"), lin("#4f8f3a")    # folhas
F_AZ, F_AM = lin("#2a5c47"), lin("#6a8a2c")                            # verde azulado, verde amarelado
NERV = lin("#7fae5a")
CAULE, CAULE2 = lin("#4a5a2a"), lin("#5a4630")
TERRA, BARRO, BARRO2 = lin("#3a2a1e"), lin("#8a4a30"), lin("#6a3a28")
ACO, ACO2, MADEIRA = lin("#8a8f98"), lin("#5f646e"), lin("#7a5a3a")
PETALA, PETALA2, MIOLO, BOTAO = lin("#ffd0e4"), lin("#fff0d8"), lin("#ffe08a"), lin("#d8ffc8")

BUF = {}
PECA = [None]


def luzf(n):
    return max(0.55, min(1.0, 0.78 + 0.22 * n.z - 0.08 * n.y))


def poly(g, pts, cols, faces, ref=None, luz=True):
    """pts: Vector, cols: Vector por vértice, faces: índices. ref: a normal
    esperada (as faces são viradas pra ela, folhas soltas não têm dentro/fora)."""
    b = BUF.setdefault((PECA[0], g), {"v": [], "f": [], "c": []})
    o = len(b["v"])
    b["v"].extend(Vector(p) for p in pts)
    for f in faces:
        a, bb, c = (Vector(pts[f[0]]), Vector(pts[f[1]]), Vector(pts[f[2]]))
        n = (bb - a).cross(c - a)
        if n.length < 1e-9 and len(f) > 3:
            n = (c - a).cross(Vector(pts[f[3]]) - a)
        n = n.normalized() if n.length > 1e-9 else Vector((0, 0, 1))
        if ref is not None:
            r = ref(sum((Vector(pts[i]) for i in f), Vector()) / len(f))
            if n.dot(r) < 0:
                f = list(reversed(f))
                n = -n
        k = luzf(n if n.z > -0.2 else -n) if (g == "solido" and luz) else 1.0
        b["f"].append([o + i for i in f])
        b["c"].append([cols[i] * k for i in f])


def caixa(g, c, s, cor, sem=(), cor2=None):
    """caixa alinhada; sem: faces omitidas ('-x','+x','-y','+y','-z','+z')."""
    c, h = Vector(c), Vector(s) / 2
    P = [c + Vector((sx * h.x, sy * h.y, sz * h.z)) for sz in (-1, 1) for sy in (-1, 1) for sx in (-1, 1)]
    F = {"-z": (0, 2, 3, 1), "+z": (4, 5, 7, 6), "-y": (0, 1, 5, 4), "+y": (2, 6, 7, 3), "-x": (0, 4, 6, 2), "+x": (1, 3, 7, 5)}
    cols = [cor2 if (cor2 is not None and i < 4) else cor for i in range(8)]
    poly(g, P, cols, [f for k, f in F.items() if k not in sem], ref=lambda p: p - c)


def tubo(g, pts, raios, cor, cor2=None, lados=3):
    pts = [Vector(p) for p in pts]
    n = len(pts)
    T = [(pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)]).normalized() for i in range(n)]
    a = Vector((0, 0, 1)) if abs(T[0].z) < 0.9 else Vector((1, 0, 0))
    N = [(a - T[0] * a.dot(T[0])).normalized()]
    for i in range(1, n):
        q = N[-1] - T[i] * N[-1].dot(T[i])
        N.append(q.normalized() if q.length > 1e-8 else N[-1])
    P, C, Fc = [], [], []
    for i in range(n):
        bb = T[i].cross(N[i])
        for k in range(lados):
            P.append(pts[i] + raios[i] * (math.cos(TAU * k / lados) * N[i] + math.sin(TAU * k / lados) * bb))
            C.append(mix(cor, cor2 if cor2 is not None else cor, i / max(1, n - 1)))
    for i in range(n - 1):
        for k in range(lados):
            Fc.append((i * lados + k, i * lados + (k + 1) % lados, (i + 1) * lados + (k + 1) % lados, (i + 1) * lados + k))
    cen = pts

    def ref(p):
        j = min(range(n), key=lambda i: (cen[i] - p).length)
        return p - cen[j]
    poly(g, P, C, Fc, ref=ref)


def folha(base, d, comp, larg, cai=0.4, torce=0.0, cor=F_MED, ponta=F_CLA, g="solido"):
    """Folha grande: nervura + 2 bordas, 3 fileiras (12 tri). d: direção;
    cai: quanto a ponta pende (fração do comprimento); torce: gira a lâmina."""
    base, d = Vector(base), Vector(d).normalized()
    s = d.cross(Vector((0, 0, 1)))
    s = s.normalized() if s.length > 1e-4 else Vector((1, 0, 0))
    n = s.cross(d).normalized()
    if torce:
        s, n = (s * math.cos(torce) + n * math.sin(torce)), (n * math.cos(torce) - s * math.sin(torce))
    P, C = [base], [cor * 0.8]
    for t in (0.25, 0.5, 0.75):
        c = base + d * comp * t + Vector((0, 0, -cai * comp)) * t * t
        w = larg * 0.5 * math.sin(math.pi * (0.12 + 0.88 * t)) ** 0.55
        e = mix(cor, ponta, t)
        P += [c - s * w - n * w * 0.3, c + n * w * 0.08, c + s * w - n * w * 0.3]
        C += [e * 0.85, mix(e, NERV, 0.35), e * 0.9]
    P.append(base + d * comp + Vector((0, 0, -cai * comp)))
    C.append(ponta)
    F = [(0, 1, 2), (0, 2, 3)]
    for r in range(2):
        a = 1 + r * 3
        F += [(a, a + 3, a + 4, a + 1), (a + 1, a + 4, a + 5, a + 2)]
    F += [(7, 10, 8), (8, 10, 9)]
    nn = n
    poly(g, P, C, F, ref=lambda p: nn)


def vaso(c, r0, r1, h, cor, lados=6):
    c = Vector(c)
    P, Cc, F = [], [], []
    for k in range(lados):
        a = TAU * k / lados
        P += [c + Vector((r0 * math.cos(a), r0 * math.sin(a), 0)), c + Vector((r1 * math.cos(a), r1 * math.sin(a), h))]
        Cc += [cor * 0.7, cor]
    for k in range(lados):
        j = (k + 1) % lados
        F.append((2 * k, 2 * j, 2 * j + 1, 2 * k + 1))
    poly("solido", P, Cc, F, ref=lambda p: p - Vector((c.x, c.y, p.z)))
    tp = [c + Vector((r1 * 0.95 * math.cos(TAU * k / lados), r1 * 0.95 * math.sin(TAU * k / lados), h * 0.9)) for k in range(lados)]
    poly("solido", tp, [TERRA] * lados, [list(range(lados))], ref=lambda p: Vector((0, 0, 1)))


def cor_folha(rr):
    return rr.choice([(F_ESC, F_MED), (F_MED, F_CLA), (F_AZ, F_MED), (F_MED, F_AM), (F_ESC, F_AZ)])


# ── os tufos (a parede em y = 0, pra fora é -Y) ──
def tufo_a():
    rr = random.Random(3)
    # a jardineira: frente, lados, fundo e a terra (contra a parede: sem costas)
    caixa("solido", (0, -0.28, -0.17), (2.2, 0.5, 0.36), BARRO, sem=("+y", "+z"), cor2=BARRO2)
    poly("solido", [Vector((-1.08, -0.05, -0.03)), Vector((1.08, -0.05, -0.03)), Vector((1.08, -0.51, -0.03)), Vector((-1.08, -0.51, -0.03))],
         [TERRA] * 4, [(0, 1, 2, 3)], ref=lambda p: Vector((0, 0, 1)))
    for i in range(13):
        x = -0.95 + 1.9 * (i + rr.random() * 0.6) / 13
        c, p = cor_folha(rr)
        if i % 3 == 1:   # de pé
            folha((x, -0.25, 0.0), (rr.uniform(-0.4, 0.4), rr.uniform(-0.5, -0.2), 1), rr.uniform(0.75, 1.0), rr.uniform(0.42, 0.55), 0.35, rr.uniform(-0.4, 0.4), c, p)
        else:            # caindo por cima da borda
            folha((x, -0.4, -0.02), (rr.uniform(-0.35, 0.35), -1, rr.uniform(0.2, 0.5)), rr.uniform(0.85, 1.25), rr.uniform(0.45, 0.62), rr.uniform(0.7, 1.1), rr.uniform(-0.3, 0.3), c, p)


def tufo_b():
    rr = random.Random(7)
    centro = Vector((0, -0.25, 0.1))
    for i in range(16):
        a = TAU * i / 16 + rr.uniform(-0.15, 0.15)
        up = rr.uniform(-0.25, 0.85)
        d = Vector((math.cos(a) * 0.9, -rr.uniform(0.45, 1.0), math.sin(a) * 0.6 + up))
        c, p = cor_folha(rr)
        folha(centro + Vector((math.cos(a) * 0.12, 0, math.sin(a) * 0.1)), d, rr.uniform(1.0, 1.4), rr.uniform(0.6, 0.82),
              rr.uniform(0.25, 0.6), rr.uniform(-0.5, 0.5), c, p)


def tufo_c():
    rr = random.Random(11)
    vaso((0, -0.32, -0.3), 0.2, 0.3, 0.32, BARRO)
    topo = Vector((0, -0.32, 0.0))
    for j, (x, z1) in enumerate(((-0.25, -1.7), (0.05, -2.0), (0.3, -1.45))):
        pts = [topo + Vector((x * 0.4, -0.12, 0)), Vector((x * 0.8, -0.62, -0.25)), Vector((x, -0.66, z1 * 0.5)),
               Vector((x * 1.1 + 0.08, -0.6, z1 * 0.8)), Vector((x * 1.15, -0.55, z1))]
        tubo("solido", pts, [0.035, 0.03, 0.025, 0.02, 0.012], CAULE, F_MED)
        for t in range(1, 5):
            if t == 4 and (t + j) % 2 == 0:
                continue
            p = pts[t]
            s = -1 if (t + j) % 2 else 1
            c, pc = cor_folha(rr)
            folha(p, (s * 0.8, -0.6, -0.25), rr.uniform(0.38, 0.55), rr.uniform(0.28, 0.38), 0.5, 0.3 * s, c, pc)
    for i in range(4):
        c, p = cor_folha(rr)
        folha(topo + Vector((rr.uniform(-0.12, 0.12), 0, 0)), (rr.uniform(-0.6, 0.6), -0.35, 1), rr.uniform(0.6, 0.85), rr.uniform(0.38, 0.48), 0.4, 0, c, p)


# ── a trepadeira: 2 caules que entram e saem nos mesmos x (encaixa em pilha) ──
HB, HM, HT = 3.0, 6.0, 2.5
CAULES = ((-0.4, 0.0), (0.45, 1.9))  # x, fase


def caule_x(x0, fase, z, H):
    return x0 + 0.28 * math.sin(TAU * z / H + fase)


def trep_meio():
    rr = random.Random(21)
    for (x0, fase) in CAULES:
        zs = [HM * i / 6 for i in range(7)]
        pts = [Vector((caule_x(x0, fase, z, HM), -0.12 - 0.05 * math.sin(TAU * z / HM + fase * 2), z)) for z in zs]
        pts[0].y = pts[-1].y = -0.12
        tubo("solido", pts, [0.06] * 7, CAULE, CAULE2)
    k = 0
    for (x0, fase) in CAULES:
        for i in range(7):
            z = HM * (i + 0.35 + rr.random() * 0.3) / 7.2
            x = caule_x(x0, fase, z, HM)
            s = 1 if (i + k) % 2 else -1
            c, p = cor_folha(rr)
            folha((x, -0.14, z), (s * 0.75, -0.55, rr.uniform(0.1, 0.5)), rr.uniform(0.7, 0.95), rr.uniform(0.5, 0.68),
                  rr.uniform(0.3, 0.55), s * 0.35, c, p)
        k += 1
    # gavinha
    tubo("solido", [Vector((0.0, -0.12, 2.4)), Vector((0.25, -0.25, 2.7)), Vector((0.35, -0.3, 3.05)), Vector((0.2, -0.32, 3.2))],
         [0.025, 0.02, 0.015, 0.01], CAULE, F_AM)


def trep_base():
    rr = random.Random(31)
    # o monte de terra e raízes no pé da parede
    P, Cc, F = [Vector((0, -0.25, 0.32))], [TERRA * 1.2], []
    for k in range(8):
        a = math.pi * k / 7
        P.append(Vector((math.cos(a) * 1.0, -math.sin(a) * 0.7 + 0.02, 0.0)))
        Cc.append(TERRA)
    for k in range(7):
        F.append((0, k + 1, k + 2))
    poly("solido", P, Cc, F, ref=lambda p: Vector((0, -0.3, 1)))
    for (x0, fase) in CAULES:
        zs = [0.0, 0.6, 1.3, 2.1, HB]
        pts = [Vector((x0 * (0.3 + 0.7 * z / HB) if z < HB else caule_x(x0, fase, 0, HM), -0.12 - 0.15 * (1 - z / HB), z + 0.15 * (z == 0)))
               for z in zs]
        pts[-1] = Vector((caule_x(x0, fase, 0, HM), -0.12, HB))
        tubo("solido", pts, [0.11, 0.09, 0.075, 0.065, 0.06], CAULE2, CAULE)
    # raízes
    for s in (-1, 1):
        tubo("solido", [Vector((s * 0.1, -0.2, 0.3)), Vector((s * 0.5, -0.35, 0.1)), Vector((s * 0.8, -0.3, -0.05))],
             [0.06, 0.04, 0.02], CAULE2, TERRA)
    for i in range(14):
        a = rr.uniform(0.1, math.pi - 0.1)
        z = rr.uniform(0.25, 2.5) if i > 5 else rr.uniform(0.2, 0.6)
        c, p = cor_folha(rr)
        folha((math.cos(a) * 0.3, -0.2, z), (math.cos(a), -rr.uniform(0.4, 0.9), rr.uniform(0.0, 0.6)),
              rr.uniform(0.75, 1.05), rr.uniform(0.55, 0.75), rr.uniform(0.3, 0.6), rr.uniform(-0.4, 0.4), c, p)


def trep_topo():
    rr = random.Random(41)
    for j, (x0, fase) in enumerate(CAULES):
        x1 = caule_x(x0, fase, 0, HM)
        pts = [Vector((x1, -0.12, 0)), Vector((x1 * 1.1, -0.15, 0.8)), Vector((x1 * 1.3, -0.3, 1.6)),
               Vector((x1 * 1.6, -0.65, 2.15)), Vector((x1 * 1.8, -1.0, 2.2)), Vector((x1 * 1.85, -1.2, 1.95))]
        tubo("solido", pts, [0.06, 0.055, 0.045, 0.035, 0.025, 0.012], CAULE, F_AM)
        for t in range(1, 6):
            p = pts[t]
            s = 1 if (t + j) % 2 else -1
            c, pc = cor_folha(rr)
            folha(p, (s * 0.8, -0.6, rr.uniform(0.1, 0.6)), rr.uniform(0.55, 0.85) * (1.1 - t * 0.08), rr.uniform(0.42, 0.6),
                  0.45, s * 0.3, c, pc)
    # broto novo no alto (folhinha clara de pé)
    for s in (-1, 1):
        folha((s * 0.15, -0.15, 1.9), (s * 0.3, -0.3, 1), 0.5, 0.3, 0.15, 0, F_CLA, F_AM)


# ── o broto: 3 florzinhas de 5 pétalas e 2 botões (brilho) ──
def flor(c, r, vira, cor, miolo):
    c = Vector(c)
    P, Cc, F = [c + Vector((0, -0.02, 0))], [miolo], []
    for k in range(10):
        a = TAU * k / 10 + vira
        rr = r if k % 2 == 0 else r * 0.42
        P.append(c + Vector((math.cos(a) * rr, 0.06 * (rr / r), math.sin(a) * rr)))
        Cc.append(cor if k % 2 == 0 else mix(cor, miolo, 0.5))
    for k in range(10):
        F.append((0, 1 + k, 1 + (k + 1) % 10))
    poly("luz", P, Cc, F, ref=lambda p: Vector((0, -1, 0)))


def botao(c, r):
    c = Vector(c)
    P = [c + Vector((0, 0, r * 1.6)), c + Vector((r, 0, 0)), c + Vector((0, -r, 0)), c + Vector((-r, 0, 0)), c + Vector((0, r, 0)), c + Vector((0, 0, -r * 0.6))]
    poly("luz", P, [BOTAO * 1.0, BOTAO * 0.8, BOTAO * 0.8, BOTAO * 0.8, BOTAO * 0.8, BOTAO * 0.6],
         [(0, 1, 2), (0, 2, 3), (0, 3, 4), (0, 4, 1)], ref=lambda p: p - c)


def broto():
    flor((0, 0, 0), 0.15, 0.2, PETALA, MIOLO)
    flor((0.2, 0.04, 0.12), 0.12, 0.9, PETALA2, MIOLO)
    flor((-0.17, 0.03, -0.1), 0.11, 1.7, PETALA, MIOLO)
    botao((0.05, 0.0, 0.26), 0.045)
    botao((-0.22, 0.02, 0.14), 0.04)


# ── a cabine de vidro (frente +X, 2,6 x 2,6 x 3,2) ──
def cabine():
    rr = random.Random(51)
    L, A = 1.3, 3.2
    caixa("solido", (0, 0, 0.07), (2.6, 2.6, 0.14), ACO2)                       # piso
    caixa("solido", (0, 0, A - 0.09), (2.7, 2.7, 0.18), ACO, cor2=ACO2)          # teto
    for sx in (-1, 1):
        for sy in (-1, 1):
            caixa("solido", (sx * (L - 0.05), sy * (L - 0.05), A / 2), (0.1, 0.1, A - 0.3), ACO, sem=("-z", "+z"))
    for z in (0.95,):                                                            # corrimão (3 lados)
        caixa("solido", (L - 0.08, 0, z), (0.05, 2.4, 0.05), ACO, sem=("-x",))
        for sy in (-1, 1):
            caixa("solido", (0, sy * (L - 0.08), z), (2.4, 0.05, 0.05), ACO, sem=("-y",) if sy > 0 else ("+y",))
    # o banco encostado no fundo (do lado da torre)
    caixa("solido", (-L + 0.32, 0, 0.48), (0.45, 1.9, 0.07), MADEIRA)
    caixa("solido", (-L + 0.14, 0, 0.82), (0.06, 1.9, 0.38), MADEIRA)
    for sy in (-0.8, 0.8):
        caixa("solido", (-L + 0.32, sy, 0.28), (0.36, 0.06, 0.34), ACO2, sem=("-z", "+z"))
    # dois vasos nos cantos da frente, com folhas
    for sy in (-1, 1):
        cx, cy = L - 0.38, sy * (L - 0.38)
        vaso((cx, cy, 0.14), 0.16, 0.22, 0.42, BARRO)
        for i in range(6):
            a = TAU * i / 6 + rr.uniform(-0.3, 0.3)
            c, p = cor_folha(rr)
            folha((cx, cy, 0.52), (math.cos(a) * 0.6, math.sin(a) * 0.6, 1), rr.uniform(0.55, 0.8), rr.uniform(0.3, 0.42),
                  rr.uniform(0.4, 0.7), 0, c, p)
    # planta pendurada no teto, num canto do fundo
    tubo("solido", [Vector((-0.6, 0.75, A - 0.2)), Vector((-0.6, 0.75, A - 0.75))], [0.012, 0.012], ACO2, ACO2)
    vaso((-0.6, 0.75, A - 1.0), 0.13, 0.17, 0.24, BARRO2)
    for i in range(5):
        a = TAU * i / 5
        c, p = cor_folha(rr)
        folha((-0.6, 0.75, A - 0.78), (math.cos(a), math.sin(a), -0.2), rr.uniform(0.45, 0.6), rr.uniform(0.26, 0.34), 1.0, 0, c, p)
    # a planta no teto caindo pela borda da frente e dos lados
    for i in range(10):
        a = TAU * i / 10
        c, p = cor_folha(rr)
        b = Vector((math.cos(a) * 1.05, math.sin(a) * 1.05, A))
        folha(b, (math.cos(a), math.sin(a), 0.35), rr.uniform(0.65, 0.9), rr.uniform(0.4, 0.55), rr.uniform(0.7, 1.0), rr.uniform(-0.3, 0.3), c, p)
    # vidro nos 4 lados
    z0, z1 = 0.14, A - 0.18
    for (o, u) in (((L - 0.03, -L, z0), (0, 2 * L, 0)), ((-L + 0.03, L, z0), (0, -2 * L, 0)),
                   ((L, L - 0.03, z0), (-2 * L, 0, 0)), ((-L, -L + 0.03, z0), (2 * L, 0, 0))):
        o, u = Vector(o), Vector(u)
        v = Vector((0, 0, z1 - z0))
        cc = [lin("#b8e8ff"), lin("#b8e8ff"), lin("#e8f8ff"), lin("#e8f8ff")]
        poly("vidro", [o, o + u, o + u + v, o + v], cc, [(0, 1, 2, 3)])
    # a luz: a faixa em volta, embaixo do teto, e a luminária
    for (c, s) in (((L - 0.02, 0, A - 0.24), (0.04, 2.5, 0.08)), ((-L + 0.02, 0, A - 0.24), (0.04, 2.5, 0.08)),
                   ((0, L - 0.02, A - 0.24), (2.5, 0.04, 0.08)), ((0, -L + 0.02, A - 0.24), (2.5, 0.04, 0.08))):
        caixa("luz", c, s, Vector((1, 1, 1)), sem=("+z",))
    poly("luz", [Vector((-0.4, -0.4, A - 0.19)), Vector((0.4, -0.4, A - 0.19)), Vector((0.4, 0.4, A - 0.19)), Vector((-0.4, 0.4, A - 0.19))],
         [Vector((1, 0.95, 0.85))] * 4, [(0, 1, 2, 3)], ref=lambda p: Vector((0, 0, -1)))


FAZ = {"tufo_a": tufo_a, "tufo_b": tufo_b, "tufo_c": tufo_c, "trep_base": trep_base, "trep_meio": trep_meio,
       "trep_topo": trep_topo, "broto": broto, "cabine": cabine}
for peca in IDS:
    PECA[0] = peca
    FAZ[peca]()

GANHO = 4.0
GRUPOS = ("solido", "luz", "vidro")


def material(g):
    m = bpy.data.materials.new("md_" + g)
    try:
        m.use_nodes = True
    except Exception:
        pass
    nt = m.node_tree
    b = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    a = nt.nodes.new("ShaderNodeVertexColor")
    a.layer_name = "Col"
    if g in ("luz", "vidro"):
        b.inputs["Base Color"].default_value = (0, 0, 0, 1)
        nt.links.new(a.outputs["Color"], b.inputs["Emission Color"])
        b.inputs["Emission Strength"].default_value = 1.0
        if g == "vidro":
            b.inputs["Alpha"].default_value = 0.3
    else:
        nt.links.new(a.outputs["Color"], b.inputs["Base Color"])
        b.inputs["Roughness"].default_value = 0.85
    return m


MATS = {g: material(g) for g in GRUPOS}
NOS = {}
for peca in IDS:
    e = bpy.data.objects.new(peca, None)
    e.empty_display_size = 0.5
    COL.objects.link(e)
    e.location = LUGAR[peca]
    NOS[peca] = e
    for g in GRUPOS:
        b = BUF.get((peca, g))
        if not b:
            continue
        me = bpy.data.meshes.new(f"{peca}_{g}")
        me.from_pydata([tuple(v) for v in b["v"]], [], b["f"])
        at = me.color_attributes.new("Base", "FLOAT_COLOR", "CORNER")
        at.data.foreach_set("color", [x for fc in b["c"] for c in fc for x in (c.x, c.y, c.z, 1.0)])
        me.update()
        me.validate()
        o = bpy.data.objects.new(f"{peca}_{g}", me)
        COL.objects.link(o)
        o.parent = e
        o["grupo"] = g
        me.materials.append(MATS[g])

vl = bpy.context.view_layer
vl.update()

# ── AO assada (Cycles) no sólido; a parede atrás dos tufos e da trepadeira, o chão no pé da base ──
solidos = [o for o in COL.objects if o.type == "MESH" and o["grupo"] == "solido"]
for o in COL.objects:
    if o.type == "MESH" and o["grupo"] == "vidro":
        o.hide_render = True
for o in solidos:
    ao = o.data.color_attributes.new("AO", "FLOAT_COLOR", "CORNER")
    o.data.color_attributes.active_color = ao
mc = bpy.data.meshes.new("fundo_bake")
mc.from_pydata([(-3, 0.01, -4), (29, 0.01, -4), (29, 0.01, 10), (-3, 0.01, 10), (13, -3, 0), (17, -3, 0), (17, 0.01, 0), (13, 0.01, 0)], [],
               [(0, 1, 2, 3), (4, 5, 6, 7)])
fundo = bpy.data.objects.new("fundo_bake", mc)
sc.collection.objects.link(fundo)
try:
    sc.render.engine = "CYCLES"
except TypeError as e:
    print("engine", e)
sc.cycles.samples = 96
try:
    pr = bpy.context.preferences.addons["cycles"].preferences
    pr.compute_device_type = "METAL"
    pr.get_devices()
    for d in pr.devices:
        d.use = True
    sc.cycles.device = "GPU"
except Exception as e:
    print("gpu", e)
if sc.world is None:
    sc.world = bpy.data.worlds.new("Mundo")
sc.world.light_settings.distance = 0.8
vl.update()
for o in sc.objects:
    o.select_set(False)
for o in solidos:
    o.select_set(True)
vl.objects.active = solidos[0]
print("BAKE", bpy.ops.object.bake(type="AO", target="VERTEX_COLORS"))
bpy.data.objects.remove(fundo, do_unlink=True)

for o in COL.objects:
    if o.type != "MESH":
        continue
    me = o.data
    g = o["grupo"]
    base = me.color_attributes["Base"]
    n = len(base.data)
    bc = [0.0] * (n * 4)
    base.data.foreach_get("color", bc)
    if g == "solido":
        ao = me.color_attributes["AO"]
        ac = [0.0] * (n * 4)
        ao.data.foreach_get("color", ac)
        for i in range(n):
            a = (0.3 + 0.7 * ac[i * 4]) * GANHO
            for c in range(3):
                bc[i * 4 + c] = min(1.0, bc[i * 4 + c] * a)
        me.color_attributes.remove(ao)
    else:
        for i in range(n):
            for c in range(3):
                bc[i * 4 + c] = min(1.0, bc[i * 4 + c])
    me.color_attributes.remove(me.color_attributes["Base"])
    col = me.color_attributes.new("Col", "FLOAT_COLOR", "CORNER")
    col.data.foreach_set("color", bc)
    me.color_attributes.active_color = col
    me.color_attributes.render_color_index = me.color_attributes.active_color_index

for e in NOS.values():
    e.location = (0, 0, 0)
vl.update()
for o in sc.objects:
    o.select_set(False)
for o in COL.objects:
    o.hide_render = False
    o.select_set(True)
vl.objects.active = NOS[IDS[0]]
print(bpy.ops.export_scene.gltf(filepath=SAIDA, export_format="GLB", use_selection=True, export_texcoords=False,
      export_normals=False, export_materials="EXPORT", export_yup=True, export_apply=True, export_vertex_color="ACTIVE"))
tot = {}
for o in COL.objects:
    if o.type == "MESH":
        tot[(o.parent.name, o["grupo"])] = sum(len(p.vertices) - 2 for p in o.data.polygons)
for peca in IDS:
    print("TRI", peca, sum(v for (l, g), v in tot.items() if l == peca), {g: v for (l, g), v in tot.items() if l == peca})
print("TRI total", sum(tot.values()))
