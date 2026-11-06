# Os lugares da CIDADE ao longo das pistas (06/11): antes eram a mesma caixa
# com vitrine e letreiro (app/linha/estrada/Lugares.tsx, Fachada). Aqui, UM
# modelo por TIPO (cada um reaproveitado em vários lugares), na linguagem da
# cidade lá em cima — cyberpunk limpo: aço claro, painel escuro, vidro, neon do
# Núcleo (o contrário do subúrbio de sucata do lugares_chao.py):
#   palco     o palco suspenso na beira da pista: deck em balanço, treliça,
#             line arrays penduradas, subs, telão (os 4 palcos das faixas)
#   estacao   a plataforma da Linha 9: deck, cobertura em asa com colunas-árvore,
#             vidro, bancos, catracas, totem (a estação 6 do Xeriff)
#   terraco   torre de vidro com o terraço no alto: guarda-corpo de vidro,
#             pérgola, sofás, mastro (o terraço da Notti)
#   casa-drew loja de streetwear no térreo (vitrine, manequins, parede de tênis)
#             e o AP em cima com brise de aço e varanda (a casa do Drew)
#   balada    o monolito preto de lâminas, túnel de entrada de anéis de neon e o
#             equalizador na fachada (a balada SEXTA e a casa de shows ONTEM)
#   casa-ella a cápsula escondida atrás da tela de ripas e das plantas
#
#   blender -b --factory-startup --python blender/scripts/lugares_cidade.py \
#     [--python blender/scripts/lugares_cidade_foto.py] -- bruto.glb [foto.png]
#   npx @gltf-transform/cli optimize bruto.glb public/models/lugares-cidade.glb \
#     --compress meshopt --simplify false --join false --flatten false --instance false --palette false
#
# Coordenadas: Blender Z pra cima, a FRENTE (o lado da pista) olha pra -Y (no
# glTF: Y pra cima, frente +Z). Cada tipo = um nó (o nome do tipo) com a origem
# NO MEIO DA PLANTA, NA ALTURA DA PISTA: a planta é a da caixa de antes, 16 m ao
# longo da pista (x) × 10 m de fundo (y de -5 a 5). Malhas penduradas:
#   <tipo>_solido  estrutura, painéis, móveis (cor no vértice × AO assada)
#   <tipo>_luz     o que brilha com cor fixa (LED, telão, janela, tênis)
#   <tipo>_neon    o neon, sem cor (o jogo pinta com a cor da faixa do lugar)
#   <tipo>_vidro   vidro (a cor no vértice é o tom; o jogo mistura a cor do lugar)
#   <tipo>_pe      o pé: de z = 0 a z = -1 (o jogo estica até a água/chão)
#   <tipo>_pen     o neon do pé (esticado junto)
# O letreiro (texto) continua o do jogo: cada nó guarda "let" = (x, z altura,
# frente em m na direção da pista, largura) — e o script imprime.
# Orçamento: o arquivo inteiro até 30 mil triângulos, sem decimate.

import bpy, bmesh, math, sys
from mathutils import Vector, Matrix, Color

TAU = 2 * math.pi
args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
SAIDA = args[0] if args else "/tmp/lugares-cidade-bruto.glb"
IDS = ["palco", "estacao", "terraco", "casa-drew", "balada", "casa-ella"]

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


# ════════════════════════ A CIDADE: paleta e peças ════════════════════════
MET, MET2, PRETO = "#2b303e", "#1c1f29", "#0f1016"   # painel escuro
ACO, ACO2 = "#9aa3b6", "#646c80"                      # aço claro, aço escuro
BR = "#c8d0de"                                        # painel branco frio
LED, QUENTE = "#dfe9ff", "#ffcf8a"
VID = "#34465f"                                       # o tom do vidro
VERDE, VERDE2 = "#2f6b4a", "#3f8a5a"
UP = Vector((0, 0, 1))


def xadrez(a, b):
    return lambda c, n, i, j: lin(a) if (i + j) % 2 else lin(b)


def trelica(a, b, w=0.42, passo=1.2, cor=ACO, ch=0.06, lc=0.032):
    """Treliça quadrada de palco: 4 banzos e as diagonais em zigue-zague nas 4 faces."""
    a, b = Vector(a), Vector(b)
    t = (b - a).normalized()
    L = (b - a).length
    ref = UP if abs(t.dot(UP)) < 0.9 else Vector((1, 0, 0))
    u = t.cross(ref).normalized()
    v = t.cross(u).normalized()
    cs = [(u * s1 + v * s2) * (w / 2) for s1, s2 in ((1, 1), (-1, 1), (-1, -1), (1, -1))]
    for c in cs:
        Viga("solido", a + c, b + c, ch, cor, 0)
    n = max(1, round(L / passo))
    for k in range(n):
        p0, p1 = a + t * (L * k / n), a + t * (L * (k + 1) / n)
        for f in range(4):
            c0, c1 = cs[f], cs[(f + 1) % 4]
            if (k + f) % 2:
                Viga("solido", p0 + c0, p1 + c1, lc, cor, 0)
            else:
                Viga("solido", p0 + c1, p1 + c0, lc, cor, 0)


