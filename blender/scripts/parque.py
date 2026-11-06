# O PARQUE DA FAIXA ROLLERCOASTER (06/11; app/linha/estrada/Parque.tsx, a missão
# da Nizzy). Antes eram primitivas; aqui, na linguagem da cidade lá em cima
# (aço claro, painel escuro, neon) com cara de parque à noite. Peças:
#   carro      o carrinho (2 lugares, barra de segurança amarela, neon nas bordas):
#              origem no ponto do trilho, frente +Y (glTF: -Z = a frente do trilho)
#   dormente   o dormente com as mãos-francesas até a espinha (instanciado ~530×)
#   pilar      um módulo de treliça de 3 m (z 0..3) com a chapa da emenda embaixo:
#              o jogo empilha quantos couberem e estica um pouco (instanciado)
#   pilartopo  a sela no topo do pilar que segura a espinha (instanciado)
#   roda       a base da roda-gigante: os dois cavaletes de treliça, o eixo, as sapatas
#   aro        o que gira (origem no cubo, a 24 m): aros, raios, contraventos, as luzes
#   cabine     a cabine (origem no pino, pendurada 1,4 m embaixo; instanciada 16×;
#              a faixa de janela é branca: o jogo pinta com a cor da instância)
#   estacao    a plataforma (as medidas de antes), a cobertura, os letreiros e,
#              a 21 m na direção da pista (+X), o portão com o arco e a bilheteria
# Grupos: <peça>_solido (cor × AO assada) e <peça>_luz (brilho de cor fixa).
#
#   blender -b --factory-startup --python blender/scripts/parque.py \
#     [--python blender/scripts/parque_foto.py] -- bruto.glb [foto.png]
#   npx @gltf-transform/cli optimize bruto.glb public/models/parque.glb \
#     --compress meshopt --simplify false --join false --flatten false --instance false --palette false
# Orçamento: o arquivo até 20 mil triângulos (as instanciadas bem leves).

import bpy, bmesh, math, sys
from mathutils import Vector, Matrix, Color

TAU = 2 * math.pi
args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
SAIDA = args[0] if args else "/tmp/parque-bruto.glb"
IDS = ["carro", "dormente", "pilar", "pilartopo", "roda", "aro", "cabine", "estacao"]

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
COL = bpy.data.collections.new("Parque")
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




# ════════════════════════ o parque ════════════════════════
MET, MET2, PRETO = "#2b303e", "#1c1f29", "#0f1016"
ACO, ACO2 = "#9aa3b6", "#646c80"
BR = "#c8d0de"
LED, QUENTE = "#dfe9ff", "#ffcf8a"
CIANO, ROSA, VERDE, AMAR, VERM = "#2fe8ff", "#ff3fb0", "#5dffa0", "#ffc857", "#ff5b5b"
# o texto virado pra +X (lê ao longo de +Y) e pra -X (lê ao longo de -Y)
UP = Vector((0, 0, 1))


def xadrez(a, b):
    return lambda c, n, i, j: lin(a) if (i + j) % 2 else lin(b)


M_MAISX = Matrix(((0, 0, 1, 0), (1, 0, 0, 0), (0, 1, 0, 0), (0, 0, 0, 1)))
M_MENOSX = Matrix(((0, 0, -1, 0), (-1, 0, 0, 0), (0, 1, 0, 0), (0, 0, 0, 1)))


def Barra(g, a, b, esp, cor=None, sujo=0.0, esp2=None):
    """Viga de caixa SEM as tampas (8 triângulos): pras peças instanciadas."""
    a, b = Vector(a), Vector(b)
    dv = b - a
    bm = bm_caixa(esp, esp2 or esp, dv.length)
    bm.normal_update()
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if abs(f.normal.z) > 0.9], context="FACES")
    add(bm, g, cor, T(*((a + b) / 2)) @ para(dv), None, sujo)


