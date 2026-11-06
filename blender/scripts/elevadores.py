# Os elevadores túneis<->cidade (06/11): a ENTRADA lá embaixo, encostada na
# torre de cada salão das trincheiras (moldura de aço, porta de grade
# pantográfica, a cabine acesa atrás, o painel com o número e as 3 faixas, a
# luz de chamada e os cabos/trilhos subindo pela torre), e a CHEGADA lá em cima,
# no anel da torre da ponta (a casinha do elevador com a mesma linguagem, porta
# de vidro, letreiro "TÚNEIS ▼" e a casa de máquinas), mais a PASSARELA que liga
# a casinha (encostada no prédio do meio) ao anel. Um modelo de cada, nos 3.
#
#   blender -b --factory-startup --python blender/scripts/elevadores.py -- bruto.glb
#   blender -b --factory-startup --python blender/scripts/elevadores_foto.py -- bruto.glb docs/blender/elevadores.png
#   npx @gltf-transform/cli optimize bruto.glb public/models/elevadores.glb \
#     --compress meshopt --simplify false --join false --flatten false --instance false --palette false
#
# Coordenadas: Blender Z pra cima, a FRENTE olha pra -Y (no glTF: +Z). Metros.
#   entrada    origem no chão, no meio da frente da moldura; a torre fica atrás
#              (+Y): o jogo põe a origem a TORRE_R + 0,75 do eixo da torre. A
#              grade fica 0,3 m pra dentro e a cabine acaba a 0,55 (fora do
#              cilindro da torre); os trilhos e cabos sobem até 14 m por trás
#              da placa "subir" (que fica a 0,25 da frente, 3,55–4,05 m).
#   chegada    origem no chão do anel, no meio da frente; a casinha vai até +Y 4,2
#              (encosta no prédio do meio) e desce 1,5 m (a saia).
#   passarela  de y = 0 até y = -1 (1 m; o jogo estica até o anel), 3,4 de largo
#   e_num1..3, c_num1..3   o número do elevador (neon), na entrada e na chegada
#   e_fx1..3,  c_fx1..3    as 3 faixas do grupo (neon; o jogo pinta com a cor da linha)
#   c_letreiro "TÚNEIS ▼" (neon)
# Em cada nó, as malhas: <id>_solido (cor no vértice × AO assada × luz falsa,
# gravada ×4: o material do jogo usa cor 0,25), <id>_luz (brilho de cor fixa),
# <id>_neon (sem cor: o jogo pinta), <id>_vidro (o vidro da porta, transparente).
# Orçamento: até 8 mil triângulos no arquivo.

import bpy, bmesh, math, sys
from mathutils import Vector, Matrix, Color

TAU = 2 * math.pi
args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
SAIDA = args[0] if args else "/tmp/elevadores-bruto.glb"
IDS = ["entrada", "chegada", "passarela", "e_num1", "e_num2", "e_num3", "e_fx1", "e_fx2", "e_fx3",
       "c_num1", "c_num2", "c_num3", "c_fx1", "c_fx2", "c_fx3", "c_letreiro"]

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
COL = bpy.data.collections.new("Elevadores")
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


def luzf(n):
    return max(0.5, min(1.0, 0.8 + 0.2 * n.z + 0.06 * n.x - 0.03 * n.y))


# ── acumuladores: uma lista de vértices/faces/cores por (lugar, grupo) ──
BUF = {}
ATUAL = [None]
PAI = [Matrix.Identity(4)]


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
            k = luzf(f.normal) if g == "solido" else 1.0
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




# ── cores (escuras: a cor do vértice já é a cena) ──
CH, CH2 = "#3a3346", "#2c2636"          # chapa, aço escuro
GR = "#6a6078"                          # a grade
AC, AC2 = "#77738a", "#4c4858"          # aço claro
CO, CO2 = "#2a2432", "#221c2a"          # concreto
FE = "#4a2c24"                          # ferrugem
PR, BO = "#121016", "#18151c"           # preto, cabo
AM, PT = "#9a7a1c", "#141216"           # faixa de perigo
AMB = "#ffb040"                         # a luz de chamada
CAB = "#ffd9a8"                         # a luz da cabine


