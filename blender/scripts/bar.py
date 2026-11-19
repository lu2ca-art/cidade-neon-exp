# O BAR DO PRÓLOGO por dentro (06/11): O COPO, na porta do subúrbio Xenom. O
# primeiro interior que o jogador novo vê. Antes eram caixas (app/linha/interior/
# salas/Bar.tsx); agora um bar de sucata do lixo da cidade, aconchegante e sujo:
# paredes de chapa ondulada em retalhos e o fundo de tábuas, o balcão de madeira
# reaproveitada com tampo de chapa e o friso de neon, as banquetas de tambor, as
# mesas de carretel de cabo, a prateleira com as garrafas (três formas repetidas),
# a geladeira velha, o jukebox, a mesa de sinuca no fundo à esquerda, o palquinho
# de paletes do primeiro show, os fios e lâmpadas penduradas, os cartazes e o
# neon de cerveja.
#
#   blender -b --factory-startup --python blender/scripts/bar.py \
#     [--python blender/scripts/bar_foto.py] -- bruto.glb [foto.png]
#   npx @gltf-transform/cli optimize bruto.glb public/models/bar.glb \
#     --compress meshopt --simplify false --join false --flatten false --instance false --palette false
#
# Coordenadas: Blender Z pra cima; o glTF sai com Y pra cima e z_jogo = -y_blender.
# Ou seja: aqui o FUNDO do bar (o balcão, as garrafas) fica em +Y e a porta em -Y.
# A sala é a do Bar.tsx: 12 × 10 × 3,8 m, origem no chão no centro. Tudo nas
# mesmas posições do jogo (bancos, mesas, balcão, palco, lâmpadas, letreiro).
# Dois nós, os dois na origem:
#   sala   o bar inteiro
#   palco  o palquinho (o jogo só mostra no prólogo, como a caixa de antes)
# e em cada nó as malhas:
#   <nó>_solido  paredes, móveis, sucata (cor no vértice × AO assada × um pouco
#                da luz das lâmpadas e do neon assada também)
#   <nó>_luz     o que brilha com cor fixa (lâmpada, painel do jukebox, a rua)
#   <nó>_neon    os tubos de neon (com cor; o jogo esquenta pro dourado a cada copo)
#   <nó>_vidro   as garrafas (transparente, sem luz)
# Orçamento: até 35 mil triângulos e 1 MB.

import bpy, bmesh, math, sys
from mathutils import Vector, Matrix, Color

TAU = 2 * math.pi
args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
SAIDA = args[0] if args else "/tmp/bar-bruto.glb"

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
COL = bpy.data.collections.new("Bar")
sc.collection.children.link(COL)

# (as primitivas são as do lugares_chao.py)

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


def ripas(cor, k=0.55):
    return lambda c, n, i, j: dim(cor, k) if j % 2 else lin(cor)


LOMBADAS = ["#a8432e", "#d0a640", "#3a6a9a", "#e0d8c8", "#2a2a30", "#6a3a7a", "#3f7a5a", "#c86a8a", "#d07a3a"]


def lombadas(seed, k=1.0):
    return lambda c, n, i, j: dim(escolhe(LOMBADAS, i, seed), k * (0.75 + 0.25 * hh(i, seed, 3)))


def pneu(p, r=(0, 0, 0), Rm=0.36, rm=0.15, cor=BO, seg=12):
    Tor("solido", p, Rm, rm, seg, 6, cor, r)



# ════════════════════════ ajudantes do bar ════════════════════════
MADEIRAS = ["#6f4f33", "#4c3524", "#7b5a3a", "#5a3e2a", "#3d5c7c", "#8a2c2a", "#6a6650", "#806a48"]
CHAPAS = ["#6d7380", "#7a4429", "#3d5c7c", "#4b6a4f", "#5a2f1e", "#8a2c2a", "#6b6870", "#7b8190"]
QUENTE = "#ffe0a8"


def ph(c, *k):
    """um hash pela posição (pras faces sem índice de grade)."""
    return hh(round(c.x * 17), round(c.y * 17), round(c.z * 17), *k)


def Cone2(g, p, r0, r1, h, seg, fora, dentro):
    """Cúpula de lâmpada: um cone aberto com a cor de fora e a de dentro."""
    for cor, inv in ((fora, False), (dentro, True)):
        bm = bmesh.new()
        bm.faces.layers.int.new("ij")
        k = 0.985 if inv else 1.0
        bmesh.ops.create_cone(bm, cap_ends=False, cap_tris=False, segments=seg, radius1=r0 * k, radius2=r1 * k,
                              depth=h, matrix=T(0, 0, h / 2))
        if inv:
            bmesh.ops.reverse_faces(bm, faces=bm.faces)
        add(bm, g, cor, T(*p), None, 0)


def Pendente(x, y, z_lamp, cupula=None, cabo_de=3.8, cor=QUENTE):
    Tubo("solido", [(x, y, cabo_de), (x, y, z_lamp + 0.1)], 0.008, 3, "#1a1618", 0)
    if cupula == "esmalte":
        Cone2("solido", (x, y, z_lamp - 0.045), 0.22, 0.04, 0.25, 14, "#2c4a3c", "#d8cfb0")
        Cil("solido", (x, y, z_lamp + 0.2), 0.03, 0.03, 0.06, 8, "#1a1618", sujo=0)
    elif cupula == "lata":
        Cone2("solido", (x, y, z_lamp + 0.01), 0.075, 0.07, 0.1, 10, "#7a4429", "#b8b0a0")
    Esfera("luz", (x, y, z_lamp), 0.065 if cupula == "esmalte" else 0.055, 8, 6, cor)


CORES_FESTA = [QUENTE, QUENTE, "#ff6a35", QUENTE, "#5dffa0", QUENTE, "#ff3f7a", QUENTE, "#7fe8ff", QUENTE, "#ffc857"]


