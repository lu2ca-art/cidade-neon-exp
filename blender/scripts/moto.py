# A moto do jogador (06/11): moto de trilha montada com sucata do subúrbio (o
# prêmio da missão dos túneis), com neon. Só a moto: o piloto continua o do
# código (Pilotos.tsx). As peças vêm nos MESMOS grupos animados do Motoqueiro:
#
#   roda_t   a roda de trás (pneu com cravos, aro neon, raios, coroa)
#            pivô = o eixo, no jogo em (0, 0.39, -0.62) dentro do "nariz"
#   roda_f   a roda da frente (pneu com cravos, aro neon, raios, disco de freio)
#            pivô = o eixo, (0, 0.39, 0.66)
#   garfo    garfo, mesas, guidão, paralama da frente e a máscara do farol
#            (o que vira com a direção); pivô = o eixo da frente, (0, 0.39, 0.66)
#   quadro   quadro, balança, amortecedor, motor, escape, tanque, banco,
#            laterais, paralama de trás e lanterna; pivô = a origem do nariz
#
#   blender -b --factory-startup --python blender/scripts/moto.py -- bruto.glb [moto.blend]
#   blender -b --factory-startup --python blender/scripts/moto_foto.py -- moto.blend docs/blender/moto.png
#   npx @gltf-transform/cli optimize bruto.glb public/models/moto.glb \
#     --compress meshopt --simplify false --join false --flatten false --instance false --palette false
#
# O material do jogo é UM só (MAT_PECAS): tudo vai nos vértices, nos nomes que
# ele já lê depois do carregamento:
#   COLOR_0  a cor (linear) × a AO assada (Cycles)         → "color"
#   _RM      (roughness, metalness)                         → "aRM"
#   _EMI     o brilho (emissive linear × intensidade)       → "aEmi"
# Coordenadas: escrevo tudo no referencial do JOGO (x direita, y cima, z frente,
# metros) e converto pro Blender (Z pra cima) no fim: Blender (x, -z, y).
# Orçamento: até 9 mil triângulos (as duas rodas contam) e 300 KB.

import bpy, bmesh, math, sys
from mathutils import Vector, Matrix, Color

TAU = 2 * math.pi
args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
SAIDA = args[0] if args else "/tmp/moto-bruto.glb"
BLEND = args[1] if len(args) > 1 else None

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
COL = bpy.data.collections.new("Moto")
sc.collection.children.link(COL)


def lin(h):
    c = Color((int(h[1:3], 16) / 255, int(h[3:5], 16) / 255, int(h[5:7], 16) / 255)).from_srgb_to_scene_linear()
    return (c.r, c.g, c.b)


# ── a paleta: (cor, roughness, metalness, brilho, intensidade) ──
# as do jogo de hoje (MAT_MOTO) + as da sucata do subúrbio (elevadores/ruínas)
ESCURO, NEON, MOTO, PLASTICO = "#14121c", "#2fe8ff", "#ff3fb0", "#f2eefa"
PAL = {
    "pneu": (ESCURO, 0.95, 0.0),
    "cromo": ("#c9c3d6", 0.3, 0.6),
    "garfo": ("#ffc857", 0.35, 0.5),
    "moto": (MOTO, 0.5, 0.0),
    "motoFosco": (MOTO, 0.8, 0.0),
    "escuro": (ESCURO, 0.9, 0.0),
    "escuroMetal": (ESCURO, 0.4, 0.5),
    "plastico": (PLASTICO, 0.6, 0.0),
    "escape": ("#8f8aa0", 0.25, 0.7),
    "aluminio": ("#a9a4b4", 0.45, 0.6),
    "motor": ("#3a3740", 0.55, 0.5),
    "zinco": ("#7b8190", 0.5, 0.6),
    "ferrugem": ("#7a4429", 0.9, 0.2),
    "azul": ("#3d5c7c", 0.8, 0.1),
    "banco": ("#1e1c21", 0.9, 0.0),
    "fita": ("#9a98a0", 0.55, 0.2),
    "neon": (NEON, 0.4, 0.0, NEON, 1.0),
    "neonRosa": (MOTO, 0.4, 0.0, MOTO, 0.9),
    "farol": ("#fff1c8", 0.2, 0.0, "#fff1c8", 1.0),
    "lanterna": ("#ff2a3a", 0.3, 0.0, "#ff2a3a", 0.9),
}
MAT = {}
for k, v in PAL.items():
    c = lin(v[0])
    e = tuple(x * v[4] for x in lin(v[3])) if len(v) > 3 else (0.0, 0.0, 0.0)
    if len(v) > 3:  # o que brilha: a cor de base escura (o brilho faz o resto)
        c = tuple(x * 0.35 for x in c)
    MAT[k] = (c, (v[1], v[2]), e)