def perigo(c, n, i, j):
    return AM if int(math.floor((c.x + c.z + c.y) / 0.1)) % 2 else PT


def Faixa(cx, y, cz, w, h, cima=False):
    """A faixa de perigo: uma grade de um lado só, virada pra -Y (ou pra cima)."""
    nu, nv = max(1, round(w / 0.1)), max(1, round(h / 0.1))
    if cima:
        Placa("solido", (cx - w / 2, y + h / 2, cz), (w, 0, 0), (0, -h, 0), nu, nv, cf=perigo, sujo=0)
    else:
        Placa("solido", (cx - w / 2, y, cz - h / 2), (w, 0, 0), (0, 0, h), nu, nv, cf=perigo, sujo=0)


def chapas(larg=0.6):
    return lambda c, n, i, j: CH if int(round((c.x + c.y) / larg)) % 2 else CH2


def tracos(g, segs, o, h, y, esp, M=None):
    """Letras/números em traços (segmentos no plano XZ, unidade = altura h), virados pra -Y."""
    ox, oz = o
    for (a, b) in segs:
        A = Vector((ox + a[0] * h, y, oz + a[1] * h))
        Bv = Vector((ox + b[0] * h, y, oz + b[1] * h))
        d = (Bv - A)
        if d.length < 1e-6:
            continue
        e = d.normalized() * esp * 0.5
        Viga(g, A - e, Bv + e, esp, None, 0)


DIG = {
    1: [((0.3, 0.8), (0.6, 1)), ((0.6, 1), (0.6, 0))],
    2: [((0, 1), (0.6, 1)), ((0.6, 1), (0.6, 0.5)), ((0.6, 0.5), (0, 0.5)), ((0, 0.5), (0, 0)), ((0, 0), (0.6, 0))],
    3: [((0, 1), (0.6, 1)), ((0.6, 1), (0.6, 0)), ((0.6, 0), (0, 0)), ((0.12, 0.5), (0.6, 0.5))],
}
LETRAS = {
    "T": [((0, 1), (0.6, 1)), ((0.3, 1), (0.3, 0))],
    "Ú": [((0, 1), (0, 0)), ((0, 0), (0.6, 0)), ((0.6, 0), (0.6, 1)), ((0.24, 1.14), (0.42, 1.3))],
    "N": [((0, 0), (0, 1)), ((0, 1), (0.6, 0)), ((0.6, 0), (0.6, 1))],
    "E": [((0, 0), (0, 1)), ((0, 1), (0.6, 1)), ((0, 0.5), (0.45, 0.5)), ((0, 0), (0.6, 0))],
    "I": [((0.3, 0), (0.3, 1))],
    "S": [((0.6, 1), (0, 1)), ((0, 1), (0, 0.5)), ((0, 0.5), (0.6, 0.5)), ((0.6, 0.5), (0.6, 0)), ((0.6, 0), (0, 0))],
}