def Varal(a, b, n, sag, seed=0):
    """Fio de lâmpadas atravessando o bar (caído no meio)."""
    a, b = Vector(a), Vector(b)
    pts = [a.lerp(b, k / n) + Vector((0, 0, -sag * 4 * (k / n) * (1 - k / n))) for k in range(n + 1)]
    Tubo("solido", pts, 0.008, 3, "#1a1618", 0)
    for k, p in enumerate(pts[1:-1]):
        Viga("solido", p, p + Vector((0, 0, -0.05)), 0.02, "#222222", 0)
        Esfera("luz", (p.x, p.y, p.z - 0.085), 0.038, 6, 4, CORES_FESTA[(k + seed) % len(CORES_FESTA)])


def Cartaz(o, U, V, nu, nv, estilo, seed):
    """Um cartaz colado na parede (o desenho é a cor de cada face)."""
    def f(c, n, i, j):
        u, v = (i + 0.5) / nu, (j + 0.5) / nv
        if estilo == "sol":     # pôr do sol de banda: sol, morros, faixa do nome
            if v < 0.18:
                return "#1a1418" if hh(i, seed) > 0.35 or v < 0.08 else "#e8d8b0"
            if (u - 0.5) ** 2 + ((v - 0.62) * 1.25) ** 2 < 0.06:
                return "#f2e2b0"
            if v < 0.3 + 0.08 * math.sin(u * 7 + seed):
                return "#2a1a2a"
            return "#d89a3a" if v > 0.6 else "#c8462a"
        if estilo == "xis":     # o X da Xenom
            if v > 0.86:
                return "#ff3f7a" if hh(i, seed, 2) > 0.4 else "#141018"
            if abs(u - v / 0.86) < 0.14 or abs(u - (1 - v / 0.86)) < 0.14:
                return "#ff3f7a"
            return "#141018"
        if estilo == "listra":  # faixas tortas (cartaz de baile)
            k = int((u + v * 0.6) * 5)
            return ["#e0c040", "#2a5ab0", "#e05a2a", "#f0e8d0", "#2a2a30"][k % 5]
        if estilo == "rosto":   # o retrato (show de alguém)
            if (u - 0.5) ** 2 + (v - 0.58) ** 2 < 0.07:
                return "#2a2028" if u < 0.5 else "#5a3a3a"
            if v < 0.16:
                return "#f0e8d0" if hh(i, j, seed) > 0.5 else "#141018"
            return "#3a8a8a"
        # "papel": um aviso velho
        return "#d8cfb0" if (j % 2 or hh(i, j, seed) > 0.6) else "#4a4038"
    Placa("solido", o, U, V, nu, nv, None, f, sujo=0)


# ════════════════════════ A SALA ════════════════════════
ATUAL[0] = "sala"


# o chão: cimento queimado com remendos e o trecho de ladrilho hidráulico gasto na frente do balcão
def f_chao(c, n, i, j):
    if -2.0 < c.x < 2.8 and -3.2 < c.y < 1.3 and hh(i, j, 7) > 0.3 - 0.1 * (c.y > -1):
        return dim("#5a221e" if (i + j) % 2 else "#7c7060", 0.7 + 0.3 * hh(i, j, 8))
    if hh(math.floor(c.x / 1.2), math.floor(c.y / 1.2), 3) > 0.8:
        return "#2f2a26"
    return escolhe(["#4a4540", "#3e3a36", "#544e48", "#433b33"], math.floor(c.x / 1.6), math.floor(c.y / 1.6), 1)


Placa("solido", (-6, -5, 0), (12, 0, 0), (0, 10, 0), 30, 25, None, f_chao, sujo=0)


# as paredes do lado: chapa ondulada em retalhos em cima, lambri pintado embaixo
def f_lado(seed):
    ch = chapa(CHAPAS, seed, 3, 3, 0.72)

    def f(c, n, i, j):
        if c.z < 1.05:
            return dim("#2f5550", 0.7) if i % 2 else lin("#35605a")
        return ch(c, n, i, j)
    return f


Placa("solido", (-6, -5, 0), (0, 10, 0), (0, 0, 3.8), 50, 8, None, f_lado(1))
Placa("solido", (6, 5, 0), (0, -10, 0), (0, 0, 3.8), 50, 8, None, f_lado(2))
# o fundo: tábuas de demolição em pé
Placa("solido", (-6, 5, 0), (12, 0, 0), (0, 0, 3.8), 40, 8, None,
      lambda c, n, i, j: dim(escolhe(MADEIRAS[:4] + ["#5a4a3a"], i, 5), 0.8 + 0.2 * hh(i, j, 9)))
# a frente: chapa, com o vão da porta
PORTA = (1.0, 2.0, 2.375)
Placa("solido", (6, -5, 0), (-12, 0, 0), (0, 0, 3.8), 60, 8, None, chapa(CHAPAS, 4, 3, 3, 0.72),
      filtro=lambda i, j: not (PORTA[0] < 6 - 12 * (i + 0.5) / 60 < PORTA[1] and j <= 4))
# o teto: chapa escura com as vigas de madeira
Placa("solido", (-6, -5, 3.8), (0, 10, 0), (12, 0, 0), 25, 30, None, onda("#2c282a", 0.75), sujo=0)
for y in (-3.4, -1.0, 1.4, 3.6):
    B("solido", (0, y, 3.71), (12, 0.16, 0.18), "#3a2a1e", d=(1.0, 1, 1), sujo=0)

# remendos de chapa por cima das paredes (cores trocadas, ferrugem)
for x, y, z, w, h, cor in ((-5.975, -3.4, 2.6, 1.3, 1.1, "#7a4429"), (-5.975, 2.6, 2.9, 1.6, 0.9, "#3d5c7c"),
                           (5.975, -1.9, 2.8, 1.2, 1.2, "#5a2f1e"), (5.975, 3.6, 2.4, 1.4, 1.0, "#6b6870")):
    B("solido", (x, y, z), (0.02, w, h), None, d=(1, 0.2, 2), cf=onda(cor, 0.7), sujo=0)