# ── matrizes (referencial do jogo) ──
def T(x, y, z):
    return Matrix.Translation((x, y, z))


def R(rx=0.0, ry=0.0, rz=0.0):
    return Matrix.Rotation(rz, 4, "Z") @ Matrix.Rotation(ry, 4, "Y") @ Matrix.Rotation(rx, 4, "X")


def base(o, X, Y, Z):
    """matriz com os eixos locais X, Y, Z (colunas) e a origem o"""
    m = Matrix((tuple(X), tuple(Y), tuple(Z))).transposed().to_4x4()
    m.translation = Vector(o)
    return m


def para(d):
    return Vector((0, 0, 1)).rotation_difference(Vector(d).normalized()).to_matrix().to_4x4()


# ── os acumuladores: por grupo, vértices e faces com o material de cada face ──
GRUPOS = ("roda_t", "roda_f", "garfo", "quadro")
BUF = {g: {"v": [], "f": [], "m": []} for g in GRUPOS}
G = ["quadro"]


def add(bm, mat, M=None, afiar=40, cf=None):
    if M is not None:
        bmesh.ops.transform(bm, matrix=M, verts=bm.verts)
        if M.to_3x3().determinant() < 0:      # espelhada (o lado esquerdo): desvira as faces
            bmesh.ops.reverse_faces(bm, faces=bm.faces)
    bm.normal_update()
    mats = {f: (cf(f) if cf else mat) for f in bm.faces}
    if afiar is not None:
        es = [e for e in bm.edges if e.is_manifold and e.calc_face_angle(0) > math.radians(afiar)]
        if es:
            bmesh.ops.split_edges(bm, edges=es)
    bm.verts.index_update()
    b = BUF[G[0]]
    o = len(b["v"])
    b["v"].extend(v.co.copy() for v in bm.verts)
    for f in bm.faces:
        b["f"].append([o + l.vert.index for l in f.loops])
        b["m"].append(mats.get(f, mat))
    bm.free()


def bm_caixa(sx, sy, sz, n=(1, 1, 1), sem=None):
    bm = bmesh.new()
    nx, ny, nz = n
    hx, hy, hz = sx / 2, sy / 2, sz / 2
    X, Y, Z = Vector((sx, 0, 0)), Vector((0, sy, 0)), Vector((0, 0, sz))

    def grade(o, U, V, nu, nv):
        vs = [[bm.verts.new(o + U * (i / nu) + V * (j / nv)) for j in range(nv + 1)] for i in range(nu + 1)]
        for i in range(nu):
            for j in range(nv):
                bm.faces.new((vs[i][j], vs[i + 1][j], vs[i + 1][j + 1], vs[i][j + 1]))
    lados = {"-y": (Vector((-hx, -hy, -hz)), X, Z, nx, nz), "+y": (Vector((hx, hy, -hz)), -X, Z, nx, nz),
             "+x": (Vector((hx, -hy, -hz)), Y, Z, ny, nz), "-x": (Vector((-hx, hy, -hz)), -Y, Z, ny, nz),
             "+z": (Vector((-hx, -hy, hz)), X, Y, nx, ny), "-z": (Vector((-hx, hy, -hz)), X, -Y, nx, ny)}
    for k, a in lados.items():
        if sem and k in sem:
            continue
        grade(*a)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def Caixa(p, s, mat, r=(0, 0, 0), M=None, sem=None):
    add(bm_caixa(*s, sem=sem), mat, (M or Matrix.Identity(4)) @ T(*p) @ R(*r))


def Redonda(p, s, mat, r=(0, 0, 0), n=(4, 3, 6), pot=3.0, afiar=60):
    """caixa arredondada (superelipsoide): tanque, banco, cárter"""
    bm = bm_caixa(2, 2, 2, n)
    for v in bm.verts:
        q = v.co
        L = (abs(q.x) ** pot + abs(q.y) ** pot + abs(q.z) ** pot) ** (1 / pot)
        v.co = Vector((q.x / L * s[0] / 2, q.y / L * s[1] / 2, q.z / L * s[2] / 2))
    add(bm, mat, T(*p) @ R(*r), afiar)


def Cil(a, b, r0, r1, seg, mat, tampa=True, afiar=40):
    a, b = Vector(a), Vector(b)
    d = b - a
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=tampa, cap_tris=False, segments=seg, radius1=r0, radius2=r1,
                          depth=d.length, matrix=T(0, 0, d.length / 2))
    add(bm, mat, T(*a) @ para(d), afiar)


def Viga(a, b, larg, alt, mat, cima=(0, 1, 0)):
    a, b = Vector(a), Vector(b)
    z = (b - a).normalized()
    y = Vector(cima)
    x = y.cross(z).normalized()
    y = z.cross(x)
    add(bm_caixa(larg, alt, (b - a).length), mat, base((a + b) / 2, x, y, z))