def painel(pref, px, pz, y):
    """O painel: a caixa, o visor do número, as 3 faixas e o botão de chamada ▲▼ (frente em y)."""
    B("solido", (px, y + 0.3, pz), (0.52, 0.6, 1.1), cor=CH2)
    B("solido", (px, y + 0.005, pz), (0.46, 0.012, 1.04), cor="#3c3546", sujo=0)
    for sx in (-1, 1):
        for sz in (-1, 1):
            Cil("solido", (px + sx * 0.2, y - 0.004, pz + sz * 0.47), 0.016, 0.016, 0.01, 4, cor=AC, r=(math.pi / 2, 0, 0), sujo=0, tampa=False)
    # o visor do número (moldura preta) e os 3 dígitos
    B("solido", (px, y - 0.01, pz + 0.28), (0.3, 0.02, 0.36), cor=PR, sujo=0)
    for n in (1, 2, 3):
        ATUAL[0] = f"{pref}_num{n}"
        tracos("neon", DIG[n], (px - 0.075, pz + 0.155), 0.25, y - 0.024, 0.04)
    # as 3 faixas do grupo
    ATUAL[0] = pref == "e" and "entrada" or "chegada"
    B("solido", (px, y - 0.008, pz - 0.05), (0.36, 0.016, 0.26), cor=PR, sujo=0)
    for k in range(3):
        ATUAL[0] = f"{pref}_fx{k + 1}"
        B("neon", (px, y - 0.02, pz + 0.03 - k * 0.08), (0.3, 0.012, 0.045))
    ATUAL[0] = pref == "e" and "entrada" or "chegada"
    # o botão de chamada: ▲ e ▼ na luz âmbar, num aro de aço
    Cil("solido", (px, y - 0.006, pz - 0.36), 0.1, 0.1, 0.014, 12, cor=AC, r=(math.pi / 2, 0, 0), sujo=0)
    Tri("luz", (px - 0.045, y - 0.024, pz - 0.335), (px + 0.045, y - 0.024, pz - 0.335), (px, y - 0.024, pz - 0.275), AMB)
    Tri("luz", (px + 0.045, y - 0.024, pz - 0.385), (px - 0.045, y - 0.024, pz - 0.385), (px, y - 0.024, pz - 0.445), AMB)


def moldura(L, A, prof, y0=0.0):
    """A moldura de aço (a assinatura dos dois): pilares em I, a verga rebitada e o neon do vão."""
    for sx in (-1, 1):
        x = sx * (L / 2 + 0.15)
        B("solido", (x, y0 + prof / 2, A / 2), (0.3, prof, A), cor=CH, d=(0.3, 0.5, 0.8))
        B("solido", (x, y0 - 0.02, A / 2), (0.42, 0.04, A), cor=AC2)
        Faixa(x, y0 - 0.042, 0.35, 0.42, 0.7)
        for k in range(7):
            Cil("solido", (x + sx * 0.15, y0 - 0.042, 0.9 + k * (A - 1.1) / 6), 0.018, 0.018, 0.012, 4, cor=AC, r=(math.pi / 2, 0, 0), sujo=0, tampa=False)
        B("neon", (sx * (L / 2 - 0.0), y0 - 0.05, A / 2), (0.05, 0.02, A - 0.1))
    B("solido", (0, y0 + prof / 2, A + 0.15), (L + 0.72, prof, 0.3), cor=CH)
    B("solido", (0, y0 - 0.02, A + 0.15), (L + 0.84, 0.04, 0.34), cor=AC2)
    for k in range(9):
        Cil("solido", (-L / 2 + k * L / 8, y0 - 0.042, A + 0.24), 0.018, 0.018, 0.012, 4, cor=AC, r=(math.pi / 2, 0, 0), sujo=0, tampa=False)
    B("neon", (0, y0 - 0.05, A - 0.02), (L, 0.02, 0.05))


def grade(L, A, y):
    """A porta de grade pantográfica fechada (de x = -L/2 a L/2)."""
    n = 12
    p = L / n
    for i in range(n + 1):
        B("solido", (-L / 2 + i * p, y, A / 2), (0.03, 0.02, A - 0.08), cor=GR, sujo=0)
    for i in range(n):
        x0, x1 = -L / 2 + i * p, -L / 2 + (i + 1) * p
        for z0, z1 in ((0.06, A / 3), (A / 3, 2 * A / 3), (2 * A / 3, A - 0.06)):
            Viga("solido", (x0, y + 0.012, z0), (x1, y + 0.012, z1), 0.014, cor=GR, sujo=0)
            Viga("solido", (x1, y - 0.012, z0), (x0, y - 0.012, z1), 0.014, cor=GR, sujo=0)
    B("solido", (0, y, A - 0.02), (L + 0.1, 0.07, 0.06), cor=CH)
    B("solido", (0, y, 0.015), (L + 0.1, 0.07, 0.03), cor=AC2, sujo=0)
    B("solido", (L / 2 - 0.08, y - 0.04, 1.1), (0.035, 0.05, 0.3), cor=AC)