B("solido", (-4.9, 4.975, 3.2), (2.0, 0.02, 1.0), None, d=(0.2, 1, 2), cf=onda("#7a4429", 0.7), sujo=0)

# ── a porta (atrás da câmera da entrada): batente, a cortina de fitas e a rua lá fora ──
for x in (PORTA[0] - 0.04, PORTA[1] + 0.04):
    B("solido", (x, -4.96, 1.2), (0.08, 0.1, 2.4), "#4c3524")
    B("solido", (x + (0.03 if x < 1.5 else -0.03), -5.15, 1.2), (0.02, 0.32, 2.4), "#2a2228")
B("solido", (1.5, -4.96, 2.42), (1.16, 0.1, 0.08), "#4c3524")
Placa("luz", (2.3, -5.3, 0), (-1.6, 0, 0), (0, 0, 2.6), 2, 3, None,
      lambda c, n, i, j: "#24304f" if j else "#2e3a52")
for k in range(9):
    B("solido", (1.06 + k * 0.11, -4.99, 1.3), (0.07, 0.004, 2.1), escolhe(["#8a2c2a", "#d0a640", "#3f7a5a", "#3a6a9a"], k), sujo=0)
B("luz", (1.5, -4.92, 2.55), (0.16, 0.04, 0.08), "#ff3020")

# ══════════ o balcão: madeira reaproveitada, tampo de chapa, o friso de neon ══════════
BX0, BX1 = -4.2, 3.0
B("solido", ((BX0 + BX1) / 2, 2.72, 0.55), (BX1 - BX0, 0.66, 1.06), "#2a1a14", d=0.4)
B("solido", ((BX0 + BX1) / 2, 2.42, 0.1), (BX1 - BX0, 0.06, 0.2), "#1a1416", sujo=0)
x = BX0
k = 0
while x < BX1 - 0.05:
    w = min(BX1 - x, 0.16 + 0.16 * hh(k, 3))
    cor = escolhe(MADEIRAS, k, 11)
    B("solido", (x + w / 2, 2.33 - 0.01 * hh(k, 4), 0.645), (w - 0.012, 0.04, 0.89), dim(cor, 0.75 + 0.25 * hh(k, 5)), d=(1, 1, 0.3))
    x += w
    k += 1
for xx in (BX0 - 0.02, BX1 + 0.02):
    B("solido", (xx, 2.7, 0.62), (0.04, 0.76, 0.96), dim("#5a3e2a", 0.9), d=(1, 0.25, 0.3))
# o tampo de chapa (retalhos soldados) com a borda dobrada e os rebites
B("solido", ((BX0 + BX1) / 2, 2.62, 1.13), (BX1 - BX0 + 0.3, 0.95, 0.04), None, d=(0.3, 0.3, 1),
  cf=retalho(["#8a8f98", "#7b8190", "#6d6258", "#7a5a44", "#9a9ea6"], 0.9, 3), sujo=0)
B("solido", ((BX0 + BX1) / 2, 2.142, 1.10), (BX1 - BX0 + 0.3, 0.012, 0.08), "#7b8190", sujo=0)
x = BX0
while x < BX1:
    B("solido", (x, 2.134, 1.10), (0.02, 0.01, 0.02), "#a8acb2", sujo=0)
    x += 0.3
# o friso de neon embaixo (o laranja do Copo)
Tubo("neon", [(BX0 + 0.05, 2.33, 0.1), (BX1 - 0.05, 2.33, 0.1)], 0.03, 6, "#ff6a35")
# o cano de apoio dos pés
Tubo("solido", [(BX0 + 0.1, 2.05, 0.22), (BX1 - 0.1, 2.05, 0.22)], 0.022, 8, "#8e9096", 0)
for xx in (BX0 + 0.2, -1.8, 0.6, BX1 - 0.2):
    Viga("solido", (xx, 2.05, 0.22), (xx, 2.32, 0.32), 0.03, "#6e7076")
# em cima: a chopeira, o porta-guardanapo, o cinzeiro e o radinho (o meio fica livre pros copos)
Cil("solido", (2.3, 2.75, 1.15), 0.07, 0.07, 0.04, 10, "#8e9096", sujo=0)
Cil("solido", (2.3, 2.75, 1.19), 0.035, 0.035, 0.4, 8, "#b8bcc2", sujo=0)
B("solido", (2.3, 2.75, 1.6), (0.26, 0.1, 0.07), "#b8bcc2", sujo=0)
for xx in (2.21, 2.39):
    Viga("solido", (xx, 2.72, 1.57), (xx, 2.6, 1.5), 0.025, "#d8d0b0", 0)
    B("solido", (xx, 2.7, 1.66), (0.03, 0.03, 0.1), "#1a1416", sujo=0)
B("solido", (-2.0, 2.6, 1.2), (0.14, 0.08, 0.1), "#b8bcc2", sujo=0)
B("solido", (-2.0, 2.6, 1.22), (0.11, 0.05, 0.1), "#f0ece0", sujo=0)
Cil("solido", (-3.1, 2.5, 1.15), 0.06, 0.07, 0.025, 10, "#3a3a40", sujo=0)
B("solido", (-3.8, 2.85, 1.24), (0.36, 0.14, 0.18), "#5a2f1e", sujo=0)
Placa("solido", (-3.96, 2.778, 1.17), (0.18, 0, 0), (0, 0, 0.14), 4, 3, None, lambda c, n, i, j: "#1a1418" if (i + j) % 2 else "#3a3438", sujo=0)
B("luz", (-3.68, 2.778, 1.27), (0.12, 0.004, 0.04), "#ffb050")
Viga("solido", (-3.7, 2.86, 1.33), (-3.55, 2.9, 1.7), 0.008, "#9a9ea6", 0)

