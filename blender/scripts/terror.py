# As peças do elevador de terror (T47, 07/11): a cabine com o painel de botões,
# a porta de grade pantográfica, a cibercama (cama-cápsula com cabos e monitor),
# a cápsula de incubação (vidro com líquido verde, base com tubos), a máquina
# "dormindo" (gabinete com o respiro), o andar que se repete (piso, pilares, a
# parede com canos) e um trecho do poço (trilhos e vigas). Antes eram caixas
# (app/linha/trincheiras/PocoTerror.tsx). Robôs e pessoas NÃO estão aqui (vêm do
# Tripo); na cápsula fica só uma silhueta escura.
#
#   blender -b --factory-startup --python blender/scripts/terror.py -- bruto.glb
#   blender -b --factory-startup --python blender/scripts/terror_foto.py -- bruto.glb docs/blender/terror.png
#   npx @gltf-transform/cli optimize bruto.glb public/models/terror.glb \
#     --compress meshopt --simplify false --join false --flatten false --instance false --palette false
#
# Coordenadas: Blender Z pra cima; o "pra dentro do andar" do jogo (+Z, a frente
# da câmera) é -Y aqui (no glTF vira +Z). Em metros, nos tamanhos de antes:
#   cabine   origem no piso, no meio (meia largura 1,8, 2,6 de alto)
#   porta    origem no canto direito da frente da cabine; vai até x = -3,6
#            (o jogo dobra ela pela escala em x: é pantográfica)
#   cama     origem no chão, no meio (0,95 × 2,1; a cabeça pro poço)
#   capsula  origem no chão, no meio (r 0,42, 2,5 de alto)
#   maquina  origem no chão, no meio (1,2 × 0,8 × 2,4; o respiro pro poço)
#   andar    origem no meio do poço, no piso (16 × 15 m depois da boca)
#   poco     origem no meio do poço, embaixo; 4,2 m de alto (um andar), repete
# Em cada nó, as malhas:
#   <id>_solido  cor no vértice × AO assada × uma luz falsa por face (o jogo é sem luz),
#                gravada ×4 (GANHO): o material do jogo usa cor 0,25
#   <id>_luz     o que brilha com cor fixa (lâmpada, botões, telas, luz vermelha)
#   <id>_neon    sem cor (o jogo pinta: o filete da cama, o respiro, a emergência)
#   <id>_vidro   o líquido da cápsula (o jogo põe transparente)
# Orçamento: até 20 mil triângulos no arquivo (as peças repetem por instância).

import bpy, bmesh, math, sys
from mathutils import Vector, Matrix, Color

TAU = 2 * math.pi
args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
SAIDA = args[0] if args else "/tmp/terror-bruto.glb"
IDS = ["cabine", "porta", "cama", "capsula", "maquina", "andar", "poco"]

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
COL = bpy.data.collections.new("Terror")
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




# ── cores (escuras: o jogo é sem luz, a cor do vértice já é a cena) ──
CH, CH2 = "#3a3346", "#2c2636"          # chapa, aço escuro
GR = "#5e546c"                          # a grade
AC, AC2 = "#6c6878", "#4c4858"          # aço claro (trilho, corrimão)
CO, CO2, CO3 = "#2a2432", "#221c2a", "#2e2838"  # concreto
FE = "#4a2c24"                          # ferrugem
PR, BO = "#121016", "#18151c"           # preto, borracha/cabo
AM, PT = "#8a7020", "#141216"           # faixa de perigo
VE = "#5dffa0"                          # o verde das cápsulas
VM = "#ff2a2a"                          # o vermelho de emergência