def placa_let(x, z, y, larg, fundo=True):
    """Onde vai o letreiro do jogo (o texto do atlas): a placa escura e o neon em cima e embaixo."""
    h = larg * 0.2
    if fundo:
        B("solido", (x, y + 0.06, z), (larg + 0.4, 0.1, h + 0.3), PRETO, sujo=0)
        for zz in (z - h / 2 - 0.17, z + h / 2 + 0.17):
            B("neon", (x, y, zz), (larg + 0.5, 0.05, 0.05))
    LET[ATUAL[0]] = (round(x, 3), round(z, 3), round(-y + 0.03, 3), larg)


def deck(cor=MET, cor2="#252a36", esp=0.6, neon=True):
    """A laje na altura da pista, a planta inteira (16 × 10), com a borda em neon."""
    B("solido", (0, 0, -esp / 2), (16, 10, esp), cor, d=(2, 2, esp), cf=xadrez(cor2, cor), sujo=0)
    if neon:
        B("neon", (0, -5.03, -0.06), (16.06, 0.06, 0.07))
        B("neon", (0, -5.03, -esp + 0.05), (16.06, 0.06, 0.04))
        for s in (-1, 1):
            B("neon", (s * 8.03, 0, -0.06), (0.06, 10.06, 0.07))


def pe(w, d, y0=0.5):
    """O pé (de z = 0 a -1; o jogo estica até a água): o núcleo e o neon nas quinas da frente."""
    B("pe", (0, y0, -0.5), (w, d, 1), MET2, sujo=0)
    for s in (-1, 1):
        B("pen", (s * (w / 2 + 0.02), y0 - d / 2 - 0.02, -0.5), (0.06, 0.06, 1))
    B("pen", (0, y0 - d / 2 - 0.02, -0.5), (0.1, 0.06, 1))


def planta(p, r=0.5, seed=0):
    for k in range(3):
        a = TAU * hh(seed, k)
        Esfera("solido", (p[0] + 0.25 * r * math.cos(a), p[1] + 0.25 * r * math.sin(a), p[2] + r * (0.5 + 0.4 * k)),
               r * (0.75 - 0.15 * k), 6, 4, VERDE if k % 2 else VERDE2)