# ══════════ atrás do balcão: engradados, o espelho velho, as prateleiras e as garrafas ══════════
for c in range(14):
    for r in range(3):
        if r == 2 and hh(c, 7) > 0.6:
            continue
        cor = escolhe(["#a82a22", "#c8a020", "#2a6a3a", "#a82a22"], c, r, 2)
        B("solido", (-4.0 + c * 0.42, 4.75 - 0.02 * hh(c, r), 0.155 + r * 0.31), (0.4, 0.36, 0.3), None,
          d=(0.2, 1, 0.15), cf=ripas(cor, 0.6))
# o espelho: uma chapa escura riscada
B("solido", (-1.2, 4.975, 2.15), (6.0, 0.02, 1.2), None, d=(0.4, 1, 0.4),
  cf=retalho(["#1c2230", "#232a38", "#2a2f3a", "#1a1c24"], 0.5, 6), sujo=0)
# as prateleiras: a de baixo inteira; a de cima só dos lados (o letreiro O COPO no meio)
PRAT = [(1.4, -4.2, 1.8), (2.9, -4.2, -2.3), (2.9, 1.2, 1.8)]
for z, x0, x1 in PRAT:
    B("solido", ((x0 + x1) / 2, 4.7, z - 0.03), (x1 - x0, 0.35, 0.04), None, d=(0.5, 1, 1), cf=lambda c, n, i, j: dim("#6f4f33", 0.7 + 0.3 * hh(i, 13)), sujo=0)
    xx = x0 + 0.15
    while xx < x1:
        Viga("solido", (xx, 4.98, z - 0.32), (xx, 4.6, z - 0.06), 0.03, "#5a2f1e")
        xx += 1.6
    Tubo("neon", [(x0 + 0.05, 4.56, z - 0.075), (x1 - 0.05, 4.56, z - 0.075)], 0.018, 6, "#ffc857")

# as garrafas: três formas repetidas (cerveja, cachaça, licor), cores de vidro
GARRAFA = {
    "cerveja": [(0, 0), (0.032, 0), (0.033, 0.14), (0.03, 0.17), (0.013, 0.22), (0.012, 0.26), (0, 0.26)],
    "cachaca": [(0, 0), (0.045, 0), (0.046, 0.2), (0.04, 0.23), (0.015, 0.26), (0.014, 0.33), (0, 0.33)],
    "licor": [(0, 0), (0.055, 0), (0.056, 0.13), (0.035, 0.16), (0.014, 0.19), (0.014, 0.23), (0, 0.23)],
}
VIDROS = ["#2f7a45", "#a8641e", "#8fb0b8", "#3a6ab0", "#9a2a3a", "#c8a040", "#5a8a2a", "#7a3a8a"]


def Garrafa(p, forma, cor):
    add(bm_torno(GARRAFA[forma], 8), "vidro", cor, T(*p), None, 0)


FORMAS = list(GARRAFA)
for z, x0, x1 in PRAT:
    xx = x0 + 0.18
    k = 0
    while xx < x1 - 0.1:
        f = escolhe(FORMAS, xx * 10, z)
        Garrafa((xx, 4.66 + 0.06 * hh(k, z), z), f, escolhe(VIDROS, k, z, 4))
        xx += 0.15 + 0.08 * hh(k, z, 2)
        k += 1

# a geladeira velha (creme, ferrugem embaixo, adesivos), com o radinho em cima
def f_gela(c, n, i, j):
    if c.z < 0.28 + 0.12 * ph(c, 1):
        return "#7a4429"
    return "#8a5a34" if ph(c, 2) > 0.9 else "#cfc6aa"


GX = 2.5
B("solido", (GX, 4.6, 0.86), (0.76, 0.66, 1.66), None, d=0.17, cf=f_gela)
B("solido", (GX, 4.6, 1.71), (0.7, 0.6, 0.06), "#cfc6aa")
B("solido", (GX, 4.265, 1.12), (0.74, 0.012, 0.014), "#6a6050", sujo=0)
B("solido", (GX + 0.3, 4.25, 1.3), (0.04, 0.04, 0.34), "#c0c4c8", sujo=0)
B("solido", (GX - 0.1, 4.262, 0.95), (0.22, 0.006, 0.15), "#b02a20", sujo=0)
B("solido", (GX + 0.12, 4.262, 0.7), (0.16, 0.006, 0.16), "#2a5ab0", sujo=0)
B("solido", (GX - 0.15, 4.262, 1.45), (0.12, 0.006, 0.08), "#e8c840", sujo=0)
B("solido", (GX, 4.262, 1.62), (0.2, 0.006, 0.04), "#a8acb2", sujo=0)
B("solido", (GX, 4.6, 1.85), (0.4, 0.2, 0.22), "#3a2a22", sujo=0)
B("luz", (GX - 0.06, 4.498, 1.88), (0.16, 0.004, 0.06), "#ffb050")
Viga("solido", (GX + 0.15, 4.6, 1.96), (GX + 0.3, 4.62, 2.4), 0.008, "#9a9ea6", 0)

# o letreiro O COPO: a placa e as lâmpadas de marquise em volta (o texto é do jogo)
B("solido", (-0.5, 4.985, 3.15), (3.5, 0.02, 1.0), "#141018", sujo=0)
for k in range(15):
    xx = -2.25 + 3.5 * k / 14
    for zz in (2.67, 3.63):
        Esfera("luz", (xx, 4.95, zz), 0.03, 6, 4, QUENTE)
for k in range(1, 4):
    for xx in (-2.25, 1.25):
        Esfera("luz", (xx, 4.95, 2.67 + 0.96 * k / 4), 0.03, 6, 4, QUENTE)

