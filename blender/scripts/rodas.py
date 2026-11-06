# Os veículos sem motor do jogador (06/11): os patins com o jato das costas, o
# skate e a BMX, montados com sucata do subúrbio e neon (o mesmo estilo e o mesmo
# esquema da moto, blender/scripts/moto.py). Só os veículos: o corpo do jogador
# continua o do código. Os nós são os MESMOS grupos que animam hoje, cada um no
# referencial do pivô que o código usa:
#
#   patins       um patins (bota, chassi, 4 rodas), no referencial da PERNA do
#                Patinador (Patins.tsx: o grupo da perna em (±0,12, 0,94, 0));
#                o jogo usa o mesmo nó nas duas pernas
#   jato         o propulsor das costas (dois cilindros de sucata, o bocal e as
#                alças de câmara de ar); referencial do corpo do Patinador. A
#                chama continua a do código (acende no propulsor)
#   skate        a prancha inteira (shape, trucks, rodas): o grupo "prancha" do
#                Skatista (gira no kickflip/heelflip em torno do eixo z)
#   bmx_roda_t   a roda de trás; pivô = o eixo, (0, 0,3, -0,5)
#   bmx_roda_f   a roda da frente; pivô = o eixo, (0, 0,3, 0,52)
#   bmx_guidao   garfo, mesa, guidão e a placa do número (o que vira no barspin);
#                pivô = o eixo da direção, (0, 0, 0,45)
#   bmx_quadro   quadro, pedivela, coroa, corrente, banco e pegs; o referencial
#                do Ciclista (no tailwhip ele gira em torno do eixo da direção)
#
#   blender -b --factory-startup --python blender/scripts/rodas.py -- bruto.glb [rodas.blend]
#   blender -b --factory-startup --python blender/scripts/rodas_foto.py -- rodas.blend docs/blender/rodas.png
#   npx @gltf-transform/cli optimize bruto.glb public/models/rodas.glb \
#     --compress meshopt --simplify false --join false --flatten false --instance false --palette false
#
# Material do jogo: UM só (MAT_PECAS), tudo nos vértices:
#   COLOR_0 cor × AO assada · _RM (roughness, metalness) · _EMI o brilho
# Coordenadas no referencial do JOGO (x direita, y cima, z frente), convertidas
# pro Blender no fim. Orçamento: até 8 mil triângulos no total e 250 KB.

import bpy, bmesh, math, sys
from mathutils import Vector, Matrix, Color

TAU = 2 * math.pi
args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
SAIDA = args[0] if args else "/tmp/rodas-bruto.glb"
BLEND = args[1] if len(args) > 1 else None

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
COL = bpy.data.collections.new("Rodas")
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
    "madeira": ("#6b4a2e", 0.85, 0.0),
    "lixa": ("#1a1920", 1.0, 0.0),
    "lona": ("#c8c2b4", 0.9, 0.0),
    "vermelho": ("#b8322e", 0.5, 0.1),
    "rosaMetal": (MOTO, 0.4, 0.4),
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
GRUPOS = ("patins", "jato", "skate", "bmx_roda_t", "bmx_roda_f", "bmx_guidao", "bmx_quadro")
BUF = {g: {"v": [], "f": [], "m": []} for g in GRUPOS}
G = ["skate"]


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


X1 = Vector((1, 0, 0))


def Raios(n, r0, r1, xh, mat="aluminio", fase=0.0):
    """raios de roda (eixo X): do cubo (±xh) até o aro, alternando os lados"""
    for k in range(n):
        t = TAU * (k + fase) / n
        lado = 1 if k % 2 else -1
        a = Vector((lado * xh, r0 * math.cos(t), r0 * math.sin(t)))
        t2 = t + lado * 0.3
        b = Vector((0.0, r1 * math.cos(t2), r1 * math.sin(t2)))
        z = (b - a).normalized()
        xx = X1.cross(z).normalized()
        add(bm_caixa(0.007, 0.007, (b - a).length, sem=("+z", "-z")), mat, base((a + b) / 2, xx, z.cross(xx), z), 50)