def lampada(p):
    """A luz de chamada: a cúpula âmbar com a gaiola."""
    x, y, z = p
    Cil("solido", (x, y, z), 0.1, 0.1, 0.05, 10, cor=CH)
    Cil("luz", (x, y, z + 0.05), 0.075, 0.06, 0.12, 10, cor=AMB)
    for k in range(4):
        a = TAU * k / 4 + 0.4
        Viga("solido", (x + 0.085 * math.cos(a), y + 0.085 * math.sin(a), z + 0.05),
             (x + 0.03 * math.cos(a), y + 0.03 * math.sin(a), z + 0.19), 0.012, cor=GR, sujo=0)


# ── a ENTRADA nos túneis (encostada na torre do salão) ──
def entrada():
    ATUAL[0] = "entrada"
    L, A = 3.0, 3.0
    # a soleira com a faixa de perigo
    B("solido", (0, 0.28, 0.03), (L + 0.6, 0.6, 0.06), cor=CH2, d=(0.3, 0.3, 0.06),
      cf=lambda c, n, i, j: CH2 if (i + j) % 2 else "#332c3c")
    B("solido", (0, -0.06, 0.03), (L, 0.12, 0.06), cor=PT, sujo=0)
    Faixa(0, -0.06, 0.061, L, 0.12, True)
    moldura(L, A, 1.3)
    grade(L, A, 0.3)
    # a cabine atrás da grade: o fundo de chapa, o corrimão, a luz no teto
    B("solido", (0, 0.58, A / 2), (L, 0.06, A), cor=CH2, d=(0.5, 0.06, 0.5), cf=chapas(0.5))
    for sx in (-1, 1):
        B("solido", (sx * (L / 2 - 0.03), 0.44, A / 2), (0.06, 0.28, A), cor=CH)
    Cil("solido", (-L / 2 + 0.2, 0.5, 0.95), 0.022, 0.022, L - 0.4, 6, cor=AC, r=(0, math.pi / 2, 0))
    B("solido", (0, 0.44, A - 0.03), (L, 0.28, 0.06), cor=CH2)
    B("luz", (0, 0.44, A - 0.065), (L - 0.6, 0.12, 0.02), cor=CAB)
    B("luz", (0, 0.545, 1.75), (L - 0.4, 0.01, 0.9), cor="#3a2c22")  # o brilho da luz no fundo
    # o painel (à direita de quem chega) e as luzes de chamada nos pilares
    painel("e", L / 2 + 0.62, 1.35, -0.12)
    for sx in (-1, 1):
        lampada((sx * (L / 2 + 0.15), -0.05, A + 0.32))
    # os trilhos-guia e os cabos subindo pela torre (atrás da placa "subir")
    for sx in (-1, 1):
        x = sx * 1.15
        B("solido", (x, 0.5, 3.35 + 5.3), (0.16, 0.12, 10.6), cor=AC2, d=(0.16, 0.12, 2.0))
        B("solido", (x - sx * 0.06, 0.43, 3.35 + 5.3), (0.04, 0.04, 10.6), cor=AC, sujo=0)
        for k in range(6):
            B("solido", (x, 0.6, 3.6 + k * 1.9), (0.36, 0.08, 0.12), cor=CH, sujo=0)
    for x in (-0.36, -0.12, 0.12, 0.36):
        Cil("solido", (x, 0.55, 3.3), 0.02, 0.02, 10.7, 5, cor=BO, sujo=0)
    # a polia lá no alto (o cabeçote)
    B("solido", (0, 0.6, 14.2), (2.8, 0.4, 0.5), cor=CH)
    Cil("solido", (-0.6, 0.45, 14.65), 0.45, 0.45, 1.2, 14, cor=AC2, r=(0, math.pi / 2, 0))
    # a caixa de força com o conduíte
    B("solido", (-L / 2 - 0.62, 0.25, 2.1), (0.42, 0.5, 0.6), cor=CH2)
    Faixa(-L / 2 - 0.62, -0.002, 2.1, 0.3, 0.1)
    Tubo("solido", [(-L / 2 - 0.62, 0.25, 2.4), (-L / 2 - 0.62, 0.3, 3.0), (-L / 2 - 0.5, 0.35, 3.6), (-1.15, 0.4, 4.3)], 0.03, 5, BO, 0)


