# A CASA DA ELLA, QUE É A GALERIA (T22), por dentro (06/11). Antes eram caixas
# (app/linha/interior/salas/GaleriaElla.tsx); agora um galpão-galeria enorme e
# proibido, com a cara dela: paredes azul-noite com pilastras, a faixa de vidro
# no alto (a chuva fica no jogo), treliças de ferro, as estantes de quadros até o
# teto (a maioria virada pra parede), os seis quadros que ela guardou em molduras
# de estilos diferentes com um spot em cima de cada um, o mezanino no fundo com a
# escada caracol, a planta do Criador no pedestal redondo sob a redoma com a luz
# de cultivo roxa pendurada da treliça, o armarinho das amostras, o cavalete de
# madeira com o carrinho de tintas e o pano manchado, os baldes das goteiras, o
# canto dela (cama de palete, criado-mudo de caixote com abajur, varal de fotos),
# o cantinho de almofadas com a luminária de arco, tapetes, plantas e o mural
# pintado na parede do fundo atrás da planta.
#
#   blender -b --factory-startup --python blender/scripts/galeria_ella.py \
#     [--python blender/scripts/galeria_ella_foto.py] -- bruto.glb [foto.png]
#   npx @gltf-transform/cli optimize bruto.glb public/models/galeria-ella.glb \
#     --compress meshopt --simplify false --join false --flatten false --instance false --palette false
#   (rodar da raiz do repositório: os quadros são lidos de app/linha/disco/ella.ts)
#
# Coordenadas: Blender Z pra cima; o glTF sai com Y pra cima e z_jogo = -y_blender
# (J(x, y, z) converte do jogo pro Blender). A sala é a do GaleriaElla.tsx:
# 9 × 16 × 7 m, origem no chão no centro, a porta em z_jogo = +8. Tudo nas
# posições das caixas: a câmera, a Ella, a planta, os quadros, o cavalete, os
# baldes e a parede da obra não mudam.
# Um nó "galeria" na origem, com as malhas:
#   galeria_solido  tudo (cor no vértice × AO assada × um pouco da luz assada)
#   galeria_luz     o que brilha com cor fixa (spots, abajur, a luz de cultivo, as amostras)
#   galeria_neon    o rodapé azul dela e o friso do mezanino
#   galeria_vidro   a faixa de vidro do teto e a redoma (transparente, sem luz)
#   tela_<id>       a tela de cada quadro (um quadrado com UV 0..1; o jogo pinta)
# O que mexe continua no jogo: a copa da planta, o halo e a luz dela, os esporos,
# a chuva, as gotas e a água dos baldes, a tela do cavalete, os potes, o prego.
# Orçamento: até 35 mil triângulos e 1 MB.

import bpy, bmesh, math, sys, os, re
from mathutils import Vector, Matrix, Color, noise

TAU = 2 * math.pi
args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
SAIDA = args[0] if args else "/tmp/galeria-ella-bruto.glb"

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
COL = bpy.data.collections.new("GaleriaElla")
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


def mix(a, b, t):
    a, b = lin(a), lin(b)
    return tuple(a[i] + (b[i] - a[i]) * t for i in range(3)) + (1.0,)


def hh(*a):
    x = math.sin(sum(v * k for v, k in zip(a, (12.9898, 78.233, 37.719, 4.581, 9.137)))) * 43758.5453
    return x - math.floor(x)


def escolhe(pal, *a):
    return pal[min(len(pal) - 1, int(hh(*a) * len(pal)))]


# a paleta (a da sala de antes, mais o que é dela)
PAREDE = "#222a3a"
CHAO = "#191c24"
ELLA = "#4fc3ff"
VERDE = "#5dffa0"
ROXO = "#b38cff"
QUENTE = "#ffcf9a"
FERRO, FERRO2 = "#1c212c", "#2a2f3a"
MAD, MAD2, MAD3 = "#6a4a30", "#5a3e28", "#3a2a1e"
LINHO = "#8a7c64"
BARRO = "#9a5a3a"
LATAO = "#a8843f"
ZINCO = "#5d6a7e"
FOLHAS = ["#2f7a48", "#245e3a", "#3a8a50", "#1f5233"]
TECIDOS = ["#c8963a", "#b0506a", "#2f7a7a", "#5a3a6a", "#3a4c8a", "#c8cfdc"]
TINTAS = ["#4fc3ff", "#ff6a35", "#5dffa0", "#b38cff", "#ff3fb0", "#ffc857"]


# ── matrizes ──
def T(x, y, z):
    return Matrix.Translation((x, y, z))


def S(x, y, z):
    return Matrix.Diagonal((x, y, z, 1.0))


def R(rx=0.0, ry=0.0, rz=0.0):
    return Matrix.Rotation(rz, 4, "Z") @ Matrix.Rotation(ry, 4, "Y") @ Matrix.Rotation(rx, 4, "X")


def para(d):
    return Vector((0, 0, 1)).rotation_difference(Vector(d).normalized()).to_matrix().to_4x4()


def J(x, y, z):
    """do jogo (Y pra cima, z pra porta) pro Blender. Linear: serve pra deslocamentos também."""
    return Vector((x, -z, y))


LARG, FUNDO, ALTO = 9.0, 16.0, 7.0

# ── acumuladores ──
BUF = {}
PAI = [Matrix.Identity(4)]


class em:
    def __init__(self, M):
        self.M = M

    def __enter__(self):
        PAI.append(PAI[-1] @ self.M)

    def __exit__(self, *a):
        PAI.pop()


def add(bm, g, cor="#ffffff", M=None, cf=None, sujo=0.25, afiar=40, cv=None):
    """cf(centro, normal, i, j) dá a cor por face; cv(posição, normal) por vértice (gradientes)."""
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
    b = BUF.setdefault(g, {"v": [], "f": [], "c": []})
    base = len(b["v"])
    b["v"].extend(v.co.copy() for v in bm.verts)
    for f in bm.faces:
        cc = cores.get(f, c0)
        b["f"].append([base + l.vert.index for l in f.loops])
        cols = []
        for l in f.loops:
            c = lin(cv(l.vert.co, f.normal)) if cv else cc
            k = 1.0
            if sujo and g == "solido":
                k = 1 - sujo * max(0.0, min(1.0, 1 - l.vert.co.z / 1.3))
            cols.append((c[0] * k, c[1] * k, c[2] * k, 1.0))
        b["c"].append(cols)
    bm.free()


# ── primitivas ──
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


def B(g, p, s, cor=None, r=(0, 0, 0), d=None, cf=None, sujo=0.25, cv=None):
    add(bm_caixa(*s, d=d), g, cor, T(*p) @ R(*r), cf, sujo, cv=cv)


def BJ(g, p, s, cor=None, ry=0.0, rx=0.0, d=None, cf=None, sujo=0.25):
    """caixa em coordenadas do jogo (posição, tamanho [x, y, z], giro em y)."""
    add(bm_caixa(s[0], s[2], s[1], d=d), g, cor, T(*J(*p)) @ R(rx, 0, ry), cf, sujo)


def Cil(g, p, r0, r1, h, seg, cor=None, r=(0, 0, 0), cf=None, sujo=0.2, tampa=True, M=None):
    bm = bmesh.new()
    bm.faces.layers.int.new("ij")
    bmesh.ops.create_cone(bm, cap_ends=tampa, cap_tris=False, segments=seg, radius1=r0, radius2=r1,
                          depth=h, matrix=T(0, 0, h / 2))
    add(bm, g, cor, M if M is not None else T(*p) @ R(*r), cf, sujo)


def Esfera(g, p, raio, u, v, cor=None, M=None, sujo=0):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=u, v_segments=v, radius=raio)
    add(bm, g, cor, T(*p) @ (M or Matrix.Identity(4)), None, sujo, afiar=None)


def Viga(g, a, b, esp, cor=None, sujo=0.2, esp2=None):
    a, b = Vector(a), Vector(b)
    dv = b - a
    bm = bm_caixa(esp, esp2 or esp, dv.length)
    add(bm, g, cor, T(*((a + b) / 2)) @ para(dv), None, sujo)


def Torno(g, perfil, seg, cor=None, M=None, cf=None, sujo=0.15, afiar=40):
    """Sólido de revolução em volta de Z. A face fica do lado de (giro × sentido do perfil):
    perfil de baixo pra cima por fora = normal pra fora."""
    bm = bmesh.new()
    ij = bm.faces.layers.int.new("ij")
    aneis = []
    for r, h in perfil:
        if r < 1e-6:
            v = bm.verts.new((0, 0, h))
            aneis.append([v] * seg)
        else:
            aneis.append([bm.verts.new((r * math.cos(TAU * k / seg), r * math.sin(TAU * k / seg), h)) for k in range(seg)])
    for i in range(len(aneis) - 1):
        A, Bn = aneis[i], aneis[i + 1]
        for k in range(seg):
            u = []
            for v in (A[k], A[(k + 1) % seg], Bn[(k + 1) % seg], Bn[k]):
                if v not in u:
                    u.append(v)
            if len(u) < 3:
                continue
            f = bm.faces.new(u)
            f[ij] = i * 1000 + k
    add(bm, g, cor, M, cf, sujo, afiar)