# ════════════════════════ PALCO ════════════════════════
def palco():
    deck(esp=0.7)
    # o praticável e a escadinha, a frente em neon
    B("solido", (0, 1.2, 0.3), (12, 5.6, 0.6), PRETO, d=(2, 2, 0.6), sujo=0)
    B("neon", (0, -1.62, 0.3), (12, 0.04, 0.05))
    B("solido", (0, -1.8, 0.15), (2.4, 0.4, 0.3), MET2, sujo=0)
    # o telão no fundo: moldura e a tela (sol de listras sobre o horizonte em grade)
    B("solido", (0, 4.2, 4.6), (11, 0.6, 6.4), MET2, sujo=0)

    def tela(c, n, i, j):
        x, z = (i + 0.5) / 20 * 2 - 1, (j + 0.5) / 10
        if z < 0.32:  # o chão em grade
            lado = (i % 4 == 0) or (j % 2 == 0)
            return dim("#ff3fb0", 0.55) if lado else lin("#140a2e")
        rr = math.hypot(x * 1.8, (z - 0.55) * 2.2)
        if rr < 0.62 and not (z < 0.55 and j % 2 == 0):
            return lin("#ffd0a0") if z > 0.7 else lin("#ff7ab8")
        return dim("#3a1e7a", 0.35 + 0.65 * z)
    Placa("luz", (-5, 3.88, 1.9), (10, 0, 0), (0, 0, 5.6), 20, 10, cf=tela, sujo=0)
    for zz in (1.86, 7.54):
        B("neon", (0, 3.86, zz), (10.12, 0.04, 0.05))
    for xx in (-5.03, 5.03):
        B("neon", (xx, 3.86, 4.7), (0.05, 0.04, 5.7))
    # a treliça: 4 torres e o quadro em cima
    Z = 9.4
    cantos = [(-7.5, -4.2), (7.5, -4.2), (7.5, 4.3), (-7.5, 4.3)]
    for x, y in cantos:
        B("solido", (x, y, 0.05), (0.9, 0.9, 0.1), ACO2, sujo=0)
        trelica((x, y, 0.1), (x, y, Z + 0.21), passo=1.2)
    trelica((-7.29, -4.2, Z), (7.29, -4.2, Z), passo=1.25)
    trelica((-7.29, 4.3, Z), (7.29, 4.3, Z), passo=1.25)
    for x in (-7.5, 7.5):
        trelica((x, -3.99, Z), (x, 4.09, Z), passo=1.4)
    # neon: embaixo da treliça da frente e subindo nas torres da frente
    B("neon", (0, -4.46, Z - 0.23), (14.6, 0.04, 0.04))
    for x in (-7.5, 7.5):
        B("neon", (x, -4.45, Z / 2), (0.04, 0.04, Z))
    # as line arrays penduradas (6 caixas em J) e as correntes
    for s in (-1, 1):
        x = s * 5.4
        Viga("solido", (x - 0.4, -4.2, Z - 0.2), (x - 0.4, -4.3, Z - 0.75), 0.02, ACO, 0)
        Viga("solido", (x + 0.4, -4.2, Z - 0.2), (x + 0.4, -4.3, Z - 0.75), 0.02, ACO, 0)
        B("solido", (x, -4.3, Z - 0.8), (1.25, 0.8, 0.08), ACO2, sujo=0)
        yy, zz = -4.3, Z - 1.08
        for k in range(6):
            rx = 0.05 + k * 0.07
            with em(T(x, yy, zz) @ R(rx=rx)):
                B("solido", (0, 0, 0), (1.15, 0.72, 0.42), PRETO, sujo=0)
                B("solido", (0, -0.365, 0), (1.05, 0.02, 0.32), "#2c3040", sujo=0)
                B("luz", (0.5, -0.38, -0.15), (0.04, 0.01, 0.04), LED)
            zz -= 0.43 * math.cos(rx)
            yy -= 0.43 * math.sin(rx)
    # os subs empilhados e os retornos na boca do palco
    for s in (-1, 1):
        for k in range(2):
            p = (s * 6.3, -3.3, 0.45 + k * 0.92)
            B("solido", p, (1.3, 1.0, 0.9), PRETO, sujo=0)
            Cil("solido", (p[0], -3.81, p[2]), 0.34, 0.3, 0.04, 12, "#23262f", r=(math.pi / 2, 0, 0), sujo=0)
            Cil("solido", (p[0], -3.85, p[2]), 0.1, 0.08, 0.03, 8, ACO2, r=(math.pi / 2, 0, 0), sujo=0)
        B("solido", (s * 2.6, -4.3, 0.22), (1.0, 0.7, 0.44), PRETO, r=(-0.45, 0, 0), sujo=0)
    # a mesa do DJ em cima do praticável
    B("solido", (0, 0.4, 1.1), (2.8, 0.9, 1.0), MET2, sujo=0)
    B("neon", (0, -0.07, 1.35), (2.8, 0.03, 0.05))
    B("luz", (0, 0.4, 1.61), (2.2, 0.6, 0.02), "#4a6ab0")
    # os refletores na treliça da frente, apontando pra pista
    for k in range(8):
        x = -6.1 + k * 1.75
        if abs(abs(x) - 5.4) < 0.8:
            continue
        p = Vector((x, -4.2, Z - 0.3))
        rx = 2.45
        Cil("solido", tuple(p), 0.13, 0.15, 0.32, 8, PRETO, r=(rx, 0, 0), sujo=0)
        d = Vector((0, -math.sin(rx), math.cos(rx)))
        Cil("luz", tuple(p + d * 0.32), 0.12, 0.12, 0.02, 8, LED, r=(rx, 0, 0))
    # a placa do letreiro em cima da treliça da frente
    for s in (-1, 1):
        Viga("solido", (s * 3, -4.2, Z + 0.21), (s * 3, -4.2, 9.8), 0.06, ACO2, 0)
    placa_let(0, 10.55, -4.3, 7.0)
    # embaixo do deck: as vigas e as escoras até o núcleo do pé
    for y in (-3.5, 3.5):
        B("solido", (0, y, -0.85), (15.6, 0.3, 0.3), ACO2, sujo=0)
    for sx in (-1, 1):
        for sy, y0 in ((-1, -1.5), (1, 2.5)):
            Viga("solido", (sx * 7.4, sy * 4.4, -0.9), (sx * 2.5, y0, -3.6), 0.22, ACO2, 0)
    pe(5, 4)