# ══════════ as banquetas de tambor (os bancos do Bar.tsx) ══════════
TAMBOR = ["#2a4a8a", "#8a2a22", "#b89020", "#3a6a3a", "#2a4a8a"]
for i, x in enumerate((-2.6, -1.4, -0.2, 1.0, 2.2)):
    cor = TAMBOR[i]
    Cil("solido", (x, 1.75, 0), 0.19, 0.19, 0.7, 12, None,
        cf=lambda c, n, i_, j_, cor=cor: ("#7a4429" if ph(c, 3) > 0.72 or c.z < 0.06 else cor), sujo=0.35)
    for z in (0.22, 0.47):
        Cil("solido", (x, 1.75, z), 0.197, 0.197, 0.025, 12, dim(cor, 0.7), tampa=False)
    Cil("solido", (x, 1.75, 0.7), 0.22, 0.21, 0.07, 14, "#5a1f22", sujo=0)
    if i % 2 == 0:
        B("solido", (x + 0.05, 1.72, 0.772), (0.16, 0.05, 0.006), "#8e9096", r=(0, 0, 0.6), sujo=0)

# ══════════ as mesas: carretel de cabo, lâmpada pendurada, garrafa e cinzeiro ══════════
MESAS = [(4.0, -1.0), (-3.3, -1.6), (4.2, 0.9), (-4.6, 0.4)]


def f_carretel(c, n, i, j, x=0.0, y=0.0):
    rr = math.hypot(c.x - x, c.y - y)
    if n.z > 0.5 and 0.26 < rr < 0.31:
        return "#3a2a1e"
    return dim("#8a6a44", 0.8 + 0.2 * ph(c, 5))


for k, (x, y) in enumerate(MESAS):
    Cil("solido", (x, y, 0), 0.42, 0.42, 0.05, 16, None, cf=lambda c, n, i, j, x=x, y=y: f_carretel(c, n, i, j, x, y))
    Cil("solido", (x, y, 0.05), 0.16, 0.16, 0.63, 12, "#6a4a30")
    Cil("solido", (x, y, 0.68), 0.45, 0.45, 0.06, 18, None, cf=lambda c, n, i, j, x=x, y=y: f_carretel(c, n, i, j, x, y), sujo=0)
    Pendente(x, y, 1.9, "lata")
    Garrafa((x + 0.12, y - 0.1, 0.74), "cerveja", escolhe(VIDROS[:3], k))
    Cil("solido", (x - 0.15, y + 0.08, 0.74), 0.06, 0.07, 0.02, 10, "#3a3a40", sujo=0)

# os engradados onde a gente das mesas senta (os MESAS do Bar.tsx; o que fica na mesa não ganha)
for k, (x, y) in enumerate(((3.4, -1.0), (4.6, -1.0), (-3.9, -1.6), (-2.7, -1.6), (3.8, 0.9))):
    cor = escolhe(["#a82a22", "#c8a020", "#2a6a3a"], k, 9)
    B("solido", (x, y, 0.23), (0.36, 0.42, 0.46), None, d=(0.18, 1, 0.12), cf=ripas(cor, 0.6), r=(0, 0, 0.2 * (hh(k, 1) - 0.5)))

# ══════════ as luzes do balcão (onde ficam as pointLights do jogo) ══════════
for x in (-3.0, -0.5, 2.0):
    Pendente(x, 2.2, 2.82, "esmalte", 3.7)
# os fios: a calha do teto até a caixa de luz na parede da direita
Tubo("solido", [(-3.0, 2.2, 3.7), (5.95, 2.2, 3.7), (5.95, 2.2, 2.85)], 0.012, 4, "#1a1618", 0)
B("solido", (5.96, 2.2, 2.65), (0.06, 0.3, 0.4), "#6b6870")
Tubo("solido", [(5.95, 2.1, 2.45), (5.95, 2.1, 0.5), (5.95, 1.6, 0.4)], 0.01, 4, "#1a1618", 0)
Tubo("solido", [(-5.95, 3.4, 3.62), (-3.5, 3.4, 3.4), (-1.0, 3.4, 3.62)], 0.009, 3, "#1a1618", 0)
Tubo("solido", [(-5.95, -4.8, 3.6), (-5.95, -2.0, 3.3), (-5.95, 0.6, 3.6), (-5.95, 3.4, 3.62)], 0.009, 3, "#1a1618", 0)

# os varais de lâmpadas atravessando o salão
Varal((-5.9, -4.3, 3.45), (5.9, -2.8, 3.45), 12, 0.32, 0)
Varal((5.9, -2.8, 3.45), (-5.9, -1.0, 3.45), 12, 0.36, 3)
Varal((-5.9, -1.0, 3.45), (5.9, 0.9, 3.45), 12, 0.3, 6)

# o ventilador de teto parado
Cil("solido", (0.6, -1.6, 3.5), 0.015, 0.015, 0.3, 6, "#3a3a40", sujo=0)
Cil("solido", (0.6, -1.6, 3.38), 0.1, 0.08, 0.13, 10, "#5a4a3a", sujo=0)
for a in (0.3, 0.3 + TAU / 3, 0.3 + 2 * TAU / 3):
    with em(T(0.6, -1.6, 3.42) @ R(rz=a)):
        B("solido", (0.42, 0, 0), (0.62, 0.13, 0.012), "#6f4f33", sujo=0)

# ══════════ o jukebox (parede da direita, perto da porta) ══════════
JY = -3.2
B("solido", (5.55, JY, 0.7), (0.6, 0.95, 1.4), "#4a2a22", d=0.25)
Cil("solido", (5.25, JY, 1.4), 0.475, 0.475, 0.6, 16, "#4a2a22", r=(0, math.pi / 2, 0))
arco = lambda rr: [(5.23, JY + rr * math.cos(math.pi * k / 12), 1.4 + rr * math.sin(math.pi * k / 12)) for k in range(13)]
Tubo("neon", [(5.23, JY + 0.43, 0.25)] + arco(0.43) + [(5.23, JY - 0.43, 0.25)], 0.022, 6, "#ff3fb0")
Tubo("neon", [(5.23, JY + 0.34, 1.0)] + arco(0.34) + [(5.23, JY - 0.34, 1.0)], 0.016, 6, "#3fd0ff")
Placa("luz", (5.235, JY + 0.3, 1.02), (0, -0.6, 0), (0, 0, 0.5), 6, 4, None,
      lambda c, n, i, j: ("#ffb050" if j % 2 else "#ff7a3a") if (i + j) % 3 else "#fff0c0")