def Casca(g, M, raio, comp, seg, nl, cor, esp=0.025, a0=0.0, a1=math.pi):
    """Meia casca de cilindro (eixo Y, de 0 a comp, arco de a0 a a1 no plano XZ), dois lados."""
    bm = bmesh.new()
    bm.faces.layers.int.new("ij")
    camadas = []
    for c, r in enumerate((raio, raio - esp)):
        vs = [[bm.verts.new((r * math.cos(a0 + (a1 - a0) * k / seg), comp * i / nl, r * math.sin(a0 + (a1 - a0) * k / seg)))
               for k in range(seg + 1)] for i in range(nl + 1)]
        camadas.append(vs)
        for i in range(nl):
            for k in range(seg):
                q = (vs[i][k], vs[i + 1][k], vs[i + 1][k + 1], vs[i][k + 1])
                bm.faces.new(q if c == 0 else q[::-1])
    A, Bc = camadas
    for i in range(nl):  # as bordas retas
        for k in (0, seg):
            q = (A[i][k], Bc[i][k], Bc[i + 1][k], A[i + 1][k])
            bm.faces.new(q if k == 0 else q[::-1])
    for i in (0, nl):  # as bordas em arco
        for k in range(seg):
            q = (A[i][k], A[i][k + 1], Bc[i][k + 1], Bc[i][k])
            bm.faces.new(q if i == 0 else q[::-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    add(bm, g, cor, M, None, 0.1)


# ── a cabine (origem no piso, no meio; a frente da grade olha pra -Y) ──
def cabine():
    A, C = 2.6, 1.8
    B("solido", (0, 0, -0.06), (3.6, 3.6, 0.12), d=(0.6, 0.6, 0.12),
      cf=lambda c, n, i, j: CH2 if (i + j) % 2 else "#332c3c")
    for k in range(-5, 6):  # as ripas antiderrapantes
        B("solido", (k * 0.3, 0.1, 0.004), (0.04, 3.2, 0.01), cor="#3e3748", sujo=0)
    B("solido", (0, 0, A + 0.04), (3.6, 3.6, 0.08), cor=CH2, d=(0.9, 0.9, 0.08))
    for sx in (-1, 1):
        for sy in (-1, 1):
            B("solido", (sx * (C - 0.04), sy * (C - 0.04), A / 2), (0.08, 0.08, A), cor=CH)
    s = -C + 0.2
    while s < C - 0.1:  # a grade dos lados e do fundo
        for sx in (-1, 1):
            B("solido", (sx * C, s, A / 2), (0.022, 0.022, A - 0.1), cor=GR, sujo=0)
        B("solido", (s, C, A / 2), (0.022, 0.022, A - 0.1), cor=GR, sujo=0)
        s += 0.2
    for z in (0.32, 1.05, A - 0.1):
        for sx in (-1, 1):
            B("solido", (sx * C, 0, z), (0.05, 3.6, 0.05), cor=CH)
        B("solido", (0, C, z), (3.6, 0.05, 0.05), cor=CH)
    for sx in (-1, 1):  # o rodapé de chapa
        B("solido", (sx * (C - 0.015), 0, 0.15), (0.02, 3.5, 0.3), cor=CH2)
    B("solido", (0, C - 0.015, 0.15), (3.5, 0.02, 0.3), cor=CH2)
    Cil("solido", (-1.5, C - 0.12, 0.95), 0.022, 0.022, 3.0, 6, cor=AC, r=(0, math.pi / 2, 0))
    for x in (-1.3, 0, 1.3):
        B("solido", (x, C - 0.07, 0.95), (0.03, 0.12, 0.03), cor=AC2)
    # os trilhos da porta pantográfica (em cima e no chão)
    B("solido", (0, -C, A - 0.04), (3.6, 0.07, 0.08), cor=CH)
    B("solido", (0, -C, 0.012), (3.6, 0.07, 0.024), cor=AC2, sujo=0)
    # o painel de botões (no canto da frente, à direita, virado pra dentro)
    with em(T(C - 0.05, -1.3, 0)):
        B("solido", (0, 0, 1.3), (0.06, 0.32, 0.8), cor="#24202c")
        B("solido", (-0.034, 0, 1.3), (0.01, 0.28, 0.76), cor="#3c3546")
        for r in range(6):
            for c in range(2):
                vm = (r, c) == (0, 1)
                Cil("solido", (-0.04, -0.06 + c * 0.12, 1.02 + r * 0.075), 0.026, 0.026, 0.008, 8, cor=AC2, r=(0, -math.pi / 2, 0), sujo=0)
                Cil("luz", (-0.046, -0.06 + c * 0.12, 1.02 + r * 0.075), 0.018, 0.018, 0.01, 8,
                    cor=VM if vm else "#ffb050", r=(0, -math.pi / 2, 0), sujo=0)
        B("solido", (-0.04, 0, 1.6), (0.012, 0.22, 0.09), cor=PR)
        B("luz", (-0.047, 0, 1.6), (0.004, 0.17, 0.05), cor="#ff7a20")  # o visor do andar
        for k in range(4):  # o alto-falante
            B("solido", (-0.04, 0, 1.47 - k * 0.025), (0.008, 0.14, 0.008), cor=PR, sujo=0)
    # a lâmpada (luz) na gaiola
    B("luz", (0, 0, A - 0.025), (0.5, 0.5, 0.03), cor="#ffd9a0")
    for sx in (-1, 1):
        B("solido", (sx * 0.27, 0, A - 0.04), (0.04, 0.58, 0.06), cor=CH)
        B("solido", (0, sx * 0.27, A - 0.04), (0.58, 0.04, 0.06), cor=CH)
    for k in (-1, 0, 1):
        B("solido", (k * 0.15, 0, A - 0.075), (0.012, 0.56, 0.012), cor=GR, sujo=0)
    # a luz de emergência (o jogo pinta de vermelho)
    e = (C - 0.25, C - 0.25)
    Cil("solido", (e[0], e[1], A - 0.035), 0.1, 0.1, 0.035, 8, cor=CH)
    Cil("neon", (e[0], e[1], A - 0.13), 0.055, 0.075, 0.095, 8)
    for k in range(3):
        a = TAU * k / 3
        Viga("solido", (e[0] + 0.08 * math.cos(a), e[1] + 0.08 * math.sin(a), A - 0.035),
             (e[0] + 0.03 * math.cos(a), e[1] + 0.03 * math.sin(a), A - 0.15), 0.01, cor=GR, sujo=0)


# ── a porta de grade pantográfica (origem no canto direito; ela vai até x = -3,6) ──
def porta():
    A, L, n = 2.6, 3.6, 12
    p = L / n
    for i in range(n + 1):
        B("solido", (-i * p, 0, A / 2 + 0.01), (0.03, 0.018, A - 0.1), cor=GR, sujo=0)
    for i in range(n):
        x0, x1 = -i * p, -(i + 1) * p
        for z0, z1 in ((0.08, 0.9), (0.9, 1.72), (1.72, 2.52)):
            Viga("solido", (x0, 0.014, z0), (x1, 0.014, z1), 0.014, cor=GR, sujo=0)
            Viga("solido", (x1, -0.014, z0), (x0, -0.014, z1), 0.014, cor=GR, sujo=0)
    B("solido", (-L + 0.02, -0.04, 1.1), (0.035, 0.05, 0.3), cor=AC)


# ── a cibercama (origem no chão, no meio; a cabeça pra +Y, do lado do poço) ──
def cama():
    B("solido", (0, 0, 0.08), (0.78, 1.9, 0.16), cor=PR)
    B("solido", (0, 0, 0.33), (0.95, 2.1, 0.34), cor="#2b2438", d=(0.475, 0.7, 0.34))
    for sx in (-1, 1):
        B("solido", (sx * 0.45, 0, 0.53), (0.06, 2.1, 0.06), cor="#3a3350")
    for sy in (-1, 1):
        B("solido", (0, sy * 1.02, 0.53), (0.95, 0.06, 0.06), cor="#3a3350")
    B("solido", (0, -0.05, 0.535), (0.8, 1.85, 0.05), cor="#1a1624")  # o colchão
    B("solido", (0, 0.8, 0.58), (0.5, 0.3, 0.06), cor="#241e30")    # o apoio da cabeça
    for sx in (-1, 1):  # o filete (o jogo colore)
        B("neon", (sx * 0.485, 0, 0.42), (0.012, 2.0, 0.025))
    B("neon", (0, 1.06, 0.42), (0.86, 0.012, 0.025))
    # a unidade dos pés, com as tomadas dos cabos
    B("solido", (0, -1.16, 0.45), (0.86, 0.22, 0.66), cor=CH)
    for k in range(3):
        Cil("solido", (-0.22 + k * 0.22, -1.27, 0.55), 0.035, 0.035, 0.03, 6, cor=PR, r=(math.pi / 2, 0, 0))
    B("luz", (0.3, -1.275, 0.7), (0.08, 0.004, 0.025), cor="#3ad8ff")
    # a tampa da cápsula, aberta (dobradiça nos pés)
    M = T(0, -1.0, 0.55) @ R(rx=math.radians(38))
    Casca("solido", M, 0.46, 1.3, 8, 3, "#3a3448")
    Casca("neon", M @ T(0, 0, 0.001), 0.47, 1.3, 1, 1, None, esp=0.008,
          a0=math.pi / 2 - 0.04, a1=math.pi / 2 + 0.04)
    # o monitor no braço, na cabeceira, virado pro poço
    Cil("solido", (0.62, 0.85, 0), 0.06, 0.06, 0.04, 6, cor=CH)
    Cil("solido", (0.62, 0.85, 0.04), 0.022, 0.022, 1.12, 6, cor=AC2)
    Viga("solido", (0.62, 0.85, 1.14), (0.32, 0.95, 1.2), 0.03, cor=AC2)
    B("solido", (0.26, 0.97, 1.22), (0.44, 0.05, 0.3), cor="#1e1a26")
    Placa("luz", (0.06, 0.997, 1.09), (0, 0, 0.26), (0.4, 0, 0), 4, 6,
          cf=lambda c, n, i, j: "#59ecff" if (i == 2 and j % 3 != 2) or (j == 2 and i == 3) else "#13505f")
    # os cabos: dos pés pro chão e da cama pro pé do monitor
    for k, dx in enumerate((-0.22, 0.0, 0.22)):
        Tubo("solido", [(dx, -1.28, 0.55), (dx * 1.1, -1.42, 0.42), (dx * 1.3, -1.55, 0.12),
                        (dx * 1.6 - 0.05 * k, -1.8, 0.03), (dx * 2.2 - 0.1 * k, -2.3, 0.03)], 0.025, 5, cor=BO)
    Tubo("solido", [(0.48, 0.55, 0.4), (0.56, 0.62, 0.22), (0.6, 0.72, 0.05), (0.62, 0.85, 0.05)], 0.02, 5, cor=BO)


# ── a cápsula de incubação (origem no chão, no meio) ──
def capsula():
    add(bm_torno([(0, 0), (0.54, 0), (0.54, 0.16), (0.48, 0.24), (0.44, 0.26), (0, 0.26)], 12), "solido", "#2a2434")
    add(bm_torno([(0, 2.2), (0.46, 2.2), (0.5, 2.25), (0.5, 2.36), (0.36, 2.46), (0, 2.5)], 12), "solido", "#2a2434")
    # o vidro com o líquido (o jogo põe transparente): claro embaixo, escuro em cima
    bm = bm_torno([(0.42, 0.26), (0.42, 0.75), (0.42, 1.35), (0.42, 1.9), (0.42, 2.2)], 12)
    add(bm, "vidro", None, None,
        lambda c, n, i, j: ("#5dffa8", "#3dff9a", "#2bd47c", "#1d9c5c")[min(3, int((c.z - 0.26) / 0.49))], 0)
    for k in range(4):  # as costelas
        a = math.pi / 4 + k * math.pi / 2
        B("solido", (0.445 * math.cos(a), 0.445 * math.sin(a), 1.23), (0.05, 0.05, 1.95), cor="#4a4458", r=(0, 0, a), sujo=0)
    for z in (0.3, 2.16):
        Tor("solido", (0, 0, z), 0.44, 0.025, 12, 4, cor=CH)
        Cil("luz", (0, 0, z - 0.02 if z < 1 else z + 0.01), 0.425, 0.425, 0.025, 12, cor=VE, tampa=False, sujo=0)
    # a silhueta lá dentro (escura, sem detalhe)
    add(bm_torno([(0, 0.42), (0.12, 0.46), (0.16, 0.8), (0.18, 1.3), (0.2, 1.48), (0.12, 1.6), (0.06, 1.64), (0, 1.65)], 8),
        "solido", "#050407", T(0, 0, 0), None, 0)
    Esfera("solido", (0, 0, 1.79), 0.11, 8, 5, "#050407")
    # as luzinhas da base (do lado do poço, +Y)
    for k in (-1, 0, 1):
        B("luz", (k * 0.09, 0.545, 0.1), (0.04, 0.01, 0.025), cor=VE if k else "#ffb040", sujo=0)
    # os tubos: três saem da base pro chão, dois sobem por trás, um vai pro teto
    for k, a in enumerate((-2.2, -1.57, -0.9)):
        ca, sa = math.cos(a), math.sin(a)
        Tubo("solido", [(0.5 * ca, 0.5 * sa, 0.12), (0.68 * ca, 0.68 * sa, 0.1), (0.85 * ca, 0.85 * sa, 0.04),
                        (1.15 * ca, 1.15 * sa, 0.035)], 0.04, 6, cor=("#2c4a3a", BO, "#3c3446")[k])
    for sx in (-1, 1):
        Tubo("solido", [(sx * 0.2, -0.44, 0.22), (sx * 0.2, -0.52, 0.42), (sx * 0.2, -0.52, 2.0), (sx * 0.2, -0.44, 2.24)],
             0.03, 6, cor="#2c4a3a")
    Tubo("solido", [(0, 0, 2.48), (0, -0.08, 2.9), (0, -0.25, 3.4), (0, -0.4, 3.92)], 0.05, 6, cor=BO)


# ── a máquina "dormindo" (origem no chão, no meio; a frente pra +Y, o respiro) ──
def maquina():
    B("solido", (0, 0, 0.05), (1.1, 0.7, 0.1), cor=PR)
    B("solido", (0, 0, 1.25), (1.2, 0.8, 2.3), cor="#221c2c", d=(0.6, 0.4, 0.58))
    for sx in (-1, 1):
        B("solido", (sx * 0.295, 0.405, 1.22), (0.57, 0.02, 2.1), cor="#2e2738")
    # o respiro: o neon atrás das aletas (o jogo colore e faz respirar)
    B("neon", (-0.3, 0.418, 1.6), (0.36, 0.004, 1.2))
    for k in range(13):
        B("solido", (-0.3, 0.43, 1.0 + k * 0.1), (0.42, 0.025, 0.035), cor="#15111b", sujo=0)
    B("neon", (0.2, 0.42, 0.9), (0.4, 0.01, 0.05))
    for k, c in enumerate(("#ffb040", VE, VE, "#ffb040")):
        B("luz", (0.1 + k * 0.08, 0.418, 1.95), (0.03, 0.01, 0.03), cor=c, sujo=0)
    B("solido", (0.06, 0.425, 1.3), (0.03, 0.03, 0.22), cor=AC2)
    for sx in (-1, 1):  # as aletas dos lados
        for k in range(5):
            B("solido", (sx * 0.62, -0.3 + k * 0.15, 1.25), (0.05, 0.03, 1.8), cor="#2a2434")
    # o ventilador em cima e os cabos pro teto
    Cil("solido", (0, -0.05, 2.4), 0.27, 0.27, 0.07, 10, cor=CH)
    for a in (0, math.pi / 2):
        B("solido", (0, -0.05, 2.48), (0.5, 0.03, 0.02), cor=PR, r=(0, 0, a), sujo=0)
    for dx, dy in ((0.38, -0.22), (0.46, 0.1)):
        Tubo("solido", [(dx, dy, 2.38), (dx, dy - 0.05, 2.9), (dx + 0.05, dy - 0.2, 3.92)], 0.035, 5, cor=BO)
    Tubo("solido", [(-0.3, -0.4, 0.35), (-0.3, -0.55, 0.12), (-0.35, -0.8, 0.03), (-0.45, -1.3, 0.03)], 0.03, 5, cor=BO)


# ── o andar (origem no meio do poço, no nível do piso; o andar vai pra -Y) ──
def andar():
    Y0, Y1 = -2.3, -17.3
    B("solido", (0, -9.8, -0.15), (16, 15, 0.3), d=(2, 1.875, 0.3), cf=lambda c, n, i, j: CO2 if (i + j) % 2 else "#262030")
    painel = lambda c, n, i, j: escolhe([CO, CO2, CO3, "#2a222c", CO], i, j, int(c.x * 3 + c.y * 7))
    B("solido", (0, Y1 - 0.1, 1.95), (16, 0.2, 3.9), d=(2, 0.2, 1.3), cf=painel)
    for sx in (-1, 1):
        B("solido", (sx * 8.1, -9.8, 1.95), (0.2, 15, 3.9), d=(0.2, 1.875, 1.3), cf=painel)
        B("solido", (sx * 5.25, Y0 - 0.1, 1.95), (5.5, 0.2, 3.9), cor=CO2)
        B("solido", (sx * 2.4, Y0 - 0.15, 1.45), (0.2, 0.3, 2.9), cor=CH)  # o batente
    # a laje da frente, sobre o vão, com a faixa de perigo virada pro poço
    B("solido", (0, Y0 - 0.15, 3.55), (5.0, 0.3, 1.3), cor="#1a1522", d=(1.25, 0.3, 0.65))
    Placa("solido", (-2.5, Y0 + 0.002, 2.9), (0.12, 0, 0.16), (4.88, 0, 0), 1, 24,
          cf=lambda c, n, i, j: AM if j % 2 else PT, sujo=0)
    B("solido", (0, Y0 - 0.15, 0.01), (4.6, 0.3, 0.02), cor=AC2, sujo=0)  # a soleira
    Placa("solido", (-2.3, Y0 - 0.3, 0.021), (4.48, 0, 0), (0.12, 0.3, 0), 20, 1,
          cf=lambda c, n, i, j: AM if i % 2 else PT, sujo=0)
    B("luz", (2.3 - 0.45, Y0 + 0.02, 3.15), (0.32, 0.04, 0.14), cor="#ff9d3c")  # a placa do andar
    # os pilares, as vigas do teto e as calhas dos cabos
    for x, y in ((-4.1, -7.5), (4.1, -7.5), (-4.1, -13.5), (4.1, -13.5)):
        B("solido", (x, y, 1.95), (0.45, 0.45, 3.9), cor="#2a2432", d=(0.45, 0.45, 1.3))
        B("solido", (x, y, 0.15), (0.55, 0.55, 0.3), cor=CO3)
        B("solido", (x, y, 3.75), (0.55, 0.55, 0.3), cor=CO3)
        B("solido", (x, y + 0.235, 2.7), (0.18, 0.02, 0.14), cor=PR)
        B("luz", (x, y + 0.25, 2.7), (0.12, 0.02, 0.08), cor=VM)
        Placa("solido", (x - 0.226, y + 0.226, 0.32), (0, 0, 0.3), (0.452, 0, 0), 1, 4,
              cf=lambda c, n, i, j: AM if j % 2 else PT, sujo=0)
    for y in (-7.5, -13.5):
        B("solido", (0, y, 3.75), (16, 0.3, 0.3), cor=CO2)
    for sx in (-1, 1):
        B("solido", (sx * 4.1, -9.8, 3.75), (0.3, 15, 0.3), cor=CO2)
        B("solido", (sx * 2.0, -9.8, 3.52), (0.4, 15, 0.03), cor=CH)
        for s2 in (-1, 1):
            B("solido", (sx * 2.0 + s2 * 0.2, -9.8, 3.56), (0.02, 15, 0.08), cor=CH)
    # os canos do fundo e dos lados
    for z, r, c in ((3.1, 0.08, "#3c3446"), (3.35, 0.06, FE), (0.45, 0.12, "#2a4a3a")):
        Cil("solido", (-8.0, Y1 + 0.28, z), r, r, 16.0, 8, cor=c, r=(0, math.pi / 2, 0), tampa=False, sujo=0)
        for x in (-6, -2, 2, 6):
            Cil("solido", (x - 0.03, Y1 + 0.28, z), r + 0.03, r + 0.03, 0.06, 8, cor=CH, r=(0, math.pi / 2, 0), sujo=0)
    for x in (-5.0, 1.0, 6.5):
        Cil("solido", (x, Y1 + 0.28, 0.0), 0.06, 0.06, 3.1, 6, cor="#3c3446", tampa=False, sujo=0)
    Tor("solido", (1.0, Y1 + 0.42, 1.4), 0.16, 0.016, 10, 4, cor=FE, r=(math.pi / 2, 0, 0))
    Cil("solido", (1.0, Y1 + 0.28, 1.4), 0.03, 0.03, 0.14, 6, cor=CH, r=(-math.pi / 2, 0, 0))
    for sx in (-1, 1):
        Cil("solido", (sx * 7.85, Y1, 3.2), 0.07, 0.07, 15.0, 8, cor="#3c3446", r=(-math.pi / 2, 0, 0), tampa=False, sujo=0)
        for y in (-6, -11, -15):
            B("solido", (sx * 7.95, y, 1.5), (0.1, 0.35, 0.5), cor=CH)  # as caixas de força
            B("luz", (sx * 7.895, y + 0.1, 1.65), (0.01, 0.04, 0.04), cor=VM, sujo=0)
    for x in (-5.0, 0.0, 5.0):
        B("solido", (x, Y1 + 0.02, 2.9), (0.22, 0.04, 0.16), cor=PR)
        B("luz", (x, Y1 + 0.045, 2.9), (0.16, 0.02, 0.1), cor=VM)


# ── o poço: um trecho de um andar de altura (4,2 m), que repete ──
def poco():
    H = 4.2
    conc = lambda c, n, i, j: escolhe(["#2a2433", "#241f2d", "#2e2838", "#221c2a", "#2e2226"], i, j, int(c.x * 5 + c.y * 3))
    for sx in (-1, 1):
        B("solido", (sx * 2.4, 0.05, H / 2), (0.2, 4.7, H), d=(0.2, 1.175, 1.4), cf=conc, sujo=0)
    B("solido", (0, 2.4, H / 2), (4.6, 0.2, H), d=(1.15, 0.2, 1.4), cf=conc, sujo=0)
    for z in (0.7, 2.1, 3.5):  # as vigas (as mesmas 3 a cada 4,2 m de antes)
        for sx in (-1, 1):
            B("solido", (sx * 2.25, 0.05, z), (0.1, 4.6, 0.16), cor="#3b3346", sujo=0)
            B("solido", (sx * 2.205, 0.05, z - 0.075), (0.02, 4.6, 0.02), cor=CH2, sujo=0)
            B("solido", (sx * 2.18, 0, z), (0.06, 0.26, 0.12), cor=CH, sujo=0)  # o suporte do trilho
        B("solido", (0, 2.25, z), (4.4, 0.1, 0.16), cor="#3b3346", sujo=0)
        B("solido", (0, 2.205, z - 0.075), (4.4, 0.02, 0.02), cor=CH2, sujo=0)
    for sx in (-1, 1):  # os trilhos-guia (perfil T)
        B("solido", (sx * 2.1, 0, H / 2), (0.1, 0.03, H), cor=AC, sujo=0)
        B("solido", (sx * 2.16, 0, H / 2), (0.02, 0.16, H), cor=AC2, sujo=0)
        B("solido", (sx * 0.9, 2.17, H / 2), (0.06, 0.08, H), cor=AC2, sujo=0)  # o do contrapeso
    for k in range(4):  # os cabos
        Cil("solido", (-0.15 + k * 0.1, 2.05, 0), 0.012, 0.012, H, 5, cor=BO, tampa=False, sujo=0)
    Cil("solido", (-2.17, 2.17, 0), 0.04, 0.04, H, 6, cor=FE, tampa=False, sujo=0)  # o conduíte
    B("solido", (-2.15, 2.15, 1.3), (0.14, 0.12, 0.2), cor=CH, sujo=0)


for nome, f in (("cabine", cabine), ("porta", porta), ("cama", cama), ("capsula", capsula),
                ("maquina", maquina), ("andar", andar), ("poco", poco)):
    ATUAL[0] = nome
    f()


# o sólido é escuro e o glTF guarda a cor em 8 bits (linear): sai ×4 e o jogo
# multiplica por 1/4 na cor do material (senão os tons escuros viram degraus)
GANHO = 4.0

# ── vira objetos: um nó por peça, uma malha por grupo ──
GRUPOS = ("solido", "luz", "neon", "vidro")


def material(g):
    m = bpy.data.materials.new("terror_" + g)
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
                b.inputs["Alpha"].default_value = 0.42
        else:
            nt.links.new(a.outputs["Color"], b.inputs["Base Color"])
            b.inputs["Roughness"].default_value = 0.85
    return m


MATS = {g: material(g) for g in GRUPOS}
NOS = {}
# separados pra assar a AO (a porta fica fechada na frente da cabine)
LUGAR = {"cabine": (0, 0, 0), "porta": (1.8, -1.8, 0), "cama": (40, 0, 0), "capsula": (44, 0, 0),
         "maquina": (48, 0, 0), "andar": (80, 0, 0), "poco": (120, 0, 0)}
for peca in IDS:
    e = bpy.data.objects.new(peca, None)
    e.empty_display_size = 1.0
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

# ── a AO assada na cor dos vértices (Cycles), só no sólido; o vidro não tampa ──
solidos = [o for o in COL.objects if o.type == "MESH" and o["grupo"] == "solido"]
for o in COL.objects:
    if o.type == "MESH" and o["grupo"] == "vidro":
        o.hide_render = True
for o in solidos:
    ao = o.data.color_attributes.new("AO", "FLOAT_COLOR", "CORNER")
    o.data.color_attributes.active_color = ao
mc = bpy.data.meshes.new("chao_bake")
mc.from_pydata([(36, -4, 0), (52, -4, 0), (52, 4, 0), (36, 4, 0)], [], [(0, 1, 2, 3)])
chao = bpy.data.objects.new("chao_bake", mc)
sc.collection.objects.link(chao)
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
sc.world.light_settings.distance = 1.1
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