# ════════════════════════ ESTAÇÃO ════════════════════════
def estacao():
    deck(esp=0.8, cor2="#2f3442")
    B("luz", (0, -4.6, 0.012), (16, 0.42, 0.02), "#6a5420")  # a faixa amarela da beira
    # colunas-árvore e a cobertura em asa
    for x in (-5.2, 0, 5.2):
        Cil("solido", (x, 1.2, 0), 0.2, 0.15, 3.0, 10, ACO, sujo=0.1)
        for dx, dy in ((-1.9, -2.9), (1.9, -2.9), (-1.9, 2.4), (1.9, 2.4)):
            Viga("solido", (x, 1.2, 2.95), (x + dx, 1.2 + dy, 4.47), 0.1, ACO, 0)
    B("solido", (0, 0.2, 4.6), (16.6, 9.4, 0.28), BR, d=(2, 2, 0.28), sujo=0)
    B("solido", (0, -4.55, 4.75), (16.6, 0.25, 1.25), MET2, sujo=0)
    B("neon", (0, -4.69, 4.1), (16.6, 0.05, 0.05))
    B("neon", (0, -4.69, 5.4), (16.6, 0.05, 0.05))
    for s in (-1, 1):
        B("neon", (s * 8.31, 0.2, 4.6), (0.05, 9.4, 0.05))
    for y in (-2.6, 0.4, 3.4):
        B("luz", (0, y, 4.445), (15, 0.16, 0.03), LED)
    placa_let(0, 4.75, -4.68, 7.0, fundo=False)
    # o fundo: a parede de vidro com montantes, e atrás os painéis de anúncio
    Placa("vidro", (-7.8, 4.7, 0), (15.6, 0, 0), (0, 0, 4.45), 8, 2, VID, sujo=0)
    for k in range(9):
        B("solido", (-7.8 + k * 1.95, 4.72, 2.22), (0.08, 0.1, 4.45), ACO2, sujo=0)
    B("solido", (0, 4.72, 1.1), (15.6, 0.1, 0.06), ACO2, sujo=0)
    B("solido", (0, 4.97, 2.2), (16, 0.06, 4.4), "#151821", sujo=0)
    for x, cor in ((-4.9, "#24407a"), (-1.0, "#5a2470"), (4.9, "#1e5a6a")):
        B("solido", (x, 4.9, 2.4), (2.4, 0.08, 3.4), MET, sujo=0)
        B("luz", (x, 4.85, 2.4), (2.2, 0.02, 3.2), cor)
    # para-ventos de vidro nos lados
    Placa("vidro", (-7.9, 4.6, 0), (0, -5.6, 0), (0, 0, 2.6), 3, 1, VID, sujo=0)
    Placa("vidro", (7.9, -1, 0), (0, 5.6, 0), (0, 0, 2.6), 3, 1, VID, sujo=0)
    for s in (-1, 1):
        B("solido", (s * 7.9, 1.8, 2.62), (0.08, 5.6, 0.06), ACO, sujo=0)
        B("solido", (s * 7.9, -1.0, 1.3), (0.08, 0.08, 2.6), ACO, sujo=0)
    # bancos
    for x in (-2.6, 2.6):
        B("solido", (x, 2.8, 0.46), (2.2, 0.45, 0.07), BR, sujo=0)
        B("solido", (x, 3.03, 0.82), (2.2, 0.06, 0.6), ACO2, sujo=0)
        for s in (-1, 1):
            B("solido", (x + s * 0.9, 2.85, 0.22), (0.08, 0.4, 0.44), ACO, sujo=0)
    # as catracas (saída pelo fundo)
    for k in range(4):
        x = 3.9 + k * 1.0
        B("solido", (x, 3.9, 0.5), (0.22, 1.1, 1.0), MET2, sujo=0)
        B("neon", (x, 3.9, 1.015), (0.23, 1.1, 0.03))
        B("luz", (x, 3.34, 0.8), (0.12, 0.02, 0.12), "#5dffa0")
    # o totem da linha
    B("solido", (-7.0, -3.9, 2.0), (0.7, 0.5, 4.0), MET2, sujo=0)
    B("luz", (-7.0, -4.16, 2.7), (0.55, 0.02, 1.6), "#d8e2f5")
    Tor("neon", (-7.0, -4.18, 3.75), 0.24, 0.03, 16, 4, r=(math.pi / 2, 0, 0))
    B("neon", (-6.63, -4.16, 2.0), (0.04, 0.04, 4.0))
    # os painéis de horário pendurados
    for x in (-2.6, 2.6):
        B("solido", (x, -2.0, 3.6), (1.95, 0.12, 0.72), MET2, sujo=0)
        B("luz", (x, -2.07, 3.6), (1.8, 0.02, 0.58), "#3a8fd0")
        for s in (-1, 1):
            Viga("solido", (x + s * 0.8, -2.0, 3.96), (x + s * 0.8, -2.0, 4.46), 0.03, ACO, 0)
    pe(12, 6)


