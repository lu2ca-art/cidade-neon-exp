# As fachadas dos lugares do chão do subúrbio (06/11): ginásio, galeria, discos,
# batida (estúdio), flores, brechó e (09/11) o bar. Antes eram caixas com letreiro
# (app/linha/disco/LugaresChao.tsx, LugaresAbertos). O subúrbio é ruína de lixo
# da cidade reaproveitado: cada lugar é uma construção improvisada com a cara do
# que é (galpão em arco com grade e pneus; vitrine de vidro rachado com quadros e
# lona; contêineres com o vinil gigante; ônibus velho com caixas de som; estufa
# de garrafa PET com canteiros; barraca de feira com araras e manequins).
#
#   blender -b --factory-startup --python blender/scripts/lugares_chao.py \
#     [--python blender/scripts/lugares_chao_foto.py] -- bruto.glb [foto.png]
#   npx @gltf-transform/cli optimize bruto.glb public/models/lugares-chao.glb \
#     --compress meshopt --simplify false --join false --flatten false --instance false --palette false
#
# Coordenadas: Blender Z pra cima, a FRENTE olha pra -Y (no glTF: Y pra cima,
# frente +Z). Cada lugar = um nó (o id do lugar) com a origem NO CHÃO NO CENTRO
# DA FRENTE (a fachada em y = 0, o prédio pra trás até y = 9; 11 m de largo, o
# ginásio 12, como as caixas de antes), e três malhas penduradas:
#   <id>_solido  paredes, sucata, móveis (cor no vértice × AO assada)
#   <id>_luz     o que brilha com cor fixa (janela, porta, lâmpada, quadro, flor)
#   <id>_neon    o neon do lugar, sem cor (o jogo pinta com a cor do lugar)
# O letreiro (o texto) continua o do jogo (o atlas): cada nó guarda onde ele vai
# ("let_z" altura, "let_f" quanto na frente da origem, em metros).
# As paredes descem 2 m abaixo do chão (as dunas inclinam).
# Orçamento: o arquivo inteiro até 30 mil triângulos, sem decimate (a contagem
# sai da modelagem; as estampas por face ficam intactas).

import bpy, bmesh, math, os, sys
from mathutils import Vector, Matrix, Color

TAU = 2 * math.pi
args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
SAIDA = args[0] if args else "/tmp/lugares-chao-bruto.glb"
IDS = ["ginasio", "galeria", "discos", "batida", "flores", "brecho", "bar"]
if os.environ.get("SO_LUGARES"):
    IDS = os.environ["SO_LUGARES"].split(",")  # só pra lapidar um lugar (a exportação final é com todos)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
COL = bpy.data.collections.new("Lugares")
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
                k = 1 - sujo * max(0.0, min(1.0, 1 - l.vert.co.z / 1.3))
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


