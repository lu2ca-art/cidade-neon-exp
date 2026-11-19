# O POSTO DE RUA (06/11): antes eram caixas (app/linha/estrada/Bombas.tsx: duas
# colunas, o toldo, uma faixa de luz e a bomba vermelha). Aqui, UM modelo,
# reaproveitado em todas as bombas de postos.ts: o toldo retrô-futurista com o
# neon na borda e os painéis de luz embaixo, as colunas afinando, a ilha com as
# faixas de perigo, a bomba de combustível/recarga (o globo aceso em cima, a
# tela, a mangueira até o bico no coldre, o cabo de recarga enrolado do outro
# lado), a vaga pintada na pista, a lixeira e o totem com o preço.
#
#   blender -b --factory-startup --python blender/scripts/posto.py \
#     [--python blender/scripts/posto_foto.py] -- bruto.glb [foto.png]
#   npx @gltf-transform/cli optimize bruto.glb public/models/posto.glb \
#     --compress meshopt --simplify false --join false --flatten false --instance false --palette false
#
# Coordenadas: Blender Z pra cima. A origem é o pé da bomba = o meio do toldo
# (no jogo: a vaga + 4,5 m pra fora da pista). A PISTA fica do lado -X (no
# glTF também -X); o comprimento da pista corre em Y (no glTF, Z). O jogo gira
# 180° quando o posto está do outro lado (lado = -1). A vaga pintada fica em
# x = -4,5 (o ponto da vaga do jogo), no chão da pista.
# Um nó "posto" com as malhas:
#   posto_solido  estrutura, bomba, chão (cor no vértice × AO assada)
#   posto_luz     o que brilha com cor fixa (painéis do toldo, telas, globo, preço)
#   posto_neon    o neon, sem cor (o jogo pinta com a cor do posto)
# Orçamento: até 4 mil triângulos.

import bpy, bmesh, math, sys
from mathutils import Vector, Matrix, Color

TAU = 2 * math.pi
args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
SAIDA = args[0] if args else "/tmp/posto-bruto.glb"
IDS = ["posto"]

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
COL = bpy.data.collections.new("Posto")
sc.collection.children.link(COL)


# ── cores ──
def lin(h):
    if not isinstance(h, str):
        return tuple(h[:3]) + (1.0,)
    c = Color((int(h[1:3], 16) / 255, int(h[3:5], 16) / 255, int(h[5:7], 16) / 255))
    c = c.from_srgb_to_scene_linear()
    return (c.r, c.g, c.b, 1.0)


def dim(h, k):
    c = lin(h)
    return (c[0] * k, c[1] * k, c[2] * k, 1.0)


def hh(*a):
    x = math.sin(sum(v * k for v, k in zip(a, (12.9898, 78.233, 37.719, 4.581, 9.137)))) * 43758.5453
    return x - math.floor(x)


def escolhe(pal, *a):
    return pal[min(len(pal) - 1, int(hh(*a) * len(pal)))]


Z1, Z2 = "#7b8190", "#5d6270"           # zinco
FE, FE2 = "#7a4429", "#5a2f1e"          # ferrugem
AZ, VD = "#3d5c7c", "#4b6a4f"           # azul e verde desbotados
MD, MD2 = "#6f4f33", "#4c3524"          # madeira
CO, CO2 = "#6b6870", "#4d4b53"          # concreto
PR, BO = "#17151b", "#1e1c21"           # preto, borracha
VM = "#8a2c2a"
LAMP = "#ffd890"


# ── matrizes ──
def T(x, y, z):
    return Matrix.Translation((x, y, z))


def S(x, y, z):
    return Matrix.Diagonal((x, y, z, 1.0))


def R(rx=0.0, ry=0.0, rz=0.0):
    return Matrix.Rotation(rz, 4, "Z") @ Matrix.Rotation(ry, 4, "Y") @ Matrix.Rotation(rx, 4, "X")


def para(d):
    return Vector((0, 0, 1)).rotation_difference(Vector(d).normalized()).to_matrix().to_4x4()


# ── acumuladores: uma lista de vértices/faces/cores por (lugar, grupo) ──
BUF = {}
ATUAL = [None]
PAI = [Matrix.Identity(4)]
LET = {}
PISO = [0.0]  # a altura do chão de referência do sujo (o rodapé escurece)


class em:
    def __init__(self, M):
        self.M = M

    def __enter__(self):
        PAI.append(PAI[-1] @ self.M)

    def __exit__(self, *a):
        PAI.pop()