# ── a CHEGADA lá em cima (a casinha no anel da torre da ponta) ──
def chegada():
    ATUAL[0] = "chegada"
    W, D, H = 5.0, 4.2, 3.6
    L, A = 2.0, 2.7
    # a saia (desce no deque) e o piso
    B("solido", (0, D / 2, -0.75), (W + 0.2, D, 1.5), cor=CO, d=(1.0, 1.0, 1.5))
    B("solido", (0, -0.25, 0.02), (W, 0.5, 0.04), cor=CH2)
    Faixa(0, -0.42, 0.041, W, 0.16, True)
    # as paredes de chapa (frente com o vão, os lados e o teto)
    lado = (W - L) / 2 - 0.3
    for sx in (-1, 1):
        B("solido", (sx * (W / 2 - lado / 2), 0.12, H / 2), (lado, 0.24, H), cf=chapas(0.25), d=(0.25, 0.24, H))
        B("solido", (sx * (W / 2 - 0.06), D / 2, H / 2), (0.12, D, H), cf=lambda c, n, i, j: CH if int(c.y / 0.25) % 2 else CH2, d=(0.12, 0.25, H))
    B("solido", (0, 0.12, (A + 0.3 + H) / 2), (L + 0.6, 0.24, H - A - 0.3), cor=CH2)
    B("solido", (0, D / 2, H + 0.06), (W + 0.3, D + 0.3, 0.12), cor=CH2, d=(1.0, 1.0, 0.12))
    for sx in (-1, 1):  # o parapeito
        B("solido", (sx * (W / 2 + 0.1), D / 2, H + 0.3), (0.1, D + 0.3, 0.36), cor=CH)
    B("solido", (0, -0.1, H + 0.3), (W + 0.3, 0.1, 0.36), cor=CH)
    # os pilares de aço nos cantos (a mesma moldura em I)
    for sx in (-1, 1):
        B("solido", (sx * (W / 2 + 0.05), -0.02, H / 2), (0.34, 0.08, H + 0.1), cor=AC2)
        Faixa(sx * (W / 2 + 0.05), -0.062, 0.35, 0.34, 0.7)
    moldura(L, A, 0.3, -0.06)
    # a porta de vidro (duas folhas de correr, a do vão), o caixilho e o puxador
    for sx in (-1, 1):
        x = sx * L / 4
        B("vidro", (x, 0.1, A / 2), (L / 2 - 0.08, 0.02, A - 0.1), cor="#3f6c86")
        B("solido", (x, 0.1, 0.06), (L / 2, 0.05, 0.12), cor=AC2, sujo=0)
        B("solido", (x, 0.1, A - 0.05), (L / 2, 0.05, 0.1), cor=AC2, sujo=0)
        B("solido", (sx * (L / 2 - 0.03), 0.1, A / 2), (0.06, 0.05, A), cor=AC2, sujo=0)
        B("solido", (sx * 0.03, 0.08, A / 2), (0.06, 0.06, A), cor=AC2, sujo=0)
        B("solido", (sx * 0.12, 0.06, 1.1), (0.03, 0.04, 0.5), cor=AC, sujo=0)
    # a cabine acesa lá dentro (vista pelo vidro): o fundo, o corrimão, a luz
    B("solido", (0, 1.9, A / 2), (L + 0.4, 0.06, A), cor=CH2, cf=chapas(0.5), d=(0.5, 0.06, 0.5))
    for sx in (-1, 1):
        B("solido", (sx * (L / 2 + 0.2), 1.0, A / 2), (0.06, 1.8, A), cor=CH)
    B("solido", (0, 1.0, 0.02), (L + 0.4, 1.8, 0.04), cor="#332c3c")
    B("luz", (0, 1.0, A - 0.02), (L - 0.2, 1.4, 0.02), cor=CAB)
    B("luz", (0, 1.865, 1.5), (L, 0.01, 1.0), cor="#3a2c22")
    Cil("solido", (-L / 2, 1.82, 0.95), 0.022, 0.022, L, 6, cor=AC, r=(0, math.pi / 2, 0))
    # o painel (à direita da porta) e o letreiro "TÚNEIS ▼" em cima
    painel("c", L / 2 + 0.62, 1.3, -0.1)
    ATUAL[0] = "chegada"
    B("solido", (0, -0.03, A + 0.6), (3.5, 0.06, 0.62), cor=PR, sujo=0)
    ATUAL[0] = "c_letreiro"
    h, x = 0.38, -1.52
    for ch in "TÚNEIS":
        tracos("neon", LETRAS[ch], (x, A + 0.38), h, -0.07, 0.055)
        x += h * 0.6 + 0.14
    Tri("neon", (x + 0.1, -0.07, A + 0.38 + h), (x + 0.1 + h, -0.07, A + 0.38 + h), (x + 0.1 + h / 2, -0.07, A + 0.42), None)
    ATUAL[0] = "chegada"
    # a casa de máquinas no teto, com a grelha, a polia e a luz de chamada
    with em(T(0, 2.4, H + 0.12)):
        B("solido", (0, 0, 0.75), (2.6, 2.2, 1.5), cf=chapas(0.3), d=(0.3, 0.3, 1.5))
        B("solido", (0, 0, 1.55), (2.8, 2.4, 0.1), cor=CH2)
        for k in range(6):
            B("solido", (0, -1.11, 0.4 + k * 0.14), (1.4, 0.04, 0.05), cor=PR, sujo=0)
        Cil("solido", (1.31, -0.2, 0.9), 0.4, 0.4, 0.14, 14, cor=AC2, r=(0, math.pi / 2, 0))
        for z in (0.5, 0.56):
            Viga("solido", (1.4, -0.6, z), (1.4, 0.2, z + 0.4), 0.02, cor=BO, sujo=0)
        lampada((0.9, -0.7, 1.6))
        lampada((-0.9, -0.7, 1.6))
        Cil("solido", (-1.0, 0.6, 1.6), 0.03, 0.03, 2.2, 5, cor=AC, sujo=0)  # a antena
    # o neon da beirada do teto
    B("neon", (0, -0.16, H + 0.47), (W + 0.3, 0.02, 0.04))