def Perfil(g, pts, x0, x1, cor, sujo=0.1):
    """Um perfil (y, z) extrudado de x0 a x1."""
    bm = bmesh.new()
    bm.faces.layers.int.new("ij")
    v0 = [bm.verts.new((x0, y, z)) for y, z in pts]
    v1 = [bm.verts.new((x1, y, z)) for y, z in pts]
    n = len(pts)
    bm.faces.new(v0[::-1])
    bm.faces.new(v1)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((v0[i], v0[j], v1[j], v1[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    add(bm, g, cor, None, None, sujo)


def Texto(g, txt, M, tam, cor):
    cu = bpy.data.curves.new("txt", "FONT")
    cu.body = txt
    cu.align_x = "CENTER"
    cu.align_y = "CENTER"
    cu.size = tam
    cu.resolution_u = 2
    o = bpy.data.objects.new("txt", cu)
    sc.collection.objects.link(o)
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    oe = o.evaluated_get(dg)
    me = oe.to_mesh()
    bm = bmesh.new()
    bm.from_mesh(me)
    oe.to_mesh_clear()
    bpy.data.objects.remove(o)
    bpy.data.curves.remove(cu)
    bmesh.ops.triangulate(bm, faces=bm.faces)
    add(bm, g, cor, M, None, 0, afiar=None)


def trelica_aberta(a, b, w, passo, cor, ch=0.16, lc=0.08):
    a, b = Vector(a), Vector(b)
    t = (b - a).normalized()
    L = (b - a).length
    ref = UP if abs(t.dot(UP)) < 0.9 else Vector((1, 0, 0))
    u = t.cross(ref).normalized()
    v = t.cross(u).normalized()
    cs = [(u * s1 + v * s2) * (w / 2) for s1, s2 in ((1, 1), (-1, 1), (-1, -1), (1, -1))]
    for c in cs:
        Barra("solido", a + c, b + c, ch, cor)
    n = max(1, round(L / passo))
    for k in range(n):
        p0, p1 = a + t * (L * k / n), a + t * (L * (k + 1) / n)
        for f in range(4):
            c0, c1 = cs[f], cs[(f + 1) % 4]
            if (k + f) % 2:
                Barra("solido", p0 + c0, p1 + c1, lc, cor)
            else:
                Barra("solido", p0 + c1, p1 + c0, lc, cor)


# ── o carrinho ──
def carro():
    PISO[0] = -0.4
    VER, SEAT, AM = "#d23440", "#1d1b26", "#f2b632"
    for s in (-1, 1):
        x = s * 0.55
        for yy in (-0.85, 0.85):
            Cil("solido", (x - 0.04, yy, 0.2), 0.11, 0.11, 0.08, 8, "#2a2a30", r=(0, math.pi / 2, 0), sujo=0)
            Cil("solido", (x - 0.03, yy, -0.18), 0.07, 0.07, 0.06, 6, "#2a2a30", r=(0, math.pi / 2, 0), sujo=0)
            B("solido", (s * 0.63, yy, 0.05), (0.04, 0.34, 0.62), ACO2, sujo=0)
        B("solido", (s * 0.63, 0, 0.37), (0.1, 2.0, 0.1), ACO2, sujo=0)
    B("solido", (0, 0, 0.38), (1.56, 2.3, 0.12), MET, sujo=0)
    lado = [(-1.18, 0.32), (1.0, 0.32), (1.0, 0.7), (0.42, 0.92), (0.05, 0.84), (-0.62, 0.84), (-0.95, 1.08), (-1.18, 1.08)]
    for s in (-1, 1):
        Perfil("solido", lado, s * 0.72, s * 0.8, VER)
    Perfil("solido", [(0.38, 0.32), (1.22, 0.32), (1.24, 0.5), (1.05, 0.78), (0.7, 0.98), (0.38, 0.98)], -0.8, 0.8, VER)
    Perfil("solido", [(-1.22, 0.32), (-1.05, 0.32), (-1.05, 1.1), (-1.22, 1.03)], -0.8, 0.8, VER)
    # os bancos (você e a Nizzy em x = ±0,4, um pouco pra trás)
    for s in (-1, 1):
        B("solido", (s * 0.4, -0.28, 0.5), (0.6, 0.62, 0.12), SEAT, sujo=0)
        B("solido", (s * 0.4, -0.64, 0.9), (0.6, 0.12, 0.8), SEAT, r=(-0.12, 0, 0), sujo=0)
        B("solido", (s * 0.4, -0.74, 1.42), (0.38, 0.12, 0.26), SEAT, r=(-0.12, 0, 0), sujo=0)
    B("solido", (0, -0.3, 0.62), (0.08, 0.7, 0.24), MET, sujo=0)
    # a barra de segurança (presa no capô, na frente dos dois)
    Tubo("solido", [(0, 0.42, 0.95), (0, 0.3, 0.94), (0, 0.18, 0.87)], 0.035, 6, ACO, 0)
    Tubo("solido", [(-0.66, 0.16, 0.86), (0.66, 0.16, 0.86)], 0.04, 6, ACO, 0)
    for s in (-1, 1):
        B("solido", (s * 0.4, 0.16, 0.86), (0.48, 0.12, 0.12), AM, sujo=0)
    # o neon: ciano na borda de cima, rosa embaixo, o filete do bico, faróis e a lanterna
    for s in (-1, 1):
        Tubo("luz", [(s * 0.76, y, z + 0.02) for y, z in [(-1.18, 1.08), (-0.95, 1.08), (-0.62, 0.84), (0.05, 0.84), (0.42, 0.92), (1.0, 0.7)]], 0.022, 3, CIANO, 0)
        B("luz", (s * 0.81, 0.0, 0.37), (0.02, 2.2, 0.04), ROSA, sujo=0)
        B("luz", (s * 0.45, 1.157, 0.645), (0.26, 0.03, 0.1), LED, r=(0.596, 0, 0), sujo=0)
    B("luz", (0, 1.236, 0.42), (1.3, 0.02, 0.05), CIANO, sujo=0)
    B("luz", (0, -1.232, 0.82), (1.2, 0.02, 0.06), "#ff2a3a", sujo=0)


# ── o dormente (origem: 0,15 m abaixo do trilho; a espinha a 0,2 m embaixo) ──
def dormente():
    B("solido", (0, 0, 0.0), (1.3, 0.14, 0.08), "#4a4e5e", sujo=0)
    for s in (-1, 1):
        Barra("solido", (s * 0.5, 0, -0.03), (s * 0.1, 0, -0.2), 0.06, "#4a4e5e")


# ── o módulo do pilar (3 m) e a sela ──
def pilar():
    H, w = 3.0, 0.38
    cs = [(w, w), (-w, w), (-w, -w), (w, -w)]
    for x, y in cs:
        Barra("solido", (x, y, 0), (x, y, H), 0.1, BR)
    for f in range(4):
        (x0, y0), (x1, y1) = cs[f], cs[(f + 1) % 4]
        if f % 2:
            Barra("solido", (x0, y0, 0.08), (x1, y1, H), 0.05, BR)
        else:
            Barra("solido", (x1, y1, 0.08), (x0, y0, H), 0.05, BR)
    B("solido", (0, 0, 0.04), (0.96, 0.96, 0.08), ACO2, sujo=0)


def pilartopo():
    B("solido", (0, 0, -0.03), (0.9, 0.9, 0.06), ACO2, sujo=0)
    for s in (-1, 1):
        B("solido", (s * 0.2, 0, 0.12), (0.06, 0.6, 0.3), ACO2, sujo=0)


# ── a roda-gigante: a base (origem no chão, embaixo do cubo) ──
RG, HG = 22.0, 24.0


def roda():
    PISO[0] = 0
    for sy in (-1, 1):
        for sx in (-1, 1):
            trelica_aberta((sx * 9.0, sy * 3.4, 0.3), (sx * 0.6, sy * 1.75, HG - 0.4), 0.6, 2.6, BR)
            B("solido", (sx * 9.0, sy * 3.4, 0.25), (1.6, 1.6, 0.5), MET)
            Barra("luz", (sx * 9.4, sy * 3.4, 0.6), (sx * 1.0, sy * 1.75, HG - 0.6), 0.07, CIANO)
        for z in (8.0, 16.0):
            t = (z - 0.3) / (HG - 0.7)
            x, y = 9.0 - 8.4 * t, 3.4 - 1.65 * t
            Barra("solido", (-x, sy * y, z), (x, sy * y, z), 0.24, ACO2)
        Cil("solido", (0, sy * 1.75 + 0.3, HG), 0.6, 0.6, 0.6, 10, ACO2, r=(math.pi / 2, 0, 0), sujo=0)
        B("luz", (0, sy * 1.75, HG + 0.75), (0.25, 0.25, 0.25), "#ff2a3a", sujo=0)
        # a plataforma de embarque dos dois lados da passagem das cabines
        B("solido", (0, sy * 2.75, 0.08), (22, 3.5, 0.16), MET2, d=(2, 3.5, 0.16), cf=xadrez(MET2, MET), sujo=0)
        B("luz", (0, sy * 4.51, 0.08), (22, 0.02, 0.08), CIANO, sujo=0)
        B("luz", (0, sy * 1.0, 0.161), (22, 0.12, 0.01), AMAR, sujo=0)
    Cil("solido", (0, 2.3, HG), 0.35, 0.35, 4.6, 12, ACO, r=(math.pi / 2, 0, 0), sujo=0)


# ── o aro (gira; origem no cubo; o plano da roda é XZ, o eixo é Y) ──
def aro():
    PISO[0] = -99
    for sy in (-1, 1):
        Tor("solido", (0, sy * 1.1, 0), RG, 0.2, 64, 4, BR, r=(math.pi / 2, 0, 0), sujo=0)
        Tor("solido", (0, sy * 0.95, 0), RG * 0.55, 0.14, 48, 4, ACO, r=(math.pi / 2, 0, 0), sujo=0)
        Tor("luz", (0, sy * 1.12, 0), RG + 0.26, 0.06, 64, 3, AMAR, r=(math.pi / 2, 0, 0), sujo=0)
        Tor("luz", (0, sy * 1.12, 0), RG * 0.55, 0.06, 48, 3, VERM, r=(math.pi / 2, 0, 0), sujo=0)
        Tor("luz", (0, sy * 1.42, 0), 1.0, 0.06, 20, 3, ROSA, r=(math.pi / 2, 0, 0), sujo=0)
        Cil("solido", (0, sy * 1.0 + 0.08, 0), 1.75, 1.75, 0.16, 16, ACO2, r=(math.pi / 2, 0, 0), sujo=0)
    Cil("solido", (0, 1.3, 0), 1.3, 1.3, 2.6, 16, ACO2, r=(math.pi / 2, 0, 0), sujo=0)
    for i in range(16):
        a = TAU * i / 16
        c, s = math.cos(a), math.sin(a)
        for sy in (-1, 1):
            Barra("solido", (1.3 * c, sy * 0.75, 1.3 * s), (RG * c, sy * 1.1, RG * s), 0.14, BR)
            Barra("luz", (1.8 * c, sy * 0.88, 1.8 * s), (21.6 * c, sy * 1.21, 21.6 * s), 0.05, CIANO)
            B("luz", (RG * c, sy * 1.3, RG * s), (0.24, 0.1, 0.24), QUENTE, r=(0, -a, 0), sujo=0)
        Cil("solido", (RG * c, 1.1, RG * s), 0.07, 0.07, 2.2, 6, ACO2, r=(math.pi / 2, 0, 0), sujo=0)
        a1, a2 = TAU * (i + 0.5) / 16, TAU * (i + 1) / 16
        Barra("solido", (RG * c, -1.1, RG * s), (RG * math.cos(a1), 1.1, RG * math.sin(a1)), 0.08, ACO)
        Barra("solido", (RG * math.cos(a1), 1.1, RG * math.sin(a1)), (RG * math.cos(a2), -1.1, RG * math.sin(a2)), 0.08, ACO)


# ── a cabine (origem no pino) ──
def cabine():
    PISO[0] = -99
    for sy in (-1, 1):
        Barra("solido", (0, sy * 0.62, 0), (0, sy * 0.3, -0.66), 0.07, ACO)
    Cil("solido", (0, 0.7, 0), 0.11, 0.11, 1.4, 6, ACO2, r=(math.pi / 2, 0, 0), sujo=0)
    Cil("solido", (0, 0, -0.92), 0.84, 0.4, 0.3, 8, BR, sujo=0)
    Cil("solido", (0, 0, -0.62), 0.4, 0.12, 0.1, 8, BR, sujo=0)
    Cil("luz", (0, 0, -1.5), 0.78, 0.78, 0.58, 8, "#f6f6f6", sujo=0, tampa=False)
    for k in range(8):
        a = TAU * k / 8
        Barra("solido", (0.8 * math.cos(a), 0.8 * math.sin(a), -1.5), (0.8 * math.cos(a), 0.8 * math.sin(a), -0.92), 0.07, BR)
    Cil("solido", (0, 0, -1.56), 0.85, 0.85, 0.07, 8, BR, sujo=0)
    Cil("solido", (0, 0, -2.1), 0.55, 0.8, 0.55, 8, MET, sujo=0)
    Cil("luz", (0, 0, -0.95), 0.86, 0.86, 0.04, 8, "#f6f6f6", sujo=0, tampa=False)


# ── a estação (as medidas de antes) e o portão com a bilheteria ──
def estacao():
    PISO[0] = 0
    B("solido", (0, 0, 0.6), (6, 26, 1.2), MET, d=(2, 2, 1.2), cf=xadrez(MET, "#252a36"))
    for s in (-1, 1):
        B("luz", (s * 3.01, 0, 1.15), (0.02, 26, 0.06), AMAR, sujo=0)
        B("luz", (s * 2.8, 0, 1.205), (0.1, 26, 0.01), AMAR, sujo=0)
    for y in (11.0, 0.0, -11.0):
        Cil("solido", (-2.6, y, 1.2), 0.18, 0.16, 5.3, 10, ACO, sujo=0.1)
        for b in ((-0.8, y), (-3.3, y), (-2.6, y + 2.6), (-2.6, y - 2.6)):
            Barra("solido", (-2.6, y, 4.6), (b[0], b[1], 6.45), 0.12, ACO)
    cf = lambda c, n, i, j: lin(MET2) if n.z < -0.5 else lin(BR)
    B("solido", (0, 0, 6.6), (7, 28, 0.3), BR, cf=cf, sujo=0)
    for s in (-1, 1):
        B("luz", (s * 3.51, 0, 6.6), (0.02, 28, 0.08), CIANO, sujo=0)
    for x in (-1.5, 1.5):
        B("luz", (x, 0, 6.44), (0.12, 24, 0.02), LED, sujo=0)
    # o letreiro em cima da cobertura, dos dois lados
    for s, M in ((-1, M_MENOSX), (1, M_MAISX)):
        B("solido", (s * 3.62, 0, 7.6), (0.12, 14.4, 2.2), PRETO, sujo=0)
        Texto("luz", "ROLLERCOASTER", T(s * 3.69, 0, 7.55) @ M, 1.3, VERM)
        for z in (6.55, 8.65):
            B("luz", (s * 3.69, 0, z), (0.02, 14.4, 0.06), CIANO, sujo=0)
    # o guarda-corpo do fundo e a escada pro lado do portão
    Tubo("solido", [(-2.95, -12.6, 2.2), (-2.95, 12.6, 2.2)], 0.04, 6, ACO, 0)
    for k in range(11):
        y = -12.5 + k * 2.5
        Barra("solido", (-2.95, y, 1.2), (-2.95, y, 2.2), 0.05, ACO)
    B("luz", (-2.95, 0, 2.12), (0.03, 25, 0.03), ROSA, sujo=0)
    for k in range(5):
        zk = 1.0 - 0.2 * k
        B("solido", (3.15 + 0.3 * k, -7, zk / 2), (0.3, 3, zk), MET2)
        B("luz", (3.0 + 0.3 * k + 0.29, -7, zk + 0.003), (0.03, 3, 0.006), AMAR, sujo=0)
    for sy in (-1, 1):
        Tubo("luz", [(3.0, -7 + sy * 1.55, 2.1), (4.6, -7 + sy * 1.55, 1.0)], 0.03, 3, CIANO, 0)

    # o portão, 21 m na direção da pista (+X)
    X0 = 21.0
    for sy in (-1, 1):
        y = sy * 6.0
        B("solido", (X0, y, 5.0), (1.0, 1.0, 10.0), BR, d=(1, 1, 2.5))
        B("solido", (X0, y, 0.15), (1.6, 1.6, 0.3), MET)
        for sx in (-1, 1):
            B("luz", (X0 + sx * 0.51, y, 5.0), (0.02, 0.14, 9.0), ROSA, sujo=0)
        Cil("solido", (X0, y, 10.0), 0.6, 0.22, 0.6, 8, ACO, sujo=0)
        Esfera("luz", (X0, y, 10.8), 0.2, 6, 4, QUENTE)
    arco = lambda y: 9.2 + 2.0 * (1 - (y / 6.0) ** 2)
    ys = [-6.0 + k for k in range(13)]
    Tubo("solido", [(X0, y, arco(y)) for y in ys], 0.22, 6, BR, 0)
    Tubo("luz", [(X0, y, arco(y) - 0.3) for y in ys], 0.06, 3, AMAR, 0)
    for y in ys[1:-1]:
        Esfera("luz", (X0, y, arco(y) + 0.32), 0.12, 4, 2, QUENTE)
    # a placa pendurada no arco: PARQUE / ROLLERCOASTER
    B("solido", (X0, 0, 8.2), (0.2, 11.2, 2.4), PRETO, sujo=0)
    for sy in (-1, 1):
        Barra("solido", (X0, sy * 4.0, 9.4), (X0, sy * 4.0, arco(4.0)), 0.06, ACO)
    Texto("luz", "ROLLERCOASTER", T(X0 + 0.11, 0, 7.75) @ M_MAISX, 1.0, VERM)
    Texto("luz", "PARQUE", T(X0 + 0.11, 0, 8.85) @ M_MAISX, 0.6, AMAR)
    Texto("luz", "PARQUE", T(X0 - 0.11, 0, 8.2) @ M_MENOSX, 1.0, VERM)
    for sx, M in ((1, M_MAISX), (-1, M_MENOSX)):
        x = X0 + sx * 0.11
        for z in (7.05, 9.35):
            B("luz", (x, 0, z), (0.02, 11.0, 0.05), CIANO, sujo=0)
        for y in (-5.55, 5.55):
            B("luz", (x, y, 8.2), (0.02, 0.05, 2.35), CIANO, sujo=0)
    # as catracas
    for y in (-3.6, -1.2, 1.2, 3.6):
        B("solido", (X0, y, 0.5), (0.9, 0.28, 1.0), ACO2)
        B("luz", (X0 + 0.1, y, 1.01), (0.5, 0.12, 0.02), VERDE, sujo=0)
        Barra("solido", (X0 + 0.15, y + 0.14, 0.85), (X0 + 0.15, y + 0.62, 0.8), 0.04, ACO)
    B("solido", (X0, 0, 0.03), (3.0, 12.0, 0.06), MET2, sujo=0)
    # a bilheteria (fora do arco, do lado -Y)
    yb = -9.8
    B("solido", (X0 + 0.2, yb, 1.4), (2.8, 3.0, 2.8), BR, cf=lambda c, n, i, j: lin(MET) if c.z < 0.9 else lin(BR))
    B("luz", (X0 + 1.61, yb, 1.65), (0.02, 2.0, 0.95), QUENTE, sujo=0)
    Barra("solido", (X0 + 1.64, yb, 1.18), (X0 + 1.64, yb, 2.12), 0.05, ACO)
    B("solido", (X0 + 1.8, yb, 1.12), (0.4, 2.2, 0.06), ACO, sujo=0)
    B("solido", (X0 + 0.5, yb, 2.95), (3.8, 3.6, 0.18), MET, sujo=0)
    B("luz", (X0 + 2.41, yb, 2.95), (0.02, 3.6, 0.1), CIANO, sujo=0)
    for sy in (-1, 1):
        B("luz", (X0 + 0.5, yb + sy * 1.81, 2.95), (3.8, 0.02, 0.1), CIANO, sujo=0)
    B("solido", (X0 + 2.3, yb, 3.45), (0.1, 3.0, 0.7), PRETO, sujo=0)
    Texto("luz", "BILHETES", T(X0 + 2.36, yb, 3.45) @ M_MAISX, 0.42, AMAR)
    # a grade dos dois lados do portão
    for y0, y1 in ((6.6, 15.0), (-11.6, -15.0)):
        n = max(1, round(abs(y1 - y0) / 2.1))
        for k in range(n + 1):
            y = y0 + (y1 - y0) * k / n
            Barra("solido", (X0, y, 0), (X0, y, 1.5), 0.08, ACO)
        for z in (0.75, 1.5):
            Barra("solido", (X0, y0, z), (X0, y1, z), 0.07, ACO)
        B("luz", (X0, (y0 + y1) / 2, 1.42), (0.03, abs(y1 - y0), 0.04), ROSA, sujo=0)
    # dois postes entre o portão e a estação
    for sy in (-1, 1):
        Cil("solido", (15.0, sy * 5.0, 0), 0.08, 0.06, 4.0, 6, ACO2, sujo=0.1)
        Esfera("luz", (15.0, sy * 5.0, 4.15), 0.22, 6, 4, QUENTE)


for nome, f in (("carro", carro), ("dormente", dormente), ("pilar", pilar), ("pilartopo", pilartopo),
                ("roda", roda), ("aro", aro), ("cabine", cabine), ("estacao", estacao)):
    ATUAL[0] = nome
    f()

GRUPOS = ("solido", "luz")


def material(g):
    m = bpy.data.materials.new("pq_" + g)
    try:
        m.use_nodes = True
    except Exception:
        pass
    nt = m.node_tree
    b = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    a = nt.nodes.new("ShaderNodeVertexColor")
    a.layer_name = "Col"
    if g == "luz":
        b.inputs["Base Color"].default_value = (0, 0, 0, 1)
        nt.links.new(a.outputs["Color"], b.inputs["Emission Color"])
        b.inputs["Emission Strength"].default_value = 1.0
    else:
        nt.links.new(a.outputs["Color"], b.inputs["Base Color"])
        b.inputs["Roughness"].default_value = 0.45
        b.inputs["Metallic"].default_value = 0.3
    return m


MATS = {g: material(g) for g in GRUPOS}
NOS = {}
for idx, tipo in enumerate(IDS):
    e = bpy.data.objects.new(tipo, None)
    e.empty_display_size = 1.0
    COL.objects.link(e)
    e.location = (idx * 80.0, 0, 0)
    NOS[tipo] = e
    for g in GRUPOS:
        b = BUF.get((tipo, g))
        if not b:
            continue
        me = bpy.data.meshes.new(f"{tipo}_{g}")
        me.from_pydata([tuple(v) for v in b["v"]], [], b["f"])
        at = me.color_attributes.new("Base", "FLOAT_COLOR", "CORNER")
        at.data.foreach_set("color", [x for fc in b["c"] for c in fc for x in c])
        me.polygons.foreach_set("use_smooth", [True] * len(me.polygons))
        me.update()
        o = bpy.data.objects.new(f"{tipo}_{g}", me)
        COL.objects.link(o)
        o.parent = e
        o["grupo"] = g
        me.materials.append(MATS[g])

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
sc.world.light_settings.distance = 2.0
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
    base = me.color_attributes["Base"]
    n = len(base.data)
    bc = [0.0] * (n * 4)
    base.data.foreach_get("color", bc)
    if g == "solido":
        ao = me.color_attributes["AO"]
        ac = [0.0] * (n * 4)
        ao.data.foreach_get("color", ac)
        for i in range(n):
            a = 0.35 + 0.65 * ac[i * 4]
            bc[i * 4] *= a
            bc[i * 4 + 1] *= a
            bc[i * 4 + 2] *= a
        me.color_attributes.remove(ao)
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
    o.select_set(True)
vl.objects.active = NOS[IDS[0]]
print(bpy.ops.export_scene.gltf(filepath=SAIDA, export_format="GLB", use_selection=True, export_texcoords=False,
      export_normals=True, export_materials="EXPORT", export_yup=True, export_apply=True, export_vertex_color="ACTIVE",
      export_extras=False))
tot = {}
for o in COL.objects:
    if o.type == "MESH":
        tot[(o.parent.name, o["grupo"])] = sum(len(p.vertices) - 2 for p in o.data.polygons)
for tipo in IDS:
    print("TRI", tipo, {g: v for (l, g), v in tot.items() if l == tipo})
print("TRI total", sum(tot.values()))