def RodaPeq(c, r, larg, mat, seg=12, cubo="escuroMetal"):
    """rodinha de patins/skate com eixo em X: o poliuretano (neon) e o rolamento"""
    c = Vector(c)
    Cil(c - X1 * larg / 2, c + X1 * larg / 2, r, r, seg, mat, afiar=50)
    Cil(c - X1 * (larg / 2 + 0.003), c + X1 * (larg / 2 + 0.003), r * 0.42, r * 0.42, 6, cubo)


# ═══════════════ os patins (referencial da perna) ═══════════════
G[0] = "patins"
# a bota: um tênis de cano alto velho (lona gasta, biqueira e sola de borracha)
Redonda((0, -0.865, 0.06), (0.16, 0.11, 0.32), "plastico", n=(2, 2, 4), pot=4)
Redonda((0, -0.765, 0.0), (0.172, 0.15, 0.21), "lona", n=(2, 2, 2), pot=4)
Redonda((0, -0.875, 0.185), (0.165, 0.085, 0.11), "pneu", n=(2, 1, 2), pot=3)
Caixa((0, -0.927, 0.05), (0.17, 0.026, 0.34), "pneu")
# a alça de câmara de ar no peito do pé, com a fivela, e o cadarço rosa
Caixa((0, -0.8, 0.115), (0.176, 0.026, 0.06), "pneu", r=(-0.55, 0, 0))
Caixa((0.09, -0.8, 0.115), (0.01, 0.034, 0.034), "cromo", r=(-0.55, 0, 0))
for k in range(3):
    Caixa((0, -0.84 + k * 0.03, 0.13 - k * 0.035), (0.1, 0.008, 0.012), "motoFosco", r=(-0.6, 0, 0))
# o neon da sola (uma fita de cada lado)
for s in (-1, 1):
    Caixa((s * 0.087, -0.913, 0.05), (0.006, 0.008, 0.3), "neon")
# o chassi: duas chapas cortadas (uma de alumínio, a outra de zinco), rebitadas
for s in (-1, 1):
    Mp = base((s * 0.032, 0, 0), Vector((0, 0, 1)), Vector((0, 1, 0)), Vector((1, 0, 0)))
    Perfil([(-0.11, -0.94), (0.21, -0.94), (0.195, -0.978), (-0.095, -0.978)], 0.008, Mp, "aluminio" if s < 0 else "zinco")
    Rebites([(s * 0.037, -0.952, z) for z in (-0.09, 0.05, 0.19)], s=0.009)
# as rodas: quatro de neon (uma rosa, de outro patins), eixo no meio de cada uma
for i, z in enumerate((-0.07, 0.01, 0.09, 0.17)):
    RodaPeq((0, -0.97, z), 0.036, 0.044, "neonRosa" if i == 2 else "neon")
    Cil((-0.036, -0.97, z), (0.036, -0.97, z), 0.006, 0.006, 6, "cromo")
# o freio do calcanhar: um toco de pneu
Cil((0, -0.945, -0.12), (0, -0.975, -0.165), 0.026, 0.024, 8, "pneu")

# ═══════════════ o jato (referencial do corpo do Patinador) ═══════════════
G[0] = "jato"
# a chapa das costas: pedaço de placa de rua, rebitada
Caixa((0, 1.37, -0.142), (0.27, 0.34, 0.014), "azul")
Rebites([(sx * 0.12, y, -0.151) for sx in (-1, 1) for y in (1.22, 1.52)])
# dois cilindros de sucata: um extintor vermelho e um botijão de zinco
for sx, mat in ((-1, "vermelho"), (1, "zinco")):
    x = sx * 0.075
    Cil((x, 1.25, -0.215), (x, 1.5, -0.215), 0.056, 0.056, 12, mat, afiar=50)
    Redonda((x, 1.5, -0.215), (0.112, 0.05, 0.112), mat, n=(2, 1, 2), pot=2.2)
    Redonda((x, 1.25, -0.215), (0.112, 0.04, 0.112), mat, n=(2, 1, 2), pot=2.2)
    Cil((x, 1.52, -0.215), (x, 1.555, -0.215), 0.014, 0.014, 6, "cromo")   # a válvula
    ToroEixo((x, 1.4, -0.215), (0, 1, 0), 0.058, 0.006, 0.006, 12, 3, "neon")  # o anel neon
    ToroEixo((x, 1.31, -0.215), (0, 1, 0), 0.058, 0.004, 0.012, 12, 3, "escuroMetal")  # a cinta
    # o cano até o bocal
    Tubo([(x, 1.24, -0.215), (sx * 0.05, 1.215, -0.22), (sx * 0.012, 1.215, -0.22)], 0.016, 6, "escape")