# ── padrões (estampa por face) ──
def chapa(pal, seed, larg=4, alt=2, k=0.76):
    """Chapa ondulada em retalhos: a cor muda a cada `larg` colunas, a onda alterna."""
    def f(c, n, i, j):
        cor = escolhe(pal, i // larg, j // alt, seed)
        return dim(cor, k) if i % 2 else lin(cor)
    return f


def onda(cor, k=0.76, eixo_i=True):
    return lambda c, n, i, j: dim(cor, k) if ((i if eixo_i else j) % 2) else lin(cor)


def retalho(pal, cel, seed):
    return lambda c, n, i, j: lin(escolhe(pal, math.floor(c.x / cel), math.floor(c.y / cel), math.floor(c.z / cel), seed))


def misto(a, b, t):
    """Mistura duas cores (hex ou linear), já em linear."""
    ca, cb = lin(a), lin(b)
    return (ca[0] + (cb[0] - ca[0]) * t, ca[1] + (cb[1] - ca[1]) * t, ca[2] + (cb[2] - ca[2]) * t, 1.0)


def ripas(cor, k=0.55):
    return lambda c, n, i, j: dim(cor, k) if j % 2 else lin(cor)


LOMBADAS = ["#a8432e", "#d0a640", "#3a6a9a", "#e0d8c8", "#2a2a30", "#6a3a7a", "#3f7a5a", "#c86a8a", "#d07a3a"]


def lombadas(seed, k=1.0):
    return lambda c, n, i, j: dim(escolhe(LOMBADAS, i, seed), k * (0.75 + 0.25 * hh(i, seed, 3)))


def pneu(p, r=(0, 0, 0), Rm=0.36, rm=0.15, cor=BO, seg=12):
    Tor("solido", p, Rm, rm, seg, 6, cor, r)


def letreiro(z, y):
    """A placa do letreiro (7,4 × 2,1) com a moldura em neon; o texto é do jogo."""
    B("solido", (0, y + 0.07, z), (7.4, 0.14, 2.1), "#141218", sujo=0)
    for zz in (z - 1.08, z + 1.08):
        B("neon", (0, y - 0.03, zz), (7.56, 0.07, 0.07))
    for xx in (-3.74, 3.74):
        B("neon", (xx, y - 0.03, z), (0.07, 0.07, 2.23))
    LET[ATUAL[0]] = (round(z, 3), round(0.05 - y, 3))


def lampadas(a, b, n, sag, cor=LAMP):
    a, b = Vector(a), Vector(b)
    pts = []
    for k in range(n + 1):
        t = k / n
        pts.append(a.lerp(b, t) + Vector((0, 0, -sag * 4 * t * (1 - t))))
    Tubo("solido", pts, 0.012, 3, "#222026", 0)
    for p in pts[1:-1]:
        B("luz", (p.x, p.y, p.z - 0.07), (0.09, 0.09, 0.09), cor, r=(0.6, 0.6, 0))


# ════════════════════════ GINÁSIO ════════════════════════
def ginasio():
    Hp, Rr = 3.2, 6.0
    PAL = [Z1, FE, AZ, Z2, VD, FE2]
    # o chão de cimento na frente, rachado em placas
    B("solido", (0, -1.7, -0.32), (12.4, 3.4, 0.7), CO2, d=(1.55, 1.13, 0.7), cf=retalho([CO2, CO, "#58565e"], 1.55, 3), sujo=0)
    # as paredes de lado e de trás: o núcleo e a chapa ondulada em retalhos por fora
    for s in (-1, 1):
        B("solido", (s * 5.92, 4.5, 0.6), (0.16, 9.0, 5.2), Z2, sujo=0.1)
        Placa("solido", (s * 6.005, 0 if s > 0 else 9, -2), (0, 9 if s > 0 else -9, 0), (0, 0, 5.2), 20, 4, cf=chapa(PAL, s + 5))
    B("solido", (0, 8.92, 0.6), (12, 0.16, 5.2), Z2, sujo=0.1)
    Placa("solido", (6, 9.005, -2), (-12, 0, 0), (0, 0, 5.2), 26, 4, cf=chapa(PAL, 9))
    Leque("solido", (0, 8.95, Hp), Rr, 16, Z2, frente=True)
    Leque("solido", (0, 8.97, Hp), Rr, 16, Z2, frente=False)
    # o telhado em arco: 16 gomos × 3, cada pedaço de uma chapa (dois faltando)
    N = 16
    for k in range(N):
        m = math.pi * (k + 0.5) / N
        corda = 2 * (Rr + 0.06) * math.sin(math.pi / (2 * N)) + 0.05
        for t in range(3):
            if (k, t) in ((11, 2), (4, 1)):
                continue
            cor = escolhe(PAL, k, t, 7)
            if k % 2:
                cor = dim(cor, 0.82)
            B("solido", ((Rr + 0.06) * math.cos(m), -0.35 + 1.625 + t * 3.25, Hp + (Rr + 0.06) * math.sin(m)),
              (corda, 3.3, 0.1), cor, r=(0, -m - math.pi / 2, 0), sujo=0)
    # as costelas do arco (ferro enferrujado) na frente e atrás
    for yy in (-0.38, 9.42):
        Tubo("solido", [((Rr + 0.14) * math.cos(math.pi * k / 16), yy, Hp + (Rr + 0.14) * math.sin(math.pi * k / 16)) for k in range(17)], 0.11, 6, FE2)
    # a parede da frente dos dois lados da porta
    for s in (-1, 1):
        B("solido", (s * 4.25, 0.08, 0.7), (3.5, 0.16, 5.4), Z2, sujo=0.1)
        Placa("solido", (2.5 if s > 0 else -6, -0.005, -2), (3.5, 0, 0), (0, 0, 5.4), 8, 4, cf=chapa(PAL, s + 2))
    B("solido", (0, 0.1, 3.58), (12.3, 0.36, 0.36), FE2, sujo=0)  # a viga em cima da porta
    # a GRADE no arco da frente
    x = -5.5
    while x <= 5.51:
        topo = Hp + math.sqrt(max(0.0, Rr * Rr - x * x)) - 0.05
        B("solido", (x, -0.3, (3.76 + topo) / 2), (0.07, 0.07, topo - 3.76), "#4a4e58", sujo=0)
        x += 0.5
    for zz in (5.6, 7.6):
        w = 2 * math.sqrt(Rr * Rr - (zz - Hp) ** 2)
        B("solido", (0, -0.3, zz), (w, 0.08, 0.08), "#4a4e58", sujo=0)
    # dentro: o chão e as lâmpadas penduradas (vê-se pela grade)
    B("solido", (0, 4.5, -0.05), (11.6, 8.8, 0.1), CO2, sujo=0)
    for xl in (-3.0, 0.0, 3.0):
        B("luz", (xl, 3.5, 6.6), (0.9, 0.22, 0.1), "#ffe2b0")
        B("solido", (xl, 3.5, 7.4 + (0.6 if xl == 0 else 0)), (0.03, 0.03, 1.5 + (1.2 if xl == 0 else 0)), PR, sujo=0)
    # a porta de enrolar meio subida e a luz quente lá dentro
    B("solido", (0, 0.04, 2.8), (5.0, 0.08, 1.2), Z1, d=(5, 0.08, 0.15), cf=onda(Z1, 0.72, eixo_i=False), sujo=0)
    B("luz", (0, 0.9, 1.1), (4.9, 0.04, 2.2), "#d89a58")
    # o letreiro preso na grade e o neon no contorno do arco
    letreiro(5.15, -0.5)
    Tubo("neon", [((Rr + 0.3) * math.cos(math.pi * k / 24), -0.46, Hp + (Rr + 0.3) * math.sin(math.pi * k / 24)) for k in range(25)], 0.05, 4)
    for s in (-1, 1):
        B("neon", (s * 6.3, -0.46, 1.6), (0.07, 0.07, 3.2))
    # PNEUS: duas pilhas, um encostado, um de trator deitado
    for k in range(4):
        pneu((-4.4 + 0.05 * math.sin(k * 2), -1.3, 0.15 + k * 0.3), r=(0, 0, k * 0.4))
    for k in range(2):
        pneu((-3.3, -2.1, 0.15 + k * 0.3), r=(0, 0, k))
    pneu((4.95, -0.42, 0.52), r=(math.pi / 2 - 0.25, 0, 0.08))
    pneu((-5.1, -2.75, 0.3), r=(0.12, 0.05, 0), Rm=0.75, rm=0.3, seg=14)
    # o SACO DE PANCADA na forca de ferro
    for xp in (2.9, 5.3):
        B("solido", (xp, -2.0, 1.3), (0.14, 0.14, 3.2), FE, sujo=0.1)
    B("solido", (4.1, -2.0, 2.95), (2.6, 0.14, 0.14), FE, sujo=0)
    B("solido", (4.1, -2.0, 2.62), (0.03, 0.03, 0.5), "#8a8f9a", sujo=0)
    Cil("solido", (4.1, -2.0, 1.25), 0.25, 0.25, 1.15, 10, VM, sujo=0)
    Cil("solido", (4.1, -2.0, 2.4), 0.25, 0.1, 0.13, 10, "#5a1a1a", sujo=0)
    # uma barra com anilhas no chão
    Cil("solido", (0.6, -1.7, 0.2), 0.02, 0.02, 1.8, 6, "#9aa0ac", r=(0, math.pi / 2, 0), sujo=0)
    for xa in (0.85, 2.15):
        Cil("solido", (xa, -1.7, 0.2), 0.2, 0.2, 0.06, 10, PR, r=(0, math.pi / 2, 0), sujo=0)


# ════════════════════════ GALERIA ════════════════════════
def galeria():
    CC = [CO, CO2, "#77737c", "#5d5a62"]
    # a casca de concreto (um prédio de loja que sobrou), o topo da direita quebrado
    B("solido", (-5.35, 4.5, 1.55), (0.3, 9, 7.1), CO, d=(0.3, 1.5, 1.2), cf=retalho(CC, 1.5, 1))
    B("solido", (5.35, 4.5, 1.15), (0.3, 9, 6.3), CO, d=(0.3, 1.5, 1.2), cf=retalho(CC, 1.5, 2))
    for k in range(5):
        B("solido", (5.35, 0.8 + k * 1.9, 4.45 + 0.2 * hh(k, 1)), (0.3, 0.9 + 0.5 * hh(k, 2), 0.4 + 0.4 * hh(k, 3)), CO2, r=(0.15 * hh(k, 4), 0, 0), sujo=0)
    B("solido", (0, 8.85, 1.3), (11, 0.3, 6.6), CO, d=(1.5, 0.3, 1.2), cf=retalho(CC, 1.5, 3))
    B("solido", (-1.9, 4.5, 5.25), (7.2, 9.3, 0.3), CO2, d=(1.5, 1.5, 0.3), cf=retalho(CC, 1.5, 4), sujo=0)
    for k in range(5):  # os ferros da laje quebrada
        B("solido", (1.95, 0.9 + k * 1.8, 5.25), (0.6, 0.03, 0.03), FE, r=(0, 0.25 * (1 if k % 2 else -1), 0.2 * hh(k, 9)), sujo=0)
    # a LONA azul no lugar da laje que caiu
    Lona("solido", (1.4, -0.3, 5.38), (4.3, 0, -1.0), (0, 9.4, 0), 5, 8, 0.35, "#2f5c9a")
    # a testa em cima da vitrine (o letreiro vai nela)
    B("solido", (0, 0.18, 4.25), (11.2, 0.36, 2.1), CO, d=(1.4, 0.36, 0.7), cf=retalho(CC, 1.4, 5))
    # a VITRINE: montantes, travessas e o vidro (uns rachados, um quebrado, a porta aberta)
    xs = [-5.2, -3.47, -1.73, 0.0, 1.73, 3.47, 5.2]
    for x in xs:
        B("solido", (x, 0.2, 1.6), (0.12, 0.14, 3.2), "#2a2c33", sujo=0.1)
    for z in (0.3, 1.85, 3.15):
        B("solido", (0, 0.2, z), (10.5, 0.14, 0.1), "#2a2c33", sujo=0)
    B("solido", (0, 0.25, -0.85), (10.6, 0.3, 2.3), CO2)
    reflexo = lambda c, n, i, j: lin("#3a4e5e") if ((c.x * 0.7 + c.z) % 2.6) < 0.5 else lin("#24323e")
    for b in range(6):
        x0, x1 = xs[b], xs[b + 1]
        for row, (z0, z1) in enumerate(((0.3, 1.85), (1.85, 3.15))):
            xc, zc, w, h = (x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0
            if (b, row) == (3, 0):
                continue  # a porta
            if (b, row) == (1, 0):
                # o vidro quebrado: só os cacos presos no caixilho
                for k in range(4):
                    B("solido", (x0 + 0.25 + 0.4 * k, 0.22, z1 - 0.2 - 0.12 * (k % 2)), (0.35, 0.02, 0.32), "#33475a", r=(0, 0.6 + k, 0), sujo=0)
                B("solido", (x1 - 0.25, 0.22, z0 + 0.3), (0.3, 0.02, 0.4), "#33475a", r=(0, -0.7, 0), sujo=0)
                continue
            B("solido", (xc, 0.22, zc), (w - 0.1, 0.03, h - 0.08), "#24323e", d=0.55, cf=reflexo, sujo=0)
            if (b, row) in ((0, 1), (4, 0), (2, 1), (5, 1)):
                cx, cz = xc + (hh(b, row) - 0.5) * w * 0.5, zc + (hh(row, b) - 0.5) * h * 0.4
                for k in range(6):
                    a = TAU * k / 6 + hh(b, k)
                    L = 0.3 + 0.5 * hh(k, b, row)
                    B("luz", (cx + math.cos(a) * L / 2, 0.198, cz + math.sin(a) * L / 2), (L, 0.012, 0.018), "#4f7898", r=(0, -a, 0))
    # dentro: o chão e a luz quente (vê-se pela porta e pelo vidro quebrado)
    B("solido", (0, 4.5, -0.05), (10.4, 8.4, 0.1), CO2, sujo=0)
    B("luz", (-0.5, 3.0, 1.3), (5.5, 0.04, 2.6), "#c89060")
    # os QUADROS: na vitrine, no cavalete e encostados no chão
    def quadro(p, w, h, rx, pal, seed, ry=0.0):
        with em(T(*p) @ R(rx, ry, 0)):
            B("solido", (0, 0.035, 0), (w + 0.16, 0.06, h + 0.16), "#7a5a2a", sujo=0)
            nu, nv = 5, 4
            Placa("luz", (-w / 2, 0.0, -h / 2), (w, 0, 0), (0, 0, h), nu, nv,
                  cf=lambda c, n, i, j: dim(escolhe(pal, i // (1 + seed % 2), (j + i * seed) // 2, seed), 0.8))
    quadro((-2.6, -0.04, 2.3), 1.9, 1.4, 0, ["#ff3fb0", "#3d7bff", "#ffc857", "#1a1830"], 3)
    quadro((3.0, -0.04, 1.75), 1.3, 1.8, 0, ["#5dffa0", "#ff6a35", "#e9e3d5", "#2a3a70"], 4)
    quadro((0.87, -0.04, 2.5), 1.0, 0.75, 0, ["#ffc857", "#ff3fb0", "#40406a"], 5)
    quadro((-4.3, -1.95, 1.45), 1.0, 0.8, -0.2, ["#3d7bff", "#ff6a35", "#e9e3d5"], 6)
    quadro((1.4, -0.32, 0.58), 0.9, 1.1, -0.25, ["#ff3fb0", "#5dffa0", "#16141c"], 7)
    quadro((4.55, -0.5, 0.42), 0.7, 0.75, -0.3, ["#ffc857", "#3d7bff"], 8, ry=0.2)
    # o cavalete
    Viga("solido", (-4.75, -2.1, 0), (-4.45, -1.95, 1.95), 0.05, MD)
    Viga("solido", (-3.85, -2.1, 0), (-4.15, -1.95, 1.95), 0.05, MD)
    Viga("solido", (-4.3, -1.3, 0), (-4.3, -1.85, 1.8), 0.05, MD)
    # as luzes que batem nos quadros (presas na testa)
    for xl in (-2.6, 0.87, 3.0):
        B("solido", (xl, -0.2, 3.12), (0.04, 0.5, 0.04), PR, sujo=0)
        B("luz", (xl, -0.48, 3.05), (0.18, 0.18, 0.12), "#fff0c8")
    # o toldo de lona listrada na esquerda, em duas varas
    Lona("solido", (-5.5, -0.05, 3.25), (4.8, 0, 0), (0, -2.2, -0.55), 6, 3, 0.18,
         cf=lambda c, n, i, j: lin("#b0582a") if i % 2 else lin("#cfc6b4"))
    for xp in (-5.4, -0.8):
        Cil("solido", (xp, -2.25, 0), 0.05, 0.05, 2.75, 6, MD, sujo=0.1)
    # entulho na direita
    for k in range(6):
        B("solido", (4.6 + hh(k, 1) * 1.0, -1.0 - hh(k, 2) * 1.6, 0.12), (0.5 + 0.4 * hh(k, 3), 0.4 + 0.3 * hh(k, 4), 0.3 + 0.2 * hh(k, 5)),
          escolhe(CC, k), r=(0.3 * hh(k, 6), 0.3 * hh(k, 7), TAU * hh(k, 8)))
    # letreiro e neon (a travessa de cima da vitrine e as quinas)
    letreiro(4.25, -0.02)
    B("neon", (0, 0.1, 3.24), (10.4, 0.06, 0.06))
    for s in (-1, 1):
        B("neon", (s * 5.3, 0.1, 1.6), (0.06, 0.06, 3.0))


# ════════════════════════ DISCOS ════════════════════════
def discos():
    CA, CB, CC_, CD = "#8a3f2a", "#2f5a58", "#34507a", "#6a6a3a"
    # o contêiner da frente (aberto de lado: é a loja)
    B("solido", (0, 1.22, 0.06), (11, 2.44, 0.12), CA)
    B("solido", (0, 1.22, 2.56), (11, 2.44, 0.08), CA, sujo=0)
    B("solido", (0, 2.41, 1.3), (11, 0.06, 2.6), CA)
    Placa("solido", (-5.5, 2.379, 0.12), (11, 0, 0), (0, 0, 2.4), 44, 1, cf=onda(dim(CA, 0.7)))
    for s in (-1, 1):
        B("solido", (s * 5.47, 1.22, 1.3), (0.06, 2.44, 2.6), CA)
        Placa("solido", (s * 5.502, 0 if s > 0 else 2.44, 0), (0, 2.44 if s > 0 else -2.44, 0), (0, 0, 2.6), 10, 1, cf=onda(CA))
        B("solido", (s * 5.42, 0.08, 1.3), (0.16, 0.16, 2.6), dim(CA, 0.7))
    B("solido", (0, 0.08, 2.45), (11, 0.16, 0.2), dim(CA, 0.8), sujo=0)
    B("solido", (0, 0.08, 0.18), (11, 0.16, 0.24), dim(CA, 0.8))
    # a parte fechada da esquerda (com cartazes) e a porta da direita aberta pra fora
    B("solido", (-4.37, 0.06, 1.3), (1.94, 0.04, 2.3), CA)
    Placa("solido", (-5.34, 0.035, 0.15), (1.94, 0, 0), (0, 0, 2.3), 8, 1, cf=onda(CA))
    for k, (cx, cz, c) in enumerate(((-4.8, 1.6, "#d0a640"), (-3.95, 1.3, "#e0d8c8"), (-4.5, 0.75, "#3a6a9a"))):
        B("solido", (cx, 0.02, cz), (0.6, 0.01, 0.8), c, r=(0, 0.08 * (k - 1), 0), sujo=0.1)
    with em(T(5.34, 0, 0) @ R(0, 0, 1.6)):
        B("solido", (-1.0, -0.03, 1.3), (2.0, 0.05, 2.3), CA, d=(0.25, 0.05, 2.3), cf=onda(CA))
        for xb in (-0.5, -1.5):
            B("solido", (xb, -0.08, 1.3), (0.04, 0.04, 2.2), "#9aa0ac", sujo=0)
    # dentro: estantes com discos (lombadas), as lâmpadas no teto, caixotes no chão
    for zs in (0.9, 1.65):
        B("solido", (0, 2.15, zs), (6.6, 0.42, 0.05), MD, sujo=0)
        B("solido", (0, 2.17, zs + 0.18), (6.4, 0.3, 0.31), PR, sujo=0)
        Placa("luz", (-3.2, 2.019, zs + 0.025), (6.4, 0, 0), (0, 0, 0.31), 80, 1, cf=lombadas(int(zs * 10), 0.6))
    for s in (-1, 1):
        B("solido", (s * 3.3, 2.15, 1.25), (0.06, 0.42, 2.3), MD, sujo=0)
    lampadas((-3.3, 1.2, 2.45), (3.3, 1.2, 2.45), 8, 0.12)
    # o contêiner de trás e o meio contêiner (e pneus) no fundo
    B("solido", (0.2, 3.82, 1.3), (11.6, 2.44, 2.6), CB)
    Placa("solido", (5.8 + 0.2, 2.6, 0), (0, 2.44, 0), (0, 0, 2.6), 10, 1, cf=onda(CB))
    B("solido", (-2.6, 6.6, 1.3), (6.0, 2.44, 2.6), CD, r=(0, 0, 0.08))
    for k in range(3):
        pneu((2.8 + 0.1 * k, 6.4, 0.15 + 0.3 * k), r=(0, 0, k))
    # o contêiner de cima (o letreiro na frente dele)
    B("solido", (0, 1.62, 3.9), (8, 2.44, 2.6), CC_)
    Placa("solido", (-4, 0.399, 2.6), (8, 0, 0), (0, 0, 2.6), 32, 1, cf=onda(CC_))
    for s in (-1, 1):
        Placa("solido", (s * 4.002, 0.4 if s > 0 else 2.84, 2.6), (0, 2.44 if s > 0 else -2.44, 0), (0, 0, 2.6), 10, 1, cf=onda(CC_))
    letreiro(3.95, 0.38)
    # o VINIL GIGANTE em pé no teto, nos cavaletes de ferro
    t = 0.11
    rs = [0.09, 1.0, 1.3, 1.6, 1.9, 2.2, 2.5, 2.8, 3.0]
    perfil = [(r, t) for r in rs] + [(3.0, -t), (0.09, -t)]
    nf = len(rs) - 1
    with em(T(0.3, 1.7, 8.35) @ R(0, 0, 0.1) @ R(math.pi / 2, 0, 0)):
        add(bm_torno(perfil, 32, fechado=True), "solido", None, None,
            cf=lambda c, n, i, j: lin("#2c2a36") if (i < nf and i % 2 == 1) else lin("#0f0d13"), sujo=0)
        Cil("neon", (0, 0, -t - 0.015), 0.95, 0.95, 2 * t + 0.03, 24)
        Cil("solido", (0, 0, -t - 0.03), 0.09, 0.09, 2 * t + 0.06, 8, PR, sujo=0)
        Tor("neon", (0, 0, t + 0.012), 2.65, 0.035, 28, 4)
    for s in (-1, 1):
        Viga("solido", (s * 2.3, 2.1, 5.2), (s * 0.5 + 0.3, 2.0, 7.8), 0.14, FE)
        Viga("solido", (s * 2.3, 2.6, 5.2), (s * 0.5 + 0.3, 2.0, 7.8), 0.12, FE2)
    Viga("solido", (-1.6, 2.06, 6.3), (2.2, 2.06, 6.3), 0.1, FE)
    # a escada pro teto
    for yy in (0.55, 1.15):
        B("solido", (5.62, yy, 2.6), (0.05, 0.05, 5.2), "#8a8f9a", sujo=0)
    for k in range(9):
        B("solido", (5.62, 0.85, 0.3 + k * 0.6), (0.04, 0.6, 0.04), "#8a8f9a", sujo=0)
    # CAIXOTES de disco na frente (e a vitrola num deles)
    def caixote(p, yaw=0.0, seed=0):
        with em(T(*p) @ R(0, 0, yaw)):
            B("solido", (0, 0, 0.19), (0.55, 0.42, 0.38), MD, d=(0.55, 0.42, 0.095), cf=ripas(MD), sujo=0.1)
            Placa("solido", (-0.25, -0.18, 0.385), (0.5, 0, 0), (0, 0.36, 0), 9, 1, cf=lombadas(seed))
    for k, (p, yaw) in enumerate((((-2.6, -0.9, 0), 0.1), ((-2.6, -0.9, 0.38), -0.1), ((-2.55, -0.92, 0.76), 0.2),
                                   ((-1.95, -1.4, 0), -0.3), ((-1.95, -1.4, 0.38), -0.15), ((2.4, -1.0, 0), 0.05),
                                   ((2.4, -1.0, 0.38), 0.25), ((2.95, -1.65, 0), -0.4), ((-0.6, -1.4, 0), 0.0),
                                   ((1.2, -2.0, 0), 0.6), ((-1.0, 1.0, 0.12), 0.0), ((0.3, 1.1, 0.12), 0.1), ((1.6, 1.0, 0.12), -0.1))):
        caixote(p, yaw, k)
    B("solido", (-0.6, -1.4, 0.43), (0.46, 0.36, 0.08), PR, sujo=0)
    Cil("solido", (-0.65, -1.4, 0.47), 0.15, 0.15, 0.012, 16, "#0d0b10", sujo=0)
    Viga("solido", (-0.4, -1.28, 0.49), (-0.55, -1.45, 0.49), 0.015, "#9aa0ac", sujo=0)
    B("luz", (-0.43, -1.55, 0.475), (0.03, 0.03, 0.01), "#ff4040")
    # as lâmpadas na frente da loja e o neon na beira de cima do contêiner
    lampadas((-3.4, -0.1, 2.35), (3.4, -0.1, 2.35), 10, 0.35)
    B("neon", (0, -0.02, 2.58), (10.8, 0.05, 0.05))


# ════════════════════════ BATIDA ════════════════════════
def batida():
    AMR, CRE = "#a9852e", "#c4bcaa"
    # o ÔNIBUS velho (o estúdio): a lataria, a faixa, o teto
    B("solido", (0, 1.75, 1.375), (10, 2.5, 1.25), AMR)
    Placa("solido", (-5, 0.499, 0.75), (10, 0, 0), (0, 0, 1.25), 16, 2,
          cf=lambda c, n, i, j: lin(FE) if hh(i, j, 3) < 0.22 else (dim(AMR, 0.85) if hh(i, j, 5) < 0.3 else lin(AMR)))
    B("solido", (0, 1.75, 2.5), (10, 2.5, 1.0), CRE, sujo=0)
    B("solido", (0, 1.75, 3.12), (9.8, 2.3, 0.24), "#b5ae9e", sujo=0)
    B("solido", (0, 0.48, 1.97), (10.02, 0.03, 0.12), VM, sujo=0)
    B("solido", (0, 1.75, 0.4), (9.0, 2.0, 0.7), PR, sujo=0)  # o chassi
    # as janelas: luz do estúdio (umas tapadas com espuma)
    for k in range(8):
        x = -4.0 + k * 1.15
        if k == 1:
            continue
        if k in (4, 6):
            Placa("solido", (x - 0.475, 0.484, 2.075), (0.95, 0, 0), (0, 0, 0.75), 4, 3,
                  cf=lambda c, n, i, j: lin("#2a2630") if (i + j) % 2 else lin("#1a181e"), sujo=0)
            continue
        B("luz", (x, 0.485, 2.45), (0.95, 0.02, 0.75), escolhe(["#9a3a7a", "#c9784a", "#6a3aa0"], k, 2))
    # a porta aberta e os degraus
    B("luz", (-2.85, 0.485, 1.8), (0.9, 0.02, 2.0), "#ffcf8a")
    B("solido", (-2.85, 0.15, 0.55), (1.0, 0.5, 0.2), CO2)
    B("solido", (-2.85, -0.3, 0.25), (1.1, 0.5, 0.2), CO2)
    # a frente (o nariz no +x): para-brisa, faróis, para-choque
    B("luz", (5.01, 1.75, 2.45), (0.02, 2.2, 0.9), "#2a2440")
    for yy in (0.8, 2.7):
        B("luz", (5.01, yy, 1.1), (0.02, 0.25, 0.18), "#fff4d0")
    B("solido", (5.08, 1.75, 0.85), (0.16, 2.5, 0.25), PR)
    # rodas: três; no lugar da quarta, blocos de concreto
    for p in ((3.3, 0.55, 0.45), (3.3, 2.95, 0.45), (-3.4, 2.95, 0.45)):
        pneu(p, r=(math.pi / 2, 0, 0), Rm=0.33, rm=0.14)
        Cil("solido", (p[0], p[1] - 0.07, p[2]), 0.2, 0.2, 0.14, 8, "#5d6270", r=(math.pi / 2, 0, 0), sujo=0)
    B("solido", (-3.4, 0.8, 0.19), (0.6, 0.4, 0.38), CO, r=(0, 0, 0.1))
    B("solido", (-3.4, 0.8, 0.56), (0.55, 0.38, 0.36), CO2, r=(0, 0, -0.1))
    # as CAIXAS DE SOM empilhadas (o cone com o anel em neon)
    def caixa_som(p, s, cones, yaw=0.0):
        with em(T(*p) @ R(0, 0, yaw)):
            B("solido", (0, 0, s[2] / 2), s, "#18161c", sujo=0.1)
            B("solido", (0, -s[1] / 2 - 0.004, s[2] / 2), (s[0] - 0.08, 0.01, s[2] - 0.08), "#232129", sujo=0)
            for cx, cz, r in cones:
                Cil("solido", (cx, -s[1] / 2 - 0.005, cz), r, r * 0.35, 0.07, 10, "#2c2a34", r=(math.pi / 2, 0, 0), sujo=0)
                Tor("neon", (cx, -s[1] / 2 - 0.02, cz), r, 0.03, 10, 4, r=(math.pi / 2, 0, 0))
    caixa_som((-4.4, -0.9, 0), (1.3, 1.0, 1.3), [(0, 0.65, 0.45)])
    caixa_som((-4.4, -0.85, 1.3), (1.1, 0.9, 0.95), [(-0.27, 0.5, 0.2), (0.27, 0.5, 0.2)], 0.08)
    caixa_som((-4.35, -0.8, 2.25), (0.8, 0.7, 0.5), [(0, 0.25, 0.16)], -0.1)
    caixa_som((4.3, -0.9, 0), (1.2, 1.0, 1.4), [(0, 0.95, 0.3), (0, 0.38, 0.22)], -0.05)
    caixa_som((4.35, -0.95, 1.4), (1.3, 0.9, 0.9), [(0, 0.45, 0.35)], -0.12)
    caixa_som((-1.5, -0.6, 0), (0.6, 0.5, 0.8), [(0, 0.5, 0.17)], 0.25)
    caixa_som((-4.2, 1.5, 3.24), (0.9, 0.8, 0.9), [(0, 0.45, 0.26)], 0.05)
    caixa_som((4.2, 1.6, 3.24), (1.0, 0.8, 0.8), [(0, 0.4, 0.25)], -0.08)
    # os cabos das caixas pra porta
    for a, b in (((-3.8, -0.5, 0.3), (-2.9, 0.4, 0.75)), ((3.7, -0.5, 0.4), (-2.6, 0.42, 0.78)), ((-1.3, -0.4, 0.2), (-2.7, 0.4, 0.7))):
        a, b = Vector(a), Vector(b)
        Tubo("solido", [a.lerp(b, k / 6) + Vector((0, 0, -0.25 * math.sin(math.pi * k / 6) + 0.0)) for k in range(7)], 0.025, 4, PR, 0)
    # o letreiro em cima do teto (com dois pés) e a antena
    for xs_ in (-3.0, 3.0):
        B("solido", (xs_, 0.6, 3.3), (0.08, 0.08, 0.25), PR, sujo=0)
    letreiro(4.4, 0.45)
    Viga("solido", (2.0, 2.6, 3.24), (2.3, 2.6, 5.8), 0.04, "#8a8f9a", 0)
    # o puxadinho atrás: telhado de chapa caído pra trás, a parede do fundo e dos lados
    B("solido", (0, 5.9, 2.85), (10.6, 5.9, 0.06), Z1, r=(-0.154, 0, 0), d=(0.45, 5.9, 0.06), cf=onda(Z1), sujo=0)
    B("solido", (0, 8.8, 0.4), (10.6, 0.12, 4.8), Z2, sujo=0.1)
    Placa("solido", (5.3, 8.862, -2), (-10.6, 0, 0), (0, 0, 4.4), 22, 3, cf=chapa([Z1, FE, AZ, Z2], 4))
    for s in (-1, 1):
        B("solido", (s * 5.3, 5.9, 0.2), (0.1, 5.8, 4.4), FE, sujo=0.1)
    Cil("solido", (3.8, 6.0, 2.95), 0.05, 0.55, 0.25, 10, "#c0c4cc", r=(-0.6, 0, 0), sujo=0)
    # neon: a beira do teto do ônibus
    B("neon", (0, 0.47, 3.0), (9.9, 0.05, 0.05))


# ════════════════════════ FLORES ════════════════════════
def flores():
    PET = ["#7fae86", "#9cb9be", "#6f9a6a", "#a4c4a0", "#7a5a3a", "#5f86a8"]
    LUZPET = ["#3e5a3a", "#4a5e38", "#56603a", "#3a5450"]
    X, Y0, Y1, Hw, Hr = 5.0, 0.3, 8.6, 2.4, 4.6
    B("solido", (0, 4.45, -0.85), (10.2, 8.5, 2.3), CO2)  # o pé de tijolo e pneu enterrado
    pet = lambda seed: (lambda c, n, i, j: dim(escolhe(PET, i, j, seed), 0.85 if j % 2 else 1.0))
    petluz = lambda seed: (lambda c, n, i, j: lin(escolhe(LUZPET, i, j, seed)))
    # as paredes de lado e de trás: garrafa PET (umas acesas pela luz de dentro)
    for s in (-1, 1):
        B("solido", (s * 4.97, 4.45, 1.35), (0.06, 8.3, 2.1), "#26342a", sujo=0)
        o, U = (s * 5.0, Y0 if s > 0 else Y1, 0.3), (0, (Y1 - Y0) * (1 if s > 0 else -1), 0)
        Placa("solido", o, U, (0, 0, 2.1), 24, 6, cf=pet(s), filtro=lambda i, j, s=s: hh(i, j, s + 3) >= 0.3)
        Placa("luz", o, U, (0, 0, 2.1), 24, 6, cf=petluz(s), filtro=lambda i, j, s=s: hh(i, j, s + 3) < 0.3)
    B("solido", (0, 8.57, 1.35), (10, 0.06, 2.1), "#26342a", sujo=0)
    Placa("solido", (5, 8.605, 0.3), (-10, 0, 0), (0, 0, 2.1), 28, 6, cf=pet(7), filtro=lambda i, j: hh(i, j, 8) >= 0.3)
    Placa("luz", (5, 8.605, 0.3), (-10, 0, 0), (0, 0, 2.1), 28, 6, cf=petluz(7), filtro=lambda i, j: hh(i, j, 8) < 0.3)
    Tri("solido", (5, 8.6, Hw), (-5, 8.6, Hw), (0, 8.6, Hr), "#4f6e55")
    # o telhado de duas águas, de garrafa também
    L = (Y1 - Y0) + 0.3
    for s in (-1, 1):
        o = (s * X, Y0 - 0.15 if s > 0 else Y1 + 0.15, Hw)
        U, V = (0, L * (1 if s > 0 else -1), 0), (-s * X, 0, Hr - Hw)
        Placa("solido", o, U, V, 20, 10, cf=pet(s + 11), filtro=lambda i, j, s=s: hh(i, j, s + 13) >= 0.25, sujo=0)
        Placa("luz", o, U, V, 20, 10, cf=petluz(s + 11), filtro=lambda i, j, s=s: hh(i, j, s + 13) < 0.25)
    # a frente: o fundo escuro, a porta acesa e os FUNDOS DE GARRAFA
    B("solido", (0, 0.33, 1.35), (10, 0.06, 2.1), "#1e2a22", sujo=0)
    Tri("solido", (-5, 0.31, Hw), (5, 0.31, Hw), (0, 0.31, Hr), "#1e2a22")
    B("luz", (0, 0.28, 1.2), (1.7, 0.02, 1.8), "#a8c890")
    for xp in (-0.92, 0.92):
        B("solido", (xp, 0.24, 1.2), (0.12, 0.1, 1.9), MD, sujo=0.1)
    B("solido", (0, 0.24, 2.15), (1.96, 0.1, 0.12), MD, sujo=0)
    z = 0.45
    row = 0
    while z < Hr - 0.2:
        x = -4.85 + (0.15 if row % 2 else 0)
        while x <= 4.85:
            dentro = abs(x) < 5 * (Hr - z) / (Hr - Hw) - 0.18 if z > Hw else True
            porta = abs(x) < 1.08 and z < 2.3
            placa = abs(x) < 3.85 and 2.05 < z < 4.35
            if dentro and not porta and not placa:
                if hh(x, z, 2) < 0.28:
                    Hex("luz", (x, 0.29, z), 0.13, dim(escolhe(["#8fc490", "#b0d0a0", "#c8d890", "#90b8c0"], x, z), 0.6))
                else:
                    Hex("solido", (x, 0.29, z), 0.13, escolhe(PET, x, z, 4))
            x += 0.3
        z += 0.26
        row += 1
    # a armação de madeira
    for yy in (Y0, 4.45, Y1):
        for s in (-1, 1):
            B("solido", (s * 5.05, yy, 1.15), (0.14, 0.14, 2.5), MD, sujo=0.1)
    Viga("solido", (0, Y0 - 0.2, Hr + 0.06), (0, Y1 + 0.2, Hr + 0.06), 0.14, MD)
    for s in (-1, 1):
        Viga("solido", (s * 5.15, 0.24, Hw - 0.04), (0, 0.24, Hr + 0.06), 0.14, MD)
        Viga("solido", (s * 5.15, Y1 + 0.06, Hw - 0.04), (0, Y1 + 0.06, Hr + 0.06), 0.14, MD)
        Viga("solido", (s * 5.05, Y0 - 0.1, Hw + 0.02), (s * 5.05, Y1 + 0.1, Hw + 0.02), 0.12, MD)
        # o neon no contorno da frente (a cumeeira)
        Viga("neon", (s * 5.05, 0.15, Hw), (0, 0.15, Hr + 0.02), 0.06)
    letreiro(3.2, 0.12)
    # os CANTEIROS na frente: dois de tábua, dois de pneu pintado, o tambor de água
    VERDES = ["#3f7a3a", "#4f8a40", "#2f6a3a", "#5a8a3a"]
    FLOR = ["#ff3fb0", "#ffc857", "#ff6a35", "#e8e0ff", "#c070ff"]
    def plantas(cx, cy, lx, ly, z0, n_folha, n_flor, seed):
        for k in range(n_folha):
            px, py = cx + (hh(k, seed, 1) - 0.5) * lx, cy + (hh(k, seed, 2) - 0.5) * ly
            Cil("solido", (px, py, z0), 0.13, 0.0, 0.35 + 0.3 * hh(k, seed, 3), 5, escolhe(VERDES, k, seed), sujo=0)
        for k in range(n_flor):
            px, py = cx + (hh(k, seed, 4) - 0.5) * lx, cy + (hh(k, seed, 5) - 0.5) * ly
            B("luz", (px, py, z0 + 0.35 + 0.3 * hh(k, seed, 6)), (0.15, 0.15, 0.15), dim(escolhe(FLOR, k, seed), 0.9), r=(0.6, 0.6, k))
    for s in (-1, 1):
        B("solido", (s * 3.1, -1.5, 0.25), (3.2, 1.0, 0.5), MD, d=(3.2, 1.0, 0.167), cf=ripas(MD, 0.6))
        B("solido", (s * 3.1, -1.5, 0.5), (3.0, 0.8, 0.06), "#3a281c", sujo=0)
        plantas(s * 3.1, -1.5, 2.8, 0.6, 0.52, 9, 11, s + 2)
    for k, (px, py, cor) in enumerate(((-5.2, -0.8, "#c84a3a"), (5.3, -2.4, "#e0b040"), (5.3, -0.5, "#4a8ac8"))):
        for a in range(2):
            pneu((px, py, 0.15 + 0.3 * a), r=(0, 0, a), cor=cor if a else dim(cor, 0.75))
        Cil("solido", (px, py, 0.5), 0.3, 0.3, 0.04, 10, "#3a281c", sujo=0)
        plantas(px, py, 0.4, 0.4, 0.52, 3, 4, k + 7)
    Cil("solido", (-4.5, -2.4, 0), 0.32, 0.32, 0.95, 12, AZ)
    Cil("solido", (-4.5, -2.4, 0.95), 0.33, 0.33, 0.04, 12, dim(AZ, 0.7), sujo=0)


# ════════════════════════ BRECHÓ ════════════════════════
def brecho():
    # o chão de tábua dentro da barraca
    B("solido", (0, 3.5, 0.06), (10.4, 7.4, 0.12), MD2, d=(10.4, 0.5, 0.12), cf=ripas(MD2, 0.75), sujo=0)
    # as varas, as vigas e a LONA listrada (de feira) por cima
    for x in (-5, -1.7, 1.7, 5):
        Cil("solido", (x, 0, -0.5), 0.07, 0.07, 3.7, 6, MD, sujo=0.1)
        Cil("solido", (x, 7.0, -0.5), 0.07, 0.07, 3.1, 6, MD, sujo=0.1)
    B("solido", (0, 0, 3.15), (10.4, 0.14, 0.14), MD, sujo=0)
    B("solido", (0, 7.0, 2.55), (10.4, 0.14, 0.14), MD, sujo=0)
    listra = lambda c, n, i, j: lin("#a8406a") if i % 2 else lin("#d6cdbd")
    Lona("solido", (-5.3, -0.25, 3.25), (10.6, 0, 0), (0, 7.5, -0.65), 14, 5, 0.28, cf=listra)
    B("solido", (0, -0.28, 2.95), (10.6, 0.03, 0.5), d=(10.6 / 14, 0.03, 0.5), cf=listra, sujo=0)
    # o fundo de paletes em pé e a chapa em cima
    for k in range(6):
        x = -4.4 + k * 1.76
        B("solido", (x, 7.15, 1.1), (1.7, 0.14, 2.4), MD2, sujo=0.1)
        Placa("solido", (x - 0.85, 7.079, -0.1), (1.7, 0, 0), (0, 0, 2.4), 1, 12, cf=ripas(escolhe([MD, "#7a6040", "#5f4a36"], k), 0.45))
    B("solido", (0, 7.15, 2.45), (10.4, 0.06, 0.3), Z1, sujo=0)
    # a lona verde do lado esquerdo
    Lona("solido", (-5.2, 0.4, 3.0), (0, 6.4, 0), (0, 0, -2.7), 6, 4, 0.15, "#4b6a4f", sdir=(-1, 0, 0))
    # (09/11) as ARARAS com peças de brechó de verdade: cortes de época (camisa de
    # gola larga, vestido evasê, boca de sino, blazer, colete de franja, poncho),
    # estampa por face, cores gastas. As da frente têm mais detalhe e algumas ficam
    # de frente pra rua; as do fundo são mais simples (orçamento: docs/suburbio-lugares.md)
    CR, TE, MO, AB, TB, PE = "#e2d3b1", "#b4532a", "#c9962e", "#7b7d3a", "#6b4a2b", "#2d6669"
    VI, RO, JE, JC, MA, LJ, CA = "#6e2233", "#c98a7c", "#3f5a7a", "#7a90a8", "#4e3324", "#c96a2b", "#9a7346"
    ROUPA = [TE, MO, AB, PE, VI, RO, JE, CA, CR]
    ACERVO = [("camisa", "flor", (CR, TE, MO)), ("vestido", "flor", (PE, RO, CR)), ("calca", "veludo", (MO, TB, TB)),
              ("blazer", "xadrez", (TB, CR, MO)), ("camisa", "zigue", (LJ, MA, CR)), ("colete", "liso", (CA, MA, CR)),
              ("vestido", "bloco", (CR, VI, PE)), ("calca", "lavado", (JE, JC, JC)), ("poncho", "zigue", (VI, MO, CR)),
              ("camisa", "listra", (RO, CR, VI)), ("blazer", "liso", (AB, TB, MO)), ("vestido", "poa", (VI, CR, CR))]

    def estampa(tipo, pal, sd, nc):
        b, a, c = pal
        def f(cc, n, i, j):
            r = hh(i, j, sd)
            if tipo == "flor":
                cor = a if r < 0.2 else c if r < 0.3 else b
            elif tipo == "listra":
                cor = a if j % 2 else b
            elif tipo == "xadrez":
                cor = misto(b, a, ((i % 2) + (j % 2)) / 2)
            elif tipo == "poa":
                cor = a if (i + j) % 2 == 0 and j % 2 == 0 else b
            elif tipo == "zigue":
                cor = (b, a, c)[(abs(2 * i - nc + 1) // 2 + j) % 3]  # o chevron em V
            elif tipo == "bloco":
                cor = (a, b, c)[min(2, j // 3)]
            elif tipo == "veludo":
                cor = dim(b, 0.72) if i % 2 else lin(b)
            elif tipo == "lavado":
                cor = misto(b, a, 0.75 if i in (1, 2) and 2 < j < 7 else 0.15)
            else:
                cor = b
            # o gasto: a trama irregular e o ombro queimado de sol
            k = 0.84 + 0.16 * hh(j, i, sd, 7)
            return misto(misto(cor, CR, 0.2 if j == 0 else 0.0), "#000000", 1 - k)
        return f

    def folha(linhas, nc, cf, bojo=0.03, rug=0.012, corte=None, sd=0):
        """Um pano de dois lados: linhas = [(x esq, x dir, z)] de cima pra baixo."""
        bm = bmesh.new()
        ij = bm.faces.layers.int.new("ij")
        for lado in (-1, 1):
            g = [[bm.verts.new((xe + (xd - xe) * (i / nc),
                                lado * bojo * math.sin(math.pi * i / nc) + rug * math.sin(i / nc * 9 + j * 1.3 + sd), z))
                  for j, (xe, xd, z) in enumerate(linhas)] for i in range(nc + 1)]
            for i in range(nc):
                for j in range(len(linhas) - 1):
                    if corte and corte(i, j):
                        continue
                    q = (g[i][j], g[i + 1][j], g[i + 1][j + 1], g[i][j + 1])
                    bm.faces.new(q if lado > 0 else q[::-1])[ij] = i * 1000 + j
        soltos = [v for v in bm.verts if not v.link_faces]
        if soltos:
            bmesh.ops.delete(bm, geom=soltos, context="VERTS")
        add(bm, "solido", None, None, cf, 0, afiar=None)

    def corpo(w, comp, nr):
        return [(-w(j / (nr - 1)), w(j / (nr - 1)), -0.02 - comp * j / (nr - 1)) for j in range(nr)]

    def rampa(a, b, t):
        return a + (b - a) * max(0.0, min(1.0, t))

    def manga(sinal, ombro, comp, nr, cf):
        ls = [(ombro - 0.005, ombro + 0.1 - 0.02 * j / (nr - 1), -0.05 - comp * j / (nr - 1)) for j in range(nr)]
        if sinal < 0:
            ls = [(-xd, -xe, z) for xe, xd, z in ls]
        with em(T(0, 0.015, 0)):
            folha(ls, 2, cf, bojo=0.02, rug=0)

    def peca(modelo, tipo, pal, sd, rico):
        nr, nc = (9, 6) if rico > 1 else (7, 4) if rico else (5, 2)
        cf = estampa(tipo, pal, sd, nc)
        # a gola larga e a lapela em V, pintadas por face; entre elas, o forro escuro
        def decote(fundo):
            def f(c, n, i, j):
                if j < nc // 2 and i in (j, nc - 1 - j):
                    return lin(pal[2])
                if j < nc // 2 and j < i < nc - 1 - j:
                    return lin(fundo)
                return cf(c, n, i, j)
            return f
        gola = decote(CR)
        if modelo == "camisa":
            folha(corpo(lambda t: rampa(0.09, 0.24, t / 0.1), 0.72, nr), nc, gola if rico else cf, sd=sd)
            if rico:
                for s in (-1, 1):
                    manga(s, 0.24, 0.52, 4, cf)
        elif modelo == "blazer":
            folha(corpo(lambda t: rampa(0.09, 0.26, t / 0.1) - 0.03 * math.sin(math.pi * t), 0.74, nr), nc, decote(MA) if rico else cf, bojo=0.04, sd=sd)
            if rico:
                for s in (-1, 1):
                    manga(s, 0.26, 0.6, 4, cf)
        elif modelo == "vestido":
            folha(corpo(lambda t: (rampa(0.08, 0.19, t / 0.08) if t < 0.3 else rampa(0.15, 0.4, (t - 0.3) / 0.7)), 1.05, nr), nc, cf, sd=sd)
        elif modelo == "calca":
            for s in (-1, 1):
                ls = []
                for j in range(nr):
                    t = j / (nr - 1)
                    fora = rampa(0.19, 0.17, t / 0.25) if t < 0.6 else rampa(0.13, 0.33, (t - 0.6) / 0.4)
                    dentro = 0.0 if t < 0.25 else rampa(0.02, 0.12, (t - 0.6) / 0.4) if t > 0.6 else 0.02
                    ls.append((s * dentro, s * fora, -0.02 - 1.05 * t) if s > 0 else (s * fora, s * dentro, -0.02 - 1.05 * t))
                folha(ls, max(2, nc // 2), cf, bojo=0.03, sd=sd + s)
        elif modelo == "colete":
            n = nr + 2
            franja = lambda i, j: j == n - 2 and i % 2 == 1
            folha(corpo(lambda t: rampa(0.09, 0.23, t / 0.1), 0.68, n), nc, cf, corte=franja, sd=sd)
        else:  # poncho
            folha(corpo(lambda t: rampa(0.08, 0.36, t / 0.5), 0.68, nr), nc, cf, bojo=0.02, sd=sd)

    def arara(x0, x1, y, seed, rico, h=1.75):
        for x in (x0, x1):
            Cil("solido", (x, y, 0), 0.03, 0.03, h, 6, "#9aa0ac", sujo=0)
            B("solido", (x, y, 0.03), (0.06, 0.6, 0.05), "#9aa0ac", sujo=0)
        Viga("solido", (x0, y, h), (x1, y, h), 0.05, "#9aa0ac", 0)
        n = int((x1 - x0 - 0.2) / 0.3)
        for k in range(n):
            x = x0 + 0.2 + k * 0.3
            mod, tipo, pal = escolhe(ACERVO, k, seed)
            yaw = 0.95 + 0.4 * (hh(k, seed, 2) - 0.5)
            with em(T(x, y, h - 0.05) @ R(0, 0, yaw)):
                peca(mod, tipo, pal, seed * 10 + k, 1 if rico else 0)
        # as peças do destaque, de frente pra rua, penduradas na frente da barra
        if rico:
            for k, x in enumerate((x0 + 0.62, x1 - 0.62)):
                mod, tipo, pal = ACERVO[(seed * 3 + k * 5) % len(ACERVO)]
                Viga("solido", (x, y, h), (x, y - 0.3, h - 0.06), 0.02, "#7a7f8a", 0)
                with em(T(x, y - 0.3, h - 0.08)):
                    peca(mod, tipo, pal, seed * 31 + k, 2)
    arara(-4.6, -2.2, -1.1, 1, True)
    arara(2.2, 4.6, -1.2, 2, True)
    arara(-3.6, 0.4, 4.0, 3, False)
    arara(1.4, 4.4, 5.6, 4, False)
    # os MANEQUINS (um sem cabeça)
    perfil = [(0, 0.9), (0.15, 0.92), (0.19, 1.02), (0.15, 1.18), (0.17, 1.36), (0.2, 1.5), (0.17, 1.6), (0.08, 1.66), (0.05, 1.7), (0.05, 1.78), (0, 1.78)]
    def manequim(p, yaw, roupa=None, cabeca=True):
        with em(T(*p) @ R(0, 0, yaw)):
            Cil("solido", (0, 0, 0), 0.22, 0.2, 0.05, 8, PR, sujo=0)
            Cil("solido", (0, 0, 0.05), 0.025, 0.025, 0.9, 5, "#8a8f9a", sujo=0)
            with em(S(1, 0.7, 1)):
                add(bm_torno(perfil, 10), "solido", None, None, sujo=0,
                    cf=lambda c, n, i, j: lin(roupa) if (roupa and 1 <= i <= 6) else lin("#d8cbb5"))
            if cabeca:
                Esfera("solido", (0, 0, 1.9), 0.11, 8, 6, "#d8cbb5")
    manequim((-1.25, -1.5, 0), 0.3, PE)
    manequim((1.3, -1.6, 0), -0.4, VI, cabeca=False)
    manequim((3.2, 2.5, 0.12), 0.2)
    # a mesa de roupa dobrada e o espelho
    B("solido", (-1.8, 2.6, 0.8), (2.2, 1.0, 0.06), MD, sujo=0)
    for sx in (-1, 1):
        for sy in (-1, 1):
            B("solido", (-1.8 + sx * 1.0, 2.6 + sy * 0.42, 0.4), (0.06, 0.06, 0.8), MD2)
    for k in range(7):
        B("solido", (-2.65 + k * 0.28, 2.6 + 0.2 * (hh(k, 1) - 0.5), 0.88 + 0.04 * (k % 3)), (0.26, 0.34, 0.1 + 0.08 * (k % 3)), escolhe(ROUPA, k, 9), r=(0, 0, 0.2 * (hh(k, 2) - 0.5)), sujo=0)
    with em(T(4.4, 0.9, 0) @ R(0, 0, -0.5)):
        B("solido", (0, 0, 1.0), (0.7, 0.06, 1.8), MD, sujo=0)
        B("luz", (0, -0.035, 1.0), (0.56, 0.01, 1.62), "#56647a")
    # montes de roupa no chão
    for k in range(4):
        B("solido", (-4.2 + k * 2.6 + hh(k, 3), 5.4 + hh(k, 4), 0.25), (0.8, 0.6, 0.3), escolhe(ROUPA, k, 5), r=(0.2, 0.1, k), sujo=0)
    # os pés do letreiro, o letreiro em cima da viga, as lâmpadas e o neon da entrada
    for s in (-1, 1):
        Cil("solido", (s * 3.0, 0.02, 3.1), 0.05, 0.05, 1.3, 6, MD, sujo=0)
    letreiro(4.3, -0.15)
    lampadas((-5.0, -0.34, 2.72), (5.0, -0.34, 2.72), 13, 0.3)
    for s in (-1, 1):
        B("neon", (s * 1.7, -0.1, 1.45), (0.05, 0.05, 2.9))


# ════════════════════════ O BAR (09/11) ════════════════════════
# O boteco na porta do subúrbio, de frente pra quem chega do deserto: sobrado de
# bloco sem reboco em cima, cal descascando embaixo, barra verde, azulejo no
# balcão de rua, porta de aço de enrolar meio aberta. Sem gente (o povo do bar é
# o do jogo: as rodinhas de vidaNasRuas.ts ficam nos vãos entre as mesas).
def bar():
    PISO = 0.14  # a calçada de cimento
    CAL, CAL2, REB = "#b9ab8a", "#9f9274", "#7c7568"
    BARRA, BARRA2 = "#3f5a48", "#2e4436"
    TIJ, TIJ2 = "#8a4a32", "#6b3625"
    VERM = "#8e3b31"       # cimento queimado vermelho (o balcão)
    PLA = ["#b5322c", "#d0a032", "#2f5f9a", "#b5322c", "#d0a032"]  # o plástico das mesas
    VIDRO = ["#3f6a3a", "#7a4a1e", "#3f6a3a", "#c9b98a"]

    # ── a calçada ──
    Placa("solido", (-6.8, -6.0, PISO), (13.6, 0, 0), (0, 6.0, 0), 8, 4,
          cf=lambda c, n, i, j: dim(CO2, 0.62 + 0.3 * hh(i, j, 11)) if hh(i, j, 12) > 0.12 else dim(CO2, 0.42), sujo=0)
    for o, U in (((-6.8, -6.0, PISO - 0.4), (13.6, 0, 0)), ((-6.8, 0, PISO - 0.4), (0, -6.0, 0)), ((6.8, -6.0, PISO - 0.4), (0, 6.0, 0))):
        Placa("solido", o, U, (0, 0, 0.4), 1, 1, CO2, sujo=0)

    # ── o corpo: a base, o fundo, o andar de cima, o forro da frente ──
    # (recuado da parede de fora: no mesmo plano, a AO assa a parede de preto)
    B("solido", (0, 4.5, -1.0), (11.8, 8.8, 2.0), CO2, sujo=0)
    B("solido", (0, 5.5, 1.75), (11.8, 6.8, 3.5), CO2, sujo=0)
    B("solido", (0, 4.55, 4.55), (11.8, 8.7, 2.1), CO2, sujo=0)
    # a platibanda: no meio recua pra não atravessar o letreiro
    for xc, lx in ((-5.175, 1.85), (5.175, 1.85)):
        B("solido", (xc, 4.5, 5.72), (lx, 9.2, 0.24), CO, sujo=0)
    B("solido", (0, 4.65, 5.72), (8.5, 8.9, 0.24), CO, sujo=0)

    # ── a parede da frente: cal descascando, barra verde, o reboco e o bloco aparecendo ──
    CX, CZ = 0.4, 0.35
    def buraco(i, j):
        return (2 <= i < 10 and 3 <= j < 8) or (14 <= i < 22 and j < 9)
    def parede(c, n, i, j):
        mancha = math.sin(c.x * 1.3 + 0.7) * math.sin(c.z * 2.1 + 1.9) + 0.6 * math.sin(c.x * 3.7 + c.z * 2.3)
        h = hh(i, j, 7)
        if mancha + h * 0.9 > 1.15:
            return lin(escolhe([TIJ, TIJ2, TIJ], i, j, 3))        # caiu tudo: o tijolo
        if mancha + h * 0.9 > 0.72:
            return dim(REB, 0.72 + 0.28 * hh(i, j, 8))            # só o reboco
        base = (BARRA2 if hh(i, j, 9) < 0.3 else BARRA) if c.z < 1.05 else (CAL2 if hh(i, j, 9) < 0.35 else CAL)
        return dim(base, 0.8 + 0.2 * hh(i, j, 10))
    Placa("solido", (-6, 0, 0), (12, 0, 0), (0, 0, 3.5), 30, 10, cf=parede, filtro=lambda i, j: not buraco(i, j), sujo=0.3)
    # o andar de cima: bloco sem reboco (a obra que nunca acabou)
    Placa("solido", (-6, 0, 3.5), (12, 0, 0), (0, 0, 2.1), 24, 7, sujo=0.05,
          cf=lambda c, n, i, j: dim(escolhe([TIJ, TIJ2, "#94573c"], (i + (j % 2)) // 2, j, 5), 0.78 + 0.22 * hh(i, j, 6)) if hh(i, j, 15) > 0.07 else lin(REB))
    # a laje aparecendo entre os andares
    B("solido", (0, -0.06, 3.53), (12.1, 0.12, 0.16), CO, sujo=0)
    # os lados (quem chega de lado vê a cal suja e o bloco)
    lado = lambda c, n, i, j: lin(TIJ2) if hh(i, j, 21) < 0.3 else dim(CAL2, 0.55 + 0.25 * hh(i, j, 22)) if c.z < 3.5 else lin(escolhe([TIJ, TIJ2], i, j, 23))
    Placa("solido", (6, 0, 0), (0, 9, 0), (0, 0, 5.6), 8, 5, cf=lado, sujo=0.2)
    Placa("solido", (-6, 9, 0), (0, -9, 0), (0, 0, 5.6), 8, 5, cf=lado, sujo=0.2)

    # ── dentro: a luz do fundo (o que se vê pelo balcão e por baixo da porta) ──
    B("solido", (-5.65, 1.0, 1.65), (0.1, 2.0, 3.2), PR, sujo=0)
    B("solido", (3.25, 1.0, 1.65), (0.1, 2.0, 3.2), PR, sujo=0)
    B("solido", (-1.2, 1.0, 3.28), (9.0, 2.0, 0.12), "#2a2622", sujo=0)
    B("luz", (-1.2, 1.0, 0.13), (8.8, 2.0, 0.04), "#3e2614")
    def fundo(c, n, i, j):
        t = (j + 0.5) / 6
        return misto("#3a2212", "#ffcf8a", min(1.0, t ** 2.2 * 1.25) * (0.75 + 0.25 * hh(i, 41)))
    Placa("luz", (-5.6, 1.95, 0.14), (8.8, 0, 0), (0, 0, 3.0), 5, 6, cf=fundo, sujo=0)
    # as prateleiras com as garrafas (a sombra contra a luz)
    for z in (1.55, 2.2):
        B("solido", (-3.6, 1.82, z), (3.1, 0.22, 0.05), MD2, sujo=0)
        for k in range(7):
            x = -4.9 + k * 0.43 + 0.08 * hh(k, z)
            Cil("solido", (x, 1.82, z + 0.025), 0.045, 0.03, 0.3, 4, escolhe(VIDRO, k, z), sujo=0, tampa=False)
    # o freezer horizontal e a lâmpada pelada no meio, vistos pela porta
    B("solido", (1.9, 1.3, 0.55), (1.5, 0.75, 0.82), "#c7cbcf", sujo=0.2)
    B("solido", (1.9, 1.3, 1.0), (1.56, 0.8, 0.08), "#8d9196", sujo=0)
    Viga("solido", (0.9, 1.2, 3.22), (0.9, 1.2, 2.62), 0.012, PR, 0)
    Esfera("luz", (0.9, 1.2, 2.55), 0.08, 6, 4, "#fff0c0")

    # ── o BALCÃO pra rua ──
    # a moldura, a pedra de cimento vermelho, o azulejo embaixo e o neon na beira
    for x in (-5.2, -2.0):
        B("solido", (x, -0.04, 1.93), (0.1, 0.14, 1.78), MD2, sujo=0)
    B("solido", (-3.6, -0.05, 2.83), (3.3, 0.14, 0.1), MD2, sujo=0)
    B("solido", (-3.6, -0.3, 1.06), (3.7, 0.72, 0.09), VERM, sujo=0)
    for x in (-5.0, -3.6, -2.2):
        B("solido", (x, -0.28, 0.8), (0.1, 0.5, 0.42), PR, sujo=0.1)   # as mãos-francesas
    Placa("solido", (-5.2, -0.02, PISO), (3.2, 0, 0), (0, 0, 0.91), 12, 4, sujo=0.25,
          cf=lambda c, n, i, j: lin(TIJ2) if hh(i, j, 31) < 0.16 else (lin("#37597a") if (i + j) % 2 else lin("#c9c2ae")))
    B("neon", (-3.6, -0.67, 1.06), (3.7, 0.03, 0.03))
    B("luz", (-3.6, 0.12, 2.74), (3.0, 0.1, 0.05), "#eaf3ff")          # a fluorescente do balcão
    # em cima do balcão: garrafa aberta, copos e o porta-guardanapo
    for x, cor in ((-4.55, VIDRO[0]), (-4.4, VIDRO[1]), (-2.65, VIDRO[0])):
        add(bm_torno([(0.04, 0), (0.04, 0.2), (0.015, 0.27), (0, 0.28)], 5), "solido", cor, T(x, -0.32, 1.105), None, 0)
    for x, y in ((-3.9, -0.3), (-3.75, -0.42), (-2.3, -0.28)):
        Cil("solido", (x, y, 1.105), 0.035, 0.042, 0.1, 5, "#d8d2c0", sujo=0, tampa=False)
    B("solido", (-3.2, -0.3, 1.16), (0.13, 0.09, 0.12), "#9a9ea6", sujo=0)
    # o toldo listrado por cima do balcão, nos dois pés
    Lona("solido", (-5.75, -1.75, 2.5), (4.25, 0, 0), (0, 1.75, 0.72), 10, 2, 0.1,
         cf=lambda c, n, i, j: dim(BARRA, 0.9) if i % 2 else dim("#d0c8a8", 0.82))
    for x in (-5.6, -1.65):
        Viga("solido", (x, -1.7, PISO), (x, -1.7, 2.52), 0.05, Z2, 0.1)
    Viga("solido", (-5.75, -1.72, 2.5), (-1.5, -1.72, 2.5), 0.05, Z2, 0)

    # ── a PORTA DE AÇO de enrolar, meio aberta (a parte de baixo é o que está aberto) ──
    x0, x1 = -0.4, 2.8
    for x in (x0 - 0.06, x1 + 0.06):
        B("solido", (x, -0.06, 1.65), (0.12, 0.12, 3.15), Z2, sujo=0.3)
    Placa("solido", (x0, -0.05, 1.45), (x1 - x0, 0, 0), (0, 0, 1.7), 8, 15, sujo=0.1,
          cf=lambda c, n, i, j: (dim(FE, 0.75) if hh(i // 2, j // 3, 51) < 0.09 else dim(FE2, 0.85) if hh(i, j, 52) < 0.07 else (dim(Z2, 0.62) if j % 2 else dim(Z1, 0.85))))
    B("solido", (1.2, -0.08, 1.42), (x1 - x0 + 0.04, 0.07, 0.1), Z2, sujo=0)        # a barra de baixo
    for x in (0.2, 2.2):
        B("solido", (x, -0.11, 1.42), (0.14, 0.03, 0.05), BO, sujo=0)              # as alças
    B("solido", (1.2, -0.14, 3.37), (x1 - x0 + 0.3, 0.26, 0.42), Z2, sujo=0.1)      # a caixa do rolo

    # ── na parede: o quadro de giz, a caixa de luz e os cartazes ──
    B("solido", (-1.2, -0.03, 1.8), (1.0, 0.06, 1.2), MD2, sujo=0)
    Placa("solido", (-1.62, -0.07, 1.33), (0.84, 0, 0), (0, 0, 0.92), 1, 7, sujo=0,
          cf=lambda c, n, i, j: lin("#6f6d68") if j % 2 else lin("#1d2420"))
    B("solido", (3.6, -0.06, 2.65), (0.42, 0.12, 0.58), Z2, sujo=0.1)
    B("solido", (3.6, -0.13, 2.65), (0.2, 0.02, 0.2), "#2a2e36", sujo=0)
    for x, z, w, h, a, b in ((4.65, 1.8, 0.72, 0.98, "#6f3a30", "#a89a7c"), (5.4, 2.15, 0.56, 0.78, "#34506a", "#8f8468"), (4.8, 2.95, 0.46, 0.36, "#a89a7c", "#3a3532")):
        Placa("solido", (x - w / 2, -0.03, z - h / 2), (w, 0, 0), (0, 0, h), 1, 3, sujo=0,
              cf=lambda c, n, i, j, a=a, b=b: lin(a) if j == 1 else lin(b))
    # o cano de PVC e a janelinha lá de cima, com grade
    Tubo("solido", [(5.72, -0.09, 5.6), (5.72, -0.09, 1.0), (5.82, -0.2, 0.25), (6.1, -0.45, PISO + 0.05)], 0.05, 5, "#d4cdbc", 0.15)
    Placa("luz", (-3.3, -0.03, 3.9), (2.0, 0, 0), (0, 0, 1.15), 1, 2, sujo=0,
          cf=lambda c, n, i, j: lin("#7a5230") if j else lin("#3e2a1c"))
    B("solido", (-2.3, -0.05, 4.47), (2.1, 0.03, 0.06), Z2, sujo=0)
    B("solido", (-2.3, -0.05, 3.9), (2.15, 0.08, 0.08), CO, sujo=0)
    for k in range(6):
        Viga("solido", (-3.15 + k * 0.34, -0.06, 3.92), (-3.15 + k * 0.34, -0.06, 5.04), 0.022, Z2, 0)

    # ── em cima: a caixa d'água azul, os ferros de espera e o suporte do letreiro ──
    add(bm_torno([(0.82, 0), (1.02, 0.95), (1.08, 1.0), (0.9, 1.14), (0, 1.2)], 12), "solido", "#2f62a8", T(4.95, 4.2, 5.84), None, 0.1)
    for x, y in ((-5.6, 1.0), (-5.0, 1.1), (-4.7, 2.2), (-5.5, 3.1), (-4.9, 0.7)):
        Viga("solido", (x, y, 5.8), (x + 0.03 * hh(x, y, 1), y, 6.7 + 0.4 * hh(x, y, 2)), 0.02, FE, 0)
    # o letreiro: o texto é o do jogo (no mesmo lugar de antes), aqui a chapa, os pés e a moldura em neon
    Z_LET = 6.3
    B("solido", (0, 0.02, Z_LET), (8.32, 0.14, 2.28), "#141218", sujo=0)
    for zz in (Z_LET - 1.16, Z_LET + 1.16):
        B("neon", (0, -0.08, zz), (8.42, 0.07, 0.07))
    for xx in (-4.18, 4.18):
        B("neon", (xx, -0.08, Z_LET), (0.07, 0.07, 2.39))
    for xx in (-3.2, 0, 3.2):
        Viga("solido", (xx, 0.1, 5.6), (xx, 0.1, Z_LET + 0.9), 0.08, Z2, 0.1)
    LET["bar"] = (Z_LET, 0.1)

    # ── as MESAS e BANQUETAS de plástico (nos vãos das rodinhas do jogo) ──
    def banqueta(x, y, cor, k=1.0):
        Lz = PISO
        add(bm_torno([(0.17, 0), (0.1, 0.38 * k), (0.17, 0.42 * k), (0, 0.45 * k)], 7), "solido", cor, T(x, y, Lz), None, 0.15)
    def mesa(x, y, cor, a=0.1):
        with em(T(x, y, PISO) @ R(0, 0, a)):
            B("solido", (0, 0, 0.74), (0.72, 0.72, 0.04), cor, sujo=0.05)
            for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
                Cil("solido", (sx * 0.29, sy * 0.29, 0), 0.032, 0.026, 0.72, 4, cor, sujo=0.2, tampa=False)
    def garrafa(x, y, cor=None):
        add(bm_torno([(0.038, 0), (0.038, 0.19), (0.014, 0.26), (0, 0.27)], 5), "solido", cor or VIDRO[1], T(x, y, PISO + 0.76), None, 0)
    def copo(x, y):
        Cil("solido", (x, y, PISO + 0.76), 0.032, 0.04, 0.095, 5, "#d8d2c0", sujo=0, tampa=False)
    MESAS = (
        (-1.55, -3.0, PLA[0], [(-0.68, 0.12), (0.62, 0.32), (0.15, 0.68)], (0.1, -0.1, 0.08, 0.14)),
        (3.65, -3.0, PLA[1], [(-0.66, -0.12), (0.62, 0.18), (-0.05, -0.69)], (-0.14, 0.05, 0.12, -0.04)),
        (-2.2, -5.45, PLA[2], [(0.68, 0.15), (-0.62, -0.3), (0.0, 0.68), (0.28, -0.68)], (0.02, 0.1, 0.16, -0.08)),
        (4.55, -5.35, PLA[3], [(-0.68, -0.15), (0.0, -0.7), (0.66, 0.2)], (0.12, 0.08, -0.08, -0.05)),
    )
    for n, (x, y, cor, bqs, itens) in enumerate(MESAS):
        mesa(x, y, cor, 0.08 + 0.17 * n)
        ix, iy, jx, jy = itens
        garrafa(x + ix, y + iy, VIDRO[(n + 1) % 2])
        copo(x + jx, y + jy)
        if n != 2:
            copo(x + ix - 0.14, y + iy + 0.07)
        for k, (dx, dy) in enumerate(bqs):
            banqueta(x + dx, y + dy, escolhe(PLA, n, k, 3))
    # as banquetas altas do balcão
    for x, cor in ((-4.75, PLA[1]), (-3.55, PLA[0]), (-2.45, PLA[1])):
        banqueta(x, -1.05, cor, 1.6)

    # ── os ENGRADADOS empilhados (a estampa é a treliça do plástico) ──
    def engradados(x, y, colunas, cor, seed):
        ca, cp, ch = 0.44, 0.34, 0.3
        for c, n in enumerate(colunas):
            cx = x + c * ca
            B("solido", (cx, y + cp / 2, PISO + n * ch / 2), (ca - 0.03, cp - 0.03, n * ch), "#0c0b0e", sujo=0)
            Placa("solido", (cx - ca / 2, y, PISO), (ca, 0, 0), (0, 0, n * ch), 3, n * 2, sujo=0.05,
                  cf=lambda c_, n_, i, j, s=seed + c: dim(escolhe([cor, cor, "#b5322c", "#2f5f9a"], j // 2, s), 0.45 if j % 2 == 0 else 1.0))
            for k in range(2):
                Cil("solido", (cx - 0.1 + 0.2 * k, y + cp / 2, PISO + n * ch), 0.04, 0.012, 0.13, 4, "#4e6b3a", sujo=0, tampa=False)
    engradados(0.1, 1.42, (3, 2), "#6a5a20", 3)
    engradados(4.6, -0.62, (3, 3, 2), "#d0a032", 1)
    engradados(0.0 - 3.15, -0.45, (2, 1), "#b5322c", 7)

    # ── a CAIXA DE SOM (na porta, em cima de um engradado virado) ──
    s = (1.05, 0.72, 1.35)
    with em(T(3.85, -0.62, PISO) @ R(0, 0, -0.08)):
        B("solido", (0, 0, 0.1), (0.9, 0.5, 0.2), "#7a4a1e", sujo=0.2)
        B("solido", (0, 0, 0.2 + s[2] / 2), s, "#18161c", sujo=0.1)
        B("solido", (0, -s[1] / 2 - 0.004, 0.2 + s[2] / 2), (s[0] - 0.08, 0.01, s[2] - 0.08), "#26242b", sujo=0)
        for cz, r in ((0.2 + 0.43, 0.34), (0.2 + 1.08, 0.18)):
            Cil("solido", (0, -s[1] / 2 - 0.005, cz), r, r * 0.35, 0.07, 10, "#2c2a34", r=(math.pi / 2, 0, 0), sujo=0, tampa=False)
            Tor("neon", (0, -s[1] / 2 - 0.02, cz), r, 0.03, 10, 4, r=(math.pi / 2, 0, 0))
    Tubo("solido", [(3.5, -0.3, PISO + 0.35), (3.1, -0.2, PISO + 0.1), (2.75, -0.1, PISO + 0.5), (2.72, -0.05, PISO + 2.7)], 0.02, 4, PR, 0)

    # ── a GAMBIARRA: os dois postes tortos, os varais de lâmpada e o emaranhado ──
    for x, inc in ((-6.45, 0.18), (6.5, -0.15)):
        Cil("solido", (x, -5.55, PISO - 0.2), 0.09, 0.06, 4.5, 6, MD2, r=(0.1, inc, 0), sujo=0.2, tampa=False)
    PA, PB = (-5.95, -5.5, 4.15), (5.95, -5.5, 4.1)
    FA, FB = (-5.95, -0.18, 3.62), (5.95, -0.18, 3.62)
    lampadas(PA, PB, 9, 0.55)
    lampadas(FA, PB, 8, 0.4)
    lampadas(FB, PA, 8, 0.45)
    lampadas(FA, FB, 7, 0.16)
    # o gato: os fios da caixa de luz subindo emaranhados até a laje e o poste
    for k in range(3):
        a = 3.6 + 0.08 * k
        pts = [(a, -0.13, 2.95), (a + 0.25, -0.2, 3.4 - 0.1 * k), (a + 0.7 + 0.2 * k, -0.28 + 0.05 * k, 3.72),
               (5.0 - 0.2 * k, -0.5 - 0.5 * k, 4.0 - 0.1 * k), (5.95, -5.5, 4.1)]
        Tubo("solido", pts, 0.012, 3, "#1c1a1f", 0)


for nome, f in (("ginasio", ginasio), ("galeria", galeria), ("discos", discos),
                ("batida", batida), ("flores", flores), ("brecho", brecho), ("bar", bar)):
    if nome not in IDS:
        continue
    ATUAL[0] = nome
    f()

# ── vira objetos: um nó por lugar, uma malha por grupo ──
def material(g):
    m = bpy.data.materials.new("lug_" + g)
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
    else:
        a = nt.nodes.new("ShaderNodeVertexColor")
        a.layer_name = "Col"
        if g == "luz":
            b.inputs["Base Color"].default_value = (0, 0, 0, 1)
            nt.links.new(a.outputs["Color"], b.inputs["Emission Color"])
            b.inputs["Emission Strength"].default_value = 1.0
        else:
            nt.links.new(a.outputs["Color"], b.inputs["Base Color"])
            b.inputs["Roughness"].default_value = 0.85
    return m


MATS = {g: material(g) for g in ("solido", "luz", "neon")}
NOS = {}
for idx, lugar in enumerate(IDS):
    e = bpy.data.objects.new(lugar, None)
    e.empty_display_size = 1.0
    COL.objects.link(e)
    e["let_z"], e["let_f"] = LET[lugar]
    e.location = (idx * 26.0, 0, 0)
    NOS[lugar] = e
    for g in ("solido", "luz", "neon"):
        b = BUF.get((lugar, g))
        if not b:
            continue
        me = bpy.data.meshes.new(f"{lugar}_{g}")
        me.from_pydata([tuple(v) for v in b["v"]], [], b["f"])
        at = me.color_attributes.new("Base", "FLOAT_COLOR", "CORNER")
        flat = [x for fc in b["c"] for c in fc for x in c]
        at.data.foreach_set("color", flat)
        me.polygons.foreach_set("use_smooth", [True] * len(me.polygons))
        me.update()
        o = bpy.data.objects.new(f"{lugar}_{g}", me)
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
mc = bpy.data.meshes.new("chao_bake")
mc.from_pydata([(-20, -20, 0), (190, -20, 0), (190, 30, 0), (-20, 30, 0)], [], [(0, 1, 2, 3)])
chao = bpy.data.objects.new("chao_bake", mc)
sc.collection.objects.link(chao)
try:
    sc.render.engine = "CYCLES"
except TypeError as e:
    print("engine", e)
sc.cycles.samples = 48
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
sc.world.light_settings.distance = 2.2
vl.update()
for o in sc.objects:
    o.select_set(False)
for o in solidos:
    o.select_set(True)
vl.objects.active = solidos[0]
print("BAKE", bpy.ops.object.bake(type="AO", target="VERTEX_COLORS"))
bpy.data.objects.remove(chao, do_unlink=True)

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
            a = 0.22 + 0.78 * ac[i * 4]
            bc[i * 4] *= a
            bc[i * 4 + 1] *= a
            bc[i * 4 + 2] *= a
        me.color_attributes.remove(ao)
    me.color_attributes.remove(me.color_attributes["Base"])
    col = me.color_attributes.new("Col", "FLOAT_COLOR", "CORNER")
    col.data.foreach_set("color", bc)
    me.color_attributes.active_color = col
    me.color_attributes.render_color_index = me.color_attributes.active_color_index

# ── exporta (os nós na origem) ──
for e in NOS.values():
    e.location = (0, 0, 0)
vl.update()
for o in sc.objects:
    o.select_set(False)
for o in COL.objects:
    o.select_set(True)
vl.objects.active = NOS[IDS[0]]
print(bpy.ops.export_scene.gltf(filepath=SAIDA, export_format="GLB", use_selection=True, export_texcoords=False,
      export_normals=True, export_materials="EXPORT", export_yup=True, export_apply=True, export_vertex_color="ACTIVE"))
tot = {}
for o in COL.objects:
    if o.type == "MESH":
        k = (o.parent.name, o["grupo"])
        tot[k] = sum(len(p.vertices) - 2 for p in o.data.polygons)
for lugar in IDS:
    print("TRI", lugar, sum(v for (l, g), v in tot.items() if l == lugar), {g: v for (l, g), v in tot.items() if l == lugar}, "LET", LET[lugar])
print("TRI total", sum(tot.values()))