# ════════════════════════ TERRAÇO ════════════════════════
def terraco():
    H = 9.6
    deck(esp=0.5, neon=False)
    # o corpo: o fundo, o miolo (elevador), as lajes com a luz na beira
    B("solido", (0, 4.65, H / 2), (14, 0.3, H), "#151821", d=(2, 0.3, 2), sujo=0)
    B("solido", (0, 2.6, H / 2), (3.6, 2.8, H), MET, d=(1.8, 1.4, 2), sujo=0)
    for z in (3.2, 6.4):
        B("solido", (0, 0.6, z), (14, 8.4, 0.3), MET2, d=(2, 2, 0.3), sujo=0)
        B("solido", (0, -3.62, z), (14.1, 0.06, 0.32), ACO, sujo=0)
        B("luz", (0, -3.2, z - 0.17), (13.4, 0.12, 0.03), LED)
    # janelas de dentro (umas acesas) no fundo de cada andar
    for f in range(3):
        for k in range(5):
            if hh(f, k, 3) < 0.45:
                continue
            x = -5.6 + k * 2.8
            if abs(x) < 2.2:
                continue
            B("luz", (x, 4.48, 0.4 + f * 3.2 + 1.3), (1.8, 0.02, 1.6), QUENTE if hh(f, k) > 0.4 else "#7a6aa8")
    # o vidro da frente e dos lados, os montantes
    Placa("vidro", (-7, -3.6, 0.0), (14, 0, 0), (0, 0, H), 7, 3, VID, sujo=0)
    Placa("vidro", (-7, 4.8, 0.0), (0, -8.4, 0), (0, 0, H), 4, 3, VID, sujo=0)
    Placa("vidro", (7, -3.6, 0.0), (0, 8.4, 0), (0, 0, H), 4, 3, VID, sujo=0)
    for k in range(8):
        B("solido", (-7 + k * 2, -3.64, H / 2), (0.1, 0.12, H), ACO, sujo=0)
    for s in (-1, 1):
        for k in range(1, 4):
            B("solido", (s * 7.04, -3.6 + k * 2.1, H / 2), (0.1, 0.1, H), ACO, sujo=0)
    # a entrada: marquise, o saguão aceso atrás do vidro
    B("solido", (-3.5, -4.4, 3.0), (5, 1.6, 0.18), ACO2, sujo=0)
    B("neon", (-3.5, -5.21, 2.93), (5, 0.04, 0.04))
    B("luz", (-3.5, -3.2, 1.5), (3.8, 0.03, 2.8), "#6a5236")
    # o letreiro pendurado no terceiro andar
    placa_let(0, 7.9, -3.76, 9.0)
    # a laje do terraço (em balanço até a planta toda), a borda em neon
    B("solido", (0, 0, H + 0.15), (16, 10, 0.3), BR, d=(2, 2, 0.3), cf=xadrez("#b8c0ce", BR), sujo=0)
    B("neon", (0, -5.03, H + 0.15), (16.06, 0.05, 0.06))
    for s in (-1, 1):
        B("neon", (s * 8.03, 0, H + 0.15), (0.05, 10.06, 0.06))
    # guarda-corpo de vidro e o corrimão
    Placa("vidro", (-7.9, -4.9, H + 0.3), (15.8, 0, 0), (0, 0, 1.1), 8, 1, VID, sujo=0)
    Placa("vidro", (-7.9, 4.9, H + 0.3), (0, -9.8, 0), (0, 0, 1.1), 5, 1, VID, sujo=0)
    Placa("vidro", (7.9, -4.9, H + 0.3), (0, 9.8, 0), (0, 0, 1.1), 5, 1, VID, sujo=0)
    B("solido", (0, -4.9, H + 1.42), (15.86, 0.08, 0.06), ACO, sujo=0)
    for s in (-1, 1):
        B("solido", (s * 7.9, 0, H + 1.42), (0.08, 9.86, 0.06), ACO, sujo=0)
    # a pérgola com o neon na viga da frente
    for x in (-5.5, 5.5):
        for y in (0.5, 4.4):
            B("solido", (x, y, H + 0.3 + 1.15), (0.14, 0.14, 2.3), ACO, sujo=0)
    for y in (0.5, 4.4):
        B("solido", (0, y, H + 2.6), (11.4, 0.14, 0.2), ACO, sujo=0)
    for k in range(9):
        B("solido", (-4.8 + k * 1.2, 2.45, H + 2.76), (0.08, 4.4, 0.12), ACO2, sujo=0)
    B("neon", (0, 0.42, H + 2.49), (11.2, 0.03, 0.03))
    # os sofás, a mesa de fogo e as plantas
    for x in (-3.0, 3.0):
        B("solido", (x, 2.9, H + 0.55), (4, 0.95, 0.5), "#2a2840", sujo=0)
        B("solido", (x, 3.32, H + 0.98), (4, 0.2, 0.6), "#2a2840", sujo=0)
        for k in range(3):
            B("solido", (x - 1.3 + k * 1.3, 2.85, H + 0.86), (1.15, 0.8, 0.14), "#4a4468", sujo=0)
    B("solido", (0, 1.4, H + 0.55), (2.4, 0.8, 0.5), PRETO, sujo=0)
    B("luz", (0, 1.4, H + 0.81), (2.0, 0.16, 0.03), "#ff9a40")
    for s in (-1, 1):
        B("solido", (s * 6.8, -4.1, H + 0.6), (1.4, 0.8, 0.6), MET2, sujo=0)
        planta((s * 6.8, -4.1, H + 0.9), 0.5, s + 3)
    # o mastro com a luz vermelha
    Cil("solido", (6.6, 4.3, H + 0.3), 0.08, 0.05, 4.0, 8, ACO, sujo=0)
    for zz in (H + 1.6, H + 2.9):
        B("solido", (6.6, 4.3, zz), (0.6, 0.04, 0.04), ACO, sujo=0)
    Esfera("luz", (6.6, 4.3, H + 4.35), 0.12, 8, 5, "#ff2436")
    pe(14, 8.4, 0.6)


# ════════════════════════ CASA DO DREW ════════════════════════
MODA = ["#14151f", "#e8e4dc", "#ff3fb0", "#3a4a6a", "#b9b2a6", "#7fe8ff"]


