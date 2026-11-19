# O METRÔ DA LINHA 9 (06/11): o trem do Núcleo, abandonado e reaproveitado. Aço
# escovado riscado, as faixas de cor (o azul do Núcleo pintado e as linhas de luz),
# janelas com grade, pichações (malha de brilho simples, sem textura), e por dentro
# os bancos de plástico de cores trocadas, as barras, as propagandas do Núcleo
# apagadas, a luz fluorescente (um tubo pisca, um queimou), as portas de correr.
#
#   blender -b --factory-startup --python blender/scripts/metro.py -- bruto.glb
#   blender -b --factory-startup --python blender/scripts/metro_foto.py -- bruto.glb docs/blender/metro.png
#   npx @gltf-transform/cli optimize bruto.glb public/models/metro.glb \
#     --compress meshopt --simplify false --join false --flatten false --instance false --palette false
#
# Aqui tudo é desenhado nas COORDENADAS DO JOGO (Y pra cima); o add() converte pro
# Blender (x, -z, y) e o glTF sai de volta igual. Quatro nós, todos na origem:
#   carro      o carro visto de fora (estrada/Metro.tsx; nos túneis, escala 1,53).
#              Origem no topo da viga, frente pra +Z, 3 × 3,2 × 13 m (y 0,5..3,7).
#              carro_solido · carro_brilho (janelas, faixas, pichação) · carro_farol
#              (o letreiro e os faróis da frente: só no primeiro carro)
#   vagao      o vagão por dentro (interior/salas/Vagao.tsx): x ±1,5, z ±9, y 0..2,5,
#              a porta aberta no +x em z 0, as janelas do −x em z −6,5 −3 3 6,5.
#              vagao_solido · vagao_luz (os tubos) · vagao_pisca (o tubo que pisca) ·
#              vagao_neon (pichação, placas de saída)
#   fuga       um vagão da fuga (metro/cena.ts), JÁ ESPELHADO (o X = −x de lá):
#              z 0..15, meia largura 1,3, altura 2,3, as baias [3, 4,4] e [10,6, 12].
#              fuga_solido · fuga_neon. Sem a porta da curva (lado +x do jogo, 2ª baia)
#   fugaporta  essa porta (o jogo põe em todos os vagões menos o último)
# Orçamento: carro ≤ 5 mil triângulos, vagão ≤ 20 mil, arquivo ≤ 700 KB.

import bpy, bmesh, math, sys
from mathutils import Vector, Matrix, Color

TAU = 2 * math.pi
args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
SAIDA = args[0] if args else "/tmp/metro-bruto.glb"

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
COL = bpy.data.collections.new("Metro")
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
    x = math.sin(sum(v * k for v, k in zip(a, (12.9898, 78.233, 37.719, 4.581, 9.137, 3.33)))) * 43758.5453
    return x - math.floor(x)


def escolhe(pal, *a):
    return pal[min(len(pal) - 1, int(hh(*a) * len(pal)))]


ACO = ["#aeb4bd", "#b8bdc6", "#a3a9b3", "#c1c6ce", "#9ba1ab"]
ACO_IN = ["#c3c8cf", "#cdd1d8", "#b9bec6", "#d3d6dc"]
RISCO = "#6c717a"
FERRUGEM = "#7a4a2e"
AZUL = "#2c5aa8"        # o azul do Núcleo, pintado
LARANJA = "#c8652c"     # a tinta laranja do reaproveitamento
PRIMER = "#8a3b2c"
BORRACHA = "#1b1c20"
VIDRO_ESC = "#0b0e16"
PISO = "#3a3d44"
NEONS = ["#ff3fb0", "#2fe8ff", "#ffc857", "#5dffa0", "#b38cff", "#ff6a35"]
PLASTICO = ["#c46a2c", "#2d4f9a", "#c9a332", "#7c818a", "#9a3a30", "#2d7a6a", "#c46a2c", "#2d4f9a"]
JANELA = "#cfe6ff"


# ── matrizes (no espaço do jogo) ──
def T(x, y, z):
    return Matrix.Translation((x, y, z))


def S(x, y, z):
    return Matrix.Diagonal((x, y, z, 1.0))


def R(rx=0.0, ry=0.0, rz=0.0):
    return Matrix.Rotation(ry, 4, "Y") @ Matrix.Rotation(rx, 4, "X") @ Matrix.Rotation(rz, 4, "Z")


# jogo (x, y, z) → Blender (x, −z, y)
G = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))
GI = G.inverted()

BUF = {}
ATUAL = ["carro"]
PAI = [Matrix.Identity(4)]


class em:
    def __init__(self, M):
        self.M = M

    def __enter__(self):
        PAI.append(PAI[-1] @ self.M)

    def __exit__(self, *a):
        PAI.pop()


def jogo(v):
    return Vector((v.x, v.z, -v.y))


