# Os 11 instrumentos ancestrais da casa da D-Bee (T49), modelados "à mão":
# djembê, tambor de água, udu, caxixi, sitar, didgeridoo, berimbau, flauta de
# bambu, ocarina, handpan, kalimba. Reconstrói tudo do zero na coleção
# "Instrumentos". Depois: instrumentos_bake.py (AO na cor dos vértices, uma
# malha por material, exporta) e instrumentos_foto.py (a foto).
#
# Headless (os três no mesmo Blender):
#   blender -b --factory-startup --python blender/scripts/instrumentos.py \
#     --python blender/scripts/instrumentos_bake.py \
#     --python blender/scripts/instrumentos_foto.py -- blender/exports/instrumentos-bruto.glb
#
# Coordenadas: Blender Z pra cima, a frente é -Y (o exportador glTF troca pra
# Y pra cima, frente +Z). Cada instrumento em metros, tamanho real, origem na
# base (z = 0), centrado em x/y. Cada peça leva o instrumento ("inst") e o
# grupo de material (madeira, barro, metal, palha, couro, corda, agua).
#
# Orçamento: o arquivo inteiro até 25 mil triângulos (sem decimate: a
# contagem sai da modelagem, anel por anel). Os detalhes finos (cordas, trastes,
# lamelas) ficam um pouco mais grossos que o real, pra ler no tamanho do jogo.

import bpy, bmesh, math
from mathutils import Vector, Matrix, Color

TAU = 2 * math.pi
NOME = "Instrumentos"
IDS = ["djembe", "tambor-agua", "udu", "caxixi", "sitar", "didgeridoo",
       "berimbau", "flauta-bambu", "ocarina", "handpan", "kalimba"]

# ── limpa ──
for o in list(bpy.data.objects):
    bpy.data.objects.remove(o, do_unlink=True)
for c in list(bpy.data.collections):
    bpy.data.collections.remove(c)
for m in list(bpy.data.meshes):
    bpy.data.meshes.remove(m)
COL = bpy.data.collections.new(NOME)
bpy.context.scene.collection.children.link(COL)


def lin(h):
    if not isinstance(h, str):
        return tuple(h)
    c = Color((int(h[1:3], 16) / 255, int(h[3:5], 16) / 255, int(h[5:7], 16) / 255))
    c = c.from_srgb_to_scene_linear()
    return (c.r, c.g, c.b, 1.0)


def mistura(a, b, t):
    a, b = lin(a), lin(b)
    return tuple(a[i] + (b[i] - a[i]) * t for i in range(3)) + (1.0,)


def ruido(p, f=40.0):
    x, y, z = p[0] * f, p[1] * f, p[2] * f
    return (math.sin(x * 1.7 + y * 0.3 + 0.4) * math.cos(y * 1.3 - z * 0.7)
            + 0.5 * math.sin(z * 2.1 + x * 0.9 + 1.3)) / 1.5


def T(x, y, z):
    return Matrix.Translation((x, y, z))


def S(x, y, z):
    return Matrix.Diagonal((x, y, z, 1.0))


def Rx(a):
    return Matrix.Rotation(a, 4, "X")


def Ry(a):
    return Matrix.Rotation(a, 4, "Y")


def Rz(a):
    return Matrix.Rotation(a, 4, "Z")


def para(d):
    # rotação que leva o +Z local pra direção d
    return Vector((0, 0, 1)).rotation_difference(Vector(d).normalized()).to_matrix().to_4x4()


# ── materiais (um por grupo; a cor vem do atributo "Col", que o bake cria) ──
PARAM = {
    "madeira": (0.62, 0.0), "barro": (0.85, 0.0), "metal": (0.32, 0.85),
    "palha": (0.85, 0.0), "couro": (0.7, 0.0), "corda": (0.9, 0.0), "agua": (0.06, 0.0),
}


def material(grupo):
    nome = "inst_" + grupo
    m = bpy.data.materials.get(nome)
    if m:
        return m
    m = bpy.data.materials.new(nome)
    try:
        m.use_nodes = True
    except Exception:
        pass
    nt = m.node_tree
    b = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    a = nt.nodes.new("ShaderNodeVertexColor")
    a.layer_name = "Col"
    nt.links.new(a.outputs["Color"], b.inputs["Base Color"])
    rough, metal = PARAM[grupo]
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    m["grupo"] = grupo
    return m


# ── geradores (bmesh) ──
def torno(perfil, seg, cores=None, fase=0.0, mat=None, desloca=None):
    """Gira um perfil [(raio, altura), ...] em volta do Z. O perfil anda com o
    sólido à esquerda (de baixo pra cima por fora, de cima pra baixo por dentro)
    e as normais saem certas. Raio 0 vira polo. `cores`: uma por ponto.
    `desloca(i, k)`: soma no raio (trançado, irregular)."""
    bm = bmesh.new()
    vc = bm.verts.layers.float_color.new("vc") if cores else None
    ik = bm.faces.layers.int.new("ik")
    aneis = []
    for i, (r, h) in enumerate(perfil):
        if r < 1e-7:
            v = bm.verts.new((0, 0, h))
            anel = [v] * seg
        else:
            anel = []
            for k in range(seg):
                a = TAU * k / seg + fase
                rr = r + (desloca(i, k) if desloca else 0.0)
                anel.append(bm.verts.new((rr * math.cos(a), rr * math.sin(a), h)))
        if vc:
            c = lin(cores[i])
            for v in set(anel):
                v[vc] = c
        aneis.append(anel)
    for i in range(len(aneis) - 1):
        A, B = aneis[i], aneis[i + 1]
        for k in range(seg):
            q = [A[k], A[(k + 1) % seg], B[(k + 1) % seg], B[k]]
            u = []
            for v in q:
                if v not in u:
                    u.append(v)
            if len(u) < 3:
                continue
            f = bm.faces.new(u)
            f[ik] = i * 1000 + k
    if mat is not None:
        bmesh.ops.transform(bm, matrix=mat, verts=bm.verts)
    return bm