def Disco(g, c, raios, seg, cor=None, cf=None, sujo=0):
    """Disco/anéis deitados, virados pra cima (+Z)."""
    c = Vector(c)
    bm = bmesh.new()
    ij = bm.faces.layers.int.new("ij")
    aneis = []
    for r in raios:
        if r < 1e-6:
            v = bm.verts.new(c)
            aneis.append([v] * seg)
        else:
            aneis.append([bm.verts.new(c + Vector((r * math.cos(TAU * k / seg), r * math.sin(TAU * k / seg), 0))) for k in range(seg)])
    for i in range(len(aneis) - 1):
        A, Bn = aneis[i], aneis[i + 1]
        for k in range(seg):
            u = []
            for v in (A[k], Bn[k], Bn[(k + 1) % seg], A[(k + 1) % seg]):
                if v not in u:
                    u.append(v)
            f = bm.faces.new(u)
            f[ij] = i * 1000 + k
    add(bm, g, cor, None, cf, sujo, afiar=None)


def Tor(g, p, Rm, rm, seg, lados, cor=None, r=(0, 0, 0), sujo=0.1):
    bm = bmesh.new()
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


def Tubo(g, pts, raio, lados, cor=None, sujo=0.1, tampa=True):
    pts = [Vector(p) for p in pts]
    n = len(pts)
    Tg = [(pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)]).normalized() for i in range(n)]
    a = Vector((0, 0, 1)) if abs(Tg[0].z) < 0.9 else Vector((1, 0, 0))
    N = [(a - Tg[0] * a.dot(Tg[0])).normalized()]
    for i in range(1, n):
        nn = N[-1] - Tg[i] * N[-1].dot(Tg[i])
        N.append(nn.normalized() if nn.length > 1e-8 else N[-1])
    bm = bmesh.new()
    aneis = []
    for i in range(n):
        b = Tg[i].cross(N[i])
        aneis.append([bm.verts.new(pts[i] + raio * (math.cos(TAU * k / lados) * N[i] + math.sin(TAU * k / lados) * b))
                      for k in range(lados)])
    for i in range(n - 1):
        A, Bn = aneis[i], aneis[i + 1]
        for k in range(lados):
            bm.faces.new((A[k], A[(k + 1) % lados], Bn[(k + 1) % lados], Bn[k]))
    if tampa and lados > 2:
        bm.faces.new(aneis[0])
        bm.faces.new(aneis[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    add(bm, g, cor, None, None, sujo)


def Placa(g, o, U, V, nu, nv, cor=None, cf=None, filtro=None, sujo=0.15, cv=None):
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
    add(bm, g, cor, None, cf, sujo, afiar=None, cv=cv)


def DuasFaces(g, tris, cor, n_off=0.004):
    """Triângulos dos dois lados (folhas, papel): a camada de trás um tiquinho atrás (a AO não se tampa)."""
    bm = bmesh.new()
    for a, b, c in tris:
        a, b, c = Vector(a), Vector(b), Vector(c)
        n = (b - a).cross(c - a)
        if n.length < 1e-9:
            continue
        n.normalize()
        bm.faces.new([bm.verts.new(v) for v in (a, b, c)])
        bm.faces.new([bm.verts.new(v - n * n_off) for v in (c, b, a)])
    add(bm, g, cor, None, None, 0, afiar=None)


def Folha(base, d, comp, larg, cor, caida=0.25, dobra=0.25):
    """uma folha da base na direção d, dobrada na nervura e caindo na ponta."""
    p0 = Vector(base)
    d = Vector(d).normalized()
    lado = d.cross(Vector((0, 0, 1)))
    if lado.length < 1e-3:
        lado = Vector((1, 0, 0))
    lado.normalize()
    cima = lado.cross(d).normalized()
    meio = p0 + d * comp * 0.45 + cima * comp * caida * 0.2
    ponta = p0 + d * comp - cima * comp * caida
    l = meio + lado * larg * 0.5 - cima * larg * dobra
    r = meio - lado * larg * 0.5 - cima * larg * dobra
    DuasFaces("solido", [(p0, r, ponta), (p0, ponta, l)], cor)


def Ripa(g, pts, larg, cor, n_dir=(0, -1, 0), afast=0.006):
    """uma fita chapada (pincelada, cipó pintado) rente a uma parede de normal n_dir."""
    n = Vector(n_dir).normalized()
    pts = [Vector(p) + n * afast for p in pts]
    bm = bmesh.new()
    vs = []
    for i, p in enumerate(pts):
        t = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
        s = t.cross(n).normalized()
        w = larg * (1 - 0.7 * i / max(1, len(pts) - 1))
        vs.append((bm.verts.new(p + s * w / 2), bm.verts.new(p - s * w / 2)))
    for i in range(len(pts) - 1):
        f = bm.faces.new((vs[i][0], vs[i][1], vs[i + 1][1], vs[i + 1][0]))
        f.normal_update()
        if f.normal.dot(n) < 0:
            f.normal_flip()
    add(bm, g, cor, None, None, 0, afiar=None)


def Cone2(g, p, r0, r1, h, seg, fora, dentro):
    """Cúpula de luminária: um cone aberto com a cor de fora e a de dentro."""
    for cor, inv in ((fora, False), (dentro, True)):
        bm = bmesh.new()
        k = 0.985 if inv else 1.0
        bmesh.ops.create_cone(bm, cap_ends=False, cap_tris=False, segments=seg, radius1=r0 * k, radius2=r1 * k,
                              depth=h, matrix=T(0, 0, h / 2))
        if inv:
            bmesh.ops.reverse_faces(bm, faces=bm.faces)
        add(bm, g, cor, T(*p), None, 0)


def Almofada(p, sx, sy, sz, cor, rz=0.0, rx=0.0):
    Esfera("solido", p, 1.0, 8, 5, cor, R(rx, 0, rz) @ S(sx, sy, sz))


# ── os quadros (lidos do jogo: app/linha/disco/ella.ts) ──
def ler_quadros():
    try:
        src = open(os.path.join(os.getcwd(), "app/linha/disco/ella.ts"), encoding="utf-8").read()
        out = []
        for m in re.finditer(r'\{\s*id:\s*"(\w+)",\s*lado:\s*(-?1),\s*z:\s*(-?[\d.]+),\s*y:\s*(-?[\d.]+),\s*larg:\s*([\d.]+),\s*alto:\s*([\d.]+),\s*cores:\s*\[([^\]]*)\]', src):
            out.append(dict(id=m[1], lado=int(m[2]), z=float(m[3]), y=float(m[4]), larg=float(m[5]), alto=float(m[6]),
                            cores=re.findall(r'"(#[0-9a-fA-F]{6})"', m[7])))
        if len(out) >= 6:
            return out
        print("quadros: achei", len(out))
    except Exception as e:
        print("quadros", e)
    return [dict(id=i, lado=l, z=z, y=y, larg=w, alto=h, cores=["#444444"]) for i, l, z, y, w, h in (
        ("cidade", -1, 1.6, 2.3, 1.6, 2.1), ("janela", 1, 1.2, 2.1, 1.2, 1.6), ("rio", -1, -1.4, 2.0, 2.2, 1.3),
        ("kombi", 1, -1.8, 1.9, 1.1, 0.9), ("branco", -1, -4.2, 2.4, 1.3, 1.7), ("flor", 1, -4.6, 2.6, 1.5, 1.5))]


QUADROS = ler_quadros()
print("QUADROS", [q["id"] for q in QUADROS])

# onde fica cada coisa (as do GaleriaElla.tsx)
PLANTA = (0.0, -6.2)                 # x, z do jogo
CAVALETE = ((-1.05, -5.35), 0.5)     # (x, z), giro
PAREDE_OBRA = (2.6, 2.35, -7.94)
BALDES = [(2.7, 3.0), (-2.4, -0.4), (2.2, -3.6)]
ZP = [6.6, 3.4, 0.25, -3.0, -6.2]    # as pilastras e as treliças (fora dos quadros)
MEZ_Z0, MEZ_Y = -6.7, 3.5            # a beira do mezanino, a altura do piso dele
ESC = (-3.5, -5.9)                   # o centro da escada caracol


def parede(lado, z, y, afast):
    """um referencial na parede lateral: X ao longo dela (a direita de quem olha), Y pra dentro da parede, Z pra cima."""
    C = J(lado * (LARG / 2 - afast), y, z)
    return Matrix(((0, lado, 0, C.x), (-lado, 0, 0, C.y), (0, 0, 1, C.z), (0, 0, 0, 1)))


# ════════════════════════ O SALÃO ════════════════════════

# o chão: cimento queimado em placas grandes, cada uma num tom
def f_chao(c, n, i, j):
    k = 0.88 + 0.22 * hh(i // 4, j // 4, 3) + 0.05 * (hh(i, j, 5) - 0.5)
    return dim(CHAO, k)


Placa("solido", (-4.5, -8, 0), (9, 0, 0), (0, 16, 0), 24, 40, None, f_chao, sujo=0)


def cv_parede(co, n):
    k = 0.92 + 0.12 * noise.noise(co * 0.7) + 0.05 * noise.noise(co * 3.1)
    if co.z < 0.9:
        k *= 0.8
    return dim(PAREDE, k)


def cv_fundo(co, n):
    """a parede do fundo: o mural dela atrás da planta (um sol verde-água pintado à mão e um anel azul)."""
    c = cv_parede(co, n)
    d = math.hypot(co.x - PLANTA[0], co.z - 1.9)
    t = max(0.0, 1 - d / 1.75) ** 1.3
    c = tuple(c[i] + (lin("#1f5a52")[i] - c[i]) * t * 0.9 for i in range(3)) + (1.0,)
    an = max(0.0, 1 - abs(d - 1.62) / 0.14)
    c = tuple(c[i] + (lin("#2f6f9a")[i] - c[i]) * an * 0.55 for i in range(3)) + (1.0,)
    return c


Placa("solido", (-4.5, -8, 0), (0, 16, 0), (0, 0, 7), 40, 18, cv=cv_parede)       # esquerda
Placa("solido", (4.5, 8, 0), (0, -16, 0), (0, 0, 7), 40, 18, cv=cv_parede)        # direita
Placa("solido", (-4.5, 8, 0), (9, 0, 0), (0, 0, 7), 36, 28, cv=cv_fundo)          # fundo (o mural)
Placa("solido", (4.5, -8, 0), (-9, 0, 0), (0, 0, 7), 18, 14, cv=lambda co, n: dim("#0e1119", 1 + 0.1 * noise.noise(co)))

# o mural: cipós pintados subindo de trás da planta, com folhinhas
for k in range(7):
    a0 = -1.2 + k * 0.4
    pts = []
    for s in range(14):
        t = s / 13
        x = PLANTA[0] + math.sin(a0) * (0.3 + t * 2.0) + 0.18 * math.sin(t * 7 + k)
        y = 0.9 + t * (1.6 + 0.4 * hh(k, 1)) + 0.25 * math.sin(t * 5 + k * 2)
        pts.append(J(x, min(y, 3.2), -8.0))
    Ripa("solido", pts, 0.05, escolhe(["#3a8a6a", "#4fa07a", "#2f6f9a"], k), (0, -1, 0))
    for s in range(2, 13, 3):
        p = pts[s]
        q = p + Vector(((-1) ** s * 0.12, 0, 0.07))
        Ripa("solido", [p, q], 0.07, "#5dbf8a" if s % 2 else "#3a9a7a", (0, -1, 0), 0.008)

# as pilastras e a base delas
for z in ZP:
    for lado in (-1, 1):
        x = lado * (LARG / 2 - 0.12)
        BJ("solido", (x, 3.5, z), (0.24, 7.0, 0.42), "#1c222e", d=1.0)
        BJ("solido", (x, 0.16, z), (0.3, 0.32, 0.5), "#141820")
        BJ("solido", (x, 6.55, z), (0.32, 0.14, 0.52), "#141820", sujo=0)

# o rodapé de luz azul dela (os três lados) e o rodapé de madeira escura embaixo
for lado in (-1, 1):
    BJ("neon", (lado * (LARG / 2 - 0.03), 0.12, 0), (0.025, 0.03, FUNDO - 0.1), ELLA)
BJ("neon", (0, 0.12, -FUNDO / 2 + 0.03), (LARG - 0.1, 0.03, 0.025), ELLA)

# ── o teto: as lajes escuras dos lados, a faixa de vidro no meio com os caixilhos ──
Placa("solido", (-4.5, -8, 7), (0, 16, 0), (3, 0, 0), 16, 3, "#0a0c12", sujo=0)
Placa("solido", (1.5, -8, 7), (0, 16, 0), (3, 0, 0), 16, 3, "#0a0c12", sujo=0)
Placa("vidro", (-1.5, -8, 6.99), (0, 16, 0), (3, 0, 0), 1, 1, "#5a7aa8")
for x in (-1.5, 0, 1.5):
    BJ("solido", (x, 6.94, 0), (0.08, 0.12, 16), FERRO, sujo=0)
for k in range(17):
    BJ("solido", (0, 6.95, -8 + k), (3.0, 0.06, 0.05), FERRO, sujo=0)

# as treliças de ferro atravessando o salão
for z in ZP:
    y0, y1 = 6.2, 6.92
    Viga("solido", J(-4.4, y0, z), J(4.4, y0, z), 0.08, FERRO, 0)
    Viga("solido", J(-4.4, y1, z), J(4.4, y1, z), 0.08, FERRO, 0)
    n = 8
    for k in range(n + 1):
        x = -4.4 + 8.8 * k / n
        Viga("solido", J(x, y0, z), J(x, y1, z), 0.05, FERRO, 0)
        if k < n:
            x2 = -4.4 + 8.8 * (k + 1) / n
            a, b = (J(x, y0, z), J(x2, y1, z)) if k % 2 == 0 else (J(x, y1, z), J(x2, y0, z))
            Viga("solido", a, b, 0.04, FERRO, 0)

# ── a porta de ferro, atrás de quem entra ──
def f_porta(c, n, i, j):
    if abs(n.y) < 0.5:
        return dim("#2a2f3a", 0.8)
    borda = i in (0, 3) or j in (0, 7)
    return dim("#2a2f3a", 0.7 if borda else 1.0 + 0.1 * hh(i, j))


BJ("solido", (0, 1.2, FUNDO / 2 - 0.06), (1.3, 2.4, 0.08), None, d=(0.33, 0.04, 0.3), cf=f_porta)
for x in (-0.72, 0.72):
    BJ("solido", (x, 1.25, FUNDO / 2 - 0.05), (0.12, 2.5, 0.12), FERRO)
BJ("solido", (0, 2.52, FUNDO / 2 - 0.05), (1.56, 0.12, 0.12), FERRO)
Viga("solido", J(0.45, 0.9, 7.86), J(0.45, 1.5, 7.86), 0.03, "#8a8f9a", 0)
BJ("solido", (0, 0.004, 7.2), (1.1, 0.012, 0.7), "#3a2e26", sujo=0)       # o capacho

# ════════════════════════ O MEZANINO E A ESCADA ════════════════════════
def f_mez(c, n, i, j):
    if n.z > 0.5:
        return dim(escolhe([MAD, MAD2, "#5f4430"], i, 3), 0.9)
    if n.z < -0.5:
        return dim("#181b22", 0.9 + 0.15 * hh(i, j))
    return lin(MAD3)


mz = (MEZ_Z0 - FUNDO / 2) / 2
BJ("solido", (0, MEZ_Y - 0.1, mz), (LARG, 0.2, FUNDO / 2 + MEZ_Z0), None,
   d=(0.25, 0.2, 0.45), cf=f_mez, sujo=0)
BJ("solido", (0, MEZ_Y - 0.3, MEZ_Z0 - 0.06), (LARG, 0.18, 0.12), FERRO, sujo=0)
BJ("neon", (0, MEZ_Y - 0.4, MEZ_Z0 - 0.03), (LARG - 0.1, 0.025, 0.025), ELLA)
for x in (-2.0, 3.9):
    BJ("solido", (x, (MEZ_Y - 0.3) / 2, MEZ_Z0 - 0.08), (0.12, MEZ_Y - 0.3, 0.12), FERRO)
    BJ("solido", (x, 0.01, MEZ_Z0 - 0.08), (0.26, 0.02, 0.26), FERRO2)
# o guarda-corpo (aberto na chegada da escada) e o varal de lampadinhas
xs = [-2.6 + k * 0.59 for k in range(13)]
xs = [x for x in xs if x < 4.47] + [4.44]
for x in xs:
    BJ("solido", (x, MEZ_Y + 0.5, MEZ_Z0 - 0.05), (0.04, 1.0, 0.04), FERRO, sujo=0)
for y, r in ((MEZ_Y + 1.0, 0.025), (MEZ_Y + 0.62, 0.01), (MEZ_Y + 0.3, 0.01)):
    Tubo("solido", [J(-2.6, y, MEZ_Z0 - 0.05), J(4.44, y, MEZ_Z0 - 0.05)], r, 4 if r > 0.02 else 3, MAD2 if r > 0.02 else FERRO, 0)
for k in range(15):
    t = k / 14
    x = -2.6 + 7.0 * t
    y = MEZ_Y + 0.96 - 0.14 * abs(math.sin(t * math.pi * 6))
    Esfera("luz", J(x, y - 0.05, MEZ_Z0 + 0.0 - 0.09), 0.03, 6, 4, QUENTE if k % 3 else "#ffe8c0")
# as jardineiras penduradas no guarda-corpo, com os cipós caindo
for i, x in enumerate((-1.3, 1.1, 3.0)):
    BJ("solido", (x, MEZ_Y + 0.82, MEZ_Z0 + 0.05), (0.6, 0.22, 0.18), "#7a4a32", sujo=0)
    for v in range(5):
        x0 = x - 0.25 + v * 0.125
        n = 8
        compr = 0.9 + 0.8 * hh(i, v)
        pts = [J(x0 + 0.04 * math.sin(s + v), MEZ_Y + 0.9 - compr * s / n, MEZ_Z0 + 0.16 + 0.05 * math.sin(s * 0.7)) for s in range(n + 1)]
        Tubo("solido", pts, 0.008, 3, "#2f5a34", 0)
        for s in range(1, n, 2):
            p = pts[s]
            Folha(p, Vector(((-1) ** s * 0.6, -0.8, -0.3)), 0.1, 0.06, escolhe(FOLHAS, i, v, s), 0.2, 0.1)
    for v in range(4):
        Folha(J(x - 0.2 + v * 0.13, MEZ_Y + 0.92, MEZ_Z0 + 0.05), Vector((0.3 * (v - 1.5), -0.5, 0.9)), 0.2, 0.1, escolhe(FOLHAS, i, v))

# a escada caracol (14 degraus de madeira em volta do poste de ferro)
cx, cz = ESC
Cil("solido", J(cx, 0, cz), 0.05, 0.05, MEZ_Y + 1.05, 8, FERRO, sujo=0)
Cil("solido", J(cx, 0, cz), 0.16, 0.16, 0.03, 12, FERRO2, sujo=0)
N_DEG = 14
A_TOPO = math.pi / 2          # o último degrau aponta pro mezanino (+Y do Blender = fundo)
PASSO = math.radians(24)
topo_corrimao = []
for k in range(1, N_DEG):
    h = MEZ_Y * k / N_DEG
    a = A_TOPO - (N_DEG - k) * PASSO
    bm = bmesh.new()
    c0 = Vector((0, 0, 0))
    ri, re_ = 0.06, 0.8
    pts = [Vector((ri * math.cos(a - 0.05), ri * math.sin(a - 0.05), 0)), Vector((re_ * math.cos(a - 0.21), re_ * math.sin(a - 0.21), 0)),
           Vector((re_ * math.cos(a + 0.21), re_ * math.sin(a + 0.21), 0)), Vector((ri * math.cos(a + 0.05), ri * math.sin(a + 0.05), 0))]
    baixo = [bm.verts.new(p) for p in pts]
    cima = [bm.verts.new(p + Vector((0, 0, 0.045))) for p in pts]
    bm.faces.new(cima)
    bm.faces.new(baixo[::-1])
    for i in range(4):
        bm.faces.new((baixo[i], baixo[(i + 1) % 4], cima[(i + 1) % 4], cima[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    add(bm, "solido", escolhe([MAD, MAD2], k), T(*(J(cx, h - 0.045, cz))), None, 0.1)
    pb = J(cx, h, cz) + Vector((0.74 * math.cos(a), 0.74 * math.sin(a), 0))
    Viga("solido", pb, pb + Vector((0, 0, 0.9)), 0.02, FERRO, 0)
for s in range(43):
    t = s / 42
    kk = 0.6 + t * (N_DEG - 0.6)
    a = A_TOPO - (N_DEG - kk) * PASSO
    topo_corrimao.append(J(cx, MEZ_Y * kk / N_DEG + 0.9, cz) + Vector((0.74 * math.cos(a), 0.74 * math.sin(a), 0)))
Tubo("solido", topo_corrimao, 0.022, 4, MAD2, 0)

# o mezanino por cima: a estante de livros, as almofadas, o abajur, as telas encostadas, duas plantas
LOMBADAS = ["#a8432e", "#d0a640", "#3a6a9a", "#e0d8c8", "#2a2a30", "#6a3a7a", "#3f7a5a", "#c86a8a", "#d07a3a"]
BJ("solido", (2.2, MEZ_Y + 0.45, -7.82), (2.6, 0.9, 0.32), MAD3, sujo=0)
for y in (MEZ_Y + 0.12, MEZ_Y + 0.52):
    BJ("solido", (2.2, y + 0.15, -7.72), (2.4, 0.3, 0.2), None, d=(0.06, 1, 1),
       cf=lambda c, n, i, j, y=y: dim(escolhe(LOMBADAS, i, y), 0.7 + 0.3 * hh(i, y)), sujo=0)
Cil("solido", J(3.3, MEZ_Y + 0.9, -7.8), 0.07, 0.07, 0.03, 10, FERRO2, sujo=0)
Viga("solido", J(3.3, MEZ_Y + 0.9, -7.8), J(3.3, MEZ_Y + 1.3, -7.8), 0.015, FERRO2, 0)
Cone2("solido", J(3.3, MEZ_Y + 1.22, -7.8), 0.16, 0.07, 0.16, 12, "#c8b890", "#ffe8c0")
Esfera("luz", J(3.3, MEZ_Y + 1.27, -7.8), 0.04, 6, 4, QUENTE)
Disco("solido", J(-0.6, MEZ_Y + 0.005, -7.4), [0, 0.5, 0.8], 20, None,
      lambda c, n, i, j: lin(["#5a3a6a", "#c8963a"][i % 2]))
for k, (x, z) in enumerate(((-1.0, -7.6), (-0.5, -7.7), (-0.2, -7.35), (-0.95, -7.2))):
    Almofada(J(x, MEZ_Y + 0.09, z), 0.26, 0.26, 0.09, TECIDOS[k], rz=k)
for k in range(4):
    x = -2.2 + k * 0.28
    with em(T(*J(x, MEZ_Y, -7.9)) @ R(0.12, 0, 0)):
        B("solido", (0, -0.02, 0.4 + 0.08 * k), (0.6 - 0.05 * k, 0.03, 0.8 + 0.16 * k), LINHO, sujo=0)

# ════════════════════════ AS PLANTAS DELA ════════════════════════
def Vaso(p, r, h, cor, seg=12):
    Torno("solido", [(0, 0), (r * 0.75, 0), (r, h), (r * 1.06, h), (r * 1.06, h + 0.03), (r * 0.96, h + 0.03), (r * 0.94, h - 0.03), (0, h - 0.03)],
          seg, cor, T(*p))


def Planta(p, tipo, s=1.0, seed=0, vaso="#9a5a3a"):
    p = Vector(p)
    if tipo == "costela":       # a costela-de-adão: folhas largas em cabinhos
        Vaso(p, 0.26 * s, 0.42 * s, vaso)
        for k in range(11):
            a = k * 2.4 + seed
            alto = (0.5 + 0.7 * hh(k, seed)) * s
            d = Vector((math.cos(a), math.sin(a), 0))
            base = p + Vector((0, 0, 0.4 * s))
            ponta = base + d * 0.35 * s + Vector((0, 0, alto))
            Tubo("solido", [base, base + Vector((0, 0, alto * 0.6)) + d * 0.1 * s, ponta], 0.012, 3, "#2f5a34", 0)
            Folha(ponta, d + Vector((0, 0, 0.25)), 0.5 * s, 0.42 * s, escolhe(FOLHAS, k, seed), 0.35, 0.2)
    elif tipo == "espada":      # a espada-de-são-jorge: lâminas em pé
        Vaso(p, 0.2 * s, 0.38 * s, vaso)
        for k in range(10):
            a = k * 2.4 + seed
            d = Vector((math.cos(a) * 0.18, math.sin(a) * 0.18, 1))
            alto = (0.7 + 0.6 * hh(k, seed, 2)) * s
            Folha(p + Vector((math.cos(a) * 0.05, math.sin(a) * 0.05, 0.35 * s)), d, alto, 0.09 * s, escolhe(["#2f6a3e", "#4a7a3a", "#3a5a2a"], k), 0.05, 0.3)
    elif tipo == "palmeira":
        Vaso(p, 0.24 * s, 0.4 * s, vaso)
        topo = p + Vector((0.05, 0, 1.5 * s))
        Tubo("solido", [p + Vector((0, 0, 0.35 * s)), p + Vector((0.02, 0, 0.9 * s)), topo], 0.03 * s, 5, "#5a4a30", 0)
        for k in range(9):
            a = k * TAU / 9 + seed
            d = Vector((math.cos(a), math.sin(a), 0))
            ult = topo
            for sgm in range(4):
                t = (sgm + 1) / 4
                prox = topo + d * 0.75 * s * t + Vector((0, 0, 0.3 * s * t - 0.6 * s * t * t))
                Folha(ult, prox - ult, (prox - ult).length * 1.2, 0.22 * s * (1 - t * 0.5), escolhe(FOLHAS, k, sgm), 0.05, 0.35)
                ult = prox
    else:                       # "moita": uma bola de folhas pequenas
        Vaso(p, 0.16 * s, 0.26 * s, vaso)
        for k in range(16):
            a = k * 2.4 + seed
            el = 0.2 + 0.9 * hh(k, seed)
            d = Vector((math.cos(a) * math.cos(el), math.sin(a) * math.cos(el), math.sin(el)))
            Folha(p + Vector((0, 0, 0.24 * s)), d, 0.3 * s, 0.14 * s, escolhe(FOLHAS, k, seed), 0.3, 0.2)


Planta(J(3.9, 0, 4.75), "costela", 1.1, 1)
Planta(J(-3.95, 0, 3.4), "espada", 1.1, 2, "#d8d0c0")
Planta(J(-3.95, 0, 7.4), "palmeira", 1.2, 3, "#2a2f3a")
Planta(J(4.0, 0, -7.45), "costela", 0.9, 4, "#d8d0c0")
Planta(J(-1.7, MEZ_Y, -7.6), "moita", 1.2, 5)
Planta(J(4.0, MEZ_Y, -7.5), "espada", 0.8, 6, "#2a2f3a")
Planta(J(1.85, 0, -7.6), "moita", 1.0, 7)

# ════════════════════════ OS TAPETES ════════════════════════
# o corredor: uma passadeira comprida no meio do salão (borda azul dela, campo ameixa, medalhões)
RW, RL, RZ0 = 1.8, 9.0, -3.6


def f_passadeira(c, n, i, j):
    u, v = (i + 0.5) / 12, (j + 0.5) / 60
    bx, by = min(u, 1 - u) * RW, min(v, 1 - v) * RL
    if bx < 0.1 or by < 0.1:
        return dim("#1d3a5a", 0.9)
    if bx < 0.18 or by < 0.18:
        return dim("#c8963a", 0.6) if (i + j) % 2 else dim("#7a2a3a", 0.8)
    cy = (v * RL) % 1.5 - 0.75
    cx = u * RW - RW / 2
    if abs(cx) + abs(cy) < 0.42:
        return dim("#c8963a", 0.7) if abs(cx) + abs(cy) > 0.25 else dim("#2f7a7a", 0.8)
    return dim("#4a2440", 0.85 + 0.15 * hh(i // 2, j // 2))


Placa("solido", J(-RW / 2, 0.006, RZ0 + RL), (RW, 0, 0), (0, RL, 0), 12, 60, None, f_passadeira, sujo=0)
# o redondo embaixo da planta
Disco("solido", J(PLANTA[0], 0.006, PLANTA[1]), [0, 0.5, 0.75, 1.0, 1.25, 1.45], 36, None,
      lambda c, n, i, j: dim(["#173a34", "#2f6a5a", "#173a34", "#c8b890", "#1d3a5a"][i], 0.8 if (j // 3 + i) % 2 else 0.95))
# o kilim embaixo da cama
Placa("solido", J(2.15, 0.006, 7.7), (2.3, 0, 0), (0, 2.9, 0), 15, 19, None,
      lambda c, n, i, j: dim(["#8a3a2a", "#c8963a", "#2a2a3a", "#d8cfb0"][(abs(i - 7) + j) // 2 % 4], 0.75), sujo=0)

# ════════════════════════ A PLANTA DO CRIADOR ════════════════════════
px, pz = PLANTA
with em(T(*J(px, 0, pz))):
    # o pedestal redondo, a beira de latão, o anel verde de luz
    Torno("solido", [(0, 0), (0.6, 0), (0.6, 0.05), (0.54, 0.08), (0.54, 0.33), (0.66, 0.35), (0.66, 0.40), (0, 0.40)], 32, "#232836",
          cf=lambda c, n, i, j: lin("#3a3f4c") if i >= 4 else lin("#232836"))
    Tor("neon", (0, 0, 0.12), 0.555, 0.012, 32, 4, "#2fe8a0")
    Torno("solido", [(0.6, 0.4), (0.625, 0.4), (0.625, 0.455), (0.585, 0.455)], 32, LATAO, sujo=0)
    # a redoma de vidro (o sino) e o puxador
    perf = [(0.585, 0.455), (0.585, 1.8)] + [(0.585 * math.cos(t * math.pi / 16), 1.8 + 0.585 * math.sin(t * math.pi / 16)) for t in range(1, 8)] + [(0, 2.385)]
    Torno("vidro", perf, 28, "#bfe3ff", afiar=None)
    Esfera("solido", J(0, 2.43, 0), 0.05, 8, 6, LATAO)
    Cil("solido", J(0, 2.37, 0), 0.025, 0.025, 0.05, 8, LATAO, sujo=0)
    # o vaso de barro rachado, a terra, a rachadura e a etiqueta escrita à mão
    Torno("solido", [(0, 0.4), (0.17, 0.4), (0.24, 0.73), (0.255, 0.74), (0.255, 0.77), (0.228, 0.77), (0.222, 0.755), (0, 0.755)], 20, BARRO,
          cf=lambda c, n, i, j: dim(BARRO, 0.8 + 0.3 * hh(j, i)), sujo=0)
    Disco("solido", J(0, 0.752, 0), [0, 0.12, 0.222], 20, "#2a1a10")
    Viga("solido", J(0.08, 0.45, 0.215), J(0.13, 0.7, 0.2), 0.008, "#3a1e12", 0, 0.004)
    with em(T(*J(-0.12, 0.6, 0.215)) @ R(0, 0, -0.3 + 0.0)):
        B("solido", (0, -0.002, 0), (0.1, 0.004, 0.05), "#efe8da", sujo=0)
    # a luz de cultivo: a calha pendurada da treliça, a barra roxa embaixo
    BJ("solido", (0, 2.77, 0), (0.98, 0.06, 0.18), "#20232b", sujo=0)
    BJ("luz", (0, 2.735, 0), (0.9, 0.012, 0.12), ROXO)
    for x in (-0.42, 0.42):
        Tubo("solido", [J(x, 2.8, 0), J(x, 6.2, 0)], 0.005, 3, "#111111", 0)
    # a mangueirinha da rega, do armário até o pedestal
    Tubo("solido", [J(0.9, 0.5, -0.25), J(0.75, 0.04, -0.2), J(0.55, 0.02, 0.1), J(0.55, 0.12, 0.25)], 0.012, 4, "#3a6a5a", 0)
    # o armarinho das amostras: gavetinhas, a prateleira, os potinhos com data
    def f_arm(c, n, i, j):
        if n.y < -0.5:
            return dim(escolhe(["#2a2f3a", "#232836", "#2e3440"], i, j), 1.0) if (i % 1 == 0) else lin("#1b1f2a")
        return lin("#1b1f2a")
    BJ("solido", (1.25, 0.5, -0.35), (0.75, 1.0, 0.3), None, d=(0.25, 0.3, 0.25), cf=f_arm)
    for i in range(3):
        for j in range(4):
            BJ("solido", (1.0 + i * 0.25, 0.125 + j * 0.25, -0.195), (0.04, 0.02, 0.015), LATAO, sujo=0)
    BJ("solido", (1.25, 1.02, -0.35), (0.7, 0.04, 0.25), FERRO2, sujo=0)
    for i in range(6):
        h = 0.12 * (0.8 + (i % 3) * 0.2)
        x, z = 0.98 + i * 0.1, -0.35 + (i % 2) * 0.05
        Cil("luz", J(x, 1.04, z), 0.03, 0.03, h, 8, escolhe(["#3a8a6a", "#2f6f6a", "#5a9a7a"], i))
        Cil("solido", J(x, 1.04 + h, z), 0.026, 0.024, 0.025, 8, "#8a6a4a", sujo=0)
    # o regador de latão no chão
    Torno("solido", [(0, 0), (0.1, 0), (0.1, 0.18), (0.06, 0.24), (0, 0.24)], 12, LATAO, T(*J(-0.75, 0, -0.75)), sujo=0.1)
    Tubo("solido", [J(-0.68, 0.06, -0.75), J(-0.5, 0.22, -0.72), J(-0.42, 0.3, -0.7)], 0.012, 4, LATAO, 0)

# ════════════════════════ O CAVALETE ════════════════════════
(cvx, cvz), crot = CAVALETE
with em(T(*J(cvx, 0, cvz)) @ R(0, 0, crot)):
    Viga("solido", J(-0.42, 0, 0.02), J(-0.3, 2.15, -0.12), 0.045, MAD, 0.1)
    Viga("solido", J(0.42, 0, 0.02), J(0.3, 2.15, -0.12), 0.045, MAD, 0.1)
    Viga("solido", J(0, 0.9, -0.08), J(0, 2.38, -0.11), 0.05, MAD2, 0.1)
    Viga("solido", J(0, 2.05, -0.12), J(0, 0, -0.8), 0.045, MAD, 0.1)
    Viga("solido", J(-0.4, 0.45, 0.0), J(0.4, 0.45, 0.0), 0.03, MAD2, 0.1)
    Viga("solido", J(0, 0.45, -0.02), J(0, 0.42, -0.5), 0.03, MAD2, 0.1)
    B("solido", tuple(J(0, 0.95, 0.02)), (0.95, 0.14, 0.04), MAD2, sujo=0)
    B("solido", tuple(J(0, 0.985, 0.087)), (0.95, 0.012, 0.035), MAD, sujo=0)
    B("solido", tuple(J(0, 2.06, -0.035)), (0.5, 0.09, 0.06), MAD2, sujo=0)
    # respingos de tinta nas pernas
    for k in range(14):
        t = hh(k, 1)
        xl = (-0.42 + 0.12 * t) * (1 if k % 2 else -1)
        Esfera("solido", J(xl, 2.15 * t, 0.02 - 0.14 * t) + Vector((0, -0.024, 0)), 0.012, 4, 3, TINTAS[k % 6])
    # o carrinho de tintas do lado: duas prateleiras, os tubos, o pote de pincéis, a paleta
    with em(T(*J(-0.85, 0, 0.05))):
        for x in (-0.2, 0.2):
            for z in (-0.15, 0.15):
                Viga("solido", J(x, 0, z), J(x, 0.76, z), 0.02, FERRO2, 0)
        B("solido", tuple(J(0, 0.76, 0)), (0.46, 0.36, 0.025), FERRO2, sujo=0)
        B("solido", tuple(J(0, 0.3, 0)), (0.46, 0.36, 0.025), FERRO2, sujo=0)
        for k in range(6):
            with em(T(*J(-0.15 + k * 0.05, 0.785, -0.08 + 0.03 * (k % 2))) @ R(math.pi / 2, 0, 0.2 * (k - 2.5))):
                Cil("solido", (0, -0.05, 0), 0.013, 0.013, 0.1, 6, "#d8d8d8", r=(0, 0, 0), sujo=0)
                Cil("solido", (0, 0.05, 0), 0.008, 0.008, 0.02, 6, TINTAS[k], sujo=0)
        Cil("solido", J(0.12, 0.775, 0.08), 0.05, 0.05, 0.12, 10, "#5a6a7a", sujo=0)
        for k in range(5):
            a = k * 1.3
            b0 = J(0.12, 0.8, 0.08)
            Viga("solido", b0, b0 + Vector((0.04 * math.cos(a), 0.04 * math.sin(a), 0.28)), 0.008, escolhe([MAD, "#c8963a", "#2a2a30"], k), 0)
        Disco("solido", J(0.05, 0.79, -0.06), [0, 0.12], 14, "#b89a6a")
        for k in range(6):
            a = k * 0.9
            Esfera("solido", J(0.05 + 0.08 * math.cos(a), 0.795, -0.06 + 0.08 * math.sin(a)), 0.018, 5, 3, TINTAS[k], S(1, 1, 0.4))
        B("solido", tuple(J(0, 0.335, 0)), (0.3, 0.2, 0.05), "#c8bfae", sujo=0)   # os panos dobrados
    # o pano manchado no chão
    def f_pano(c, n, i, j):
        if hh(i, j, 9) > 0.86:
            return dim(escolhe(TINTAS, i, j), 0.8)
        return dim("#b8ad98", 0.55 + 0.15 * hh(i, j))
    Placa("solido", J(-0.95, 0.016, 0.9), (1.9, 0, 0), (0, 1.6, 0), 14, 12, None, f_pano, sujo=0)

# os respingos no cimento em volta do cavalete
for k in range(40):
    a, r = hh(k, 3) * TAU, 0.6 + 1.3 * hh(k, 4)
    x, z = cvx + r * math.cos(a), cvz + r * math.sin(a)
    if math.hypot(x - px, z - pz) < 0.7:
        continue
    Disco("solido", J(x, 0.004, z), [0, 0.02 + 0.04 * hh(k, 5)], 6, dim(escolhe(TINTAS, k), 0.7))

# ════════════════════════ OS QUADROS QUE ELA GUARDOU ════════════════════════
ESTILOS = {
    "cidade": (0.09, "#0c0d12", "#a8843f"),   # laca preta, filete de ouro
    "janela": (0.05, "#7a5a3a", "#5a3e28"),   # madeira clara fininha
    "rio": (0.14, "#8a6a30", "#2a2018"),      # dourada larga
    "kombi": (0.06, "#2a3a9a", "#ff6a35"),    # pintada de azul (traço de criança)
    "branco": (0.04, "#d8d4cc", "#b8b4ac"),   # branca, quase nada
    "flor": (0.08, "#3a2618", "#a8843f"),     # madeira escura, filete de ouro
}
TELAS = []
for q in QUADROS:
    b, cor_m, cor_f = ESTILOS.get(q["id"], (0.06, "#0c0d12", "#2a2a2a"))
    a, h = q["larg"] / 2, q["alto"] / 2
    M = parede(q["lado"], q["z"], q["y"], 0.06)
    with em(M):
        for sx, sz, w, hh_ in ((0, h + b / 2, 2 * a + 2 * b, b), (0, -h - b / 2, 2 * a + 2 * b, b),
                               (-a - b / 2, 0, b, 2 * h), (a + b / 2, 0, b, 2 * h)):
            B("solido", (sx, 0.012, sz), (w, 0.065, hh_), cor_m, sujo=0)
        # o friso de fora (a moldura tem degrau) e o filete de dentro
        bb = b * 0.35
        for sx, sz, w, hh_ in ((0, h + b - bb / 2, 2 * a + 2 * b, bb), (0, -h - b + bb / 2, 2 * a + 2 * b, bb),
                               (-a - b + bb / 2, 0, bb, 2 * h + 2 * b - 2 * bb), (a + b - bb / 2, 0, bb, 2 * h + 2 * b - 2 * bb)):
            B("solido", (sx, -0.03, sz), (w, 0.02, hh_), dim(cor_m, 1.25), sujo=0)
        f = 0.012
        for sx, sz, w, hh_ in ((0, h + f / 2, 2 * a + 2 * f, f), (0, -h - f / 2, 2 * a + 2 * f, f),
                               (-a - f / 2, 0, f, 2 * h), (a + f / 2, 0, f, 2 * h)):
            B("solido", (sx, -0.024, sz), (w, 0.012, hh_), cor_f, sujo=0)
        B("solido", (0, 0.03, 0), (2 * a, 0.02, 2 * h), "#101216", sujo=0)    # o fundo (atrás da tela)
        # a plaquinha do lado
        B("solido", (a + b + 0.14, 0.04, -h + 0.25), (0.13, 0.008, 0.07), "#d8cfb0", sujo=0)
        # o spot em cima: o braço saindo da parede e a cabeça virada pro quadro
        yb = h + b + 0.3
        Viga("solido", Vector((0, 0.06, yb)), Vector((0, -0.42, yb + 0.04)), 0.025, "#15171c", 0)
        alvo = Vector((0, 0, 0))
        cab = Vector((0, -0.45, yb))
        d = (alvo - cab).normalized()
        Cil("solido", None, 0.045, 0.035, 0.14, 10, "#15171c", M=T(*(cab - d * 0.07)) @ para(d), sujo=0)
        Cil("luz", None, 0.033, 0.033, 0.004, 10, "#fff2d8", M=T(*(cab + d * 0.071)) @ para(d))
    # a tela: o jogo pinta (UV 0..1; o V vai de cima pra baixo aqui porque o exportador do glTF inverte o V,
    # e no jogo a CanvasTexture tem flipY: assim a pintura sai de pé)
    vs = [M @ Vector(v) for v in ((-a, -0.012, -h), (a, -0.012, -h), (a, -0.012, h), (-a, -0.012, h))]
    me = bpy.data.meshes.new("tela_" + q["id"])
    me.from_pydata([tuple(v) for v in vs], [], [[0, 1, 2, 3]])
    uv = me.uv_layers.new(name="UVMap")
    for li, (u, v) in enumerate(((0, 1), (1, 1), (1, 0), (0, 0))):
        uv.data[li].uv = (u, v)
    me.update()
    TELAS.append(me)

# ════════════════════════ AS TELAS GUARDADAS (até o teto) ════════════════════════
def f_frente(pal, seed):
    return lambda c, n, i, j: dim(escolhe(pal, i, j, seed), 0.75) if n.y < -0.5 else lin("#1a1612")


def Guardada(M, w, h, frente, seed, cores=None):
    """uma tela no referencial M (X ao longo, Y pra dentro da parede, Z pra cima; a base no 0)."""
    with em(M):
        if frente:
            B("solido", (0, 0, h / 2), (w + 0.06, 0.04, h + 0.06), dim("#14121a", 1 + hh(seed)), sujo=0)
            B("solido", (0, -0.022, h / 2), (w - 0.02, 0.01, h - 0.02), None, d=(w / 3, 0.01, h / 2), cf=f_frente(cores, seed), sujo=0)
        else:
            B("solido", (0, 0, h / 2), (w, 0.025, h), dim(LINHO, 0.8 + 0.3 * hh(seed, 1)), sujo=0)
            B("solido", (0, -0.02, h / 2), (w - 0.04, 0.02, 0.04), dim(MAD, 0.9), sujo=0)
            if w > 0.9:
                B("solido", (0, -0.02, h / 2), (0.04, 0.02, h - 0.04), dim(MAD, 0.9), sujo=0)


PAL_GUARDADAS = [q["cores"] for q in QUADROS if len(q["cores"]) > 1] or [["#3a4cff", "#ff6a35", "#5dffa0"]]
seed = 0
FAIXAS = [(3.85, 4.95), (5.05, 5.95), (6.05, 6.85)]
for lado in (-1, 1):
    for f0, f1 in FAIXAS:
        # o trilho (a prateleira estreita) onde elas se apoiam
        BJ("solido", (lado * (LARG / 2 - 0.08), f0 - 0.03, 0), (0.16, 0.04, FUNDO - 0.1), FERRO2, sujo=0)
        z = -7.8
        while z < 7.6:
            seed += 1
            w = 0.5 + 0.8 * hh(seed, lado, f0)
            if any(abs(z + w / 2 - zp) < w / 2 + 0.3 for zp in ZP):
                z += 0.2
                continue
            if z + w > 7.8:
                break
            h = (f1 - f0) * (0.65 + 0.35 * hh(seed, 2))
            zc = z + w / 2
            M = parede(lado, zc, f0 - 0.01, 0.07) @ R(math.radians(-4), 0, 0)
            Guardada(M, w, h, hh(seed, 3) > 0.78, seed, escolhe(PAL_GUARDADAS, seed))
            z += w + 0.04 + 0.1 * hh(seed, 4)

# no chão, encostadas em pilhas (a da frente de costas pra quem entra)
def Pilha(lado, z, n, seed0, larg0=0.9):
    for k in range(n):
        s = seed0 + k
        w = larg0 * (0.75 + 0.4 * hh(s, 7))
        h = 0.7 + 0.8 * hh(s, 8)
        incl = 0.12 + 0.05 * k
        M = parede(lado, z + 0.1 * (hh(s, 9) - 0.5), 0, 0.06 + 0.07 * k + h * math.sin(incl)) @ R(-incl, 0, 0)
        Guardada(M, w, h, k < n - 1 and hh(s, 10) > 0.5, s, escolhe(PAL_GUARDADAS, s))


Pilha(-1, 4.6, 3, 300)
Pilha(-1, 5.7, 4, 310, 1.2)
Pilha(-1, 6.6, 2, 320)
Pilha(1, 2.75, 3, 330)
Pilha(1, 3.75, 2, 340, 1.1)
Pilha(-1, -7.3, 3, 350, 1.1)

# ════════════════════════ OS BALDES DAS GOTEIRAS ════════════════════════
def f_balde(c, n, i, j):
    return dim("#7a4429", 0.8) if hh(i, j, 2) > 0.85 else dim(ZINCO, 0.85 + 0.25 * hh(j, 1))


for k, (bx, bz) in enumerate(BALDES):
    with em(T(*J(bx, 0, bz))):
        Torno("solido", [(0, 0), (0.17, 0), (0.22, 0.4)], 16, None, cf=f_balde, sujo=0.05)
        Torno("solido", [(0.212, 0.4), (0.163, 0.02), (0, 0.02)], 16, dim(ZINCO, 0.6), sujo=0)
        Tor("solido", (0, 0, 0.4), 0.216, 0.008, 16, 4, ZINCO, sujo=0)
        a = 0.4 + k
        arco = [Vector((0.21 * math.cos(a) * math.cos(t * math.pi / 8), 0.21 * math.sin(a) * math.cos(t * math.pi / 8),
                        0.38 + 0.12 * math.sin(t * math.pi / 8))) for t in range(9)]
        if k == 1:      # um deles com a alça deitada
            arco = [Vector((p.x, p.y, 0.4 - (p.z - 0.4) * 0.2)) + Vector((0, 0, 0)) for p in arco]
        Tubo("solido", arco, 0.006, 3, "#3a3f48", 0)

# ════════════════════════ O CANTO DELA (a cama, o criado-mudo, o varal de fotos) ════════════════════════
BX, BZ = 3.3, 6.2
for dz in (-0.52, 0.52):       # dois paletes
    for k in range(7):
        BJ("solido", (BX - 0.6 + k * 0.2, 0.115, BZ + dz), (0.14, 0.02, 1.0), escolhe(["#8a6a48", "#7a5a3a", "#9a7a58"], k, dz), sujo=0.1)
    for x in (-0.65, 0, 0.65):
        BJ("solido", (BX + x, 0.05, BZ + dz), (0.1, 0.1, 1.0), MAD2, sujo=0.1)
BJ("solido", (BX, 0.21, BZ), (1.4, 0.18, 2.0), "#2d3446", d=(0.35, 0.18, 0.4))
BJ("solido", (BX - 0.02, 0.31, BZ - 0.3), (1.46, 0.04, 1.45), None, d=(0.12, 0.04, 0.24),
   cf=lambda c, n, i, j: dim(["#24406a", "#2f7a7a", "#24406a", "#c8b890"][(i + j * 0) % 4], 0.8), sujo=0)
BJ("solido", (BX - 0.72, 0.18, BZ - 0.3), (0.04, 0.26, 1.45), "#24406a", sujo=0)
for k, (x, cor) in enumerate(((-0.33, "#c8cfdc"), (0.3, "#c8cfdc"))):
    Almofada(J(BX + x, 0.38, 6.92), 0.3, 0.17, 0.07, cor, rz=0.05 * k)
Almofada(J(BX - 0.1, 0.42, 6.75), 0.18, 0.18, 0.08, "#b0506a", rx=0.8, rz=0.3)
Almofada(J(BX + 0.35, 0.42, 6.7), 0.16, 0.16, 0.07, "#c8963a", rx=0.7)
# a cadeira de madeira (com livros em cima)
CX, CZ = 2.2, 6.6
for x in (-0.19, 0.19):
    for z in (-0.19, 0.19):
        Viga("solido", J(CX + x, 0, CZ + z), J(CX + x, 0.43, CZ + z), 0.035, MAD3, 0.1)
BJ("solido", (CX, 0.45, CZ), (0.45, 0.04, 0.45), MAD2)
for x in (-0.19, 0.19):
    Viga("solido", J(CX + x, 0.45, CZ + 0.2), J(CX + x, 0.95, CZ + 0.22), 0.035, MAD3, 0.1)
BJ("solido", (CX, 0.85, CZ + 0.21), (0.42, 0.12, 0.03), MAD2)
for k in range(4):
    BJ("solido", (CX + 0.02 * (k % 2), 0.49 + k * 0.04, CZ - 0.03), (0.24 - 0.02 * k, 0.04, 0.17), LOMBADAS[k * 2])
# o criado-mudo de caixote e o abajur (a luz quente do canto)
LX, LZ = 3.95, 7.4
BJ("solido", (LX, 0.22, LZ), (0.45, 0.44, 0.4), None, d=(0.45, 0.11, 0.4),
   cf=lambda c, n, i, j: dim("#8a6a48", 0.6) if j % 2 else lin("#8a6a48"))
Cil("solido", J(LX, 0.44, LZ), 0.07, 0.06, 0.05, 10, "#d8cfb0", sujo=0)
Viga("solido", J(LX, 0.49, LZ), J(LX, 0.66, LZ), 0.012, LATAO, 0)
Cone2("solido", J(LX, 0.63, LZ), 0.2, 0.12, 0.25, 14, "#e8c890", "#ffe8c0")
Esfera("luz", J(LX, 0.72, LZ), 0.05, 8, 5, QUENTE)
Cil("solido", J(LX - 0.12, 0.44, LZ + 0.08), 0.035, 0.035, 0.09, 8, "#5a3a6a", sujo=0)     # a caneca
# o varal de fotos na parede de cima da cama
fio = [J(LARG / 2 - 0.05, 1.75 - 0.18 * math.sin(math.pi * t / 10), 5.0 + 2.8 * t / 10) for t in range(11)]
Tubo("solido", fio, 0.004, 3, "#d8d0c0", 0)
for k in range(9):
    p = fio[k + 1]
    with em(T(*p) @ R(0, 0, 0)):
        B("solido", (-0.01, 0, -0.1), (0.006, 0.11, 0.13), "#e8e0d0", sujo=0)
        B("solido", (-0.014, 0, -0.09), (0.004, 0.09, 0.09), escolhe(["#2a3550", "#5a3a3a", "#3a6a5a", "#7a5a2a", "#2a2028"], k), sujo=0)

# ════════════════════════ O CANTINHO DAS ALMOFADAS (a luminária de arco) ════════════════════════
SX, SZ = -2.5, 5.2
Disco("solido", J(SX, 0.007, SZ), [0, 0.35, 0.65, 0.9, 1.1], 28, None,
      lambda c, n, i, j: dim(["#c8963a", "#7a2a3a", "#2f7a7a", "#d8cfb0"][i], 0.75 if j % 2 else 0.85))
Cil("solido", J(SX, 0.32, SZ), 0.42, 0.42, 0.04, 20, MAD, sujo=0)
for k in range(3):
    a = k * TAU / 3 + 0.3
    Viga("solido", J(SX + 0.3 * math.cos(a), 0, SZ + 0.3 * math.sin(a)), J(SX + 0.25 * math.cos(a), 0.32, SZ + 0.25 * math.sin(a)), 0.04, MAD3, 0.1)
for k, (dx, dz) in enumerate(((0.75, 0.1), (-0.7, 0.25), (0.05, 0.8), (0.1, -0.75))):
    Almofada(J(SX + dx, 0.1, SZ + dz), 0.33, 0.33, 0.1, TECIDOS[k], rz=k * 0.7)
Almofada(J(SX + 0.78, 0.25, SZ + 0.15), 0.18, 0.18, 0.07, TECIDOS[4], rx=0.6)
Cil("solido", J(SX + 0.1, 0.36, SZ - 0.05), 0.06, 0.05, 0.1, 10, "#d8cfb0", sujo=0)     # o bule
Cil("solido", J(SX - 0.15, 0.36, SZ + 0.1), 0.03, 0.03, 0.07, 8, "#5a3a6a", sujo=0)
Cil("luz", J(SX + 0.2, 0.36, SZ + 0.15), 0.025, 0.025, 0.06, 8, "#ffe0a8")                # a vela
for k in range(3):
    BJ("solido", (SX - 0.1, 0.36 + 0.03 * k + 0.015, SZ - 0.22), (0.25 - 0.03 * k, 0.03, 0.18), LOMBADAS[k + 3], ry=0.3 * k)
# a luminária de arco: a base de pedra, o arco de latão, a cúpula sobre a mesa
AB = J(-3.6, 0, 6.1)
Cil("solido", tuple(AB), 0.18, 0.16, 0.06, 14, "#2a2f3a")
arco = []
for k in range(17):
    t = k / 16
    p = AB.lerp(J(SX + 0.1, 0, SZ), t)
    arco.append(Vector((p.x, p.y, 0.06 + 2.1 * math.sin(t * math.pi * 0.62) / math.sin(math.pi * 0.62) * (1 - 0.0 * t))))
arco[-1] = arco[-1] + Vector((0, 0, 0))
Tubo("solido", arco, 0.015, 5, LATAO, 0)
topo = arco[-1]
Cone2("solido", topo + Vector((0, 0, -0.18)), 0.2, 0.05, 0.2, 14, "#2a3a2a", "#ffe8c0")
Esfera("luz", topo + Vector((0, 0, -0.12)), 0.05, 8, 5, QUENTE)

# ════════════════════════ vira objetos, AO, a luz assada, exporta ════════════════════════
GRUPOS = ("solido", "luz", "neon", "vidro")


def material(g):
    m = bpy.data.materials.new("galeria_" + g)
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
mt_tela = bpy.data.materials.new("galeria_tela")
RAIZ = bpy.data.objects.new("galeria", None)
COL.objects.link(RAIZ)
for g in GRUPOS:
    b = BUF.get(g)
    if not b:
        continue
    me = bpy.data.meshes.new(f"galeria_{g}")
    me.from_pydata([tuple(v) for v in b["v"]], [], b["f"])
    at = me.color_attributes.new("Base", "FLOAT_COLOR", "CORNER")
    at.data.foreach_set("color", [x for fc in b["c"] for c in fc for x in c])
    me.polygons.foreach_set("use_smooth", [True] * len(me.polygons))
    me.update()
    o = bpy.data.objects.new(f"galeria_{g}", me)
    COL.objects.link(o)
    o.parent = RAIZ
    o["grupo"] = g
    me.materials.append(MATS[g])
for me in TELAS:
    me.materials.append(mt_tela)
    o = bpy.data.objects.new(me.name, me)
    COL.objects.link(o)
    o.parent = RAIZ
    o["grupo"] = "tela"

vl = bpy.context.view_layer
vl.update()

# ── a AO assada (Cycles), só no sólido ──
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
sc.world.light_settings.distance = 0.9
vl.update()
for o in sc.objects:
    o.select_set(False)
for o in solidos:
    o.select_set(True)
vl.objects.active = solidos[0]
print("BAKE", bpy.ops.object.bake(type="AO", target="VERTEX_COLORS"))


# ── a luz assada de leve na cor (o jogo não ganha luz nova): os spots nos quadros,
# a planta, a luz de cultivo, os abajures, o vidro do teto, o rodapé azul ──
def c3(h, k):
    c = lin(h)
    return (c[0] * k, c[1] * k, c[2] * k)


FONTES = [
    (J(px, 1.3, pz), c3(VERDE, 0.55), 1.5),
    (J(px, 2.6, pz), c3(ROXO, 0.5), 1.3),
    (J(LX, 0.75, LZ), c3(QUENTE, 0.9), 1.1),
    (J(SX + 0.1, 1.9, SZ), c3(QUENTE, 0.7), 1.4),
    (J(3.3, MEZ_Y + 1.2, -7.8), c3(QUENTE, 0.6), 1.1),
    (J(SX + 0.2, 0.42, SZ + 0.15), c3("#ffe0a8", 0.4), 0.5),
]
for q in QUADROS:
    FONTES.append((J(q["lado"] * (LARG / 2 - 0.25), q["y"] + 0.3, q["z"]), c3("#ffe8c8", 0.55), 1.15))
for z in (-6, -3, 0, 3, 6):
    FONTES.append((J(0, 6.6, z), c3("#7f9cff", 0.3), 2.4))
for z in range(-7, 8, 2):
    for lado in (-1, 1):
        FONTES.append((J(lado * (LARG / 2 - 0.05), 0.12, z), c3(ELLA, 0.35), 0.45))
        # a noite que cai do vidro nas estantes lá de cima
        FONTES.append((J(lado * 3.4, 5.6, z), c3("#9fb8e0", 0.45), 1.9))
for x in range(-2, 5):
    FONTES.append((J(x, MEZ_Y + 0.9, MEZ_Z0 - 0.1), c3(QUENTE, 0.25), 0.7))

for o in COL.objects:
    if o.type != "MESH" or o["grupo"] == "tela":
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
            fr, fg, fb = 0.9, 0.9, 0.94
            for q, cor, raio in FONTES:
                d2 = ((p.x - q[0]) ** 2 + (p.y - q[1]) ** 2 + (p.z - q[2]) ** 2) / (raio * raio)
                k = 1.0 / (1.0 + d2)
                fr += cor[0] * k
                fg += cor[1] * k
                fb += cor[2] * k
            a = 0.2 + 0.8 * ac[i * 4]
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
vl.objects.active = RAIZ
print(bpy.ops.export_scene.gltf(filepath=SAIDA, export_format="GLB", use_selection=True, export_texcoords=True,
      export_normals=True, export_materials="EXPORT", export_yup=True, export_apply=True, export_vertex_color="ACTIVE"))
tot = {}
for o in COL.objects:
    if o.type == "MESH":
        tot[o.name] = sum(len(p.vertices) - 2 for p in o.data.polygons)
print("TRI", tot)
print("TRI total", sum(tot.values()))