# o manômetro no extintor
Cil((-0.075, 1.45, -0.27), (-0.075, 1.45, -0.285), 0.022, 0.022, 10, "cromo")
Cil((-0.075, 1.45, -0.284), (-0.075, 1.45, -0.288), 0.017, 0.017, 10, "farol")
# o bocal (sino de escape) com o anel neon na boca: a chama do código sai daqui
Cil((0, 1.235, -0.22), (0, 1.195, -0.22), 0.03, 0.03, 10, "escape")
Cil((0, 1.2, -0.22), (0, 1.155, -0.22), 0.038, 0.058, 12, "escuroMetal", tampa=False)
Cil((0, 1.19, -0.22), (0, 1.185, -0.22), 0.045, 0.045, 10, "neon")
ToroEixo((0, 1.158, -0.22), (0, 1, 0), 0.058, 0.007, 0.007, 12, 3, "neon")
# o fio neon rosa da válvula ao bocal
Tubo([(0.075, 1.555, -0.24), (0.14, 1.45, -0.27), (0.13, 1.28, -0.26), (0.03, 1.2, -0.25)], 0.005, 4, "neonRosa", afiar=None)
# as alças: câmara de ar de bicicleta por cima dos ombros
for sx in (-1, 1):
    Fita([(sx * 0.1, 1.5, -0.15), (sx * 0.1, 1.567, -0.09), (sx * 0.1, 1.567, 0.07), (sx * 0.1, 1.48, 0.137), (sx * 0.1, 1.16, 0.137)],
         0.035, 0.008, "pneu", cima=(1, 0, 0), afiar=60)
Caixa((0, 1.36, 0.14), (0.22, 0.022, 0.008), "pneu")          # a tira do peito
Caixa((0, 1.36, 0.145), (0.035, 0.03, 0.01), "cromo")

# ═══════════════ o skate (referencial da prancha) ═══════════════
G[0] = "skate"
# o shape: uma tábua velha com os bicos, a lixa por cima
sh = [(0, 0.175, -0.45), (0, 0.15, -0.405), (0, 0.13, -0.33), (0, 0.13, 0.33), (0, 0.15, 0.405), (0, 0.175, 0.45)]
Fita(sh, [0.17, 0.235, 0.26, 0.26, 0.235, 0.17], 0.026, "madeira", afiar=35)
Fita([(x, y + 0.015, z) for x, y, z in sh], [0.15, 0.215, 0.24, 0.24, 0.215, 0.15], 0.004, "lixa", afiar=35)
# embaixo: um pedaço de placa de rua azul com a borda branca
Caixa((0, 0.114, 0), (0.22, 0.005, 0.5), "azul")
for s in (-1, 1):
    Caixa((s * 0.1, 0.112, 0), (0.012, 0.005, 0.5), "plastico")
# o remendo de zinco no bico, rebitado, e a fita prata no rabo
Perfil([(-0.07, -0.05), (0.08, -0.06), (0.07, 0.05), (-0.06, 0.04)], 0.004, base((0, 0.146, 0.33), X1, Vector((0, 0, 1)), Vector((0, -1, 0))), "zinco")
Rebites([(-0.05, 0.147, 0.29), (0.06, 0.147, 0.29), (0.05, 0.147, 0.37), (-0.05, 0.147, 0.37)], s=0.008)
Caixa((0, 0.148, -0.36), (0.25, 0.006, 0.05), "fita", r=(-0.3, 0, 0))
# o neon nas bordas
for s in (-1, 1):
    Caixa((s * 0.131, 0.13, 0), (0.006, 0.012, 0.6), "neon")