def tubo(pts, raios, lados, tampa=(False, False), fase=0.0, desloca=None, mat=None):
    """Um tubo por uma lista de pontos (transporte paralelo). Faces das tampas
    levam i = -1 (começo) e i = n (fim)."""
    pts = [Vector(p) for p in pts]
    n = len(pts)
    if isinstance(raios, (int, float)):
        raios = [raios] * n
    Tg = []
    for i in range(n):
        Tg.append((pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)]).normalized())
    a = Vector((0, 0, 1)) if abs(Tg[0].z) < 0.9 else Vector((1, 0, 0))
    N = [(a - Tg[0] * a.dot(Tg[0])).normalized()]
    for i in range(1, n):
        nn = N[-1] - Tg[i] * N[-1].dot(Tg[i])
        N.append(nn.normalized() if nn.length > 1e-8 else N[-1])
    bm = bmesh.new()
    ik = bm.faces.layers.int.new("ik")
    aneis = []
    for i in range(n):
        b = Tg[i].cross(N[i])
        anel = []
        for k in range(lados):
            ang = TAU * k / lados + fase
            r = raios[i] * (1 + (desloca(i, k) if desloca else 0.0))
            anel.append(bm.verts.new(pts[i] + r * (math.cos(ang) * N[i] + math.sin(ang) * b)))
        aneis.append(anel)
    for i in range(n - 1):
        A, B = aneis[i], aneis[i + 1]
        for k in range(lados):
            f = bm.faces.new((A[k], A[(k + 1) % lados], B[(k + 1) % lados], B[k]))
            f[ik] = i * 1000 + k
    if tampa[0]:
        c = bm.verts.new(pts[0])
        R0 = aneis[0]
        for k in range(lados):
            f = bm.faces.new((c, R0[(k + 1) % lados], R0[k]))
            f[ik] = -1000 + k
    if tampa[1]:
        c = bm.verts.new(pts[-1])
        R1 = aneis[-1]
        for k in range(lados):
            f = bm.faces.new((R1[k], R1[(k + 1) % lados], c))
            f[ik] = n * 1000 + k
    if mat is not None:
        bmesh.ops.transform(bm, matrix=mat, verts=bm.verts)
    return bm


def anel(R, r, seg, lados, mat=None):
    """Um toro deitado no plano XY (eixo Z)."""
    bm = bmesh.new()
    ik = bm.faces.layers.int.new("ik")
    vs = []
    for k in range(seg):
        a = TAU * k / seg
        linha = []
        for j in range(lados):
            p = TAU * j / lados
            rr = R + r * math.cos(p)
            linha.append(bm.verts.new((rr * math.cos(a), rr * math.sin(a), r * math.sin(p))))
        vs.append(linha)
    for k in range(seg):
        A, B = vs[k], vs[(k + 1) % seg]
        for j in range(lados):
            f = bm.faces.new((A[j], B[j], B[(j + 1) % lados], A[(j + 1) % lados]))
            f[ik] = k * 1000 + j
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    if mat is not None:
        bmesh.ops.transform(bm, matrix=mat, verts=bm.verts)
    return bm


def caixa(dims, mat=None, chanfro=0.0, passos=1, cortes=None):
    bm = bmesh.new()
    bm.faces.layers.int.new("ik")
    bmesh.ops.create_cube(bm, size=1.0, matrix=S(*dims))
    if cortes:
        eixo, n = cortes
        es = [e for e in bm.edges if abs((e.verts[0].co - e.verts[1].co)[eixo]) > 1e-6]
        bmesh.ops.subdivide_edges(bm, edges=es, cuts=n, use_grid_fill=True)
    if chanfro:
        es = [e for e in bm.edges if e.is_manifold and e.calc_face_angle(0) > 1.0]
        bmesh.ops.bevel(bm, geom=es, offset=chanfro, segments=passos, affect="EDGES",
                        profile=0.5, clamp_overlap=True)
    if mat is not None:
        bmesh.ops.transform(bm, matrix=mat, verts=bm.verts)
    return bm


def furo(raio, seg=8, fundo=0.0015, alonga=1.0, fase=0.0):
    """Um furo: disco escuro um pouco afundado (normal +Z), pra colar na
    superfície. `alonga` estica no X."""
    return torno([(raio, 0.0), (raio * 0.55, -fundo * 0.6), (0.0, -fundo)], seg, fase=fase, mat=S(alonga, 1, 1))


ESCURO = "#0d0805"