def casa_drew():
    deck(esp=0.5, cor=MET2, cor2="#232733", neon=False)
    # a loja (térreo): fundo, lados, teto, luz do teto
    B("solido", (0, 4.6, 2.2), (15, 0.3, 4.4), MET2, d=(2, 0.3, 2), sujo=0)
    for s in (-1, 1):
        B("solido", (s * 7.35, 0.6, 2.2), (0.3, 8.4, 4.4), MET, d=(0.3, 2, 2), sujo=0)
    B("solido", (0, 0.6, 4.55), (15, 8.4, 0.3), MET2, d=(2, 2, 0.3), sujo=0)
    for x in (-5, -2, 1, 4):
        B("luz", (x, 0.6, 4.385), (0.12, 7, 0.03), LED)
    # a parede de tênis (caixas acesas) com as prateleiras
    def tenis(c, n, i, j):
        return dim(escolhe(["#ff3fb0", "#7fe8ff", "#ffffff", "#ffc857", "#b38cff", "#5dffa0"], i, j, 7), 0.45 + 0.3 * hh(i, j))
    Placa("luz", (-6.5, 4.44, 0.6), (9, 0, 0), (0, 0, 3.2), 8, 5, cf=tenis, sujo=0)
    for j in range(6):
        B("solido", (-2, 4.36, 0.6 + j * 0.64), (9.1, 0.16, 0.04), ACO, sujo=0)
    # a vitrine e a porta de vidro, os montantes e o arco em neon
    Placa("vidro", (-7.2, -3.6, 0.05), (10.4, 0, 0), (0, 0, 4.1), 4, 1, VID, sujo=0)
    for x in (-7.2, -4.6, -2.0, 0.6, 3.2):
        B("solido", (x, -3.62, 2.1), (0.1, 0.1, 4.1), ACO, sujo=0)
    B("solido", (5.25, -3.62, 3.55), (4.1, 0.2, 1.4), MET, sujo=0)
    for x in (3.65, 6.8):
        B("solido", (x, -3.62, 1.45), (0.8 if x < 5 else 0.9, 0.2, 2.9), MET, sujo=0)
    Placa("vidro", (4.05, -3.6, 0.05), (2.35, 0, 0), (0, 0, 2.8), 1, 1, VID, sujo=0)
    for x in (5.05, 5.45):
        B("neon", (x, -3.68, 1.25), (0.04, 0.04, 1.0))
    B("neon", (-2.0, -3.7, 4.22), (10.5, 0.05, 0.05))
    for x in (-7.25, 3.25):
        B("neon", (x, -3.7, 2.12), (0.05, 0.05, 4.2))
    # dentro: manequins, a arara, o balcão
    for x, roupa in ((-5.2, "#ff3fb0"), (-1.2, "#e8e4dc")):
        B("solido", (x, -2.8, 0.05), (0.6, 0.6, 0.1), ACO2, sujo=0)
        for s in (-1, 1):
            Cil("solido", (x + s * 0.1, -2.8, 0.1), 0.07, 0.06, 0.85, 6, "#20222c", sujo=0)
        Cil("solido", (x, -2.8, 0.95), 0.2, 0.24, 0.62, 8, roupa, sujo=0)
        Cil("solido", (x, -2.8, 1.57), 0.24, 0.12, 0.14, 8, roupa, sujo=0)
        Esfera("solido", (x, -2.8, 1.86), 0.13, 8, 5, BR)
    Tubo("solido", [(-6.4, 0.8, 0.0), (-6.4, 0.8, 1.7), (-2.4, 0.8, 1.7), (-2.4, 0.8, 0.0)], 0.025, 5, ACO, 0)
    for k in range(7):
        B("solido", (-6.0 + k * 0.55, 0.8, 1.25), (0.08, 0.5, 0.8), escolhe(MODA, k, 2), r=(0, 0, 0.1 * (k % 3 - 1)), sujo=0)
    B("solido", (3.0, 2.4, 0.5), (2.6, 0.8, 1.0), BR, sujo=0)
    B("luz", (3.0, 1.99, 0.85), (2.5, 0.02, 0.06), "#ff7ab8")
    # a faixa entre os andares com o letreiro (AP 222) em cima da vitrine
    B("solido", (0, -3.75, 5.0), (15.6, 0.3, 1.2), PRETO, sujo=0)
    B("neon", (0, -3.92, 4.38), (15.6, 0.04, 0.04))
    B("neon", (0, -3.92, 5.62), (15.6, 0.04, 0.04))
    placa_let(-2.0, 5.0, -3.9, 5.5, fundo=False)
    # o AP: o volume de cima, as janelas acesas atrás do vidro, o brise de aço
    B("solido", (-2.25, 0.7, 7.9), (10.5, 7.8, 4.6), MET, d=(2, 2, 2), sujo=0)
    for x, cor in ((-5.8, QUENTE), (-3.2, "#a24a8a"), (0.6, QUENTE)):
        B("luz", (x, -3.21, 7.6), (1.9, 0.02, 2.6), dim(cor, 0.75))
    Placa("vidro", (-7.3, -3.3, 5.9), (10.1, 0, 0), (0, 0, 3.9), 5, 1, VID, sujo=0)
    for k in range(21):
        B("solido", (-7.3 + k * 0.505, -3.75, 7.95), (0.05, 0.5, 4.3), ACO, r=(0, 0, 0.55), sujo=0)
    for zz in (5.75, 10.15):
        B("solido", (-2.25, -3.75, zz), (10.6, 0.6, 0.1), ACO2, sujo=0)
    B("neon", (-2.25, -3.3, 10.22), (10.5, 0.05, 0.05))
    for x in (-7.5, 3.0):
        B("neon", (x, -3.3, 7.95), (0.05, 0.05, 4.5))
    # a varanda da direita: vidro, corrimão, a palmeira, a espreguiçadeira
    Placa("vidro", (3.1, -3.9, 5.6), (4.5, 0, 0), (0, 0, 1.05), 2, 1, VID, sujo=0)
    Placa("vidro", (7.6, -3.9, 5.6), (0, 8.4, 0), (0, 0, 1.05), 3, 1, VID, sujo=0)
    B("solido", (5.35, -3.9, 6.7), (4.5, 0.06, 0.06), ACO, sujo=0)
    B("solido", (5.4, 0.0, 5.62), (4.4, 7.8, 0.06), "#3a3f4e", sujo=0)
    B("solido", (6.6, 1.5, 5.95), (0.9, 0.9, 0.7), MET2, sujo=0)
    Cil("solido", (6.6, 1.5, 6.3), 0.08, 0.05, 2.0, 6, "#5a4a3a", sujo=0)
    for k in range(6):
        a = TAU * k / 6
        B("solido", (6.6 + 0.55 * math.cos(a), 1.5 + 0.55 * math.sin(a), 8.25), (1.2, 0.3, 0.03), VERDE2, r=(0, 0.35, a), sujo=0)
    B("solido", (4.6, -1.2, 5.85), (0.7, 1.9, 0.2), BR, r=(0.12, 0, 0), sujo=0)
    # o teto: as condensadoras
    for x in (-5.0, -1.5):
        B("solido", (x, 2.2, 10.6), (1.3, 0.9, 0.8), ACO2, sujo=0)
        Cil("solido", (x, 2.2, 11.0), 0.38, 0.38, 0.02, 10, "#20222c", sujo=0)
    pe(15, 8.4, 0.6)