# os trucks: pad de borracha, base, amortecedor rosa, a barra e o eixo; as rodas neon
for z in (-0.28, 0.28):
    sz = 1 if z > 0 else -1
    Caixa((0, 0.112, z), (0.075, 0.008, 0.1), "pneu")
    Caixa((0, 0.1, z), (0.065, 0.016, 0.085), "aluminio")
    Cil((0, 0.095, z - sz * 0.01), (0, 0.07, z - sz * 0.02), 0.017, 0.017, 8, "motoFosco")
    Viga((-0.09, 0.062, z), (0.09, 0.062, z), 0.035, 0.03, "cromo", cima=(0, 0, 1))
    Cil((-0.13, 0.05, z), (0.13, 0.05, z), 0.007, 0.007, 6, "cromo")
    for x in (-0.1, 0.1):
        RodaPeq((x, 0.05, z), 0.05, 0.05, "neonRosa" if (x < 0 and z > 0) else "neon")

# ═══════════════ a BMX ═══════════════
def roda_bmx(tras):
    SEG = 24
    ToroEixo((0, 0, 0), (1, 0, 0), 0.268, 0.034, 0.032, SEG, 6, "pneu")
    # o aro: um de cada bicicleta (o de trás escuro, o da frente cromado)
    ToroEixo((0, 0, 0), (1, 0, 0), 0.226, 0.012, 0.018, SEG, 4, "escuroMetal" if tras else "cromo", 0.5, afiar=50)
    ToroEixo((0, 0, 0), (1, 0, 0), 0.212, 0.005, 0.012, SEG, 3, "neon")
    Cil((-0.05, 0, 0), (0.05, 0, 0), 0.022, 0.022, 8, "cromo")
    Raios(12, 0.02, 0.215, 0.04)
    if tras:  # a catraca (lado direito)
        Cil((0.052, 0, 0), (0.06, 0, 0), 0.04, 0.04, 10, "ferrugem")


G[0] = "bmx_roda_t"
roda_bmx(True)
G[0] = "bmx_roda_f"
roda_bmx(False)

# ── o guidão (pivô: o eixo da direção em z = 0,45; a roda da frente em (0, 0,3, 0,07)) ──
G[0] = "bmx_guidao"
Caixa((0, 0.635, 0.0), (0.13, 0.03, 0.05), "cromo")                          # a mesa do garfo
for s in (-1, 1):
    Cil((s * 0.055, 0.635, 0.0), (s * 0.05, 0.3, 0.07), 0.013, 0.012, 6, "cromo")
    Caixa((s * 0.05, 0.3, 0.07), (0.008, 0.035, 0.035), "escuroMetal")
Cil((0, 0.62, 0), (0, 0.84, 0), 0.014, 0.014, 6, "escuroMetal")               # a coluna
Caixa((0, 0.835, -0.02), (0.05, 0.04, 0.07), "escuroMetal")                   # a mesa
# o guidão alto (cromo), as manoplas e as ponteiras neon rosa
for s in (-1, 1):
    Tubo([(s * 0.025, 0.835, -0.03), (s * 0.07, 0.86, -0.04), (s * 0.12, 0.87, -0.045), (s * 0.31, 0.875, -0.05)], 0.011, 6, "cromo")
    Cil((s * 0.22, 0.874, -0.048), (s * 0.3, 0.875, -0.05), 0.017, 0.017, 8, "escuro")
    Cil((s * 0.3, 0.875, -0.05), (s * 0.312, 0.875, -0.05), 0.019, 0.019, 8, "neonRosa")
# a placa do número: um retalho de placa de rua, moldura neon, o número em branco
MPl = base((0, 0.77, 0.035), X1, Vector((0, 1, 0)), Vector((0, 0, 1)))
Perfil([(-0.1, -0.06), (0.1, -0.06), (0.11, 0.05), (0.08, 0.075), (-0.08, 0.075), (-0.11, 0.05)], 0.008, MPl, "azul")
for (u, v, w, h) in ((0, -0.064, 0.2, 0.008), (0, 0.078, 0.16, 0.008), (-0.106, 0.0, 0.008, 0.1), (0.106, 0.0, 0.008, 0.1)):
    Caixa((u, v, 0.006), (w, h, 0.006), "neon", M=MPl)