def peca(inst, nome, bm, grupo, cor="#ffffff", cor_face=None, cor_vert=None, grao=0.0,
         freq=40.0, afiar=50):
    """Vira objeto. Cor: `cor_face(f, i, k)` (estampa por face, não simplifica)
    > `cor_vert(co)` > cores do torno > `cor`. `grao`: variação na cor pelo
    ruído da posição (madeira, cabaça, barro)."""
    if afiar is not None:
        es = [e for e in bm.edges if e.is_manifold and e.calc_face_angle(0) > math.radians(afiar)]
        if es:
            bmesh.ops.split_edges(bm, edges=es)
    ik = bm.faces.layers.int.get("ik")
    vc = bm.verts.layers.float_color.get("vc")
    base = bm.loops.layers.float_color.new("Base")
    c0 = lin(cor)
    for f in bm.faces:
        cf = None
        if cor_face:
            x = f[ik] if ik else 0
            i, k = (x // 1000, x % 1000) if x >= 0 else (-1, x + 1000)
            cf = lin(cor_face(f, i, k))
            if grao:
                g = 1 + grao * ruido(f.calc_center_median(), freq)
                cf = (cf[0] * g, cf[1] * g, cf[2] * g, 1.0)
        for l in f.loops:
            if cf:
                c = cf
            else:
                if cor_vert:
                    c = lin(cor_vert(l.vert.co))
                elif vc:
                    c = l.vert[vc]
                else:
                    c = c0
                if grao:
                    g = 1 + grao * ruido(l.vert.co, freq)
                    c = (c[0] * g, c[1] * g, c[2] * g, 1.0)
            l[base] = c
    me = bpy.data.meshes.new(f"{inst}.{nome}")
    bm.to_mesh(me)
    bm.free()
    for nome_at in ("vc", "ik"):
        at = me.attributes.get(nome_at)
        if at:
            me.attributes.remove(at)
    me.color_attributes.active_color = me.color_attributes["Base"]
    o = bpy.data.objects.new(f"{inst}.{nome}", me)
    COL.objects.link(o)
    me.materials.append(material(grupo))
    o["inst"] = inst
    o["grupo"] = grupo
    o["estampa"] = 1 if cor_face else 0
    me.shade_smooth()
    return o


def raio_em(perfil, z):
    pts = sorted(perfil, key=lambda p: p[1])
    for a, b in zip(pts, pts[1:]):
        if a[1] <= z <= b[1]:
            t = (z - a[1]) / max(b[1] - a[1], 1e-9)
            return a[0] + (b[0] - a[0]) * t
    return pts[-1][0] if z > pts[-1][1] else pts[0][0]


def suave(a, b, x):
    t = max(0.0, min(1.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


# ════════════════════════════════════════════════════════════════════════════
# DJEMBÊ — 60 cm, couro de cabra no bojo (Ø 34 cm), cintura fina, pé aberto;
# a corda azul desce em V do aro de cima ao de baixo
def djembe():
    I = "djembe"
    MAD, MAD2, DENTRO = "#6a3a1d", "#4e2a15", "#22140a"
    ext = [(0.126, 0.0), (0.131, 0.012), (0.124, 0.04), (0.103, 0.10), (0.083, 0.17), (0.070, 0.235),
           (0.069, 0.25), (0.077, 0.257), (0.077, 0.268), (0.069, 0.276),
           (0.071, 0.30), (0.083, 0.33), (0.104, 0.37), (0.129, 0.42), (0.149, 0.475), (0.161, 0.525),
           (0.166, 0.56), (0.168, 0.578)]
    dentro = [(0.0, 0.25), (0.055, 0.245), (0.08, 0.17), (0.098, 0.09), (0.107, 0.02), (0.111, 0.0)]
    perfil = dentro + ext + [(0.15, 0.58), (0.0, 0.58)]
    cores = [DENTRO] * len(dentro) + [MAD2, MAD2] + [MAD] * (len(ext) - 2) + [MAD, MAD]
    peca(I, "corpo", torno(perfil, 24, cores), "madeira", grao=0.12, freq=30)
    # o couro: domo raso, a borda desce irregular por fora do aro
    pele = [(0.174, 0.546), (0.176, 0.556), (0.175, 0.568), (0.170, 0.579), (0.155, 0.584), (0.10, 0.588), (0.0, 0.589)]
    bm = torno(pele, 24, ["#a8875a", "#bea072", "#cdb184", "#dcc596", "#e3cfa3", "#e6d4ab", "#e8d7af"])
    for v in bm.verts:
        if v.co.z < 0.55:
            v.co.z += 0.005 * ruido(v.co, 90)
    peca(I, "couro", bm, "couro", grao=0.05, freq=60)
    CORDA = "#2b4f9c"
    rb = raio_em(ext, 0.40) + 0.004
    peca(I, "aro_cima", anel(0.1805, 0.0042, 32, 5, T(0, 0, 0.557)), "corda", CORDA)
    peca(I, "aro_baixo", anel(rb, 0.0042, 28, 5, T(0, 0, 0.40)), "corda", CORDA)
    n = 20
    for j in range(n):
        at = TAU * j / n
        ab = TAU * (j + (0.5 if j % 2 == 0 else -0.5)) / n
        pts = []
        for s in range(4):
            t = s / 3
            z = 0.552 + (0.405 - 0.552) * t
            a = at + (ab - at) * t
            r = (0.177 if z > 0.546 else raio_em(ext, z)) + 0.0036
            pts.append((r * math.cos(a), r * math.sin(a), z))
        peca(I, f"corda{j}", tubo(pts, 0.0026, 4), "corda", CORDA, afiar=None)


# TAMBOR DE ÁGUA — meia cabaça grande (Ø 56 cm) com água, e outra cabaça
# virada boiando, com a faixa pirografada
def tambor_agua():
    I = "tambor-agua"
    CAB, CABE, DENTRO = "#b9843f", "#8c5a26", "#d6b27a"
    perfil = [(0, 0.0), (0.07, 0.003), (0.15, 0.022), (0.21, 0.055), (0.25, 0.10), (0.272, 0.15),
              (0.28, 0.195), (0.279, 0.212), (0.272, 0.218), (0.266, 0.205), (0.26, 0.18), (0.253, 0.15)]
    cores = [CABE, CABE, CAB, CAB, CAB, CAB, CAB, CAB, DENTRO, DENTRO, DENTRO, DENTRO]
    peca(I, "bacia", torno(perfil, 32, cores), "madeira", grao=0.1, freq=18)
    peca(I, "agua", torno([(0.259, 0.172), (0.17, 0.172), (0.0, 0.172)], 32), "agua", "#1d4352")
    boia = [(0.135, 0.162), (0.134, 0.18), (0.128, 0.205), (0.112, 0.228), (0.088, 0.246), (0.055, 0.258), (0.0, 0.263)]
    PIRO, CLARA = "#4a2a12", "#c99650"

    def piro(f, i, k):
        if i == 1:
            return PIRO if k % 2 == 0 else CLARA
        if i == 2:
            return PIRO if k % 2 == 1 else CLARA
        if i == 3:
            return "#8a5a28"
        return CLARA if i > 0 else CABE
    peca(I, "boia", torno(boia, 24, mat=T(0.03, -0.02, 0) @ Rx(0.06)), "madeira", cor_face=piro, grao=0.06, freq=25)


# UDU — o pote de barro (40 cm): a boca em cima e o furo do lado, com a
# fileira de pelotas no ombro e o pé esfumaçado
def udu():
    I = "udu"
    B, BE, PRETO = "#9a4626", "#5e2614", "#140805"
    perfil = [(0, 0.0), (0.05, 0.0), (0.088, 0.012), (0.122, 0.045), (0.146, 0.10), (0.152, 0.155),
              (0.146, 0.205), (0.128, 0.25), (0.10, 0.285), (0.068, 0.31), (0.045, 0.33), (0.037, 0.355),
              (0.039, 0.378), (0.047, 0.392), (0.046, 0.40), (0.036, 0.402), (0.029, 0.39), (0.027, 0.36),
              (0.03, 0.335), (0, 0.33)]
    cores = [BE, BE, BE, "#7a3519", B, B, B, B, B, B, B, B, B, B, B, "#5a2412", PRETO, PRETO, PRETO, PRETO]
    peca(I, "pote", torno(perfil, 22, cores), "barro", grao=0.1, freq=22)
    gola = [(0.034, -0.012), (0.036, 0.006), (0.033, 0.016), (0.026, 0.019), (0.021, 0.012), (0.019, 0.0), (0.0, -0.006)]
    peca(I, "furo", torno(gola, 14, [B, B, B, "#5a2412", PRETO, PRETO, PRETO], mat=T(0, -0.148, 0.165) @ Rx(math.pi / 2)),
         "barro", grao=0.08, freq=22)
    for j in range(10):
        a = TAU * j / 10 + 0.3
        r = raio_em(perfil[:15], 0.258) - 0.002
        bm = bmesh.new()
        bm.faces.layers.int.new("ik")
        bmesh.ops.create_uvsphere(bm, u_segments=6, v_segments=4, radius=0.011,
                                  matrix=T(r * math.cos(a), r * math.sin(a), 0.258) @ para((math.cos(a), math.sin(a), 0.5)) @ S(1, 1, 0.6))
        peca(I, f"pelota{j}", bm, "barro", "#a8522c", afiar=None)


# CAXIXI — o chocalho de palha trançada (19 cm) com o fundo de cabaça e a alça
def caxixi():
    I = "caxixi"
    P1, P2, PE = "#d2ad66", "#9e773a", "#6e4e22"
    peca(I, "fundo", torno([(0, 0.0), (0.052, 0.0), (0.0535, 0.006), (0.05, 0.0085), (0, 0.0085)], 20), "madeira", "#7a4a22", grao=0.1)
    guia = [(0.0505, 0.006), (0.051, 0.02), (0.0495, 0.045), (0.045, 0.07), (0.038, 0.095), (0.03, 0.118),
            (0.022, 0.138), (0.016, 0.155), (0.0135, 0.168)]
    # a trama: 14 fileiras de palha (o perfil guia reamostrado), 28 em volta
    zs = [0.006 + (0.168 - 0.006) * j / 14 for j in range(15)]
    perfil = [(raio_em(guia, z), z) for z in zs] + [(0.013, 0.178), (0.0, 0.181)]

    def trama(i, k):
        return 0.0011 * (1 if (i + k) % 2 == 0 else -1) if 0 < i < 14 else 0.0

    def xadrez(f, i, k):
        if i >= 13:
            return PE
        return P1 if (i + k) % 2 == 0 else P2
    peca(I, "trama", torno(perfil, 28, desloca=trama), "palha", cor_face=xadrez, grao=0.05, freq=80)

    def listra(f, i, k):
        return P1 if i % 2 == 0 else P2
    peca(I, "alca", anel(0.026, 0.0055, 22, 6, T(0, 0, 0.203) @ Rx(math.pi / 2)), "palha", cor_face=listra)
    peca(I, "amarra", anel(0.0145, 0.0028, 16, 4, T(0, 0, 0.168)), "corda", "#5a3a1c")


# SITAR — 1,22 m: a cabaça grande (Ø 38 cm) com o tampo, o braço longo com 18
# trastes em arco, 7 cordas, as cravelhas grandes e as pequenas (as cordas que
# vibram sozinhas), e a cabaça pequena atrás da cabeça
def sitar():
    I = "sitar"
    CAB, CABE = "#c48d47", "#8e5c2a"
    MAD, MADC, MADE = "#5a2f16", "#84502a", "#36190b"
    OSSO, ACO = "#efe6d0", "#d8d4c8"
    R, corte, cz = 0.19, 0.088, 0.181
    hs = [-R, -0.183, -0.165, -0.135, -0.095, -0.05, 0.0, 0.04, 0.07, corte]
    perfil = [(math.sqrt(max(R * R - h * h, 0)) if i > 0 else 0.0, h) for i, h in enumerate(hs)]
    cores = [mistura(CABE, CAB, i / (len(hs) - 1)) for i in range(len(hs))]
    gir = T(0, 0, cz) @ S(1, 1, 0.95) @ Rx(math.pi / 2)
    peca(I, "cabaca", torno(perfil, 22, cores, mat=gir), "madeira", grao=0.1, freq=20)
    rt = math.sqrt(R * R - corte * corte)
    tampo = [(rt + 0.001, -0.004), (rt + 0.003, 0.003), (rt - 0.001, 0.008), (0.12, 0.011), (0.0, 0.012)]

    def tampo_cor(f, i, k):
        return OSSO if i <= 1 else MADC
    peca(I, "tampo", torno(tampo, 22, mat=T(0, -corte, cz) @ S(1, 1, 0.95) @ Rx(math.pi / 2)), "madeira",
         cor_face=tampo_cor, grao=0.05)
    # cavalete e estandarte (osso), pestana
    peca(I, "cavalete", caixa((0.056, 0.012, 0.012), T(0, -0.104, 0.13), 0.002), "madeira", OSSO)
    peca(I, "estandarte", caixa((0.03, 0.012, 0.01), T(0, -0.098, 0.032), 0.002), "madeira", OSSO)
    nut = 1.085
    peca(I, "pestana", caixa((0.084, 0.007, 0.008), T(0, -0.089, nut), 0.0015), "madeira", OSSO)
    # o braço: caixa oca de 84 cm, a escala clara na frente
    def braco_cor(f, i, k):
        n = f.normal
        return MADC if n.y < -0.9 else MAD
    peca(I, "braco", caixa((0.084, 0.07, 0.84), T(0, -0.05, 0.75), 0.004, 1, (2, 8)), "madeira", cor_face=braco_cor, grao=0.06, freq=30)
    gulu = [(0.066, 0.30), (0.07, 0.33), (0.064, 0.36), (0.054, 0.39), (0.05, 0.405), (0.054, 0.415), (0.048, 0.43), (0.046, 0.445)]

    def gulu_cor(f, i, k):
        return OSSO if i == 4 else MADE
    peca(I, "gulu", torno(gulu, 16, mat=T(0, -0.048, 0)), "madeira", cor_face=gulu_cor, grao=0.05)
    remate = [(0.03, 1.166), (0.034, 1.18), (0.026, 1.195), (0.018, 1.205), (0.022, 1.215), (0.014, 1.23), (0, 1.236)]
    peca(I, "remate", torno(remate, 10, [MADE, MADE, MAD, MADE, OSSO, OSSO, OSSO], mat=T(0, -0.05, 0)), "madeira")
    Rt = 0.08
    hs2 = [-Rt, -0.075, -0.06, -0.035, 0.0, 0.035, 0.06, 0.075, Rt]
    peca(I, "tumbi", torno([(math.sqrt(max(Rt * Rt - h * h, 0)) if 0 < i < len(hs2) - 1 else 0.0, h) for i, h in enumerate(hs2)], 14,
                           mat=T(0, 0.03, 1.0)), "madeira", "#b07a3a", grao=0.1, freq=25)
    # 18 trastes em arco (as distâncias de traste de verdade, mais juntos perto do corpo)
    L = nut - 0.13
    for n in range(1, 19):
        z = nut - L * (1 - 2 ** (-n / 12))
        pts = [(-0.044 + 0.088 * t / 4, -0.084 - 0.011 * math.sin(math.pi * t / 4), z) for t in range(5)]
        peca(I, f"traste{n}", tubo(pts, 0.0022, 4), "metal", "#cdb88a", afiar=None)
    # 7 cordas: do estandarte, por cima do cavalete, até a pestana
    for s in range(7):
        xb = -0.024 + s * 0.008
        xn = -0.018 + s * 0.006
        pts = [(xb * 0.6, -0.1, 0.034), (xb, -0.1115, 0.136), (xn, -0.1, nut), (xn * 0.8, -0.088, nut + 0.035)]
        peca(I, f"corda{s}", tubo(pts, 0.0011, 3), "metal", ACO, afiar=None)
    # cravelhas: 7 grandes (cabeça e lateral) e 11 pequenas (as simpáticas)
    crav = [(-0.042, -1, 1.0), (-0.042, -1, 1.045), (-0.042, -1, 1.105), (-0.042, -1, 1.145),
            (0.042, 1, 1.085), (0.042, 1, 1.125), (0.042, 1, 1.16)]
    cp = [(0.0065, 0.0), (0.0065, 0.018), (0.012, 0.03), (0.016, 0.045), (0.014, 0.06), (0.008, 0.068), (0, 0.07)]
    for j, (x, s, z) in enumerate(crav):
        peca(I, f"cravelha{j}", torno(cp, 7, [MADE, MADE, MADE, MADE, MADE, OSSO, OSSO], mat=T(x - s * 0.004, -0.05, z) @ Ry(s * math.pi / 2)),
             "madeira", grao=0.05)
    pp = [(0.0035, 0.0), (0.0035, 0.01), (0.006, 0.016), (0.006, 0.024), (0, 0.026)]
    for j in range(11):
        z = 0.58 + j * 0.037
        peca(I, f"cravinha{j}", torno(pp, 5, [MADE, MADE, OSSO, OSSO, OSSO], mat=T(0.04, -0.072, z) @ Ry(math.pi / 2)), "madeira")


# DIDGERIDOO — 1,28 m de tronco oco de eucalipto, levemente torto, mais largo
# na boca de baixo; pintado em faixas (pontos, zigue-zague) e o bocal de cera
def didgeridoo():
    I = "didgeridoo"
    n, L = 26, 1.28
    pts, rs = [], []
    for i in range(n):
        t = i / (n - 1)
        pts.append((0.022 * math.sin(math.pi * t * 1.2) + 0.004 * math.sin(t * 17),
                    0.012 * math.sin(math.pi * t * 2.0 + 0.5) - 0.006, L * t))
        rs.append(0.054 - 0.03 * (t ** 0.7))

    def torto(i, k):
        return 0.06 * math.sin(i * 1.9 + k * 2.3) * math.cos(i * 0.7 - k * 1.1)
    BASE, BR, OCRE, PR, AM = "#6b2a17", "#ece2cb", "#c8742e", "#1c1410", "#d9a441"

    def pintura(f, i, k):
        if i < 0 or i >= n - 1:
            return PR
        if i in (2, 3):
            return BR if (i + k) % 2 == 0 else BASE
        if 5 <= i <= 8:
            return OCRE if (k + i) % 4 in (0, 1) else BASE
        if i in (10, 17):
            return PR
        if i in (12, 13):
            return AM if (i + k) % 2 == 0 else BASE
        if 19 <= i <= 21:
            return BR if (k - i) % 3 == 0 else OCRE
        if i == 23:
            return PR
        return BASE
    peca(I, "tronco", tubo(pts, rs, 12, tampa=(True, True), desloca=torto), "madeira", cor_face=pintura, grao=0.06, freq=25)
    topo = Vector(pts[-1])
    d = (Vector(pts[-1]) - Vector(pts[-2])).normalized()
    peca(I, "bocal", anel(rs[-1] * 0.95, 0.006, 12, 5, T(*topo) @ para(d)), "madeira", "#2a1a0e")


# BERIMBAU — a verga de 1,50 m em arco, o arame, a cabaça (Ø 18 cm) amarrada
# perto do pé com o cordão, o couro no pé
def berimbau():
    I = "berimbau"
    L, n, flecha = 1.5, 20, 0.10
    pts = [(-flecha * math.sin(math.pi * i / (n - 1)), 0.0, 0.004 + (L - 0.008) * i / (n - 1)) for i in range(n)]
    rs = [0.0125 - 0.003 * i / (n - 1) for i in range(n)]
    peca(I, "verga", tubo(pts, rs, 8, tampa=(True, True)), "madeira", "#7a5226", grao=0.14, freq=12)
    peca(I, "pe", torno([(0.0, 0.0), (0.0165, 0.0), (0.017, 0.03), (0.0145, 0.036), (0.0, 0.036)], 10), "couro", "#5b3a22", grao=0.08)
    zc = 0.25
    xb = -flecha * math.sin(math.pi * (zc - 0.004) / (L - 0.008))
    fio = [(0.011, 0.0, 0.03), (xb + 0.0145, 0.0, zc), (0.009, 0.0, L - 0.03)]
    peca(I, "arame", tubo(fio, 0.0016, 4), "metal", "#b9b3a6", afiar=None)
    CORD = "#e6d8b8"
    for dz in (-0.006, 0.0, 0.006):
        peca(I, f"cordao{dz}", anel(0.0205, 0.0026, 14, 4, T(xb + 0.002, 0, zc + dz)), "corda", CORD)
    Rg = 0.088
    hs = [-0.084, -0.072, -0.05, -0.02, 0.01, 0.035, 0.05]
    perfil = [(0.0, -Rg)] + [(math.sqrt(Rg * Rg - h * h), h) for h in hs] + \
             [(0.070, 0.056), (0.066, 0.052), (0.068, 0.03), (0.06, -0.01), (0.04, -0.05), (0.0, -0.065)]
    FORA, DENTRO = "#a8692e", "#3e220e"
    cores = [mistura("#7a4518", FORA, min(1, i / 4)) for i in range(8)] + ["#8a5422", DENTRO, DENTRO, DENTRO, DENTRO, DENTRO]
    gx = xb - 0.0125 - Rg + 0.002
    peca(I, "cabaca", torno(perfil, 16, cores, mat=T(gx, 0, zc) @ Ry(-math.pi / 2)), "madeira", grao=0.1, freq=25)
    peca(I, "fio_cabaca", tubo([(gx + Rg - 0.004, 0, zc), (xb - 0.01, 0, zc)], 0.0022, 4), "corda", CORD, afiar=None)


# FLAUTA DE BAMBU — 45 cm, um gomo com o nó fechado na ponta, o bocal e seis
# furos, três amarrações de linha
def flauta():
    I = "flauta-bambu"
    L, r0 = 0.45, 0.014
    h0 = L / 2
    raio = lambda h: r0 - 0.0014 * (h + h0) / L
    passos = [-0.21 + 0.04 * j for j in range(11)]
    perfil = [(0.0, -h0), (0.0126, -h0), (raio(-h0 + 0.0015), -h0 + 0.0015)] + [(raio(h), h) for h in passos] + \
             [(raio(h0), h0), (0.0094, h0), (0.0092, h0 - 0.013), (0.0, h0 - 0.019)]
    B, BN = "#c9b46c", "#a08848"
    cores = [BN, BN, BN] + [B] * len(passos) + [B, "#8a7440", "#2a1d0e", "#1a1209"]
    gira = T(0, 0, r0) @ Ry(math.pi / 2)
    peca(I, "gomo", torno(perfil, 12, cores, mat=gira), "madeira", grao=0.06, freq=50)
    peca(I, "no", anel(raio(-0.205) + 0.0002, 0.0016, 14, 4, T(-0.205, 0, r0) @ Ry(math.pi / 2)), "madeira", BN)
    d = Vector((0, -0.3, 0.954)).normalized()
    for j, (x, rh, al) in enumerate([(-0.16, 0.0052, 1.3), (0.0, 0.0042, 1), (0.035, 0.0042, 1), (0.07, 0.0042, 1),
                                     (0.115, 0.0042, 1), (0.15, 0.0042, 1), (0.185, 0.0042, 1)]):
        c = Vector((x, 0, r0)) + d * (raio(x) + 0.0002)
        bm = furo(rh, 8, 0.0015, al)
        bmesh.ops.transform(bm, matrix=T(*c) @ para(d), verts=bm.verts)
        peca(I, f"furo{j}", bm, "madeira", ESCURO, afiar=None)
    amarra = lambda r: [(r + 0.0002, -0.006), (r + 0.0008, -0.005), (r + 0.0008, 0.005), (r + 0.0002, 0.006)]
    for j, x in enumerate((-0.19, 0.093, 0.205)):
        peca(I, f"amarra{j}", torno(amarra(raio(x)), 12, mat=T(x, 0, r0) @ Ry(math.pi / 2)), "corda", "#7a2418")


# OCARINA — a batata de barro (14 cm), o bocal achatado com a fenda, a janela
# do apito e seis furos em cima
def ocarina():
    I = "ocarina"
    hs = [-0.07, -0.067, -0.058, -0.044, -0.026, -0.008, 0.01, 0.028, 0.044, 0.056, 0.065, 0.07]
    raio = lambda h: 0.044 * max(0.0, 1 - (h / 0.07) ** 2) ** 0.55 * (1 - 0.16 * h / 0.07)
    perfil = [(raio(h) if 0 < i < len(hs) - 1 else 0.0, h) for i, h in enumerate(hs)]
    AZ = 0.68
    zc = AZ * max(raio(h) for h in hs)
    gira = T(0, 0, zc) @ S(1, 1, AZ) @ Ry(math.pi / 2)
    BAR = "#b0603a"

    def cor(co):
        return mistura("#6e3420", BAR, suave(0.0, zc * 1.1, co.z))
    peca(I, "corpo", torno(perfil, 16, mat=gira), "barro", cor_vert=cor, grao=0.06, freq=60)
    boc = [(0.0125, 0.0), (0.0125, 0.024), (0.0108, 0.03), (0.006, 0.0315), (0.0, 0.0318)]

    def boc_cor(f, i, k):
        return ESCURO if i >= 3 else BAR
    peca(I, "bocal", torno(boc, 8, mat=T(-0.054, 0, zc + 0.004) @ Ry(-math.pi / 2 + 0.12) @ S(0.55, 1, 1)), "barro", cor_face=boc_cor)

    def topo(x, y):
        r = raio(x)
        z = zc + AZ * math.sqrt(max(r * r - y * y, 1e-9))
        n = Vector((0, y / (r * r), (z - zc) / (AZ * AZ * r * r))).normalized()
        return Vector((x, y, z)), n
    furos = [(-0.046, 0.0, 0.0055, 1.6), (-0.012, 0.017, 0.0055, 1), (0.012, 0.02, 0.005, 1), (0.034, 0.016, 0.0042, 1),
             (-0.012, -0.017, 0.0055, 1), (0.012, -0.02, 0.005, 1), (0.034, -0.016, 0.0042, 1)]
    for j, (x, y, rh, al) in enumerate(furos):
        p, nrm = topo(x, y)
        bm = furo(rh, 4 if j == 0 else 8, 0.002, al, math.pi / 4 if j == 0 else 0.0)
        bmesh.ops.transform(bm, matrix=T(*(p + nrm * 0.0002)) @ para(nrm), verts=bm.verts)
        peca(I, f"furo{j}", bm, "barro", ESCURO, afiar=None)


# HANDPAN — Ø 53 cm, duas cascas de aço; em cima o ding no meio e oito campos
# de nota afundados (cada um com o domo no centro), em baixo o furo (gu)
def handpan():
    I = "handpan"
    R = 0.262
    ACO, ACOE, DENTRO = "#5d4f40", "#4a3e32", "#15110d"
    baixo = [(0.0, 0.075), (0.05, 0.03), (0.054, 0.006), (0.06, 0.0), (0.075, 0.0015), (0.11, 0.008), (0.16, 0.024),
             (0.205, 0.046), (0.238, 0.07), (0.256, 0.09), (0.262, 0.105)]
    peca(I, "casca_baixo", torno(baixo, 32, [DENTRO, DENTRO, DENTRO, ACOE, ACOE, ACOE, ACO, ACO, ACO, ACO, ACO]), "metal", grao=0.05)
    peca(I, "aro", torno([(0.262, 0.098), (0.2675, 0.101), (0.2675, 0.109), (0.262, 0.112)], 56), "metal", "#3f352b")
    campos = []
    for j in range(8):
        a = -math.pi / 2 + TAU * j / 8
        s = 0.052 - 0.0016 * j
        campos.append((a, s))
    rc = 0.168

    def relevo(x, y):
        r = math.hypot(x, y)
        z = 0.105 + 0.125 * max(0.0, 1 - (r / R) ** 2) ** 0.75
        tom = 0.0
        z += 0.02 * (1 - suave(0.02, 0.058, r))  # o ding
        tom = max(tom, 0.6 * (1 - suave(0.0, 0.05, r)))
        th = math.atan2(y, x)
        for a, s in campos:
            da = math.atan2(math.sin(th - a), math.cos(th - a))
            u = (r - rc) / (s * 0.82)
            v = (rc * da) / (s * 1.05)
            d = math.hypot(u, v)
            z += -0.009 * (1 - suave(0.72, 1.0, d)) + 0.0065 * (1 - suave(0.0, 0.42, d))
            tom = max(tom, 0.35 * (1 - suave(0.72, 1.0, d)) + 0.5 * (1 - suave(0.0, 0.42, d)))
        return z, tom
    aneis = [0.262, 0.252, 0.241, 0.229, 0.217, 0.205, 0.193, 0.181, 0.169, 0.157, 0.145, 0.133, 0.121, 0.108,
             0.094, 0.079, 0.064, 0.05, 0.036, 0.022, 0.0]
    bm = torno([(r, 0.0) for r in aneis], 64, fase=-math.pi / 2)
    for v in bm.verts:
        v.co.z = relevo(v.co.x, v.co.y)[0]

    def cor(co):
        return mistura(ACO, "#9a7e58", relevo(co.x, co.y)[1])
    peca(I, "casca_cima", bm, "metal", cor_vert=cor, grao=0.04, freq=70, afiar=None)


# KALIMBA — a caixa de 17 × 13 cm, o furo, o cavalete e a barra, 17 lamelas
# em V (a do meio é a mais longa)
def kalimba():
    I = "kalimba"
    W, D, H = 0.17, 0.13, 0.045
    peca(I, "caixa", caixa((W, D, H), T(0, 0, H / 2), 0.007, 2), "madeira", "#83491f", grao=0.12, freq=55)
    bm = furo(0.014, 12, 0.004)
    bmesh.ops.transform(bm, matrix=T(0, -0.042, H + 0.0002), verts=bm.verts)
    peca(I, "furo", bm, "madeira", ESCURO, afiar=None)
    peca(I, "cavalete", caixa((0.152, 0.01, 0.005), T(0, 0.03, H + 0.0025), 0.0015), "madeira", "#5a3018")
    zs = H + 0.005 + 0.0022
    peca(I, "sela", tubo([(-0.076, 0.03, zs), (0.076, 0.03, zs)], 0.0022, 6, (True, True)), "metal", "#c9ccd2", afiar=None)
    zt = zs + 0.0022
    peca(I, "barra", tubo([(-0.078, 0.044, zt + 0.0035), (0.078, 0.044, zt + 0.0035)], 0.0021, 6, (True, True)), "metal", "#9aa0a8", afiar=None)
    for lado in (-1, 1):
        peca(I, f"poste{lado}", caixa((0.006, 0.006, zt + 0.004 - H), T(lado * 0.079, 0.044, H + (zt + 0.004 - H) / 2)), "metal", "#8a9098")
    for i in range(17):
        x = (i - 8) * 0.0085
        comp = 0.088 - 0.0034 * abs(i - 8)
        y0, y1 = 0.052, 0.052 - comp
        w, e = 0.0029, 0.0014
        bm = bmesh.new()
        bm.faces.layers.int.new("ik")
        def z_em(y):
            return zt + max(0.0, 0.03 - y) * 0.06
        vs = [bm.verts.new((x + sx * w, y, z_em(y) + sz * e)) for y in (y0, y1) for sx in (-1, 1) for sz in (0, 1)]
        # 0..3 em y0, 4..7 em y1: (sx-,sz0),(sx-,sz1),(sx+,sz0),(sx+,sz1)
        for q in ((0, 2, 3, 1), (4, 5, 7, 6), (0, 1, 5, 4), (2, 6, 7, 3), (1, 3, 7, 5), (0, 4, 6, 2)):
            bm.faces.new([vs[j] for j in q])
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        peca(I, f"lamela{i}", bm, "metal", "#d4d6dc", afiar=None)


for fn in (djembe, tambor_agua, udu, caxixi, sitar, didgeridoo, berimbau, flauta, ocarina, handpan, kalimba):
    fn()

tot = {}
for o in COL.objects:
    tot[o["inst"]] = tot.get(o["inst"], 0) + sum(len(p.vertices) - 2 for p in o.data.polygons)
for k in IDS:
    print("TRI", k, tot.get(k, 0))
print("TRI total", sum(tot.values()))