Placa("solido", (5.235, JY + 0.3, 0.28), (0, -0.6, 0), (0, 0, 0.6), 8, 6, None,
      lambda c, n, i, j: "#1a1416" if (i + j) % 2 else "#2e2628", sujo=0)
for k in range(5):
    B("luz", (5.235, JY - 0.2 + k * 0.1, 0.94), (0.01, 0.05, 0.03), escolhe(["#ff3f7a", "#5dffa0", "#ffc857"], k))
B("solido", (5.24, JY, 0.92), (0.02, 0.84, 0.03), "#b8bcc2", sujo=0)

# ══════════ a mesa de sinuca (no fundo, à esquerda; a partida abre ali) ══════════
SX, SY = -5.15, 3.4
for dx in (-0.42, 0.42):
    for dy in (-0.82, 0.82):
        B("solido", (SX + dx, SY + dy, 0.32), (0.12, 0.12, 0.64), "#3a2418")
B("solido", (SX, SY, 0.7), (1.1, 2.0, 0.14), "#4a2c1c", d=0.25)
B("solido", (SX, SY, 0.785), (0.92, 1.82, 0.03), None, d=0.15, sujo=0,
  cf=lambda c, n, i, j: "#3a5a3a" if math.hypot(c.x - SX - 0.15, c.y - SY + 0.4) < 0.12 else escolhe(["#1f5a3a", "#1c5034", "#22603d"], i, j, 2))
for dx in (-0.505, 0.505):
    B("solido", (SX + dx, SY, 0.805), (0.09, 2.0, 0.07), "#5a3420", sujo=0)
for dy in (-0.955, 0.955):
    B("solido", (SX, SY + dy, 0.805), (1.1, 0.09, 0.07), "#5a3420", sujo=0)
for dx in (-0.47, 0.47):
    for dy in (-0.92, 0.0, 0.92):
        B("solido", (SX + dx, SY + dy, 0.81), (0.09, 0.1, 0.075), "#0a0808", sujo=0)
for k, (dx, dy, cor) in enumerate(((0.1, -0.5, "#f0ece0"), (-0.2, 0.3, "#e0c040"), (0.25, 0.42, "#b02a20"),
                                    (-0.1, 0.5, "#2a4ab0"), (0.0, 0.62, "#141418"), (0.3, 0.1, "#e06a20"))):
    Esfera("solido", (SX + dx, SY + dy, 0.828), 0.028, 8, 5, cor)
Viga("solido", (SX - 0.25, SY - 0.7, 0.84), (SX + 0.1, SY + 0.6, 0.86), 0.014, "#c8a070", 0)
for k in range(3):
    yy = 1.6 + k * 0.15
    Viga("solido", (-5.92, yy, 0.05), (-5.86, yy + 0.04, 1.45), 0.016, "#c8a070", 0)
B("solido", (-5.97, 1.75, 1.3), (0.04, 0.5, 0.06), "#4c3524")
# o lustre da sinuca
B("solido", (SX, SY, 1.76), (0.34, 1.2, 0.12), "#2a5a3a", sujo=0)
B("luz", (SX, SY, 1.697), (0.3, 1.15, 0.004), "#d8b880")
for yy in (SY - 0.4, SY + 0.4):
    Esfera("luz", (SX, yy, 1.68), 0.05, 8, 6, QUENTE)
    Tubo("solido", [(SX, yy, 1.82), (SX, yy, 3.8)], 0.006, 3, "#1a1618", 0)

# ══════════ cartazes e o neon de cerveja ══════════
def na_esq(y, z, w, h, t=0.0):
    return (-5.985, y - w / 2, z - h / 2), (0, w * math.cos(t), w * math.sin(t)), (0, -h * math.sin(t), h * math.cos(t))


def na_dir(y, z, w, h, t=0.0):
    return (5.985, y + w / 2, z - h / 2), (0, -w * math.cos(t), w * math.sin(t)), (0, h * math.sin(t), h * math.cos(t))


for lado, y, z, est, t in ((na_esq, -3.9, 1.5, "sol", 0.04), (na_esq, -2.9, 1.7, "xis", -0.05), (na_esq, 1.0, 1.55, "listra", 0.03),
                           (na_esq, 0.25, 1.35, "papel", -0.08), (na_dir, -1.5, 1.5, "rosto", -0.04), (na_dir, 1.9, 1.5, "sol", 0.05),
                           (na_dir, 0.9, 1.25, "papel", 0.1), (na_dir, 2.7, 1.8, "xis", -0.03)):
    w, h = (0.3, 0.4) if est == "papel" else (0.6, 0.85)
    o, U, V = lado(y, z, w, h, t)
    Cartaz(o, U, V, 8, 10, est, int(y * 10))
Cartaz((-5.8, 4.985, 1.5), (0.6, 0, 0), (0, 0, 0.85), 8, 10, "listra", 77)