for (u, v, w, h) in ((-0.035, 0.0, 0.016, 0.08), (0.03, 0.03, 0.05, 0.014), (0.03, 0.0, 0.05, 0.014), (0.03, -0.03, 0.05, 0.014), (0.048, 0.015, 0.014, 0.03), (0.012, -0.015, 0.014, 0.03)):
    Caixa((u, v, 0.006), (w, h, 0.004), "plastico", M=MPl)   # "12"
Viga((0, 0.8, 0.03), (0, 0.835, 0.0), 0.02, 0.01, "escuroMetal")

# ── o quadro (referencial do Ciclista) ──
G[0] = "bmx_quadro"
HT0, HT1 = Vector((0, 0.65, 0.45)), Vector((0, 0.8, 0.45))
BB = Vector((0, 0.3, -0.05))
SC = Vector((0, 0.62, -0.27))
Cil(HT0, HT1, 0.025, 0.025, 10, "rosaMetal")                                  # a caixa de direção
Tubo([(0, 0.765, 0.43), (0, 0.735, 0.1), SC + Vector((0, 0.01, 0))], 0.017, 6, "rosaMetal")   # o tubo de cima
Cil((0, 0.68, 0.44), BB + Vector((0, 0.01, 0.01)), 0.02, 0.02, 8, "rosaMetal")                # o de baixo
Cil(BB, (0, 0.66, -0.29), 0.017, 0.017, 8, "rosaMetal")                       # o do selim
for s in (-1, 1):
    mat = "rosaMetal" if s > 0 else "ferrugem"   # um lado trocado por tubo velho (sucata)
    Cil((s * 0.03, 0.3, -0.06), (s * 0.06, 0.3, -0.5), 0.011, 0.011, 6, mat)
    Cil((s * 0.035, 0.6, -0.27), (s * 0.06, 0.31, -0.49), 0.01, 0.01, 6, mat)
    Caixa((s * 0.06, 0.3, -0.5), (0.008, 0.045, 0.045), "escuroMetal")
    # os pegs de trás: cano de sucata
    Cil((s * 0.065, 0.3, -0.5), (s * 0.15, 0.3, -0.5), 0.022, 0.022, 8, "zinco" if s > 0 else "ferrugem")
# o reforço de chapa de zinco rebitada entre os tubos da frente
Perfil([(0.0, 0.0), (-0.12, 0.08), (-0.1, -0.03)], 0.01, base((0.0, 0.69, 0.43), Vector((0, 0, 1)), Vector((0, 1, 0)), Vector((-1, 0, 0))), "zinco")
Rebites([(0.008, 0.72, 0.36), (0.008, 0.68, 0.37)], s=0.008)
# o movimento central, a coroa dourada, os pedivelas e os pegs do meio (onde o piloto pisa)
Cil((-0.045, 0.3, -0.05), (0.045, 0.3, -0.05), 0.024, 0.024, 8, "escuroMetal")
Cil((0.05, 0.3, -0.05), (0.058, 0.3, -0.05), 0.075, 0.075, 14, "garfo")
ToroEixo((0.062, 0.3, -0.05), (1, 0, 0), 0.05, 0.004, 0.004, 12, 3, "neonRosa")
Viga((0.072, 0.3, -0.05), (0.072, 0.3, 0.12), 0.018, 0.02, "cromo")
Viga((-0.072, 0.3, -0.05), (-0.072, 0.3, -0.22), 0.018, 0.02, "cromo")
for s in (-1, 1):
    Cil((s * 0.085, 0.3, -0.05), (s * 0.21, 0.3, -0.05), 0.022, 0.022, 8, "zinco")