def add(bm, g, cor="#ffffff", M=None, cf=None, sujo=0.25, afiar=40):
    MM = PAI[-1] @ M if M is not None else PAI[-1]
    bmesh.ops.transform(bm, matrix=G @ MM, verts=bm.verts)
    if MM.determinant() < 0:
        bmesh.ops.reverse_faces(bm, faces=bm.faces)
    bm.normal_update()
    ij = bm.faces.layers.int.get("ij")
    c0 = lin(cor or "#ffffff")
    cores = {}
    for f in bm.faces:
        if cf:
            x = f[ij] if ij else 0
            cores[f] = lin(cf(jogo(f.calc_center_median()), jogo(f.normal), x // 1000, x % 1000))
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
                k = 1 - sujo * max(0.0, min(1.0, 1 - l.vert.co.z / 1.2))
            cols.append((cc[0] * k, cc[1] * k, cc[2] * k, 1.0))
        b["c"].append(cols)
    bm.free()


# ── primitivas (em metros do jogo) ──
def bm_caixa(sx, sy, sz, d=None, sem=()):
    """caixa centrada; `sem` tira faces: 'x-','x+','y-','y+','z-','z+'."""
    bm = bmesh.new()
    ij = bm.faces.layers.int.new("ij")
    if d is None:
        nx = ny = nz = 1
    else:
        dx, dy, dz = d if isinstance(d, tuple) else (d, d, d)
        nx, ny, nz = (max(1, round(s / q)) for s, q in ((sx, dx), (sy, dy), (sz, dz)))
    hx, hy, hz = sx / 2, sy / 2, sz / 2
    X, Y, Z = Vector((sx, 0, 0)), Vector((0, sy, 0)), Vector((0, 0, sz))

    def grade(nome, o, U, V, nu, nv):
        if nome in sem:
            return
        vs = [[bm.verts.new(o + U * (i / nu) + V * (j / nv)) for j in range(nv + 1)] for i in range(nu + 1)]
        for i in range(nu):
            for j in range(nv):
                f = bm.faces.new((vs[i][j], vs[i + 1][j], vs[i + 1][j + 1], vs[i][j + 1]))
                f[ij] = i * 1000 + j
    grade("z-", Vector((hx, -hy, -hz)), -X, Y, nx, ny)
    grade("z+", Vector((-hx, -hy, hz)), X, Y, nx, ny)
    grade("x-", Vector((-hx, -hy, -hz)), Z, Y, nz, ny)
    grade("x+", Vector((hx, -hy, hz)), -Z, Y, nz, ny)
    grade("y-", Vector((-hx, -hy, -hz)), X, Z, nx, nz)
    grade("y+", Vector((-hx, hy, hz)), X, -Z, nx, nz)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    return bm


def B(g, p, s, cor=None, r=(0, 0, 0), d=None, cf=None, sujo=0.25, sem=()):
    add(bm_caixa(*s, d=d, sem=sem), g, cor, T(*p) @ R(*r), cf, sujo)


def Caixa2(g, x0, x1, y0, y1, z0, z1, cor=None, **k):
    B(g, ((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), (abs(x1 - x0), y1 - y0, abs(z1 - z0)), cor, **k)


def Placa(g, o, U, V, nu, nv, cor=None, cf=None, sujo=0.15):
    """grade de um lado só; a normal é U × V."""
    o, U, V = Vector(o), Vector(U), Vector(V)
    bm = bmesh.new()
    ij = bm.faces.layers.int.new("ij")
    vs = [[bm.verts.new(o + U * (i / nu) + V * (j / nv)) for j in range(nv + 1)] for i in range(nu + 1)]
    for i in range(nu):
        for j in range(nv):
            f = bm.faces.new((vs[i][j], vs[i + 1][j], vs[i + 1][j + 1], vs[i][j + 1]))
            f[ij] = i * 1000 + j
    add(bm, g, cor, None, cf, sujo)


def Tubo(g, pts, raio, lados, cor=None, sujo=0.1, tampa=True):
    pts = [Vector(p) for p in pts]
    n = len(pts)
    Tg = [(pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)]).normalized() for i in range(n)]
    a = Vector((0, 1, 0)) if abs(Tg[0].y) < 0.9 else Vector((1, 0, 0))
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
    if tampa:
        bm.faces.new(aneis[0])
        bm.faces.new(aneis[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    add(bm, g, cor, None, None, sujo, afiar=None)


def Cil(g, p, raio, h, lados, cor=None, eixo="y", sujo=0.1):
    p = Vector(p)
    d = {"x": Vector((1, 0, 0)), "y": Vector((0, 1, 0)), "z": Vector((0, 0, 1))}[eixo] * (h / 2)
    Tubo(g, [p - d, p + d], raio, lados, cor, sujo)


def Fita(g, pts, n, w, cor, sujo=0.0):
    """um traço chato (pichação, risco) sobre uma parede de normal n."""
    n = Vector(n).normalized()
    pts = [Vector(p) for p in pts]
    bm = bmesh.new()
    prev = None
    for i in range(len(pts) - 1):
        a, b = pts[i], pts[i + 1]
        t = b - a
        if t.length < 1e-5:
            continue
        s = n.cross(t).normalized() * (w / 2)
        q = [bm.verts.new(a - s), bm.verts.new(a + s), bm.verts.new(b + s), bm.verts.new(b - s)]
        f = bm.faces.new(q)
        f.normal_update()
        if f.normal.dot(n) < 0:
            f.normal_flip()
    if not bm.faces:
        bm.free()
        return
    add(bm, g, cor, None, None, sujo, afiar=None)


def Poligono(g, pts, n, cor, sujo=0.0):
    n = Vector(n)
    bm = bmesh.new()
    f = bm.faces.new([bm.verts.new(Vector(p)) for p in pts])
    f.normal_update()
    if f.normal.dot(n) < 0:
        f.normal_flip()
    add(bm, g, cor, None, None, sujo, afiar=None)


def Tag(g, o, U, V, larg, alt, seed, cor=None, w=0.035):
    """uma pichação: 3 a 5 letras de traço corrido e o sublinhado, no plano U, V."""
    o, U, V = Vector(o), Vector(U).normalized(), Vector(V).normalized()
    n = U.cross(V)
    cor = cor or escolhe(NEONS, seed, 1)
    nl = 3 + int(hh(seed, 2) * 3)
    cel = larg / nl
    for k in range(nl):
        np_ = 4 + int(hh(seed, k, 3) * 4)
        pts = []
        for m in range(np_):
            u = (k + 0.1 + 0.8 * hh(seed, k, m, 4)) * cel
            v = alt * (0.15 + 0.85 * hh(seed, k, m, 5))
            if m == 0:
                v = alt * 0.1
            pts.append(o + U * u + V * v)
        Fita(g, pts, n, w, cor)
    # o sublinhado (a "seta") e um respingo
    sw = [o + U * (larg * t) + V * (alt * (0.02 - 0.08 * math.sin(t * 3.0 + seed))) for t in (0.0, 0.3, 0.6, 0.95)]
    Fita(g, sw, n, w * 0.8, cor)
    if hh(seed, 9) < 0.6:
        x = larg * hh(seed, 10)
        Fita(g, [o + U * x - V * 0.02, o + U * x - V * (0.08 + 0.15 * hh(seed, 11))], n, w * 0.6, cor)


def Riscos(o, U, V, larg, alt, n, seed, w=0.007, cor=RISCO):
    o, U, V = Vector(o), Vector(U).normalized(), Vector(V).normalized()
    nn = U.cross(V)
    for k in range(n):
        u, v = larg * hh(seed, k, 1), alt * hh(seed, k, 2)
        a = (hh(seed, k, 3) - 0.5) * 1.2
        L = 0.15 + 0.5 * hh(seed, k, 4)
        p0 = o + U * u + V * v
        p1 = p0 + (U * math.cos(a) + V * math.sin(a)) * L
        p2 = p1 + (U * math.cos(a + 0.3) + V * math.sin(a + 0.3)) * L * 0.4
        Fita("solido", [p0, p1, p2], nn, w, cor)


def escovado(pal, seed, faixa=None, rem=0.1):
    """aço escovado: a cor por faixa horizontal (o j da grade), remendos de outra chapa."""
    def f(c, n, i, j):
        if faixa:
            r = faixa(c)
            if r:
                return lin(r)
        if hh(math.floor(c.z / 2.2), math.floor(c.y / 1.1), math.floor(c.x / 2.2), seed) < rem:
            return dim(escolhe(["#8d929b", PRIMER, "#6f7580", "#9aa0a8"], math.floor(c.z / 2.2), seed, 7), 0.95)
        base = escolhe(pal, j, seed, round(c.z * 0.7))
        k = 0.93 + 0.07 * hh(j, i // 3, seed)
        return dim(base, k)
    return f


# ════════════════════════ O CARRO, POR FORA ════════════════════════
ATUAL[0] = "carro"
L2 = 6.45
PERFIL = [(-1.40, 0.50), (1.40, 0.50), (1.50, 0.80), (1.50, 3.30), (1.40, 3.55), (1.15, 3.68),
          (-1.15, 3.68), (-1.40, 3.55), (-1.50, 3.30), (-1.50, 0.80)]
# a lateral grande em fileiras (pra escovar a cor)
LINHAS_LADO = [0.80, 1.05, 1.30, 1.55, 1.80, 2.05, 2.55, 3.05, 3.30]


def faixa_carro(c):
    if 1.05 <= c.y <= 1.30 and abs(c.x) > 1.45:
        return AZUL if hh(math.floor(c.z / 1.5), 3) > 0.15 else PRIMER
    if c.y > 3.5:
        return None
    return None


def corpo_carro():
    bm = bmesh.new()
    ij = bm.faces.layers.int.new("ij")
    nz = 26
    perfil = []
    for k in range(len(PERFIL)):
        a, b = PERFIL[k], PERFIL[(k + 1) % len(PERFIL)]
        perfil.append(a)
        if abs(a[0]) == 1.5 and abs(b[0]) == 1.5 and abs(a[1] - b[1]) > 1:
            ys = LINHAS_LADO if b[1] > a[1] else LINHAS_LADO[::-1]
            for y in ys[1:-1]:
                perfil.append((a[0], y))
    aneis = []
    for i in range(nz + 1):
        z = -L2 + 2 * L2 * i / nz
        aneis.append([bm.verts.new((x, y, z)) for x, y in perfil])
    m = len(perfil)
    for i in range(nz):
        for k in range(m):
            f = bm.faces.new((aneis[i][k], aneis[i + 1][k], aneis[i + 1][(k + 1) % m], aneis[i][(k + 1) % m]))
            f[ij] = i * 1000 + k
    for i, inv in ((0, False), (nz, True)):
        f = bm.faces.new(aneis[i] if not inv else aneis[i][::-1])
        f[ij] = 999
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    add(bm, "solido", None, None, escovado(ACO, 11, faixa_carro, 0.08), 0.35)


corpo_carro()

JAN_Z = [(-6.0, -4.0), (-2.4, 2.4), (4.0, 6.0)]
PORTAS_Z = [(-3.85, -2.55), (2.55, 3.85)]
for s in (-1, 1):
    xo = s * 1.5
    nrm = Vector((s, 0, 0))
    # as janelas acesas, os montantes, a borracha e a grade
    for z0, z1 in JAN_Z:
        Poligono("brilho", [(xo + s * 0.006, 1.9, z0), (xo + s * 0.006, 1.9, z1), (xo + s * 0.006, 3.0, z1), (xo + s * 0.006, 3.0, z0)], nrm, JANELA)
        n = max(1, round((z1 - z0) / 1.2))
        for k in range(n + 1):
            z = z0 + (z1 - z0) * k / n
            Caixa2("solido", xo, xo + s * 0.03, 1.88, 3.02, z - 0.05, z + 0.05, BORRACHA, sujo=0)
        for y in (1.86, 3.02):
            Caixa2("solido", xo, xo + s * 0.035, y - 0.03, y + 0.03, z0 - 0.05, z1 + 0.05, BORRACHA, sujo=0)
        nb = round((z1 - z0) / 0.24)
        for k in range(1, nb):
            z = z0 + (z1 - z0) * k / nb
            B("solido", (xo + s * 0.055, 2.45, z), (0.022, 1.16, 0.022), "#4a4e56", sem=("y-", "y+"), sujo=0)
        for y in (2.2, 2.75):
            Cil("solido", (xo + s * 0.055, y, (z0 + z1) / 2), 0.012, z1 - z0, 4, "#4a4e56", eixo="z")
    # as portas de correr (fechadas), pintadas de laranja por cima do aço
    for z0, z1 in PORTAS_Z:
        zm = (z0 + z1) / 2
        for a, b in ((z0, zm - 0.01), (zm + 0.01, z1)):
            Caixa2("solido", xo, xo + s * 0.04, 0.82, 3.12, a, b, None,
                   cf=lambda c, n, i, j: lin(LARANJA) if c.y < 2.8 else lin("#a9aeb6"), d=(1, 0.6, 1))
            Poligono("brilho", [(xo + s * 0.045, 2.0, a + 0.12), (xo + s * 0.045, 2.0, b - 0.12),
                                (xo + s * 0.045, 2.85, b - 0.12), (xo + s * 0.045, 2.85, a + 0.12)], nrm, JANELA)
        Caixa2("solido", xo, xo + s * 0.05, 0.8, 3.15, z0 - 0.06, z0, BORRACHA, sujo=0)
        Caixa2("solido", xo, xo + s * 0.05, 0.8, 3.15, z1, z1 + 0.06, BORRACHA, sujo=0)
        Caixa2("solido", xo, xo + s * 0.05, 3.12, 3.2, z0 - 0.06, z1 + 0.06, BORRACHA, sujo=0)
        Caixa2("solido", xo, xo + s * 0.048, 0.9, 1.0, z0 + 0.02, z1 - 0.02, "#d8b030", sujo=0)
    # as faixas de luz (a ciano da saia, a laranja fina)
    for y0, y1, cor in ((0.86, 0.96, "#2fe8ff"), (1.36, 1.41, "#ff7a3c")):
        for a, b in ((-6.4, -3.9), (-2.5, 2.5), (3.9, 6.4)):
            Poligono("brilho", [(xo + s * 0.008, y0, a), (xo + s * 0.008, y0, b), (xo + s * 0.008, y1, b), (xo + s * 0.008, y1, a)], nrm, cor)
    # a pichação embaixo das janelas
    U = Vector((0, 0, -s))
    for k, (z0, z1) in enumerate(((-6.1, -4.1), (-2.3, -0.2), (0.3, 2.3), (4.1, 6.1))):
        if hh(s, k, 41) < 0.25:
            continue
        zz = z0 if s < 0 else z1
        Tag("brilho", (xo + s * 0.012, 1.45, zz), U, (0, 1, 0), (z1 - z0) * 0.9, 0.38, 100 + k * 7 + s, w=0.04)
    # os riscos e a ferrugem escorrida
    Riscos((xo + s * 0.009, 0.95, -6.2 if s < 0 else 6.2), U, (0, 1, 0), 12.4, 2.2, 34, 200 + s)
    for k in range(10):
        z = -6 + 12 * hh(s, k, 51)
        if any(a - 0.05 < z < b + 0.05 for a, b in PORTAS_Z):
            continue
        L = 0.3 + 0.6 * hh(s, k, 52)
        Fita("solido", [(xo + s * 0.01, 1.85, z), (xo + s * 0.01, 1.85 - L, z + 0.03)], nrm, 0.05, FERRUGEM)

# as pontas: a placa da intercomunicação, a janela, o engate
for e in (-1, 1):
    ze = e * L2
    nrm = Vector((0, 0, e))
    Caixa2("solido", -0.5, 0.5, 0.75, 3.05, ze, ze + e * 0.05, "#9aa0a9", d=(0.5, 0.5, 1))
    Poligono("solido", [(-0.36, 2.1, ze + e * 0.052), (0.36, 2.1, ze + e * 0.052), (0.36, 2.85, ze + e * 0.052), (-0.36, 2.85, ze + e * 0.052)], nrm, VIDRO_ESC)
    for x in (-0.6, 0.6):
        Caixa2("solido", x - 0.06, x + 0.06, 0.7, 3.2, ze, ze + e * 0.07, BORRACHA, sujo=0)
    Caixa2("solido", -0.25, 0.25, 0.45, 0.72, ze, ze + e * 0.25, "#3a3c42")
    Tag("brilho", (0.7 * e, 1.0, ze + e * 0.06), (e, 0, 0), (0, 1, 0), 0.5, 0.9, 300 + e, w=0.03)

# o teto: o ar-condicionado (dois), o conduíte, a antena
for z in (-3.2, 3.2):
    B("solido", (0, 3.82, z), (1.7, 0.28, 2.3), None, d=(0.2, 0.3, 2.3),
      cf=lambda c, n, i, j: dim("#8c929b", 0.75 if (i % 2 and n.y < 0.5) else 1.0), sujo=0)
    B("solido", (0, 3.97, z), (1.0, 0.03, 1.2), "#4c5058", sujo=0)
Tubo("solido", [(0.9, 3.72, -6.2), (0.9, 3.72, 6.2)], 0.04, 5, "#5c6068", 0)
Tubo("solido", [(-0.6, 3.68, 5.4), (-0.6, 4.05, 5.6)], 0.012, 4, "#3a3c42", 0)

# embaixo: os truques do monotrilho (abraçam a viga de 1,3 m) com as rodas-guia
for z in (-4.6, 4.6):
    B("solido", (0, 0.27, z), (2.1, 0.42, 2.5), "#3b3d43", sujo=0.5)
    for s in (-1, 1):
        B("solido", (s * 0.82, -0.18, z), (0.16, 0.62, 2.2), "#2e3035", sujo=0.5)
        for dz in (-0.7, 0.7):
            Cil("solido", (s * 0.7, -0.25, z + dz), 0.22, 0.12, 8, "#18181c", eixo="x", sujo=0)
# a saia entre os truques
for s in (-1, 1):
    Caixa2("solido", s * 1.35, s * 1.42, 0.25, 0.55, -3.2, 3.2, "#5a5f68", sujo=0.4)

# a frente (+Z): o letreiro do 9 e os faróis (só no primeiro carro)
ze = L2 + 0.055
Poligono("farol", [(-1.1, 2.3, ze), (1.1, 2.3, ze), (1.1, 2.8, ze), (-1.1, 2.8, ze)], (0, 0, 1), "#ffffff")
for x in (-0.95, 0.95):
    Poligono("farol", [(x - 0.2, 0.95, ze), (x + 0.2, 0.95, ze), (x + 0.2, 1.15, ze), (x - 0.2, 1.15, ze)], (0, 0, 1), "#fff0c8")
    Caixa2("solido", x - 0.25, x + 0.25, 0.9, 1.2, L2, L2 + 0.05, BORRACHA, sujo=0)


# ════════════════════════ O VAGÃO, POR DENTRO (Vagao.tsx) ════════════════════════
ATUAL[0] = "vagao"
VX, VZ, VY = 1.5, 9.0, 2.5
JAN_V = [(-7.8, -5.2), (-4.3, -1.7), (1.7, 4.3), (5.2, 7.8)]   # as janelas (centros −6,5 −3 3 6,5; 2,6 de largo)
PORTA_V = 1.4      # a porta fechada do −x (z ±1,4)
VAO_V = 1.5        # o vão aberto do +x (z ±1,5, até 2,1)


def f_piso(c, n, i, j):
    if c.x > 1.2 and abs(c.z) < VAO_V:
        return lin("#c9a632") if (math.floor(c.z * 5) % 2) else lin("#202126")
    if abs(c.x) < 0.45:
        return dim("#4b4e56", 0.95 + 0.05 * hh(i, j))
    return dim(PISO, 0.9 + 0.12 * hh(i, j, 3))


Placa("solido", (-VX, 0, VZ), (2 * VX, 0, 0), (0, 0, -2 * VZ), 6, 36, None, f_piso, 0)
# o teto: o miolo reto e as abas inclinadas (as propagandas vão nelas)
FALTA_Z = (4.2, 5.4)  # a placa do teto que caiu


def f_teto(c, n, i, j):
    if FALTA_Z[0] < c.z < FALTA_Z[1] and 0.1 < c.x < 0.9:
        return lin("#121318")
    return dim(escolhe(["#c9ccd2", "#bfc3ca", "#b2b6bd", "#9ea29a"], i, j // 2, 5), 1.0)


Placa("solido", (-0.9, VY, -VZ), (1.8, 0, 0), (0, 0, 2 * VZ), 4, 18, None, f_teto, 0)
for s in (-1, 1):
    a, b = Vector((s * 0.9, VY, 0)), Vector((s * VX, 2.2, 0))
    if s > 0:
        Placa("solido", (a.x, a.y, -VZ), b - a, (0, 0, 2 * VZ), 1, 18, None, escovado(ACO_IN, 61, None, 0.05), 0)
    else:
        Placa("solido", (a.x, a.y, VZ), b - a, (0, 0, -2 * VZ), 1, 18, None, escovado(ACO_IN, 62, None, 0.05), 0)


def faixa_in(c):
    if 1.0 <= c.y <= 1.06:
        return AZUL
    if 1.06 < c.y <= 1.1:
        return "#d8822f"
    return None


def parede_lado(s, trechos):
    """a face de dentro (normal −s·x), em retângulos (z0, z1, y0, y1)."""
    x = s * VX
    for z0, z1, y0, y1 in trechos:
        nz = max(1, round((z1 - z0) / 0.6))
        ny = max(1, round((y1 - y0) / 0.28))
        if s > 0:
            Placa("solido", (x, y0, z0), (0, 0, z1 - z0), (0, y1 - y0, 0), nz, ny, None, escovado(ACO_IN, 70 + s, faixa_in, 0.07), 0.3)
        else:
            Placa("solido", (x, y0, z1), (0, 0, z0 - z1), (0, y1 - y0, 0), nz, ny, None, escovado(ACO_IN, 70 + s, faixa_in, 0.07), 0.3)


def pilares(jan, z0, z1):
    out, z = [], z0
    for a, b in jan:
        if a > z:
            out.append((z, a))
        z = b
    if z < z1:
        out.append((z, z1))
    return out


# −x: as janelas (o jogo põe a cidade correndo em x −1,48) e a porta fechada
tr = [(-VZ, -PORTA_V, 0, 1.1), (PORTA_V, VZ, 0, 1.1), (-VZ, -PORTA_V, 1.9, 2.2), (PORTA_V, VZ, 1.9, 2.2), (-PORTA_V, PORTA_V, 2.1, 2.2)]
tr += [(a, b, 1.1, 1.9) for a, b in pilares(JAN_V, -VZ, VZ) if not (a >= -PORTA_V - 0.01 and b <= PORTA_V + 0.01)]
tr = [(max(a, -VZ), b, y0, y1) for a, b, y0, y1 in tr]
# o pilar do meio cruza a porta: corta
tr2 = []
for a, b, y0, y1 in tr:
    if y0 >= 1.1 and y1 <= 1.9 and a < PORTA_V and b > -PORTA_V:
        if a < -PORTA_V:
            tr2.append((a, -PORTA_V, y0, y1))
        if b > PORTA_V:
            tr2.append((PORTA_V, b, y0, y1))
    else:
        tr2.append((a, b, y0, y1))
parede_lado(-1, tr2)
# +x: o vão da porta aberta e janelas escuras (do lado da plataforma)
tr = [(-VZ, -VAO_V, 0, 1.1), (VAO_V, VZ, 0, 1.1), (-VZ, -VAO_V, 1.9, 2.2), (VAO_V, VZ, 1.9, 2.2), (-VAO_V, VAO_V, 2.1, 2.2)]
for a, b in pilares(JAN_V, -VZ, VZ):
    if b <= -VAO_V or a >= VAO_V:
        tr.append((a, b, 1.1, 1.9))
    else:
        if a < -VAO_V:
            tr.append((a, -VAO_V, 1.1, 1.9))
        if b > VAO_V:
            tr.append((VAO_V, b, 1.1, 1.9))
parede_lado(1, tr)
# a face de fora do +x (vista da plataforma): aço liso, a faixa azul
for z0, z1 in ((-VZ, -VAO_V), (VAO_V, VZ)):
    Placa("solido", (1.62, 0, z1), (0, 0, z0 - z1), (0, 2.5, 0), 6, 5, None, escovado(ACO, 81, lambda c: AZUL if 1.0 < c.y < 1.5 else None, 0.1), 0.4)
Placa("solido", (1.62, 2.1, VAO_V), (0, 0, -2 * VAO_V), (0, 0.4, 0), 2, 1, None, escovado(ACO, 82, None, 0), 0)

for s in (-1, 1):
    x = s * VX
    for z0, z1 in JAN_V:
        # a moldura de borracha, o vão (a espessura da parede) e a grade
        for y in (1.1, 1.9):
            Caixa2("solido", x - s * 0.05, x, y - 0.035, y + 0.035, z0 - 0.04, z1 + 0.04, BORRACHA, sujo=0)
        for z in (z0, z1):
            Caixa2("solido", x - s * 0.05, x, 1.06, 1.94, z - 0.035, z + 0.035, BORRACHA, sujo=0)
        if s > 0:
            Poligono("solido", [(1.6, 1.1, z0), (1.6, 1.1, z1), (1.6, 1.9, z1), (1.6, 1.9, z0)], (-1, 0, 0), VIDRO_ESC)
            # riscado no vidro
            Riscos((1.595, 1.15, z0 + 0.1), (0, 0, 1), (0, 1, 0), z1 - z0 - 0.2, 0.7, 5, 400 + int(z0 * 10), 0.005, "#3a4252")
        nb = round((z1 - z0) / 0.14)
        xg = x - s * 0.06
        for k in range(1, nb):
            z = z0 + (z1 - z0) * k / nb
            B("solido", (xg, 1.5, z), (0.018, 0.8, 0.018), "#50545c", sem=("y-", "y+"), sujo=0)
        Cil("solido", (xg, 1.5, (z0 + z1) / 2), 0.011, z1 - z0, 4, "#50545c", eixo="z")

# a porta fechada do −x: duas folhas de correr (o laranja por cima do aço), janelinhas
for a, b in ((-PORTA_V, -0.01), (0.01, PORTA_V)):
    Caixa2("solido", -VX - 0.02, -VX + 0.04, 0, 2.1, a, b, None, d=(1, 0.3, 0.7),
           cf=lambda c, n, i, j: lin(LARANJA) if (c.y < 1.15 or c.y > 1.9) else lin("#b4b9c0"))
    Poligono("solido", [(-VX + 0.042, 1.2, a + 0.2), (-VX + 0.042, 1.2, b - 0.2), (-VX + 0.042, 1.85, b - 0.2), (-VX + 0.042, 1.85, a + 0.2)], (1, 0, 0), VIDRO_ESC)
Caixa2("solido", -VX - 0.01, -VX + 0.05, 0, 2.1, -0.012, 0.012, BORRACHA, sujo=0)
for z in (-PORTA_V, PORTA_V):
    Caixa2("solido", -VX, -VX + 0.08, 0, 2.12, z - 0.05, z + 0.05, BORRACHA, sujo=0)
Caixa2("solido", -VX, -VX + 0.07, 0.6, 0.66, -0.5, 0.5, "#d8b030", sujo=0)
Tag("neon", (-VX + 0.047, 0.35, -0.1), (0, 0, -1), (0, 1, 0), 1.0, 0.55, 501, "#ff3fb0", 0.03)
# o vão do +x: o batente de borracha, a soleira, as folhas recolhidas
for z in (-VAO_V, VAO_V):
    Caixa2("solido", VX - 0.02, 1.64, 0, 2.12, z - 0.06 if z > 0 else z, z if z > 0 else z + 0.06, BORRACHA, sujo=0)
Caixa2("solido", VX - 0.1, 1.64, 0, 0.02, -VAO_V, VAO_V, "#8d939c", sujo=0)
for a, b in ((VAO_V, 2.9), (-2.9, -VAO_V)):
    Caixa2("solido", 1.54, 1.58, 0, 2.1, a, b, LARANJA, sujo=0.3)
# a luz da porta (vermelha) e as placas de saída
Caixa2("luz", VX - 0.04, VX - 0.01, 2.15, 2.19, -0.12, 0.12, "#ff3a2a")
Caixa2("neon", -VX + 0.01, -VX + 0.04, 2.13, 2.19, -0.25, 0.25, "#3dff8a")

# os fundos (z ±9): a porta da intercomunicação, o painel apagado do Núcleo, o mapa da linha
for e in (-1, 1):
    ze = e * VZ
    nrm = (0, 0, -e)
    for x0, x1 in ((-VX, -0.45), (0.45, VX)):
        if e < 0:
            Placa("solido", (x0, 0, ze), (x1 - x0, 0, 0), (0, VY, 0), 3, 8, None, escovado(ACO_IN, 90 + e, faixa_in, 0.1), 0.3)
        else:
            Placa("solido", (x1, 0, ze), (x0 - x1, 0, 0), (0, VY, 0), 3, 8, None, escovado(ACO_IN, 90 + e, faixa_in, 0.1), 0.3)
    zi = ze - e * 0.02
    Caixa2("solido", -0.45, 0.45, 2.05, VY, ze, zi, None, cf=escovado(ACO_IN, 95, None, 0))
    Caixa2("solido", -0.42, 0.42, 0, 2.05, ze + e * 0.02, ze - e * 0.01, "#9aa0a8", d=(0.5, 0.5, 1))
    Poligono("solido", [(-0.28, 1.25, ze - e * 0.012), (0.28, 1.25, ze - e * 0.012), (0.28, 1.85, ze - e * 0.012), (-0.28, 1.85, ze - e * 0.012)], nrm, VIDRO_ESC)
    for x in (-0.45, 0.45):
        Caixa2("solido", x - 0.04, x + 0.04, 0, 2.08, ze, ze - e * 0.06, BORRACHA, sujo=0)
    Caixa2("solido", 0.25, 0.32, 1.0, 1.12, ze - e * 0.01, ze - e * 0.05, "#3a3c42", sujo=0)
    # o luminoso do Núcleo, apagado: a caixa, a cara cinza e a marca desbotada
    lx = -0.98
    Caixa2("solido", lx - 0.42, lx + 0.42, 1.2, 2.0, ze, ze - e * 0.08, "#2a2c33", sujo=0)
    zf = ze - e * 0.082
    Poligono("solido", [(lx - 0.38, 1.24, zf), (lx + 0.38, 1.24, zf), (lx + 0.38, 1.96, zf), (lx - 0.38, 1.96, zf)], nrm, "#8f949c")
    hexa = [(lx + 0.16 * math.cos(TAU * k / 6 + 0.5), 1.7 + 0.16 * math.sin(TAU * k / 6 + 0.5), zf - e * 0.002) for k in range(6)]
    Poligono("solido", hexa, nrm, "#6f87a8")
    Poligono("solido", [(lx - 0.3, 1.38, zf - e * 0.002), (lx + 0.3, 1.38, zf - e * 0.002), (lx + 0.3, 1.44, zf - e * 0.002), (lx - 0.3, 1.44, zf - e * 0.002)], nrm, "#a6abb2")
    # o mapa da linha 9 (as estações são pontinhos sem cor)
    mx = 0.98
    Caixa2("solido", mx - 0.4, mx + 0.4, 1.55, 1.95, ze, ze - e * 0.02, "#d9dbe0", sujo=0)
    Fita("solido", [(mx - 0.34, 1.75, ze - e * 0.022), (mx + 0.34, 1.75, ze - e * 0.022)], nrm, 0.02, "#7b8aa6")
    for k in range(9):
        Cil("solido", (mx - 0.32 + k * 0.08, 1.75, ze - e * 0.024), 0.012, 0.004, 5, "#5a6a88", eixo="z", sujo=0)
    # pichação grande no fundo (o −z é o que a câmera vê)
    if e < 0:
        Tag("neon", (0.55, 0.3, ze + 0.025), (1, 0, 0), (0, 1, 0), 0.85, 0.75, 601, "#2fe8ff", 0.04)
        Tag("neon", (-1.42, 0.35, ze + 0.025), (1, 0, 0), (0, 1, 0), 0.9, 0.6, 603, "#ffc857", 0.035)
        Tag("neon", (mx - 0.35, 1.2, ze + 0.025), (1, 0, 0), (0, 1, 0), 0.7, 0.3, 605, "#ff3fb0", 0.025)
    else:
        Tag("neon", (1.42, 0.3, ze - 0.025), (-1, 0, 0), (0, 1, 0), 0.9, 0.7, 607, "#5dffa0", 0.04)
        Tag("neon", (-0.55, 0.35, ze - 0.025), (-1, 0, 0), (0, 1, 0), 0.8, 0.6, 609, "#b38cff", 0.035)

# riscos nas paredes de dentro
Riscos((-VX + 0.004, 0.4, VZ), (0, 0, -1), (0, 1, 0), 18, 1.7, 40, 700, 0.006)
Riscos((VX - 0.004, 0.4, -VZ), (0, 0, 1), (0, 1, 0), 18, 1.7, 40, 701, 0.006)

# pichação nas paredes, nos pilares, perto das janelas
for k, (s, z, w, h) in enumerate(((-1, -8.6, 0.7, 0.32), (-1, 4.5, 0.55, 0.3), (1, -8.6, 0.7, 0.3), (1, 7.9, 0.75, 0.32), (-1, -5.15, 0.8, 0.25), (1, 4.4, 0.6, 0.28))):
    x = s * (VX - 0.006)
    U = (0, 0, s)
    zz = z + w if s < 0 else z
    Tag("neon", (x, 1.55 if k > 3 else 1.35, zz), U, (0, 1, 0), w, h, 650 + k, w=0.028)

# os bancos de plástico (as cores trocadas: cada um veio de um lugar)
for s in (-1, 1):
    z, k = -8.5, 0
    while z + 0.46 <= 6.52:
        zc = z + 0.23
        cor = escolhe(PLASTICO, s, k, 3)
        quebrado = hh(s, k, 5) < 0.06
        B("solido", (s * 1.16, 0.415, zc), (0.5, 0.05, 0.43), cor, r=(0, 0, -s * 0.06), sujo=0)
        B("solido", (s * 0.93, 0.385, zc), (0.05, 0.06, 0.43), cor, sujo=0)
        if not quebrado:
            B("solido", (s * 1.4, 0.72, zc), (0.04, 0.52, 0.43), cor, r=(0, 0, s * 0.1), sujo=0)
        if k % 3 == 0:
            B("solido", (s * 1.2, 0.2, zc), (0.06, 0.38, 0.06), "#50545c", sujo=0.5)
        k += 1
        z += 0.46
    Tubo("solido", [(s * 1.2, 0.36, -8.5), (s * 1.2, 0.36, 6.5)], 0.03, 5, "#5d626b", 0.3)
    Tubo("solido", [(s * 1.44, 0.98, -8.5), (s * 1.44, 0.98, 6.5)], 0.018, 5, "#9aa0a8", 0)

# os ferros: os quatro do meio (z −6 −2 2 6), as barras do teto, os de canto dos bancos, as alças
for z in (-6, -2, 2, 6):
    Cil("solido", (0, 1.25, z), 0.025, 2.5, 8, "#b8bec8", sujo=0)
    for y in (0.01, 2.49):
        Cil("solido", (0, y, z), 0.05, 0.02, 8, "#7c828c", sujo=0)
for s in (-1, 1):
    Tubo("solido", [(s * 0.75, 2.12, -8.8), (s * 0.75, 2.12, 8.8)], 0.02, 6, "#b8bec8", 0)
    for z in (-8, -4.5, -1, 2.5, 6, 8.6):
        Tubo("solido", [(s * 0.75, 2.12, z), (s * 0.8, 2.45, z)], 0.012, 4, "#9aa0a8", 0, tampa=False)
    for z in (-7.2, -4.4, 0.4, 3.4, 6.0):
        if s > 0 and z == 0.4:
            continue
        Tubo("solido", [(s * 0.9, 0.44, z), (s * 0.9, 1.9, z), (s * 0.75, 2.12, z)], 0.02, 6, "#b8bec8", 0)
    z = -8.4
    k = 0
    while z < 8.5:
        if not (s > 0 and abs(z) < 1.2) and hh(s, k, 9) > 0.18:
            x = s * 0.75
            B("solido", (x, 2.01, z), (0.006, 0.22, 0.03), "#2a2c33", sujo=0, sem=("y-", "y+"))
            Tubo("solido", [(x, 1.9, z - 0.06), (x, 1.82, z - 0.04), (x, 1.8, z), (x, 1.82, z + 0.04), (x, 1.9, z + 0.06)], 0.012, 3, "#c9a332" if hh(s, k) > 0.5 else "#d0d3d8", 0, tampa=False)
        z += 0.9
        k += 1

# as propagandas do Núcleo nas abas do teto: apagadas, rasgadas, pichadas
for s in (-1, 1):
    a, b = Vector((s * 0.9, VY, 0)), Vector((s * VX, 2.2, 0))
    up = (a - b)
    nrm = Vector((0, 0, 1)).cross(up).normalized() * (1 if s > 0 else -1)
    if nrm.y > 0:
        nrm = -nrm
    z, k = -8.6, 0
    while z + 1.0 < 8.6:
        o = b + up * 0.12 + nrm * 0.01
        o.z = z
        U = Vector((0, 0, 1))
        V = up * 0.7
        estado = hh(s, k, 31)
        if estado < 0.15:
            Poligono("solido", [o, o + U, o + U + V, o + V], nrm, "#2a2b30")  # arrancada
        else:
            fundo = escolhe(["#b7bcc3", "#a9b4c2", "#c2b9a8", "#9fa8a0"], s, k)
            Poligono("solido", [o, o + U, o + U + V, o + V], nrm, fundo)
            c = o + U * 0.22 + V * 0.5 + nrm * 0.002
            Poligono("solido", [c + U * (0.12 * math.cos(TAU * q / 6)) + V * (0.32 * math.sin(TAU * q / 6)) for q in range(6)], nrm, "#7d93b3")
            for q, w in ((0, 0.55), (1, 0.4)):
                p = o + U * 0.42 + V * (0.62 - q * 0.25) + nrm * 0.002
                Poligono("solido", [p, p + U * w, p + U * w + V * 0.1, p + V * 0.1], nrm, "#8d9198")
            if estado > 0.7:
                Tag("neon", o + U * 0.08 + V * 0.1 + nrm * 0.004, U, V, 0.8, 0.6 * V.length, 800 + k * 3 + s, w=0.02)
        Caixa2("solido", o.x - 0.01, o.x + 0.01, min(o.y, (o + V).y), max(o.y, (o + V).y), z - 0.02, z, "#3a3c42", sujo=0)
        z += 1.12
        k += 1

# as luminárias (onde o jogo tem as pointLights): a caixa, os dois tubos. A de z 2 pisca, a de −6 queimou um
for z in (-6, -2, 2, 6):
    B("solido", (0, 2.475, z), (0.8, 0.05, 2.0), "#9da2aa", sujo=0)
    for x in (-0.38, 0.38):
        B("solido", (x, 2.44, z), (0.04, 0.04, 2.0), "#7d828a", sujo=0)
    for k, x in enumerate((-0.18, 0.18)):
        g = "luz"
        cor = "#eef4ff"
        if z == 2 and k == 0:
            g = "pisca"
        if z == -6 and k == 1:
            g, cor = "solido", "#8a8c90"
        Cil(g, (x, 2.425, z), 0.022, 1.8, 6, cor, eixo="z", sujo=0)
        for e in (-1, 1):
            B("solido", (x, 2.435, z + e * 0.92), (0.06, 0.05, 0.04), "#3a3c42", sujo=0)

# a placa que caiu: o buraco, os fios pendurados
Placa("solido", (0.1, VY + 0.12, FALTA_Z[0]), (0.8, 0, 0), (0, 0, FALTA_Z[1] - FALTA_Z[0]), 1, 1, "#0c0d10")
for k in range(4):
    x = 0.2 + 0.18 * k
    zz = FALTA_Z[0] + 0.3 + 0.2 * k
    Tubo("solido", [(x, 2.55, zz), (x + 0.05, 2.25 - 0.08 * k, zz + 0.1), (x + 0.02, 2.05 - 0.1 * k, zz + 0.25)], 0.008, 3, escolhe(["#1a1a1e", "#8a2c2a", "#2c4a8a"], k), 0, tampa=False)
B("solido", (0.6, 0.012, 4.9), (0.8, 0.02, 0.5), "#b2b6bd", r=(0.05, 0.4, 0), sujo=0.2)
# lixo no chão: papel amassado, a lata
for k in range(9):
    x, z = (hh(k, 1) - 0.5) * 1.6, (hh(k, 2) - 0.5) * 16
    if abs(x) < 0.3:
        x += 0.5
    B("solido", (x, 0.03, z), (0.07, 0.05, 0.06), escolhe(["#d8d4c8", "#a8a090", "#cc4444", "#e0e0e0"], k), r=(hh(k, 3), hh(k, 4) * 3, 0), sujo=0)
Cil("solido", (-0.45, 0.033, -4.1), 0.033, 0.12, 8, "#c83a2a", eixo="z", sujo=0)


# ════════════════════════ O VAGÃO DA FUGA (metro/cena.ts) ════════════════════════
ATUAL[0] = "fuga"
WL, MEIA, ALT, BANCO, PASSAGEM = 15.0, 1.3, 2.3, 0.85, 0.65
BAIAS = [(3.0, 4.4), (10.6, 12.0)]
TRECHOS = [(0.3, 3.0), (4.4, 10.6), (12.0, 14.7)]
SEG = [(0.0, 3.0), (4.4, 10.6), (12.0, 15.0)]


def f_piso_fuga(c, n, i, j):
    zl = c.z
    for a, b in BAIAS:
        if a <= zl <= b:
            if abs(abs(c.x) - 1.07) < 0.22 and (zl - a < 0.08 or b - zl < 0.08):
                return lin("#e8c547")
            return dim("#3a3e49", 0.95 + 0.05 * hh(i, j))
    if abs(c.x) < 0.4:
        return dim("#4a4e58", 0.95 + 0.05 * hh(i, j))
    return dim("#454a57", 0.9 + 0.1 * hh(i, j, 2))


def faixa_fuga(c):
    if 0.98 <= c.y <= 1.06:
        return "#2f6cd8"
    return None


with em(S(-1, 1, 1)):
    Placa("solido", (-MEIA, 0, WL), (2 * MEIA, 0, 0), (0, 0, -WL), 5, 30, None, f_piso_fuga, 0)
    Placa("solido", (-MEIA, ALT, 0), (2 * MEIA, 0, 0), (0, 0, WL), 4, 15, None,
          lambda c, n, i, j: dim(escolhe(["#c4cad6", "#b8bec9", "#aab0bb"], i, j, 4), 1.0), 0)
    for s in (-1, 1):
        x = s * MEIA
        # a parede: embaixo, a faixa, em cima, os pilares (como no cena.ts)
        tre = []
        for a, b in SEG:
            tre += [(a, b, 0, 0.98), (a, b, 0.98, 1.06), (a, b, 1.86, ALT)]
            n = max(1, round((b - a) / 1.6))
            for k in range(n + 1):
                z = a + (b - a) * k / n
                tre.append((max(a, z - 0.09), min(b, z + 0.09), 1.06, 1.86))
            # o vão da janela: o peitoril e a verga (a espessura)
            for y, nn in ((1.06, 1), (1.86, -1)):
                Placa("solido", (x, y, b) if s * nn > 0 else (x, y, a), (s * 0.08, 0, 0), (0, 0, (a - b) if s * nn > 0 else (b - a)), 1, 1, "#9aa0aa")
            # a grade nas janelas
            nb = round((b - a) / 0.2)
            for k in range(1, nb):
                z = a + (b - a) * k / nb
                B("solido", (x + s * 0.03, 1.46, z), (0.016, 0.8, 0.016), "#4d5159", sem=("y-", "y+"), sujo=0)
            Cil("solido", (x + s * 0.03, 1.46, (a + b) / 2), 0.01, b - a, 4, "#4d5159", eixo="z")
        for z0, z1, y0, y1 in tre:
            nz = max(1, round((z1 - z0) / 0.75))
            ny = max(1, round((y1 - y0) / 0.4))
            if s > 0:
                Placa("solido", (x, y0, z0), (0, 0, z1 - z0), (0, y1 - y0, 0), nz, ny, None, escovado(ACO_IN, 120 + s, faixa_fuga, 0.06), 0.3)
            else:
                Placa("solido", (x, y0, z1), (0, 0, z0 - z1), (0, y1 - y0, 0), nz, ny, None, escovado(ACO_IN, 120 + s, faixa_fuga, 0.06), 0.3)
        # as portas das baias: a verga e o batente sempre; as folhas (menos a da curva)
        for kb, (a, b) in enumerate(BAIAS):
            if s > 0:
                Placa("solido", (x, 2.02, a), (0, 0, b - a), (0, ALT - 2.02, 0), 2, 1, None, escovado(ACO_IN, 130, None, 0), 0)
            else:
                Placa("solido", (x, 2.02, b), (0, 0, a - b), (0, ALT - 2.02, 0), 2, 1, None, escovado(ACO_IN, 131, None, 0), 0)
            for z in (a, b):
                Caixa2("solido", x - s * 0.04, x + s * 0.02, 0, 2.04, z - 0.04, z + 0.04, BORRACHA, sujo=0)
            if s > 0 and kb == 1:
                ATUAL[0] = "fugaporta"
            zm = (a + b) / 2
            for p, q in ((a + 0.02, zm - 0.008), (zm + 0.008, b - 0.02)):
                Caixa2("solido", x - s * 0.005, x + s * 0.035, 0, 2.02, p, q, None, d=(1, 0.35, 0.7),
                       cf=lambda c, n, i, j: lin(LARANJA) if (c.y < 1.0 or c.y > 1.78) else lin("#aab2bf"))
                Poligono("solido", [(x - s * 0.007, 1.0, p + 0.1), (x - s * 0.007, 1.0, q - 0.1), (x - s * 0.007, 1.78, q - 0.1), (x - s * 0.007, 1.78, p + 0.1)], (-s, 0, 0), VIDRO_ESC)
            Caixa2("solido", x - s * 0.012, x + s * 0.03, 0, 2.02, zm - 0.012, zm + 0.012, BORRACHA, sujo=0)
            Caixa2("solido", x - s * 0.01, x, 0.55, 0.61, a + 0.15, b - 0.15, "#d8b030", sujo=0)
            if hh(s, kb, 77) > 0.4:
                Tag("neon", (x - s * 0.009, 0.15, b - 0.12 if s < 0 else a + 0.12), (0, 0, s), (0, 1, 0), 1.1, 0.4, 900 + kb * 5 + s, w=0.025)
            ATUAL[0] = "fuga"
        # os bancos de plástico (de cores trocadas) em cima do pé escuro
        for a, b in TRECHOS:
            xi, xo = s * BANCO, s * MEIA
            Caixa2("solido", xi + s * 0.04, xo, 0, 0.4, a, b, "#2b2f3a", sujo=0.2, sem=("y-",))
            n = max(1, round((b - a) / 0.46))
            for k in range(n):
                p, q = a + (b - a) * k / n + 0.015, a + (b - a) * (k + 1) / n - 0.015
                cor = escolhe(PLASTICO, s, k, round(a))
                Caixa2("solido", xi, xo - s * 0.08, 0.4, 0.48, p, q, cor, sujo=0)
                Caixa2("solido", xi - s * 0.01, xi + s * 0.04, 0.36, 0.48, p, q, cor, sujo=0)
                if hh(s, k, a, 8) > 0.07:
                    B("solido", (s * (MEIA - 0.06), 0.74, (p + q) / 2), (0.04, 0.48, q - p), cor, r=(0, 0, s * 0.08), sujo=0)
        # a barra do teto e os suportes; os riscos
        Tubo("solido", [(s * 0.8, 1.98, 0.2), (s * 0.8, 1.98, WL - 0.2)], 0.018, 6, "#d4d8de", 0)
        for z in (0.6, 3.7, 7.5, 11.3, 14.4):
            Tubo("solido", [(s * 0.8, 1.98, z), (s * 0.82, ALT, z)], 0.012, 4, "#9aa0a8", 0, tampa=False)
        Riscos((x - s * 0.004, 0.3, WL if s < 0 else 0), (0, 0, s), (0, 1, 0), WL, 1.9, 30, 140 + s, 0.006)
        # as propagandas apagadas em cima das janelas
        for k, (a, b) in enumerate(SEG):
            m = max(1, round((b - a) / 1.3))
            for q in range(m):
                p0, p1 = a + (b - a) * q / m + 0.08, a + (b - a) * (q + 1) / m - 0.08
                if p1 - p0 < 0.4:
                    continue
                xx = x - s * 0.008
                est = hh(s, k, q, 33)
                fundo = "#2a2b30" if est < 0.18 else escolhe(["#b7bcc3", "#a9b4c2", "#c2b9a8", "#9fa8a0"], s, k, q)
                Poligono("solido", [(xx, 1.92, p0), (xx, 1.92, p1), (xx, 2.22, p1), (xx, 2.22, p0)], (-s, 0, 0), fundo)
                if est >= 0.18:
                    cz = p0 + 0.2
                    Poligono("solido", [(xx - s * 0.002, 2.07 + 0.1 * math.sin(TAU * t / 6), cz + 0.1 * math.cos(TAU * t / 6)) for t in range(6)], (-s, 0, 0), "#7d93b3")
                    Poligono("solido", [(xx - s * 0.002, 2.1, cz + 0.2), (xx - s * 0.002, 2.1, p1 - 0.1), (xx - s * 0.002, 2.15, p1 - 0.1), (xx - s * 0.002, 2.15, cz + 0.2)], (-s, 0, 0), "#8d9198")
                if est > 0.72:
                    Tag("neon", (xx - s * 0.004, 1.95, p1 - 0.05 if s < 0 else p0 + 0.05), (0, 0, s), (0, 1, 0), p1 - p0 - 0.1, 0.24, 950 + k * 9 + q + s, w=0.018)
    # os fundos (com o vão da passagem, sem verga: o trem é um tubo só)
    for zf, nz in ((0.0, 1), (WL, -1)):
        for x0, x1 in ((-MEIA, -PASSAGEM), (PASSAGEM, MEIA)):
            if nz > 0:
                Placa("solido", (x0, 0, zf), (x1 - x0, 0, 0), (0, ALT, 0), 1, 6, None, escovado(ACO_IN, 160, faixa_fuga, 0.1), 0.3)
            else:
                Placa("solido", (x1, 0, zf), (x0 - x1, 0, 0), (0, ALT, 0), 1, 6, None, escovado(ACO_IN, 161, faixa_fuga, 0.1), 0.3)
            Caixa2("solido", (PASSAGEM if x0 > 0 else -PASSAGEM) - 0.03, (PASSAGEM if x0 > 0 else -PASSAGEM) + 0.03, 0, ALT, zf, zf + nz * 0.05, BORRACHA, sujo=0)
        U = (-1, 0, 0) if nz > 0 else (1, 0, 0)
        Tag("neon", (-1.25 if nz > 0 else 1.25, 0.45, zf + nz * 0.006), (nz, 0, 0), (0, 1, 0), 0.55, 0.6, 980 + nz, "#2fe8ff" if nz > 0 else "#ff3fb0", 0.03)
        Tag("neon", (0.7 if nz > 0 else -0.7, 1.2, zf + nz * 0.006), (nz, 0, 0), (0, 1, 0), 0.55, 0.45, 990 + nz, "#ffc857", 0.028)
        Caixa2("neon", -1.1 if nz > 0 else 0.75, -0.75 if nz > 0 else 1.1, 2.12, 2.2, zf, zf + nz * 0.02, "#3dff8a")
    # as calhas das lâmpadas (as lâmpadas são do jogo: cada vagão pisca sozinho)
    for x in (-0.42, 0.42):
        for k in range(5):
            z0 = 0.6 + k * 2.9
            for dx in (-0.09, 0.09):
                Caixa2("solido", x + dx - 0.015, x + dx + 0.015, ALT - 0.05, ALT, z0 - 0.04, z0 + 2.04, "#7d828a", sujo=0)


# ════════════════════════ vira objetos, AO, a luz assada, exporta ════════════════════════
GRUPOS = ("solido", "brilho", "farol", "luz", "pisca", "neon")
NOS_IDS = ("carro", "vagao", "fuga", "fugaporta")
LONGE = {"carro": 0.0, "vagao": 40.0, "fuga": 80.0, "fugaporta": 80.0}


def material(g):
    m = bpy.data.materials.new("metro_" + g)
    try:
        m.use_nodes = True
    except Exception:
        pass
    nt = m.node_tree
    b = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    a = nt.nodes.new("ShaderNodeVertexColor")
    a.layer_name = "Col"
    if g == "solido":
        nt.links.new(a.outputs["Color"], b.inputs["Base Color"])
        b.inputs["Roughness"].default_value = 0.6
    else:
        b.inputs["Base Color"].default_value = (0, 0, 0, 1)
        nt.links.new(a.outputs["Color"], b.inputs["Emission Color"])
        b.inputs["Emission Strength"].default_value = 1.0
    return m


MATS = {g: material(g) for g in GRUPOS}
NOS = {}
for no in NOS_IDS:
    e = bpy.data.objects.new(no, None)
    COL.objects.link(e)
    NOS[no] = e
    for g in GRUPOS:
        b = BUF.get((no, g))
        if not b:
            continue
        me = bpy.data.meshes.new(f"{no}_{g}")
        me.from_pydata([tuple(v) for v in b["v"]], [], b["f"])
        at = me.color_attributes.new("Base", "FLOAT_COLOR", "CORNER")
        at.data.foreach_set("color", [x for fc in b["c"] for c in fc for x in c])
        me.polygons.foreach_set("use_smooth", [True] * len(me.polygons))
        me.update()
        o = bpy.data.objects.new(f"{no}_{g}", me)
        COL.objects.link(o)
        o.parent = e
        o["grupo"] = g
        me.materials.append(MATS[g])
    e.location = (LONGE[no], 0, 0)

vl = bpy.context.view_layer
vl.update()

solidos = [o for o in COL.objects if o.type == "MESH" and o["grupo"] == "solido"]
for o in solidos:
    ao = o.data.color_attributes.new("AO", "FLOAT_COLOR", "CORNER")
    o.data.color_attributes.active_color = ao
try:
    sc.render.engine = "CYCLES"
except TypeError as e:
    print("engine", e)
sc.cycles.samples = 64
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
sc.world.light_settings.distance = 0.7
vl.update()
for o in sc.objects:
    o.select_set(False)
for o in solidos:
    o.select_set(True)
vl.objects.active = solidos[0]
print("BAKE", bpy.ops.object.bake(type="AO", target="VERTEX_COLORS"))


# ── a luz fluorescente assada de leve na cor (nos interiores; o jogo não ganha luz nova) ──
def c3(h, k):
    c = lin(h)
    return (c[0] * k, c[1] * k, c[2] * k)


def J(x, y, z):
    return (x, -z, y)


FONTES = {
    "carro": [],
    "vagao": [(J(0, 2.35, z), c3("#e8f0ff", 0.55 if z != -6 else 0.35), 1.7) for z in (-6, -2, 2, 6)] + [(J(3.0, 2.0, 1.0), c3("#b38cff", 0.4), 2.0)],
    "fuga": [(J(0, 2.2, z), c3("#f3f6ff", 0.35), 1.6) for z in (1.6, 4.5, 7.4, 10.3, 13.2)],
}
FONTES["fugaporta"] = FONTES["fuga"]
BASE = {"carro": 0.95, "vagao": 0.62, "fuga": 0.8, "fugaporta": 0.8}

for o in COL.objects:
    if o.type != "MESH":
        continue
    me = o.data
    g = o["grupo"]
    no = o.parent.name
    base = me.color_attributes["Base"]
    n = len(base.data)
    bc = [0.0] * (n * 4)
    base.data.foreach_get("color", bc)
    if g == "solido":
        ac = [0.0] * (n * 4)
        me.color_attributes["AO"].data.foreach_get("color", ac)
        vi = [0] * n
        me.loops.foreach_get("vertex_index", vi)
        for i in range(n):
            p = me.vertices[vi[i]].co
            fr = fg = fb = BASE[no]
            for q, cor, raio in FONTES[no]:
                d2 = ((p.x - q[0]) ** 2 + (p.y - q[1]) ** 2 + (p.z - q[2]) ** 2) / (raio * raio)
                k = 1.0 / (1.0 + d2)
                fr += cor[0] * k
                fg += cor[1] * k
                fb += cor[2] * k
            a = 0.25 + 0.75 * ac[i * 4]
            bc[i * 4] = min(1.0, bc[i * 4] * a * fr)
            bc[i * 4 + 1] = min(1.0, bc[i * 4 + 1] * a * fg)
            bc[i * 4 + 2] = min(1.0, bc[i * 4 + 2] * a * fb)
        me.color_attributes.remove(me.color_attributes["AO"])
    me.color_attributes.remove(me.color_attributes["Base"])
    col = me.color_attributes.new("Col", "FLOAT_COLOR", "CORNER")
    col.data.foreach_set("color", bc)
    me.color_attributes.active_color = col
    me.color_attributes.render_color_index = me.color_attributes.active_color_index

for no, e in NOS.items():
    e.location = (0, 0, 0)
vl.update()
for o in sc.objects:
    o.select_set(False)
for o in COL.objects:
    o.select_set(True)
vl.objects.active = NOS["carro"]
print(bpy.ops.export_scene.gltf(filepath=SAIDA, export_format="GLB", use_selection=True, export_texcoords=False,
      export_normals=True, export_materials="EXPORT", export_yup=True, export_apply=True, export_vertex_color="ACTIVE"))
tot = {}
for o in COL.objects:
    if o.type == "MESH":
        tot[o.name] = sum(len(p.vertices) - 2 for p in o.data.polygons)
print("TRI", tot)
for no in NOS_IDS:
    print("TRI", no, sum(v for k, v in tot.items() if k.startswith(no + "_")))
print("TRI total", sum(tot.values()))