# ════════════════════════ BALADA ════════════════════════
def balada():
    deck(esp=0.5, cor=MET2, cor2="#1a1d26")
    B("solido", (0, 1.0, 5.5), (15.6, 8, 11), PRETO, d=(2, 2, 2), sujo=0)
    for s in (-1, 1):
        B("neon", (s * 7.82, -3.02, 5.5), (0.05, 0.05, 11))
    B("neon", (0, -3.02, 11.0), (15.66, 0.05, 0.05))
    # em cima: as lâminas viradas, cada uma com a quina em neon
    for k in range(12):
        x = -6.9 + k * 1.255
        with em(T(x, -3.45, 8.55) @ R(rz=0.6)):
            B("solido", (0, 0, 0), (1.3, 0.1, 4.6), MET2, sujo=0)
            B("neon", (0.66, 0, 0), (0.04, 0.12, 4.6))
    B("solido", (0, -3.3, 6.15), (15.6, 0.6, 0.2), ACO2, sujo=0)
    # o túnel da entrada: paredes, teto, anéis de neon e a porta lá no fundo
    cx = -2.0
    for s in (-1, 1):
        B("solido", (cx + s * 1.95, -4.0, 2.15), (0.2, 2.0, 4.3), MET2, sujo=0)
    B("solido", (cx, -4.0, 4.2), (4.1, 2.0, 0.2), MET2, sujo=0)
    for k in range(6):
        y = -4.95 + k * 0.38
        w, h = 3.6 - 0.12 * k, 4.0 - 0.12 * k
        B("neon", (cx, y, h), (w, 0.06, 0.06))
        for s in (-1, 1):
            B("neon", (cx + s * w / 2, y, h / 2), (0.06, 0.06, h))
    B("luz", (cx, -3.0, 1.6), (2.2, 0.04, 3.0), "#40142e")
    B("luz", (cx, -4.0, 0.012), (0.12, 2.0, 0.02), LED)
    placa_let(cx, 5.0, -5.0, 6.0)
    # o equalizador na fachada (as barras em neon) com a moldura
    alt = [4, 7, 10, 12, 9, 6, 8, 11, 7, 5]
    Placa("neon", (1.2, -3.04, 0.6), (6.2, 0, 0), (0, 0, 5.0), 20, 12,
          filtro=lambda i, j: i % 2 == 0 and j < alt[i // 2], sujo=0)
    for zz in (0.5, 5.7):
        B("solido", (4.3, -3.06, zz), (6.5, 0.08, 0.08), ACO2, sujo=0)
    for xx in (1.05, 7.55):
        B("solido", (xx, -3.06, 3.1), (0.08, 0.08, 5.28), ACO2, sujo=0)
    # a fila: pedestais e a corda
    pts = []
    for k in range(4):
        x = 0.6 + k * 1.4
        Cil("solido", (x, -4.3, 0), 0.05, 0.04, 1.0, 6, ACO, sujo=0)
        Cil("solido", (x, -4.3, 0), 0.18, 0.16, 0.04, 8, ACO, sujo=0)
        pts.append((x, -4.3, 0.95))
    for a, b in zip(pts, pts[1:]):
        Tubo("solido", [(a[0] + (b[0] - a[0]) * t, -4.3, 0.95 - 0.25 * 4 * t * (1 - t)) for t in (0, 0.25, 0.5, 0.75, 1)], 0.03, 4, "#7a1240", 0)
    # os exaustores e a antena no teto
    for x in (-5.0, 4.5):
        B("solido", (x, 2.5, 11.4), (1.6, 1.6, 0.8), ACO2, sujo=0)
    pe(15.6, 8, 1.0)


# ════════════════════════ CASA DA ELLA ════════════════════════
def casa_ella():
    deck(esp=0.5, cor="#1e2229", cor2="#232830", neon=False)
    # a tela de ripas na frente (o vão da porta no meio) e os canteiros
    for k in range(39):
        x = -7.6 + k * 0.4
        if abs(x) < 0.65:
            continue
        B("solido", (x, -3.8, 2.5), (0.08, 0.12, 5.0), ACO2, sujo=0)
    for s in (-1, 1):
        B("solido", (s * 4.1, -3.8, 5.04), (7.0, 0.16, 0.08), ACO2, sujo=0)
        B("solido", (s * 4.1, -4.2, 0.3), (7.0, 0.6, 0.6), MET2, sujo=0)
        for k in range(5):
            planta((s * (1.6 + k * 1.3), -4.2, 0.4), 0.45 + 0.15 * hh(k, s), k + 7 * s)
        for k in range(4):
            Esfera("solido", (s * (2.2 + k * 1.6), -3.95, 4.2 + 0.6 * hh(k, s, 2)), 0.55, 6, 4, VERDE if k % 2 else VERDE2, M=S(1.2, 0.35, 0.9))
    placa_let(0, 4.2, -3.95, 2.6)
    # o caminho até a cápsula
    for k in range(5):
        B("luz", (0, -3.0 + k * 0.7, 0.012), (0.5, 0.06, 0.02), "#9fe6ff")
    # a cápsula em pernas: o corpo deitado, as pontas, a escotilha
    cy, cz = 1.4, 3.8
    Cil("solido", (-3.2, cy, cz), 1.9, 1.9, 6.4, 16, BR, r=(0, math.pi / 2, 0), sujo=0, tampa=False)
    for s in (-1, 1):
        Esfera("solido", (s * 3.2, cy, cz), 1.9, 16, 8, BR, M=S(0.5, 1, 1))
    for x in (-2.4, 2.4):
        for y in (0.4, 2.4):
            Cil("solido", (x, y, 0), 0.1, 0.08, 2.2, 6, ACO, sujo=0.1)
    Cil("luz", (0.6, cy - 1.86, cz + 0.3), 0.7, 0.7, 0.04, 16, "#bff4ff", r=(math.pi / 2, 0, 0))
    Tor("neon", (0.6, cy - 1.95, cz + 0.3), 0.8, 0.05, 20, 4, r=(math.pi / 2, 0, 0))
    B("neon", (0, cy, cz - 1.95), (6.4, 0.06, 0.04))
    # a porta do lado e a escadinha
    B("luz", (-2.2, cy - 1.75, cz - 0.4), (0.9, 0.04, 1.6), "#6ad0e8", r=(0.35, 0, 0))
    for k in range(5):
        B("solido", (-2.2, cy - 2.3 - (4 - k) * 0.3, 0.2 + k * 0.38), (1.0, 0.3, 0.06), ACO2, sujo=0)
    # o lampião do jardim
    Cil("solido", (5.5, -1.6, 0), 0.04, 0.04, 1.1, 6, ACO, sujo=0)
    Esfera("luz", (5.5, -1.6, 1.2), 0.12, 8, 5, QUENTE)
    for k in range(4):
        planta((-6.2 + k * 0.9, 3.4 - hh(k) * 0.8, 0.1), 0.5, k + 20)
    pe(14, 8, 0.5)


for nome, f in (("palco", palco), ("estacao", estacao), ("terraco", terraco),
                ("casa-drew", casa_drew), ("balada", balada), ("casa-ella", casa_ella)):
    ATUAL[0] = nome
    f()

# ── vira objetos: um nó por tipo, uma malha por grupo ──
GRUPOS = ("solido", "luz", "neon", "vidro", "pe", "pen")


def material(g):
    m = bpy.data.materials.new("cid_" + g)
    try:
        m.use_nodes = True
    except Exception:
        pass
    nt = m.node_tree
    b = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    if g in ("neon", "pen"):
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
        b.inputs["Roughness"].default_value = 0.12 if g == "vidro" else 0.6
    return m


MATS = {g: material(g) for g in GRUPOS}
NOS = {}
for idx, tipo in enumerate(IDS):
    e = bpy.data.objects.new(tipo, None)
    e.empty_display_size = 1.0
    COL.objects.link(e)
    e["let"] = list(LET[tipo])
    e.location = (idx * 30.0, 0, 0)
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

# ── a AO assada na cor dos vértices (Cycles), só no sólido ──
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
sc.world.light_settings.distance = 2.2
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
    if g in ("neon", "pen"):
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
      export_normals=True, export_materials="EXPORT", export_yup=True, export_apply=True, export_vertex_color="ACTIVE",
      export_extras=True))
tot = {}
for o in COL.objects:
    if o.type == "MESH":
        tot[(o.parent.name, o["grupo"])] = sum(len(p.vertices) - 2 for p in o.data.polygons)
for tipo in IDS:
    print("TRI", tipo, sum(v for (l, g), v in tot.items() if l == tipo), {g: v for (l, g), v in tot.items() if l == tipo}, "LET", LET[tipo])
print("TRI total", sum(tot.values()))