Caixa((0.1, 0.3, 0.12), (0.06, 0.016, 0.08), "escuro")
Caixa((-0.1, 0.3, -0.22), (0.06, 0.016, 0.08), "escuro")
# a corrente (lado direito)
Viga((0.056, 0.373, -0.05), (0.056, 0.338, -0.5), 0.008, 0.008, "escuroMetal")
Viga((0.056, 0.227, -0.05), (0.056, 0.262, -0.5), 0.008, 0.008, "escuroMetal")
# o selim com fita prata e o canote
Cil(SC, (0, 0.665, -0.3), 0.012, 0.012, 6, "cromo")
Redonda((0, 0.675, -0.31), (0.1, 0.05, 0.22), "banco", n=(2, 1, 4), pot=4)
Caixa((0, 0.678, -0.27), (0.104, 0.054, 0.035), "fita")
# o neon amarrado embaixo do tubo de baixo (com as abraçadeiras) e um rosa no de cima
Tubo([(0, 0.645, 0.4), (0, 0.32, 0.0)], 0.006, 4, "neon", afiar=None)
for t in (0.2, 0.5, 0.8):
    p = Vector((0, 0.645, 0.4)).lerp(Vector((0, 0.32, 0.0)), t)
    Caixa(tuple(p), (0.045, 0.012, 0.012), "escuro", r=(math.atan2(0.4, 0.325), 0, 0))
Tubo([(0.016, 0.75, 0.36), (0.016, 0.735, 0.1), (0.016, 0.66, -0.2)], 0.005, 4, "neonRosa", afiar=None)

# ═══════════════ monta os objetos ═══════════════
# PIVO: onde o código põe cada grupo (a malha já está no referencial dele).
# FOTO: onde cada veículo fica no .blend (pra AO e pra foto, lado a lado)
PIVO = {"patins": (0, 0, 0), "jato": (0, 0, 0), "skate": (0, 0, 0), "bmx_roda_t": (0, 0.3, -0.5), "bmx_roda_f": (0, 0.3, 0.52),
        "bmx_guidao": (0, 0, 0.45), "bmx_quadro": (0, 0, 0)}
FOTO = {"patins": (-1.35, 1.005, 0.1), "jato": (-1.95, -1.155, -0.1), "skate": (0, 0, 0)}
for g in ("bmx_roda_t", "bmx_roda_f", "bmx_guidao", "bmx_quadro"):
    FOTO[g] = (1.45, 0, 0)
CB = Matrix(((1, 0, 0), (0, 0, -1), (0, 1, 0)))                 # jogo (x, y, z) → Blender (x, -z, y)

mt = bpy.data.materials.new("rodas_pecas")
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
    o.location = CB @ (Vector(PIVO[g]) + Vector(FOTO[g]))
    OBJ[g] = o

vl = bpy.context.view_layer
vl.update()

# ── a AO assada na cor dos vértices (Cycles), com o chão embaixo ──
for o in OBJ.values():
    ao = o.data.color_attributes.new("AO", "FLOAT_COLOR", "CORNER")
    o.data.color_attributes.active_color = ao
mc = bpy.data.meshes.new("chao_bake")
mc.from_pydata([(-6, -6, 0), (6, -6, 0), (6, 6, 0), (-6, 6, 0)], [], [(0, 1, 2, 3)])
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
sc.world.light_settings.distance = 0.12
vl.update()
for o in sc.objects:
    o.select_set(False)
for o in OBJ.values():
    o.select_set(True)
vl.objects.active = OBJ["skate"]
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
        a = 0.35 + 0.65 * ac[i * 4]
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

# os nós vão na origem: a malha já está no referencial do pivô
for o in OBJ.values():
    o.location = (0, 0, 0)
vl.update()
for o in sc.objects:
    o.select_set(False)
for o in OBJ.values():
    o.select_set(True)
vl.objects.active = OBJ["skate"]
print(bpy.ops.export_scene.gltf(filepath=SAIDA, export_format="GLB", use_selection=True, export_texcoords=False,
      export_normals=True, export_materials="EXPORT", export_yup=True, export_apply=True,
      export_vertex_color="ACTIVE", export_attributes=True))
tot = 0
for g, o in OBJ.items():
    t = sum(len(p.vertices) - 2 for p in o.data.polygons)
    tot += t
    print("TRI", g, t)
print("TRI total", tot)