# a caneca de neon na parede da esquerda (o "chopp gelado") e a garrafa na da direita
B("solido", (-5.97, -1.0, 2.3), (0.03, 0.95, 0.95), "#141018", sujo=0)
NX = -5.93
Tubo("neon", [(NX, -1.25, 1.95), (NX, -1.25, 2.5), (NX, -0.8, 2.5), (NX, -0.8, 1.95), (NX, -1.25, 1.95)], 0.018, 6, "#ffb020")
Tubo("neon", [(NX, -0.8, 2.4)] + [(NX, -0.8 + 0.17 * math.sin(math.pi * k / 8), 2.225 + 0.175 * math.cos(math.pi * k / 8)) for k in range(9)], 0.016, 6, "#ffb020")
Tubo("neon", [(NX, -1.3 + 0.6 * k / 12, 2.52 + 0.06 * abs(math.sin(math.pi * k / 4))) for k in range(13)], 0.016, 6, "#fff2d0")
for dy, dz in ((-1.1, 2.1), (-0.95, 2.25), (-1.08, 2.36)):
    Tor("neon", (NX, dy, dz), 0.025, 0.007, 8, 3, "#fff2d0", r=(0, math.pi / 2, 0), sujo=0)
B("solido", (5.97, 0.2, 2.4), (0.03, 0.7, 1.05), "#141018", sujo=0)
MX = 5.93
Tubo("neon", [(MX, 0.05, 1.95), (MX, 0.05, 2.45), (MX, 0.12, 2.6), (MX, 0.12, 2.8), (MX, 0.28, 2.8), (MX, 0.28, 2.6),
              (MX, 0.35, 2.45), (MX, 0.35, 1.95), (MX, 0.05, 1.95)], 0.018, 6, "#5dffa0")
Tubo("neon", [(MX, 0.2 + 0.08 * math.cos(TAU * k / 12), 2.2 + 0.08 * math.sin(TAU * k / 12)) for k in range(13)], 0.015, 6, "#ff3f3a")

# ══════════ sucata pelos cantos ══════════
for k in range(3):
    Tor("solido", (-5.35 + 0.03 * k, -4.4, 0.12 + 0.24 * k), 0.3, 0.12, 12, 6, "#1e1c21", r=(0, 0, 0.3 * k))
for r in range(3):
    B("solido", (-0.6, -4.7, 0.155 + r * 0.31), (0.4, 0.36, 0.3), None, d=(0.2, 1, 0.15), cf=ripas(escolhe(["#a82a22", "#c8a020"], r), 0.6))
B("solido", (-0.15, -4.72, 0.155), (0.4, 0.36, 0.3), None, d=(0.2, 1, 0.15), cf=ripas("#2a6a3a", 0.6))
# a TV velha no canto (chiado)
with em(T(5.5, -4.5, 2.65) @ R(rz=0.8)):
    B("solido", (0, 0, 0), (0.5, 0.4, 0.4), "#2a2a2e", sujo=0)
    B("luz", (0, 0.205, 0), (0.4, 0.01, 0.3), None, d=0.05,
      cf=lambda c, n, i, j: escolhe(["#5a6a80", "#7a8aa0", "#3a4a60", "#8a9ab0"], i, j, 4))
    Viga("solido", (0, -0.15, -0.2), (0, -0.4, -0.35), 0.04, "#3a3a40")

# ════════════════════════ O PALCO (o jogo só mostra no prólogo) ════════════════════════
ATUAL[0] = "palco"
PX, PY = 4.4, 3.0
PALETE = ["#9a7a52", "#8a6a44", "#7a5a3a", "#a08458"]
for camada in (0, 1):
    z = camada * 0.2
    B("solido", (PX, PY, z + 0.075), (2.5, 1.9, 0.11), "#1a1210", sujo=0)
    for s in range(9):
        y = PY - 0.9 + s * 0.225
        B("solido", (PX, y, z + 0.17), (2.6, 0.19, 0.03), escolhe(PALETE, s, camada), sujo=0)
    for x in (PX - 1.2, PX - 0.65, PX - 0.05, PX + 0.65, PX + 1.2):
        B("solido", (x, PY - 0.95, z + 0.075), (0.12, 0.1, 0.11), "#b09068", sujo=0)