# ── a PASSARELA (de y = 0 a y = -1; o jogo estica) ──
def passarela():
    ATUAL[0] = "passarela"
    Wp = 3.4
    B("solido", (0, -0.5, -0.12), (Wp, 1.0, 0.24), cor=CH2)
    for k in range(-7, 8):
        B("solido", (k * 0.22, -0.5, 0.005), (0.05, 1.0, 0.01), cor="#3e3748", sujo=0)
    for sx in (-1, 1):
        B("solido", (sx * (Wp / 2 + 0.06), -0.5, -0.35), (0.14, 1.0, 0.7), cor=CH)
        B("solido", (sx * (Wp / 2 - 0.04), -0.5, 1.05), (0.06, 1.0, 0.06), cor=AC)
        B("solido", (sx * (Wp / 2 - 0.04), -0.5, 0.55), (0.03, 1.0, 0.03), cor=AC2, sujo=0)
        B("solido", (sx * (Wp / 2 - 0.04), -0.5, 0.06), (0.08, 1.0, 0.12), cor=AM, sujo=0)
        B("neon", (sx * (Wp / 2 + 0.14), -0.5, -0.02), (0.02, 1.0, 0.04))
    for sx in (-1, 1):  # os montantes nas pontas (na emenda com a casinha e com o anel)
        for y in (-0.04, -0.96):
            B("solido", (sx * (Wp / 2 - 0.04), y, 0.55), (0.07, 0.07, 1.1), cor=AC2, sujo=0)


entrada()
chegada()
passarela()

GANHO = 4.0
GRUPOS = ("solido", "luz", "neon", "vidro")