def add(bm, g, cor="#ffffff", M=None, cf=None, sujo=0.25, afiar=40):
    MM = PAI[-1] @ M if M is not None else PAI[-1]
    bmesh.ops.transform(bm, matrix=MM, verts=bm.verts)
    bm.normal_update()
    ij = bm.faces.layers.int.get("ij")
    tags = {f: (f[ij] if ij else 0) for f in bm.faces}
    cores = {}
    c0 = lin(cor or "#ffffff")
    for f in bm.faces:
        if cf:
            x = tags[f]
            cores[f] = lin(cf(f.calc_center_median(), f.normal.copy(), x // 1000, x % 1000))
        else:
            cores[f] = c0
    if afiar is not None:
        es = [e for e in bm.edges if e.is_manifold and e.calc_face_angle(0) > math.radians(afiar)]
        if es:
            bmesh.ops.split_edges(bm, edges=es)
    bm.verts.index_update()
    b = BUF.setdefault((ATUAL[0], g), {"v": [], "f": [], "c": []})
    base = len(b["v"])
    b["v"].extend(v.co.copy() for v in bm.verts)
    for f in bm.faces:
        cc = cores.get(f, c0)
        b["f"].append([base + l.vert.index for l in f.loops])
        cols = []
        for l in f.loops:
            k = 1.0
            if sujo and g == "solido":
                k = 1 - sujo * max(0.0, min(1.0, 1 - (l.vert.co.z - PISO[0]) / 1.3))
            cols.append((cc[0] * k, cc[1] * k, cc[2] * k, 1.0))
        b["c"].append(cols)
    bm.free()


# ── primitivas (bmesh) ──
def bm_caixa(sx, sy, sz, d=None):
    bm = bmesh.new()
    ij = bm.faces.layers.int.new("ij")
    if d is None:
        nx = ny = nz = 1
    else:
        dx, dy, dz = d if isinstance(d, tuple) else (d, d, d)
        nx, ny, nz = (max(1, round(s / q)) for s, q in ((sx, dx), (sy, dy), (sz, dz)))
    hx, hy, hz = sx / 2, sy / 2, sz / 2
    X, Y, Z = Vector((sx, 0, 0)), Vector((0, sy, 0)), Vector((0, 0, sz))

    def grade(o, U, V, nu, nv):
        vs = [[bm.verts.new(o + U * (i / nu) + V * (j / nv)) for j in range(nv + 1)] for i in range(nu + 1)]
        for i in range(nu):
            for j in range(nv):
                f = bm.faces.new((vs[i][j], vs[i + 1][j], vs[i + 1][j + 1], vs[i][j + 1]))
                f[ij] = i * 1000 + j
    grade(Vector((-hx, -hy, -hz)), X, Z, nx, nz)
    grade(Vector((hx, hy, -hz)), -X, Z, nx, nz)
    grade(Vector((-hx, hy, -hz)), -Y, Z, ny, nz)
    grade(Vector((hx, -hy, -hz)), Y, Z, ny, nz)
    grade(Vector((-hx, -hy, hz)), X, Y, nx, ny)
    grade(Vector((-hx, hy, -hz)), X, -Y, nx, ny)
    return bm


def B(g, p, s, cor=None, r=(0, 0, 0), d=None, cf=None, sujo=0.25):
    add(bm_caixa(*s, d=d), g, cor, T(*p) @ R(*r), cf, sujo)


def Cil(g, p, r0, r1, h, seg, cor=None, r=(0, 0, 0), cf=None, sujo=0.2, tampa=True):
    bm = bmesh.new()
    bm.faces.layers.int.new("ij")
    bmesh.ops.create_cone(bm, cap_ends=tampa, cap_tris=False, segments=seg, radius1=r0, radius2=r1,
                          depth=h, matrix=T(0, 0, h / 2))
    add(bm, g, cor, T(*p) @ R(*r), cf, sujo)


def Esfera(g, p, raio, u, v, cor=None, M=None):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=u, v_segments=v, radius=raio)
    add(bm, g, cor, T(*p) @ (M or Matrix.Identity(4)), None, 0)


def Viga(g, a, b, esp, cor=None, sujo=0.2):
    a, b = Vector(a), Vector(b)
    dv = b - a
    bm = bm_caixa(esp, esp, dv.length)
    add(bm, g, cor, T(*((a + b) / 2)) @ para(dv), None, sujo)


def bm_torno(perfil, seg, fechado=False):
    bm = bmesh.new()
    ij = bm.faces.layers.int.new("ij")
    aneis = []
    for r, h in perfil:
        if r < 1e-6:
            v = bm.verts.new((0, 0, h))
            aneis.append([v] * seg)
        else:
            aneis.append([bm.verts.new((r * math.cos(TAU * k / seg), r * math.sin(TAU * k / seg), h)) for k in range(seg)])
    n = len(aneis)
    for i in range(n if fechado else n - 1):
        A, Bn = aneis[i], aneis[(i + 1) % n]
        for k in range(seg):
            u = []
            for v in (A[k], A[(k + 1) % seg], Bn[(k + 1) % seg], Bn[k]):
                if v not in u:
                    u.append(v)
            if len(u) < 3:
                continue
            f = bm.faces.new(u)
            f[ij] = i * 1000 + k
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def Tor(g, p, Rm, rm, seg, lados, cor=None, r=(0, 0, 0), sujo=0.15):
    bm = bmesh.new()
    bm.faces.layers.int.new("ij")
    vs = []
    for k in range(seg):
        a = TAU * k / seg
        vs.append([bm.verts.new(((Rm + rm * math.cos(TAU * j / lados)) * math.cos(a),
                                 (Rm + rm * math.cos(TAU * j / lados)) * math.sin(a),
                                 rm * math.sin(TAU * j / lados))) for j in range(lados)])
    for k in range(seg):
        A, Bn = vs[k], vs[(k + 1) % seg]
        for j in range(lados):
            bm.faces.new((A[j], Bn[j], Bn[(j + 1) % lados], A[(j + 1) % lados]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    add(bm, g, cor, T(*p) @ R(*r), None, sujo)


def Tubo(g, pts, raio, lados, cor=None, sujo=0.1):
    pts = [Vector(p) for p in pts]
    n = len(pts)
    Tg = [(pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)]).normalized() for i in range(n)]
    a = Vector((0, 0, 1)) if abs(Tg[0].z) < 0.9 else Vector((1, 0, 0))
    N = [(a - Tg[0] * a.dot(Tg[0])).normalized()]
    for i in range(1, n):
        nn = N[-1] - Tg[i] * N[-1].dot(Tg[i])
        N.append(nn.normalized() if nn.length > 1e-8 else N[-1])
    bm = bmesh.new()
    bm.faces.layers.int.new("ij")
    aneis = []
    for i in range(n):
        b = Tg[i].cross(N[i])
        aneis.append([bm.verts.new(pts[i] + raio * (math.cos(TAU * k / lados) * N[i] + math.sin(TAU * k / lados) * b))
                      for k in range(lados)])
    for i in range(n - 1):
        A, Bn = aneis[i], aneis[i + 1]
        for k in range(lados):
            bm.faces.new((A[k], A[(k + 1) % lados], Bn[(k + 1) % lados], Bn[k]))
    bm.faces.new(aneis[0])
    bm.faces.new(aneis[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    add(bm, g, cor, None, None, sujo)


def Placa(g, o, U, V, nu, nv, cor=None, cf=None, filtro=None, sujo=0.15):
    """Uma grade de um lado só (a normal é U × V)."""
    o, U, V = Vector(o), Vector(U), Vector(V)
    bm = bmesh.new()
    ij = bm.faces.layers.int.new("ij")
    vs = [[bm.verts.new(o + U * (i / nu) + V * (j / nv)) for j in range(nv + 1)] for i in range(nu + 1)]
    for i in range(nu):
        for j in range(nv):
            if filtro and not filtro(i, j):
                continue
            f = bm.faces.new((vs[i][j], vs[i + 1][j], vs[i + 1][j + 1], vs[i][j + 1]))
            f[ij] = i * 1000 + j
    soltos = [v for v in bm.verts if not v.link_faces]
    if soltos:
        bmesh.ops.delete(bm, geom=soltos, context="VERTS")
    if not bm.faces:
        bm.free()
        return
    add(bm, g, cor, None, cf, sujo)


def Lona(g, o, U, V, nu, nv, sag, cor=None, cf=None, sdir=(0, 0, -1), esp=0.025):
    """Lona dos dois lados, caída no meio (sag em metros, na direção sdir)."""
    o, U, V, sdir = Vector(o), Vector(U), Vector(V), Vector(sdir)
    nrm = U.cross(V).normalized()
    bm = bmesh.new()
    ij = bm.faces.layers.int.new("ij")
    for camada in (0, 1):
        vs = []
        for i in range(nu + 1):
            linha = []
            for j in range(nv + 1):
                u, v = i / nu, j / nv
                p = o + U * u + V * v + sdir * (sag * math.sin(math.pi * v) * (0.6 + 0.4 * math.sin(math.pi * u))
                                               + 0.03 * math.sin(u * 17 + v * 5))
                if camada:
                    p = p - nrm * esp
                linha.append(bm.verts.new(p))
            vs.append(linha)
        for i in range(nu):
            for j in range(nv):
                q = (vs[i][j], vs[i + 1][j], vs[i + 1][j + 1], vs[i][j + 1])
                f = bm.faces.new(q if camada == 0 else q[::-1])
                f[ij] = i * 1000 + j
    add(bm, g, cor, None, cf, 0, afiar=None)


def Hex(g, c, raio, cor):
    """Um fundo de garrafa (hexágono) virado pra -Y."""
    c = Vector(c)
    bm = bmesh.new()
    vs = [bm.verts.new(c + Vector((raio * math.cos(TAU * k / 6 + 0.5), 0, raio * math.sin(TAU * k / 6 + 0.5)))) for k in range(6)]
    bm.faces.new(vs)
    add(bm, g, cor, None, None, 0)


def Leque(g, centro, Rr, seg, cor, frente=True):
    """Meio disco no plano XZ (o fundo do arco), virado pra -Y (frente) ou +Y."""
    c = Vector(centro)
    bm = bmesh.new()
    vc = bm.verts.new(c)
    ps = [bm.verts.new(c + Vector((Rr * math.cos(math.pi * k / seg), 0, Rr * math.sin(math.pi * k / seg)))) for k in range(seg + 1)]
    for k in range(seg):
        bm.faces.new((vc, ps[k], ps[k + 1]) if frente else (vc, ps[k + 1], ps[k]))
    add(bm, g, cor, None, None, 0.1)


def Tri(g, a, b, c, cor):
    bm = bmesh.new()
    bm.faces.new([bm.verts.new(Vector(p)) for p in (a, b, c)])
    add(bm, g, cor, None, None, 0.1)



# ── as cores do posto (retrô-futurista: o vermelho da bomba, creme, aço, o toldo escuro) ──
TO, TO2 = "#24212c", "#17151d"          # o toldo
SOB = "#8d93a3"                         # a parte de baixo do toldo (pega a luz)
VB, VB2 = "#c8322f", "#8e2220"          # o vermelho da bomba
CR = "#e4dccb"                          # creme
ACO, ACO2 = "#9aa3b6", "#5c6476"
AS = "#1b1c21"                          # o asfalto da vaga (só a borda)
TINTA = "#d9dde3"                       # a tinta da vaga
AMB = "#ffb44a"                         # âmbar (preço, globo)
CI = "#38e6ff"                          # ciano (recarga)
AM, PT = "#d9a11c", "#141317"           # faixa de perigo


def faixa(c, n, i, j):
    return AM if (i + j) % 2 else PT


# ── o chão: o pátio de concreto e o meio-fio pintado do lado da pista ──
def chao():
    PISO[0] = 0.0
    ladr = lambda c, n, i, j: escolhe([CO, CO2, "#5a5860", CO], i, j) if n.z > 0.5 else CO2
    B("solido", (0.35, 0, -0.17), (6.1, 11.6, 0.34), d=(1.2, 1.45, 0.34), cf=ladr, sujo=0)
    B("solido", (-2.66, 0, 0.0), (0.16, 11.6, 0.14), d=(0.16, 0.58, 0.14), cf=faixa, sujo=0)
    # a junta de dilatação: tiras escuras no pátio
    for y in (-2.9, 2.9):
        B("solido", (0.35, y, 0.003), (6.0, 0.04, 0.008), cor="#2a292e", sujo=0)


# ── a ilha da bomba ──
def ilha():
    B("solido", (0, 0, 0.11), (1.15, 3.3, 0.22), cor=CO, d=(1.15, 1.1, 0.22))
    for s in (-1, 1):  # as pontas com a faixa de perigo e o protetor
        Placa("solido", (0.575 * s, s * 1.651, 0.0), (-1.15 * s, 0, 0), (0, 0, 0.22), 8, 1, cf=faixa, sujo=0)
        Cil("solido", (0, s * 1.4, 0.22), 0.07, 0.07, 0.85, 8, cor=AM)
        Cil("solido", (0, s * 1.4, 1.07), 0.08, 0.08, 0.04, 8, cor=PT, sujo=0)


# ── as colunas (afinam pra cima, com o filete de neon virado pra pista) ──
def colunas():
    for y in (-3.5, 3.5):
        Cil("solido", (0, y, 0.22), 0.3, 0.3, 0.14, 10, cor=ACO2)
        Cil("solido", (0, y, 0.36), 0.22, 0.15, 4.8, 10, cor=ACO, sujo=0.35)
        B("neon", (-0.19, y, 2.6), (0.03, 0.05, 3.6), r=(0, -0.016, 0))
        # o capitel abrindo em leque até o toldo
        Cil("solido", (0, y, 5.0), 0.15, 0.45, 0.28, 10, cor=ACO2, sujo=0)


# ── o toldo: a laje com a borda, o neon em volta e os painéis de luz embaixo ──
def toldo():
    W, L, Z0, H = 4.4, 9.6, 5.2, 0.55
    B("solido", (0, 0, Z0 + 0.12), (W - 0.1, L - 0.1, 0.06), cor=SOB, d=(1.1, 1.2, 0.06), sujo=0)
    B("solido", (0, 0, Z0 + H - 0.05), (W, L, 0.1), cor=TO2, sujo=0)
    for s in (-1, 1):  # a borda (a fáscia) inclinada pra fora
        B("solido", (s * (W / 2 - 0.05), 0, Z0 + H / 2), (0.1, L, H), cor=TO, d=(0.1, 1.2, H), r=(0, s * 0.08, 0), sujo=0)
        B("solido", (0, s * (L / 2 - 0.05), Z0 + H / 2), (W, 0.1, H), cor=TO, d=(1.1, 0.1, H), r=(-s * 0.08, 0, 0), sujo=0)
        # o neon em duas linhas: embaixo, grosso; em cima, fino
        B("neon", (s * (W / 2 + 0.02), 0, Z0 + 0.1), (0.04, L + 0.04, 0.09))
        B("neon", (0, s * (L / 2 + 0.02), Z0 + 0.1), (W + 0.04, 0.04, 0.09))
        B("neon", (s * (W / 2 + 0.06), 0, Z0 + H - 0.06), (0.03, L + 0.1, 0.03))
        B("neon", (0, s * (L / 2 + 0.06), Z0 + H - 0.06), (W + 0.1, 0.03, 0.03))
    # os painéis de luz embaixo (6, dois por fileira)
    for x in (-0.95, 0.95):
        for y in (-3.0, 0.0, 3.0):
            B("solido", (x, y, Z0 + 0.075), (1.25, 1.85, 0.03), cor=ACO2, sujo=0)
            B("luz", (x, y, Z0 + 0.058), (1.1, 1.7, 0.012), cor="#fff1d6", sujo=0)
    # o selo do posto na fáscia da pista: um disco aceso com o anel de neon
    with em(T(-W / 2 - 0.08, 0, Z0 + H / 2) @ R(ry=math.pi / 2)):
        Cil("solido", (0, 0, -0.04), 0.42, 0.42, 0.06, 16, cor=TO2, sujo=0)
        Cil("luz", (0, 0, -0.01), 0.3, 0.3, 0.03, 16, cor=AMB, sujo=0)
        Tor("neon", (0, 0, 0.0), 0.36, 0.025, 16, 4)
    with em(T(W / 2 + 0.08, 0, Z0 + H / 2) @ R(ry=-math.pi / 2)):
        Cil("luz", (0, 0, -0.01), 0.3, 0.3, 0.03, 16, cor=AMB, sujo=0)
        Tor("neon", (0, 0, 0.0), 0.36, 0.025, 16, 4)


# ── a bomba: combustível de um lado, recarga do outro; a cara pra pista (-X) ──
def bomba():
    Z = 0.22  # em cima da ilha
    B("solido", (0, 0, Z + 0.06), (0.72, 1.0, 0.12), cor=PR)
    # o corpo com os ombros redondos (meio cilindro em cima)
    B("solido", (0, 0, Z + 0.12 + 0.62), (0.56, 0.86, 1.24), cor=VB, d=(0.56, 0.43, 0.62))
    Cil("solido", (0, -0.43, Z + 1.36), 0.28, 0.28, 0.86, 12, cor=VB, r=(-math.pi / 2, 0, 0))
    # a frente creme com a tela, o visor do preço e os botões
    B("solido", (-0.285, 0, Z + 0.95), (0.03, 0.66, 0.9), cor=CR)
    B("solido", (-0.305, 0, Z + 1.2), (0.02, 0.5, 0.3), cor=PR, sujo=0)
    B("luz", (-0.316, 0, Z + 1.2), (0.005, 0.44, 0.24), cor="#1f6f8a", sujo=0)
    B("luz", (-0.317, -0.08, Z + 1.24), (0.004, 0.22, 0.07), cor=AMB, sujo=0)
    B("luz", (-0.317, 0.1, Z + 1.14), (0.004, 0.16, 0.05), cor=CI, sujo=0)
    for k in range(3):
        for j in range(2):
            B("solido", (-0.305, -0.1 + k * 0.1, Z + 0.8 - j * 0.09), (0.025, 0.06, 0.05), cor=ACO, sujo=0)
    B("neon", (-0.31, 0, Z + 0.55), (0.02, 0.6, 0.05))  # a faixa de luz (a cor do posto)
    B("solido", (-0.29, 0, Z + 0.32), (0.02, 0.7, 0.18), cor=VB2, sujo=0)
    # o globo retrô aceso em cima
    Cil("solido", (0, 0, Z + 1.62), 0.09, 0.07, 0.1, 8, cor=ACO2, sujo=0)
    Esfera("luz", (0, 0, Z + 1.86), 0.17, 10, 6, AMB)
    Tor("solido", (0, 0, Z + 1.86), 0.17, 0.02, 12, 4, cor=CR, r=(math.pi / 2, 0, math.pi / 2))
    # o lado do combustível (+Y): o coldre, o bico e a mangueira em laço
    B("solido", (-0.12, 0.45, Z + 0.95), (0.18, 0.06, 0.22), cor=PR)
    B("solido", (-0.17, 0.5, Z + 0.98), (0.07, 0.07, 0.18), cor=ACO, r=(0.3, 0, 0), sujo=0)
    B("solido", (-0.22, 0.5, Z + 0.9), (0.12, 0.04, 0.03), cor=ACO2, sujo=0)
    Tubo("solido", [(0.05, 0.43, Z + 1.3), (0.08, 0.6, Z + 1.05), (0.04, 0.72, Z + 0.62), (-0.12, 0.7, Z + 0.3),
                    (-0.3, 0.62, Z + 0.36), (-0.3, 0.56, Z + 0.62), (-0.18, 0.52, Z + 0.86)], 0.024, 6, cor=BO)
    # o lado da recarga (-Y): a tomada com o anel ciano e o cabo enrolado no gancho
    B("solido", (0.02, -0.45, Z + 1.0), (0.3, 0.06, 0.3), cor=PR)
    Tor("luz", (0.02, -0.484, Z + 1.0), 0.09, 0.012, 12, 4, cor=CI, r=(math.pi / 2, 0, 0))
    Cil("solido", (0.02, -0.48, Z + 1.0), 0.05, 0.05, 0.08, 8, cor=ACO2, r=(math.pi / 2, 0, 0), sujo=0)
    Cil("solido", (-0.12, -0.44, Z + 0.62), 0.03, 0.03, 0.12, 6, cor=ACO, r=(math.pi / 2, 0, 0), sujo=0)
    pts = []
    for k in range(17):  # o cabo: desce da tomada, dá duas voltas no gancho
        a = k / 16 * TAU * 2
        r = 0.13
        pts.append((-0.12 + r * math.cos(a) * 0.6, -0.56 - 0.01 * k, Z + 0.5 + r * math.sin(a) - 0.004 * k))
    Tubo("solido", [(0.02, -0.5, Z + 0.95), (0.04, -0.56, Z + 0.78)] + pts, 0.02, 5, cor="#1d3a44")
    B("luz", (0.02, -0.484, Z + 1.24), (0.16, 0.004, 0.05), cor=CI, sujo=0)  # o "⚡" (a etiqueta acesa)


# ── a vaga pintada na pista (no ponto da vaga do jogo, x = -4,5) ──
def vaga():
    X, Lg, Wd, e = -4.5, 6.0, 2.7, 0.12
    z = 0.012
    for s in (-1, 1):
        B("solido", (X + s * Wd / 2, 0, z), (e, Lg, 0.01), cor=TINTA, sujo=0)
        B("solido", (X, s * Lg / 2, z), (Wd + e, e, 0.01), cor=TINTA, sujo=0)
    # as diagonais no meio e a seta do bico (pintadas)
    for k in (-1, 0, 1):
        B("solido", (X, k * 1.2, z), (Wd * 0.8, 0.1, 0.01), cor=AM, r=(0, 0, 0.6), sujo=0)
    Tri("solido", (X - 0.5, 2.0, z + 0.001), (X + 0.5, 2.0, z + 0.001), (X, 2.65, z + 0.001), TINTA)


# ── a lixeira (do lado da pista, perto da coluna) ──
def lixeira():
    with em(T(-1.15, -4.3, 0)):
        Cil("solido", (0, 0, 0), 0.26, 0.24, 0.86, 10, cor="#2f3d46")
        Tor("solido", (0, 0, 0.62), 0.255, 0.018, 10, 4, cor=AM)
        Cil("solido", (0, 0, 0.86), 0.28, 0.2, 0.1, 10, cor=PR)
        B("solido", (-0.22, 0, 0.82), (0.1, 0.18, 0.06), cor=PR, sujo=0)  # a boca
        Cil("solido", (0, 0, 0), 0.3, 0.3, 0.03, 10, cor=ACO2, sujo=0)


# ── o totem com o preço (perpendicular à pista: lido por quem chega dos dois lados) ──
SEG = {"0": "abcdef", "1": "bc", "2": "abged", "3": "abgcd", "4": "fgbc", "5": "afgcd",
       "6": "afgedc", "7": "abc", "8": "abcdefg", "9": "abcdfg"}


def numero(texto, u0, zc, y0, s, cor, w=0.19, h=0.34, t=0.04):
    """Escreve os dígitos (7 segmentos) na face do totem. s = -1 vira pra -Y, +1 pra +Y."""
    rx = 1 if s < 0 else -1  # a direita de quem olha

    def ret(a, b, z0, z1):
        Placa("luz", (rx * a + XT, y0, z0), (rx * (b - a), 0, 0), (0, 0, z1 - z0), 1, 1, cor=cor, sujo=0)
    u = u0
    for ch in texto:
        if ch == ",":
            ret(u - 0.05, u - 0.01, zc - h / 2, zc - h / 2 + 0.05)
            u += 0.02
            continue
        sg = SEG[ch]
        l, r = u, u + w
        if "a" in sg: ret(l + t, r - t, zc + h / 2 - t, zc + h / 2)
        if "g" in sg: ret(l + t, r - t, zc - t / 2, zc + t / 2)
        if "d" in sg: ret(l + t, r - t, zc - h / 2, zc - h / 2 + t)
        if "f" in sg: ret(l, l + t, zc + t / 2, zc + h / 2 - t)
        if "b" in sg: ret(r - t, r, zc + t / 2, zc + h / 2 - t)
        if "e" in sg: ret(l, l + t, zc - h / 2 + t, zc - t / 2)
        if "c" in sg: ret(r - t, r, zc - h / 2 + t, zc - t / 2)
        u += w + 0.07


XT, YT = -1.9, 6.4


def totem():
    with em(T(XT, YT, 0)):
        B("solido", (0, 0, 0.12), (1.5, 0.6, 0.24), cor=CO2)
        B("solido", (0, 0, 1.9), (1.3, 0.34, 3.4), cor=TO, d=(0.65, 0.34, 0.85))
        B("solido", (0, 0, 3.72), (1.42, 0.42, 0.3), cor=VB, sujo=0)
        B("neon", (0, 0, 3.88), (1.46, 0.46, 0.03))
        for s in (-1, 1):
            B("neon", (s * 0.67, 0, 1.9), (0.04, 0.38, 3.4))
            # os dois painéis pretos do preço
            for z in (2.75, 2.05):
                B("solido", (0, s * 0.175, z), (1.16, 0.01, 0.52), cor=PR, sujo=0)
            # o selo em cima e os ícones (gota âmbar, raio ciano)
            B("luz", (0, s * 0.212, 3.72), (0.9, 0.004, 0.14), cor=CR, sujo=0)
            B("luz", (0.47 * (1 if s < 0 else -1) * -1, s * 0.181, 2.75), (0.1, 0.004, 0.16), cor=AMB, sujo=0)
            B("luz", (0.47 * (1 if s < 0 else -1) * -1, s * 0.181, 2.05), (0.06, 0.004, 0.18), cor=CI, sujo=0)
    for s in (-1, 1):
        y0 = YT + s * 0.182
        numero("5,49", -0.33, 2.75, y0, s, AMB)
        numero("0,89", -0.33, 2.05, y0, s, CI)


ATUAL[0] = "posto"
chao()
ilha()
colunas()
toldo()
bomba()
vaga()
lixeira()
totem()


# ── vira objetos: um nó, uma malha por grupo ──
GRUPOS = ("solido", "luz", "neon")


def material(g):
    m = bpy.data.materials.new("posto_" + g)
    try:
        m.use_nodes = True
    except Exception:
        pass
    nt = m.node_tree
    b = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    if g == "neon":
        b.inputs["Base Color"].default_value = (0, 0, 0, 1)
        b.inputs["Emission Color"].default_value = (1, 1, 1, 1)
        b.inputs["Emission Strength"].default_value = 1.0
        return m
    a = nt.nodes.new("ShaderNodeVertexColor")
    a.layer_name = "Col"
    if g == "luz":
        b.inputs["Base Color"].default_value = (0, 0, 0, 1)
        nt.links.new(a.outputs["Color"], b.inputs["Emission Color"])
        b.inputs["Emission Strength"].default_value = 1.0
    else:
        nt.links.new(a.outputs["Color"], b.inputs["Base Color"])
        b.inputs["Roughness"].default_value = 0.6
    return m


MATS = {g: material(g) for g in GRUPOS}
e = bpy.data.objects.new("posto", None)
COL.objects.link(e)
for g in GRUPOS:
    b = BUF.get(("posto", g))
    if not b:
        continue
    me = bpy.data.meshes.new(f"posto_{g}")
    me.from_pydata([tuple(v) for v in b["v"]], [], b["f"])
    at = me.color_attributes.new("Base", "FLOAT_COLOR", "CORNER")
    at.data.foreach_set("color", [x for fc in b["c"] for c in fc for x in c])
    me.polygons.foreach_set("use_smooth", [True] * len(me.polygons))
    me.update()
    o = bpy.data.objects.new(f"posto_{g}", me)
    COL.objects.link(o)
    o.parent = e
    o["grupo"] = g
    me.materials.append(MATS[g])

vl = bpy.context.view_layer
vl.update()

# ── a AO assada na cor dos vértices (Cycles), só no sólido ──
solidos = [o for o in COL.objects if o.type == "MESH" and o["grupo"] == "solido"]
for o in solidos:
    ao = o.data.color_attributes.new("AO", "FLOAT_COLOR", "CORNER")
    o.data.color_attributes.active_color = ao
try:
    sc.render.engine = "CYCLES"
except TypeError as er:
    print("engine", er)
sc.cycles.samples = 64
try:
    pr = bpy.context.preferences.addons["cycles"].preferences
    pr.compute_device_type = "METAL"
    pr.get_devices()
    for d in pr.devices:
        d.use = True
    sc.cycles.device = "GPU"
except Exception as er:
    print("gpu", er)
if sc.world is None:
    sc.world = bpy.data.worlds.new("Mundo")
sc.world.light_settings.distance = 1.6
vl.update()
for o in sc.objects:
    o.select_set(False)
for o in solidos:
    o.select_set(True)
vl.objects.active = solidos[0]
print("BAKE", bpy.ops.object.bake(type="AO", target="VERTEX_COLORS"))

for o in COL.objects:
    if o.type != "MESH":
        continue
    me = o.data
    g = o["grupo"]
    if g == "neon":
        me.color_attributes.remove(me.color_attributes["Base"])
        continue
    base = me.color_attributes["Base"]
    n = len(base.data)
    bc = [0.0] * (n * 4)
    base.data.foreach_get("color", bc)
    if g == "solido":
        ao = me.color_attributes["AO"]
        ac = [0.0] * (n * 4)
        ao.data.foreach_get("color", ac)
        for i in range(n):
            a = 0.3 + 0.7 * ac[i * 4]
            bc[i * 4] *= a
            bc[i * 4 + 1] *= a
            bc[i * 4 + 2] *= a
        me.color_attributes.remove(ao)
    me.color_attributes.remove(me.color_attributes["Base"])
    col = me.color_attributes.new("Col", "FLOAT_COLOR", "CORNER")
    col.data.foreach_set("color", bc)
    me.color_attributes.active_color = col
    me.color_attributes.render_color_index = me.color_attributes.active_color_index

# ── exporta ──
for o in sc.objects:
    o.select_set(False)
for o in COL.objects:
    o.select_set(True)
vl.objects.active = e
print(bpy.ops.export_scene.gltf(filepath=SAIDA, export_format="GLB", use_selection=True, export_texcoords=False,
      export_normals=True, export_materials="EXPORT", export_yup=True, export_apply=True, export_vertex_color="ACTIVE",
      export_extras=True))
tot = {o["grupo"]: sum(len(p.vertices) - 2 for p in o.data.polygons) for o in COL.objects if o.type == "MESH"}
print("TRI", tot, "total", sum(tot.values()))