# o tapete velho
B("solido", (PX, PY, 0.405), (1.6, 1.2, 0.01), None, d=(0.1, 0.1, 1), sujo=0,
  cf=lambda c, n, i, j: "#5a1818" if (i < 2 or i > 13 or j < 2 or j > 9) else escolhe(["#8a2a22", "#3a2a4a", "#a8703a", "#8a2a22"], (i + j) // 2, abs(i - j) // 2))
# o neon da beira (rosa, onde a caixa tinha)
Tubo("neon", [(PX - 1.3, 1.98, 0.42), (PX + 1.3, 1.98, 0.42)], 0.03, 6, "#ff3f7a")
# o pedestal sem microfone
Cil("solido", (PX, 2.8, 0.41), 0.2, 0.2, 0.03, 14, "#33333a", sujo=0)
Cil("solido", (PX, 2.8, 0.44), 0.015, 0.015, 1.45, 6, "#55555e", sujo=0)
Viga("solido", (PX, 2.8, 1.75), (PX - 0.05, 2.55, 1.85), 0.018, "#55555e", 0)
# as caixas de som empoeiradas
for x, esc in ((PX - 0.9, 1.0), (PX + 1.0, 0.75)):
    hz = 0.9 * esc
    B("solido", (x, 3.6, 0.4 + hz / 2), (0.6 * esc, 0.5, hz), None, d=0.15,
      cf=lambda c, n, i, j: "#4a4642" if n.z > 0.5 else ("#232327" if ph(c, 8) > 0.2 else "#3a3632"))
    for zc, rr in ((0.4 + hz * 0.38, 0.18 * esc), (0.4 + hz * 0.78, 0.07 * esc)):
        Cil("solido", (x, 3.35, zc), rr, rr * 0.9, 0.02, 14, "#3a3a3a", r=(math.pi / 2, 0, 0), sujo=0)
        Cil("solido", (x, 3.33, zc), rr * 0.35, rr * 0.3, 0.015, 8, "#141416", r=(math.pi / 2, 0, 0), sujo=0)
B("solido", (PX + 1.0, 3.6, 0.4 + 0.675 + 0.12), (0.5, 0.35, 0.24), "#1a1a1e", sujo=0)
B("luz", (PX + 0.85, 3.424, 1.2), (0.05, 0.004, 0.03), "#ff3020")
Tubo("solido", [(PX - 0.9, 3.34, 0.5), (PX - 0.6, 2.9, 0.415), (PX - 0.1, 2.85, 0.415), (PX, 2.8, 0.45)], 0.01, 4, "#141416", 0)
# a cortina de veludo velho na parede do fundo, atrás do palco


def Cortina(x0, x1, y, z0, z1, n, cor):
    bm = bmesh.new()
    ij = bm.faces.layers.int.new("ij")
    vs = []
    for i in range(n + 1):
        x = x0 + (x1 - x0) * i / n
        yy = y - (0.07 if i % 2 else 0.0)
        vs.append([bm.verts.new((x, yy, z)) for z in (z0, (z0 + z1) / 2, z1)])
    for i in range(n):
        for j in range(2):
            f = bm.faces.new((vs[i][j], vs[i][j + 1], vs[i + 1][j + 1], vs[i + 1][j]))
            f[ij] = i * 1000 + j
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces:
        if f.normal.y > 0:
            f.normal_flip()
    add(bm, "solido", None, None, lambda c, nn, i, j: dim(cor, 0.6) if i % 2 else lin(cor), 0.1, afiar=None)


Cortina(3.15, 5.9, 4.93, 0.4, 3.5, 22, "#5a1420")
Varal((3.15, 2.1, 3.35), (5.85, 2.1, 3.35), 8, 0.18, 2)


# ════════════════════════ vira objetos, AO, a luz assada, exporta ════════════════════════
GRUPOS = ("solido", "luz", "neon", "vidro")
NOS_IDS = ("sala", "palco")


def material(g):
    m = bpy.data.materials.new("bar_" + g)
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
        b.inputs["Roughness"].default_value = 0.85
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

vl = bpy.context.view_layer
vl.update()

# ── a AO assada (Cycles), só no sólido; a sala é fechada: distância curta ──
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
sc.world.light_settings.distance = 0.8
vl.update()
for o in sc.objects:
    o.select_set(False)
for o in solidos:
    o.select_set(True)
vl.objects.active = solidos[0]
print("BAKE", bpy.ops.object.bake(type="AO", target="VERTEX_COLORS"))

# ── a luz das lâmpadas e do neon, assada de leve na cor (o jogo não ganha luz nova) ──
def c3(h, k):
    c = lin(h)
    return (c[0] * k, c[1] * k, c[2] * k)


FONTES = []
for x in (-3.0, -0.5, 2.0):
    FONTES.append(((x, 2.2, 2.82), c3("#ffcf8a", 0.9), 1.6))
for x, y in MESAS:
    FONTES.append(((x, y, 1.9), c3("#ffd9a0", 0.6), 1.2))
for x in (-3.5, -0.6, 2.3):
    FONTES.append(((x, 2.3, 0.1), c3("#ff6a35", 0.7), 0.7))
for x in (-3.2, -1.2, 0.8):
    FONTES.append(((x, 4.56, 1.32), c3("#ffc857", 0.6), 0.8))
FONTES += [
    ((-0.5, 4.85, 3.15), c3("#ff6a35", 0.8), 1.5),
    ((5.1, JY, 1.3), c3("#ff3fb0", 0.7), 1.1),
    ((PX, 1.98, 0.42), c3("#ff3f7a", 0.5), 0.8),
    ((-5.85, -1.0, 2.3), c3("#ffb020", 0.6), 1.0),
    ((5.85, 0.2, 2.4), c3("#5dffa0", 0.5), 1.0),
    ((SX, SY, 1.6), c3("#ffd9a0", 0.7), 1.0),
    ((1.5, -4.9, 1.2), c3("#7f9cff", 0.4), 1.5),
]

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
        ac = [0.0] * (n * 4)
        me.color_attributes["AO"].data.foreach_get("color", ac)
        vi = [0] * n
        me.loops.foreach_get("vertex_index", vi)
        for i in range(n):
            p = me.vertices[vi[i]].co
            fr, fg, fb = 0.62, 0.62, 0.62
            for q, cor, raio in FONTES:
                d2 = ((p.x - q[0]) ** 2 + (p.y - q[1]) ** 2 + (p.z - q[2]) ** 2) / (raio * raio)
                k = 1.0 / (1.0 + d2)
                fr += cor[0] * k
                fg += cor[1] * k
                fb += cor[2] * k
            a = 0.22 + 0.78 * ac[i * 4]
            bc[i * 4] = min(1.0, bc[i * 4] * a * fr)
            bc[i * 4 + 1] = min(1.0, bc[i * 4 + 1] * a * fg)
            bc[i * 4 + 2] = min(1.0, bc[i * 4 + 2] * a * fb)
        me.color_attributes.remove(me.color_attributes["AO"])
    me.color_attributes.remove(me.color_attributes["Base"])
    col = me.color_attributes.new("Col", "FLOAT_COLOR", "CORNER")
    col.data.foreach_set("color", bc)
    me.color_attributes.active_color = col
    me.color_attributes.render_color_index = me.color_attributes.active_color_index

vl.update()
for o in sc.objects:
    o.select_set(False)
for o in COL.objects:
    o.select_set(True)
vl.objects.active = NOS["sala"]
print(bpy.ops.export_scene.gltf(filepath=SAIDA, export_format="GLB", use_selection=True, export_texcoords=False,
      export_normals=True, export_materials="EXPORT", export_yup=True, export_apply=True, export_vertex_color="ACTIVE"))
tot = {}
for o in COL.objects:
    if o.type == "MESH":
        tot[o.name] = sum(len(p.vertices) - 2 for p in o.data.polygons)
print("TRI", tot)
print("TRI total", sum(tot.values()))