def material(g):
    m = bpy.data.materials.new("elev_" + g)
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
        if g in ("luz", "vidro"):
            b.inputs["Base Color"].default_value = (0, 0, 0, 1)
            nt.links.new(a.outputs["Color"], b.inputs["Emission Color"])
            b.inputs["Emission Strength"].default_value = 1.0
            if g == "vidro":
                b.inputs["Alpha"].default_value = 0.35
        else:
            nt.links.new(a.outputs["Color"], b.inputs["Base Color"])
            b.inputs["Roughness"].default_value = 0.85
    return m


MATS = {g: material(g) for g in GRUPOS}
NOS = {}
# separados pra assar a AO (os números/faixas/letreiro são só neon, não assam)
LUGAR = {"entrada": (0, 0, 0), "chegada": (30, 0, 0), "passarela": (60, 0, 0)}
for peca in IDS:
    e = bpy.data.objects.new(peca, None)
    e.empty_display_size = 0.5
    COL.objects.link(e)
    e.location = LUGAR.get(peca, (0, 0, 0))
    NOS[peca] = e
    for g in GRUPOS:
        b = BUF.get((peca, g))
        if not b:
            continue
        me = bpy.data.meshes.new(f"{peca}_{g}")
        me.from_pydata([tuple(v) for v in b["v"]], [], b["f"])
        at = me.color_attributes.new("Base", "FLOAT_COLOR", "CORNER")
        at.data.foreach_set("color", [x for fc in b["c"] for c in fc for x in c])
        me.polygons.foreach_set("use_smooth", [True] * len(me.polygons))
        me.update()
        o = bpy.data.objects.new(f"{peca}_{g}", me)
        COL.objects.link(o)
        o.parent = e
        o["grupo"] = g
        me.materials.append(MATS[g])

vl = bpy.context.view_layer
vl.update()

# ── a AO assada na cor dos vértices (Cycles), só no sólido ──
solidos = [o for o in COL.objects if o.type == "MESH" and o["grupo"] == "solido"]
for o in COL.objects:
    if o.type == "MESH" and o["grupo"] in ("vidro", "neon"):
        o.hide_render = True
for o in solidos:
    ao = o.data.color_attributes.new("AO", "FLOAT_COLOR", "CORNER")
    o.data.color_attributes.active_color = ao
# o chão e as paredes de trás (a torre embaixo, o prédio em cima) tampam a AO como no jogo
mc = bpy.data.meshes.new("fundo_bake")
mc.from_pydata([(-8, -6, 0), (8, -6, 0), (8, 0.9, 0), (-8, 0.9, 0), (8, 0.9, 20), (-8, 0.9, 20),
                (22, -6, 0), (38, -6, 0), (38, 4.25, 0), (22, 4.25, 0), (38, 4.25, 12), (22, 4.25, 12)], [],
               [(0, 1, 2, 3), (3, 2, 4, 5), (6, 7, 8, 9), (9, 8, 10, 11)])
fundo = bpy.data.objects.new("fundo_bake", mc)
sc.collection.objects.link(fundo)
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
sc.world.light_settings.distance = 1.0
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
            a = (0.25 + 0.75 * ac[i * 4]) * GANHO
            for c in range(3):
                bc[i * 4 + c] = min(1.0, bc[i * 4 + c] * a)
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
    o.hide_render = False
    o.select_set(True)
vl.objects.active = NOS[IDS[0]]
print(bpy.ops.export_scene.gltf(filepath=SAIDA, export_format="GLB", use_selection=True, export_texcoords=False,
      export_normals=True, export_materials="EXPORT", export_yup=True, export_apply=True, export_vertex_color="ACTIVE"))
tot = {}
for o in COL.objects:
    if o.type == "MESH":
        tot[(o.parent.name, o["grupo"])] = sum(len(p.vertices) - 2 for p in o.data.polygons)
for peca in IDS:
    print("TRI", peca, sum(v for (l, g), v in tot.items() if l == peca), {g: v for (l, g), v in tot.items() if l == peca})
print("TRI total", sum(tot.values()))