def Tubo(pts, raio, lados, mat, tampa=True, afiar=40):
    pts = [Vector(p) for p in pts]
    n = len(pts)
    Tg = [(pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)]).normalized() for i in range(n)]
    a = Vector((1, 0, 0)) if abs(Tg[0].x) < 0.9 else Vector((0, 1, 0))
    N = [(a - Tg[0] * a.dot(Tg[0])).normalized()]
    for i in range(1, n):
        nn = N[-1] - Tg[i] * N[-1].dot(Tg[i])
        N.append(nn.normalized() if nn.length > 1e-8 else N[-1])
    bm = bmesh.new()
    an = []
    for i in range(n):
        bb = Tg[i].cross(N[i])
        an.append([bm.verts.new(pts[i] + raio * (math.cos(TAU * k / lados) * N[i] + math.sin(TAU * k / lados) * bb))
                   for k in range(lados)])
    for i in range(n - 1):
        for k in range(lados):
            bm.faces.new((an[i][k], an[i][(k + 1) % lados], an[i + 1][(k + 1) % lados], an[i + 1][k]))
    if tampa:
        bm.faces.new(an[0])
        bm.faces.new(an[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    add(bm, mat, None, afiar)


def Fita(pts, larg, esp, mat, cima=(0, 1, 0), afiar=50):
    """uma chapa grossa seguindo uma linha (paralamas); larg pode ser lista"""
    pts = [Vector(p) for p in pts]
    n = len(pts)
    W = larg if isinstance(larg, (list, tuple)) else [larg] * n
    bm = bmesh.new()
    an = []
    for i in range(n):
        t = (pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)]).normalized()
        s = t.cross(Vector(cima)).normalized()
        u = s.cross(t).normalized()
        p, w = pts[i], W[i] / 2
        an.append([bm.verts.new(p + s * w * a + u * esp / 2 * c) for a, c in ((-1, -1), (1, -1), (1, 1), (-1, 1))])
    for i in range(n - 1):
        for k in range(4):
            bm.faces.new((an[i][k], an[i][(k + 1) % 4], an[i + 1][(k + 1) % 4], an[i + 1][k]))
    bm.faces.new(an[0])
    bm.faces.new(an[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    add(bm, mat, None, afiar)


def Perfil(pts2, esp, M, mat, cf=None):
    """um polígono (u, v) extrudado esp em w, posto pela matriz M (u=X, v=Y, w=Z local)"""
    bm = bmesh.new()
    vs = [bm.verts.new((u, v, -esp / 2)) for u, v in pts2]
    f = bm.faces.new(vs)
    r = bmesh.ops.extrude_face_region(bm, geom=[f])
    nv = [g for g in r["geom"] if isinstance(g, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, vec=(0, 0, esp), verts=nv)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    add(bm, mat, M, 40, cf)


def ToroEixo(c, eixo, Rm, rr, rl, seg, lados, mat, fase=0.0, afiar=None):
    """anel em volta do eixo (pneu, aro, molas): rr no raio, rl no lado"""
    z = Vector(eixo).normalized()
    a = Vector((0, 1, 0)) if abs(z.y) < 0.9 else Vector((1, 0, 0))
    x = (a - z * a.dot(z)).normalized()
    y = z.cross(x)
    bm = bmesh.new()
    vs = []
    for k in range(seg):
        t = TAU * (k + fase) / seg
        d = x * math.cos(t) + y * math.sin(t)
        vs.append([bm.verts.new(Vector(c) + d * (Rm + rr * math.cos(TAU * j / lados)) + z * (rl * math.sin(TAU * j / lados)))
                   for j in range(lados)])
    for k in range(seg):
        A, B2 = vs[k], vs[(k + 1) % seg]
        for j in range(lados):
            bm.faces.new((A[j], B2[j], B2[(j + 1) % lados], A[(j + 1) % lados]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    add(bm, mat, None, afiar)


def Rebites(pts, mat="cromo", s=0.012):
    for p in pts:
        Caixa(p, (s, s, s), mat)


# ═══════════════ as rodas (eixo em X, no pivô) ═══════════════
def roda(frente):
    R0, rr, rl = 0.318, 0.072, (0.062 if frente else 0.078)    # o pneu: até 0,39 (o raio do giro)
    SEG = 28
    ToroEixo((0, 0, 0), (1, 0, 0), R0, rr, rl, SEG, 8, "pneu", afiar=None)
    # os cravos: fileiras alternadas (2 no ombro / 1 no meio + 2 no lado), sem o fundo
    X = Vector((1, 0, 0))
    for i in range(SEG):
        t = TAU * (i + 0.5) / SEG
        d = Vector((0, math.cos(t), math.sin(t)))
        tg = Vector((0, -math.sin(t), math.cos(t)))
        for b in ((-0.5, 0.5) if i % 2 == 0 else (0.0, -1.05, 1.05)):
            n = d * math.cos(b) + X * math.sin(b)
            lat = -d * math.sin(b) + X * math.cos(b)
            c = d * (R0 + rr * math.cos(b)) + X * (rl * math.sin(b)) + n * 0.011
            w = 0.034 if abs(b) < 0.9 else 0.026
            add(bm_caixa(0.046, w, 0.026, sem=("-z",)), "pneu", base(c, tg, lat, n), 30)
    # o aro: metal escuro com a fita neon por dentro (o "aro neon")
    ToroEixo((0, 0, 0), (1, 0, 0), 0.262, 0.018, 0.026, SEG, 4, "escuroMetal", 0.5, afiar=50)
    ToroEixo((0, 0, 0), (1, 0, 0), 0.241, 0.006, 0.018, SEG, 3, "neon", afiar=None)
    # o cubo e os raios (16, cruzados de um lado pro outro)
    Cil((-0.075, 0, 0), (0.075, 0, 0), 0.045, 0.045, 10, "cromo")
    for k in range(16):
        t = TAU * k / 16
        lado = 1 if k % 2 else -1
        a = Vector((lado * 0.05, 0.05 * math.cos(t), 0.05 * math.sin(t)))
        t2 = t + lado * 0.35
        b = Vector((lado * 0.012, 0.248 * math.cos(t2), 0.248 * math.sin(t2)))
        z = (b - a).normalized()
        add(bm_caixa(0.007, 0.007, (b - a).length, sem=("+z", "-z")), "aluminio", base((a + b) / 2, X.cross(z).normalized(), z.cross(X.cross(z).normalized()), z), 50)
    if frente:
        # o disco de freio (esquerda), furado no desenho: um anel e o miolo
        Cil((-0.072, 0, 0), (-0.064, 0, 0), 0.125, 0.125, 18, "escape")
        Cil((-0.075, 0, 0), (-0.061, 0, 0), 0.06, 0.06, 6, "ferrugem")
    else:
        # a coroa (esquerda): enferrujada, de sucata, com os dentes
        Cil((-0.088, 0, 0), (-0.08, 0, 0), 0.098, 0.098, 14, "ferrugem")
        for k in range(14):
            t = TAU * (k + 0.5) / 14
            d = Vector((0, math.cos(t), math.sin(t)))
            add(bm_caixa(0.008, 0.02, 0.02, sem=("-y",)), "ferrugem", base(d * 0.106, X, d, X.cross(d)), 50)


G[0] = "roda_t"
roda(False)
G[0] = "roda_f"
roda(True)

# ═══════════════ o garfo (pivô: o eixo da frente) ═══════════════
G[0] = "garfo"
CAI = 0.42                                                    # o cáster do código (rotation-x -0,42)
UP = Vector((0, math.cos(CAI), -math.sin(CAI)))               # subindo pelo garfo
FR = Vector((0, math.sin(CAI), math.cos(CAI)))                # pra frente, de pé pro garfo
XV = Vector((1, 0, 0))


def P(t, x=0.0, f=0.0):
    return Vector((x, 0, 0)) + UP * t + FR * f


for lx in (-0.1, 0.1):
    Cil(P(-0.04, lx), P(0.43, lx), 0.037, 0.034, 8, "escuroMetal")       # a perna (botinha)
    Cil(P(0.40, lx), P(0.96, lx), 0.027, 0.027, 8, "garfo")              # o tubo dourado
    Caixa(P(0.0, lx, -0.01), (0.05, 0.07, 0.085), "aluminio", M=base((0, 0, 0), XV, UP, FR))
    # o protetor da perna: um branco, o outro uma chapa de zinco rebitada (sucata)
    add(bm_caixa(0.012, 0.3, 0.075), "plastico" if lx < 0 else "zinco", base(P(0.2, lx + (0.012 if lx > 0 else -0.012), 0.045), XV, UP, FR))
Rebites([P(0.1, 0.118, 0.06), P(0.3, 0.118, 0.06)])
Caixa(P(0.09, -0.1, -0.075), (0.04, 0.09, 0.05), "garfo", M=base((0, 0, 0), XV, UP, FR))  # a pinça do freio
# as mesas (de baixo e de cima) e a coluna da direção
for t, mat in ((0.72, "escuroMetal"), (0.9, "cromo")):
    add(bm_caixa(0.3, 0.035, 0.12), mat, base(P(t, 0, -0.03), XV, UP, FR))
Cil(P(0.70, 0, -0.06), P(0.92, 0, -0.06), 0.03, 0.03, 8, "escuroMetal")
# o guidão alto (de trilha), as manoplas, os manetes e a espuma da barra
for lx in (-0.055, 0.055):
    Cil(P(0.91, lx, -0.07), (lx, 0.88, -0.335), 0.014, 0.014, 6, "cromo")
bar = [(-0.37, 0.935, -0.40), (-0.25, 0.92, -0.375), (-0.13, 0.895, -0.34), (0, 0.89, -0.335),
       (0.13, 0.895, -0.34), (0.25, 0.92, -0.375), (0.37, 0.935, -0.40)]
Tubo(bar, 0.012, 6, "escuroMetal")
Caixa((0, 0.915, -0.338), (0.2, 0.04, 0.04), "moto")
for s in (-1, 1):
    Cil((s * 0.27, 0.927, -0.385), (s * 0.37, 0.935, -0.40), 0.021, 0.021, 8, "escuro")
    Cil((s * 0.37, 0.935, -0.40), (s * 0.385, 0.936, -0.402), 0.023, 0.023, 8, "neonRosa")
    Viga((s * 0.22, 0.925, -0.37), (s * 0.33, 0.915, -0.30), 0.012, 0.01, "cromo")
# os fios da frente: um neon rosa enrolado no garfo, do farol até o guidão
Tubo([P(0.76, -0.06, 0.07), P(0.86, -0.09, 0.02), (-0.12, 0.9, -0.33)], 0.006, 4, "neonRosa", afiar=None)
# o paralama alto: sai debaixo da mesa e avança por cima do pneu
para_f = [(0, 0.60, -0.36), (0, 0.615, -0.2), (0, 0.61, 0.0), (0, 0.585, 0.18), (0, 0.54, 0.34), (0, 0.47, 0.46)]
Fita(para_f, [0.14, 0.19, 0.2, 0.19, 0.17, 0.14], 0.014, "plastico")
Fita([(x, y + 0.009, z) for x, y, z in para_f[1:-1]], 0.05, 0.006, "moto")
# a máscara do farol: chapa de placa de rua (azul desbotado), dois faróis e as fitas neon
NM = Vector((0, 0.33, 0.944))                                  # a normal da máscara (olha pra frente, um pouco pra cima)
VM = Vector((0, 0.944, -0.33))                                 # o "pra cima" da máscara
MM = base((0, 0.79, -0.215), XV, VM, NM)
mask = [(-0.13, -0.11), (0.13, -0.11), (0.15, 0.04), (0.1, 0.14), (-0.1, 0.14), (-0.15, 0.04)]
Perfil(mask, 0.02, MM, "azul")
Perfil([(-0.135, 0.12), (0.135, 0.12), (0.1, 0.145), (-0.1, 0.145)], 0.024, MM, "plastico")  # a borda branca de cima
for (u, v, r) in ((0.0, 0.02, 0.058), (0.0, -0.075, 0.03)):
    c = MM @ Vector((u, v, 0.0))
    Cil(c, c + NM * 0.035, r + 0.01, r + 0.008, 12, "escuroMetal")
    Cil(c + NM * 0.03, c + NM * 0.04, r, r, 12, "farol")
for u in (-0.105, 0.105):
    Caixa((u, -0.01, 0.014), (0.014, 0.13, 0.008), "neon", M=MM)
Rebites([MM @ Vector((u, v, 0.012)) for u, v in ((-0.11, -0.09), (0.11, -0.09), (-0.12, 0.1), (0.12, 0.1))])

# ═══════════════ o quadro (pivô: a origem do nariz) ═══════════════
G[0] = "quadro"
# a coluna (encaixa entre as mesas) e o tubo de cima, por baixo do tanque
FE = Vector((0, 0.39, 0.66))
Cil(FE + P(0.70, 0, -0.11), FE + P(0.93, 0, -0.11), 0.034, 0.034, 8, "escuroMetal")
Tubo([FE + P(0.86, 0, -0.13), (0, 0.98, 0.1), (0, 0.86, -0.22)], 0.024, 6, "escuroMetal")
# o berço duplo (descendo na frente do motor, passando por baixo e subindo atrás)
for s in (-1, 1):
    berco = [FE + P(0.74, s * 0.02, -0.14), (s * 0.05, 0.78, 0.3), (s * 0.065, 0.42, 0.27), (s * 0.075, 0.22, 0.13),
             (s * 0.075, 0.19, -0.08), (s * 0.085, 0.42, -0.2), (s * 0.085, 0.84, -0.24)]
    Tubo(berco, 0.021, 6, "escuroMetal")
    # o neon de baixo, amarrado no berço (abraçadeiras)
    Tubo([(s * 0.098, 0.4, 0.26), (s * 0.098, 0.23, 0.13), (s * 0.098, 0.205, -0.07), (s * 0.1, 0.4, -0.18)], 0.008, 4, "neon", afiar=None)
    for p in ((s * 0.098, 0.3, 0.2), (s * 0.098, 0.2, 0.02)):
        Caixa(p, (0.012, 0.03, 0.03), "escuro")
    # o subquadro: um lado é tubo enferrujado de outra moto (sucata)
    sub = "ferrugem" if s > 0 else "escuroMetal"
    Tubo([(s * 0.085, 0.84, -0.22), (s * 0.085, 0.87, -0.5), (s * 0.08, 0.89, -0.78)], 0.016, 6, sub)
    Tubo([(s * 0.085, 0.5, -0.22), (s * 0.085, 0.86, -0.62)], 0.014, 6, sub)
    # a balança (até o eixo de trás) e o esticador da corrente
    Viga((s * 0.1, 0.43, -0.2), (s * 0.1, 0.39, -0.66), 0.03, 0.055, "aluminio")
    Caixa((s * 0.1, 0.39, -0.62), (0.04, 0.035, 0.07), "garfo")
    # as pedaleiras (o piloto pisa em ~(±0,2, 0,4, -0,15)) e o suporte
    Caixa((s * 0.19, 0.375, -0.15), (0.12, 0.025, 0.055), "cromo")
    for k in range(3):
        Caixa((s * (0.15 + k * 0.04), 0.39, -0.15), (0.008, 0.012, 0.058), "escuroMetal")
    Caixa((s * 0.11, 0.39, -0.17), (0.05, 0.06, 0.05), "escuroMetal")
# o amortecedor de trás: haste, corpo e a mola rosa
Cil((0, 0.48, -0.36), (0, 0.86, -0.22), 0.018, 0.018, 8, "cromo")
Cil((0, 0.68, -0.29), (0, 0.86, -0.22), 0.032, 0.032, 8, "escuroMetal")
eixoA = (Vector((0, 0.86, -0.22)) - Vector((0, 0.48, -0.36))).normalized()
for k in range(5):
    ToroEixo(Vector((0, 0.5, -0.35)) + eixoA * (0.03 + k * 0.042), eixoA, 0.036, 0.008, 0.008, 8, 3, "motoFosco")
# o motor: cárter, tampas, cilindro aletado, cabeçote, carburador e filtro
Redonda((0, 0.37, 0.03), (0.2, 0.22, 0.34), "motor", n=(2, 2, 3), pot=4)
Cil((0.1, 0.36, -0.02), (0.13, 0.36, -0.02), 0.1, 0.095, 12, "aluminio")
Cil((-0.1, 0.38, 0.07), (-0.125, 0.38, 0.07), 0.07, 0.065, 10, "escape")
Cil((-0.1, 0.35, -0.04), (-0.12, 0.35, -0.04), 0.038, 0.038, 8, "escuroMetal")  # o pinhão
EC = Vector((0, 0.966, 0.259))
c0 = Vector((0, 0.5, 0.1))
Cil(c0, c0 + EC * 0.24, 0.062, 0.058, 8, "motor")
XC = Vector((1, 0, 0))
for k in range(6):
    add(bm_caixa(0.17, 0.16, 0.01), "aluminio", base(c0 + EC * (0.04 + k * 0.033), XC, EC.cross(XC), EC))
Redonda(tuple(c0 + EC * 0.25), (0.15, 0.07, 0.15), "motor", r=(-0.26, 0, 0), n=(2, 1, 2), pot=4)
Cil(c0 + EC * 0.27, c0 + EC * 0.31, 0.01, 0.01, 6, "plastico")       # a vela
Tubo([tuple(c0 + EC * 0.31), (0.03, 0.83, 0.15), (0.12, 0.8, 0.1)], 0.006, 4, "neonRosa", afiar=None)  # o cabo de vela neon
Caixa((0, 0.6, -0.1), (0.09, 0.08, 0.1), "zinco")
Cil((0.04, 0.6, -0.16), (0.16, 0.62, -0.2), 0.045, 0.05, 8, "azul")    # o filtro: uma lata pintada
# a corrente (esquerda): do pinhão até a coroa
Viga((-0.085, 0.39, -0.04), (-0.085, 0.49, -0.62), 0.012, 0.012, "escuroMetal")
Viga((-0.085, 0.31, -0.04), (-0.085, 0.292, -0.62), 0.012, 0.012, "escuroMetal")
# o escape: coletor (com a curva na frente do motor) e a ponteira com o anel neon
Tubo([(0.0, 0.69, 0.2), (0.05, 0.63, 0.28), (0.12, 0.51, 0.27), (0.15, 0.42, 0.15), (0.16, 0.43, -0.04),
      (0.17, 0.54, -0.21), (0.175, 0.6, -0.29)], 0.024, 6, "escape")
pa, pb = Vector((0.175, 0.6, -0.27)), Vector((0.185, 0.74, -0.8))
Cil(pa, pb, 0.05, 0.058, 10, "escape")
de = (pb - pa).normalized()
Cil(pa + de * 0.12, pa + de * 0.17, 0.053, 0.054, 10, "ferrugem")      # a braçadeira velha
Cil(pb, pb + de * 0.03, 0.045, 0.04, 10, "cromo")
ToroEixo(pb + de * 0.005, de, 0.058, 0.006, 0.006, 10, 3, "neon")
Perfil([(-0.1, -0.03), (0.12, -0.03), (0.12, 0.03), (-0.1, 0.03)], 0.006,
       base(pa + de * 0.3 + Vector((0.058, 0, 0)), de, Vector((1, 0, 0)).cross(de).normalized(), Vector((1, 0, 0))), "zinco")  # o protetor de calor
# o tanque: rosa, com um remendo de zinco rebitado, a tampa cromada e a fita neon em cima
Redonda((0, 0.9, 0.14), (0.3, 0.2, 0.46), "moto", r=(-0.12, 0, 0), n=(4, 3, 6), pot=3)
Perfil([(-0.08, -0.05), (0.09, -0.06), (0.1, 0.05), (-0.07, 0.06)], 0.008, base((0.148, 0.9, 0.1), Vector((0, 0, 1)), Vector((0, 1, 0)), Vector((1, 0, 0))), "zinco")
Rebites([(0.155, 0.85, 0.03), (0.155, 0.85, 0.19), (0.155, 0.95, 0.02), (0.155, 0.95, 0.18)])
Cil((0, 0.99, 0.16), (0, 1.01, 0.16), 0.035, 0.035, 10, "cromo")
Fita([(0, 0.988, 0.33), (0, 1.002, 0.24)], 0.03, 0.006, "neon")
Fita([(0, 1.002, 0.08), (0, 0.985, -0.04)], 0.03, 0.006, "neon")
# as abas do radiador (uma branca, a outra de zinco) com o friso rosa
for s in (-1, 1):
    aba = [(0.0, 0.0), (0.2, 0.045), (0.23, -0.09), (0.09, -0.2), (0.0, -0.15)]
    Mb = base((s * 0.165, 0.96, 0.43), Vector((0, 0, -1)), Vector((0, 1, 0)), Vector((s, 0, 0)) * 1)
    Perfil(aba, 0.012, Mb, "plastico" if s < 0 else "zinco")
    Fita([Mb @ Vector((0.02, -0.02, 0.008)), Mb @ Vector((0.185, 0.025, 0.008))], 0.018, 0.004, "moto", cima=(s, 0, 0))
    Caixa((s * 0.12, 0.76, 0.3), (0.05, 0.22, 0.16), "escuroMetal", r=(-0.15, 0, 0))   # o radiador
if True:  # os rebites da aba de zinco
    Rebites([(0.172, 0.9, 0.36), (0.172, 0.84, 0.27), (0.172, 0.8, 0.33)])
# o banco comprido, com duas voltas de fita prata (remendo)
Redonda((0, 0.925, -0.36), (0.24, 0.085, 0.68), "banco", r=(0.03, 0, 0), n=(3, 2, 8), pot=4)
for z in (-0.25, -0.52):
    Caixa((0, 0.928 + 0.008 * (z + 0.36), z), (0.25, 0.092, 0.055), "fita", r=(0.03, 0, 0))
# as laterais: pedaço de placa de rua (azul com a borda branca)
for s in (-1, 1):
    lat = [(0.0, 0.0), (0.3, 0.04), (0.33, -0.16), (0.08, -0.2)]
    Ml = base((s * 0.115, 0.87, -0.34), Vector((0, 0, -1)), Vector((0, 1, 0)), Vector((s, 0, 0)))
    Perfil(lat, 0.01, Ml, "azul")
    Fita([Ml @ Vector((0.02, -0.02, 0.006)), Ml @ Vector((0.3, 0.015, 0.006))], 0.012, 0.004, "plastico", cima=(s, 0, 0))
    Fita([Ml @ Vector((0.06, -0.17, 0.006)), Ml @ Vector((0.3, -0.135, 0.006))], 0.012, 0.004, "plastico", cima=(s, 0, 0))
# o paralama de trás (alto, subindo) e a lanterna vermelha
para_t = [(0, 0.89, -0.62), (0, 0.9, -0.78), (0, 0.93, -0.94), (0, 0.97, -1.07)]
Fita(para_t, [0.2, 0.2, 0.18, 0.14], 0.014, "moto")
Caixa((0, 0.945, -1.0), (0.1, 0.035, 0.03), "lanterna", r=(-0.3, 0, 0))
Caixa((0, 0.885, -0.96), (0.13, 0.02, 0.018), "neon", r=(-0.3, 0, 0))     # a fita neon embaixo do rabo

# ═══════════════ monta os objetos ═══════════════
PIVO = {"roda_t": (0, 0.39, -0.62), "roda_f": (0, 0.39, 0.66), "garfo": (0, 0.39, 0.66), "quadro": (0, 0, 0)}
CB = Matrix(((1, 0, 0), (0, 0, -1), (0, 1, 0)))                 # jogo (x, y, z) → Blender (x, -z, y)

mt = bpy.data.materials.new("moto_pecas")
try:
    mt.use_nodes = True
except Exception:
    pass
bsdf = next(n for n in mt.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
vcn = mt.node_tree.nodes.new("ShaderNodeVertexColor")
vcn.layer_name = "Col"
mt.node_tree.links.new(vcn.outputs["Color"], bsdf.inputs["Base Color"])

OBJ = {}
for g in GRUPOS:
    b = BUF[g]
    me = bpy.data.meshes.new(g)
    me.from_pydata([tuple(CB @ v) for v in b["v"]], [], b["f"])
    cs, rm, em = [], [], []
    for f, mk in zip(b["f"], b["m"]):
        c, r, e = MAT[mk]
        for _ in f:
            cs.extend((c[0], c[1], c[2], 1.0))
            rm.extend(r)
            em.extend(e)
    at = me.color_attributes.new("Base", "FLOAT_COLOR", "CORNER")
    at.data.foreach_set("color", cs)
    a2 = me.attributes.new("_RM", "FLOAT2", "CORNER")
    a2.data.foreach_set("vector", rm)
    a3 = me.attributes.new("_EMI", "FLOAT_VECTOR", "CORNER")
    a3.data.foreach_set("vector", em)
    me.polygons.foreach_set("use_smooth", [True] * len(me.polygons))
    me.update()
    me.materials.append(mt)
    o = bpy.data.objects.new(g, me)
    COL.objects.link(o)
    o.location = CB @ Vector(PIVO[g])
    OBJ[g] = o

vl = bpy.context.view_layer
vl.update()

# ── a AO assada na cor dos vértices (Cycles), com o chão embaixo ──
for o in OBJ.values():
    ao = o.data.color_attributes.new("AO", "FLOAT_COLOR", "CORNER")
    o.data.color_attributes.active_color = ao
mc = bpy.data.meshes.new("chao_bake")
mc.from_pydata([(-3, -3, 0), (3, -3, 0), (3, 3, 0), (-3, 3, 0)], [], [(0, 1, 2, 3)])
chao = bpy.data.objects.new("chao_bake", mc)
sc.collection.objects.link(chao)
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
sc.world.light_settings.distance = 0.25
vl.update()
for o in sc.objects:
    o.select_set(False)
for o in OBJ.values():
    o.select_set(True)
vl.objects.active = OBJ["quadro"]
print("BAKE", bpy.ops.object.bake(type="AO", target="VERTEX_COLORS"))
bpy.data.objects.remove(chao, do_unlink=True)

for o in OBJ.values():
    me = o.data
    bc_ = me.color_attributes["Base"]
    n = len(bc_.data)
    bc = [0.0] * (n * 4)
    bc_.data.foreach_get("color", bc)
    ac = [0.0] * (n * 4)
    me.color_attributes["AO"].data.foreach_get("color", ac)
    for i in range(n):
        a = 0.3 + 0.7 * ac[i * 4]
        for c in range(3):
            bc[i * 4 + c] = min(1.0, bc[i * 4 + c] * a)
    me.color_attributes.remove(me.color_attributes["AO"])
    me.color_attributes.remove(me.color_attributes["Base"])
    col = me.color_attributes.new("Col", "FLOAT_COLOR", "CORNER")
    col.data.foreach_set("color", bc)
    me.color_attributes.active_color = col
    me.color_attributes.render_color_index = me.color_attributes.active_color_index

if BLEND:
    bpy.ops.wm.save_as_mainfile(filepath=BLEND)

# os nós vão na origem: a malha já está no referencial do pivô, e o meshopt
# (quantização) guarda a escala dele no nó; o jogo aplica a matriz do nó e pronto
for o in OBJ.values():
    o.location = (0, 0, 0)
vl.update()
for o in sc.objects:
    o.select_set(False)
for o in OBJ.values():
    o.select_set(True)
vl.objects.active = OBJ["quadro"]
print(bpy.ops.export_scene.gltf(filepath=SAIDA, export_format="GLB", use_selection=True, export_texcoords=False,
      export_normals=True, export_materials="EXPORT", export_yup=True, export_apply=True,
      export_vertex_color="ACTIVE", export_attributes=True))
tot = 0
for g, o in OBJ.items():
    t = sum(len(p.vertices) - 2 for p in o.data.polygons)
    tot += t
    print("TRI", g, t)
print("TRI total", tot)
