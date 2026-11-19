# O KIT DAS SALAS modeladas (06/11): as primitivas do bar.py (cor por face no
# vértice, AO assada, a luz assada de leve) num arquivo só, pro topo.py e o
# quarto.py. Coordenadas do Blender: Z pra cima; o glTF sai com Y pra cima e
# z_jogo = -y_blender (o "fundo" da sala fica em +Y).
#
#   import sys; sys.path.insert(0, "blender/scripts"); from sala_kit import *
#   comecar("Topo"); ATUAL[0] = "sala"; ... ; terminar(NOS, FONTES, SAIDA)

import bpy, bmesh, math, sys
from mathutils import Vector, Matrix, Color

TAU = 2 * math.pi
sc = bpy.context.scene
COL = [None]


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



# ════════════════════════ o que o topo e o quarto acrescentam ════════════════════════
FONTE_ARQ = "/System/Library/Fonts/Supplemental/Arial Black.ttf"


def comecar(nome):
    global sc
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    COL[0] = bpy.data.collections.new(nome)
    sc.collection.children.link(COL[0])


def Prisma(g, perfil, esp, cor, M, cf=None, sujo=0.15):
    """Um perfil (y, z) puxado em X (espessura esp, centrado): o lado do fliperama, o sofá."""
    bm = bmesh.new()
    bm.faces.layers.int.new("ij")
    a = [bm.verts.new((-esp / 2, y, z)) for y, z in perfil]
    b = [bm.verts.new((esp / 2, y, z)) for y, z in perfil]
    bm.faces.new(a)
    bm.faces.new(b[::-1])
    n = len(perfil)
    for k in range(n):
        bm.faces.new((a[k], a[(k + 1) % n], b[(k + 1) % n], b[k]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    add(bm, g, cor, M, cf, sujo)


def Texto(g, txt, M, tam, cor, extr=0.0, fonte=True):
    """Letras de verdade (a fonte vira malha), viradas pra -Y em M (R(rx=pi/2))."""
    cu = bpy.data.curves.new("txt", "FONT")
    cu.body = txt
    cu.align_x = "CENTER"
    cu.align_y = "CENTER"
    cu.size = tam
    cu.extrude = extr
    cu.resolution_u = 2
    if fonte:
        try:
            cu.font = bpy.data.fonts.load(FONTE_ARQ, check_existing=True)
        except Exception as e:
            print("fonte", e)
    ob = bpy.data.objects.new("txt", cu)
    sc.collection.objects.link(ob)
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    bm = bmesh.new()
    bm.from_mesh(me)
    bm.faces.layers.int.new("ij")
    bmesh.ops.triangulate(bm, faces=bm.faces)
    add(bm, g, cor, M @ R(rx=math.pi / 2), None, 0, afiar=None)
    bpy.data.objects.remove(ob)
    bpy.data.curves.remove(cu)
    bpy.data.meshes.remove(me)


def Disco(g, p, raio, seg, cor, M=None):
    """Um disco chato virado pra +Z (poça, tapete, cone de alto-falante)."""
    bm = bmesh.new()
    bm.faces.layers.int.new("ij")
    bmesh.ops.create_circle(bm, cap_ends=True, cap_tris=False, segments=seg, radius=raio)
    add(bm, g, cor, T(*p) @ (M or Matrix.Identity(4)), None, 0)


def Pano(g, o, U, V, nu, nv, amp, cor, cf=None, seed=0, normal=(0, 0, 1)):
    """Um pano amarrotado (roupa no chão, edredom): grade com ondas na normal."""
    o, U, V, N = Vector(o), Vector(U), Vector(V), Vector(normal)
    bm = bmesh.new()
    ij = bm.faces.layers.int.new("ij")
    vs = []
    for i in range(nu + 1):
        ln = []
        for j in range(nv + 1):
            u, v = i / nu, j / nv
            borda = min(u, 1 - u, v, 1 - v)
            h = amp * (0.5 + 0.5 * math.sin(u * 9.1 + seed) * math.cos(v * 7.3 + seed * 1.7)) * min(1.0, borda * 6 + 0.25)
            ln.append(bm.verts.new(o + U * u + V * v + N * h))
        vs.append(ln)
    for i in range(nu):
        for j in range(nv):
            f = bm.faces.new((vs[i][j], vs[i + 1][j], vs[i + 1][j + 1], vs[i][j + 1]))
            f[ij] = i * 1000 + j
    add(bm, g, cor, None, cf, 0.1, afiar=None)


def terminar(nos, fontes, saida, prefixo, dist=0.8, piso=0.62, amostras=64):
    """Vira objetos, assa a AO no sólido + a luz das fontes (sem luz no jogo) e exporta."""
    COLx = COL[0]
    grupos = ("solido", "luz", "neon", "vidro")

    def material(g):
        m = bpy.data.materials.new(prefixo + "_" + g)
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

    mats = {g: material(g) for g in grupos}
    raiz = {}
    for no in nos:
        e = bpy.data.objects.new(no, None)
        COLx.objects.link(e)
        raiz[no] = e
        for g in grupos:
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
            COLx.objects.link(o)
            o.parent = e
            o["grupo"] = g
            me.materials.append(mats[g])
    vl = bpy.context.view_layer
    vl.update()
    solidos = [o for o in COLx.objects if o.type == "MESH" and o["grupo"] == "solido"]
    for o in solidos:
        ao = o.data.color_attributes.new("AO", "FLOAT_COLOR", "CORNER")
        o.data.color_attributes.active_color = ao
    try:
        sc.render.engine = "CYCLES"
    except TypeError as e:
        print("engine", e)
    sc.cycles.samples = amostras
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
    sc.world.light_settings.distance = dist
    vl.update()
    for o in sc.objects:
        o.select_set(False)
    for o in solidos:
        o.select_set(True)
    vl.objects.active = solidos[0]
    print("BAKE", bpy.ops.object.bake(type="AO", target="VERTEX_COLORS"))
    for o in COLx.objects:
        if o.type != "MESH":
            continue
        me = o.data
        base = me.color_attributes["Base"]
        n = len(base.data)
        bc = [0.0] * (n * 4)
        base.data.foreach_get("color", bc)
        if o["grupo"] == "solido":
            ac = [0.0] * (n * 4)
            me.color_attributes["AO"].data.foreach_get("color", ac)
            vi = [0] * n
            me.loops.foreach_get("vertex_index", vi)
            for i in range(n):
                p = me.vertices[vi[i]].co
                fr = fg = fb = piso
                for q, cor, raio in fontes:
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
    for o in COLx.objects:
        o.select_set(True)
    vl.objects.active = raiz[nos[0]]
    print(bpy.ops.export_scene.gltf(filepath=saida, export_format="GLB", use_selection=True, export_texcoords=False,
          export_normals=True, export_materials="EXPORT", export_yup=True, export_apply=True, export_vertex_color="ACTIVE"))
    tot = {}
    for o in COLx.objects:
        if o.type == "MESH":
            tot[o.name] = sum(len(p.vertices) - 2 for p in o.data.polygons)
    print("TRI", tot)
    print("TRI total", sum(tot.values()))


def c3(h, k):
    c = lin(h)
    return (c[0] * k, c[1] * k, c[2] * k)


def J(x, y, z):
    """do jogo (Y pra cima) pro Blender."""
    return Vector((x, -z, y))


def foto(saida, cam, olha, fov, luzes, fundo=(0.02, 0.02, 0.04), ganho=None, larg=1280, amostras=96, prep=None):
    """A foto da câmera do jogo (cam/olha/fov em coordenadas do jogo), com as luzes que o jogo tem."""
    ganho = ganho or {"luz": 3.0, "neon": 6.0, "vidro": 1.0}

    def mat(nome, tipo):
        m = bpy.data.materials.new(nome)
        try:
            m.use_nodes = True
        except Exception:
            pass
        nt = m.node_tree
        b = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
        a = nt.nodes.new("ShaderNodeVertexColor")
        a.layer_name = "Col"
        if tipo == "solido":
            nt.links.new(a.outputs["Color"], b.inputs["Base Color"])
            b.inputs["Roughness"].default_value = 0.8
        else:
            b.inputs["Base Color"].default_value = (0, 0, 0, 1)
            nt.links.new(a.outputs["Color"], b.inputs["Emission Color"])
            b.inputs["Emission Strength"].default_value = ganho[tipo]
            if tipo == "vidro":
                b.inputs["Alpha"].default_value = 0.6
        return m

    for o in list(COL[0].objects):
        if o.type == "MESH":
            o.data.materials.clear()
            o.data.materials.append(mat("foto_" + o.name, o["grupo"]))
    for i, (p, cor, w, raio) in enumerate(luzes):
        d = bpy.data.lights.new(f"l{i}", "POINT")
        d.energy = w
        d.color = lin(cor)[:3]
        d.shadow_soft_size = raio
        lo = bpy.data.objects.new(f"l{i}", d)
        sc.collection.objects.link(lo)
        lo.location = J(*p)
    if prep:
        prep()
    sc.world.use_nodes = True
    bg = next(n for n in sc.world.node_tree.nodes if n.type == "BACKGROUND")
    bg.inputs["Color"].default_value = fundo + (1,)
    bg.inputs["Strength"].default_value = 1.0
    cd = bpy.data.cameras.new("foto_cam")
    cd.sensor_fit = "VERTICAL"
    cd.angle_y = math.radians(fov)
    cd.clip_start = 0.05
    cd.clip_end = 400
    camo = bpy.data.objects.new("foto_cam", cd)
    sc.collection.objects.link(camo)
    camo.location = J(*cam)
    camo.rotation_euler = (J(*olha) - camo.location).to_track_quat("-Z", "Y").to_euler()
    sc.camera = camo
    sc.cycles.samples = amostras
    sc.cycles.use_denoising = True
    sc.view_settings.view_transform = "AgX"
    try:
        sc.view_settings.look = "AgX - Medium High Contrast"
    except TypeError as e:
        print("look", e)
    try:
        ng = bpy.data.node_groups.new("foto_comp", "CompositorNodeTree")
        ng.interface.new_socket("Image", in_out="OUTPUT", socket_type="NodeSocketColor")
        rl = ng.nodes.new("CompositorNodeRLayers")
        gl = ng.nodes.new("CompositorNodeGlare")
        out = ng.nodes.new("NodeGroupOutput")
        for nome, v in (("Type", "Fog Glow"), ("Threshold", 0.7), ("Strength", 0.5), ("Size", 0.5)):
            if nome in gl.inputs:
                try:
                    gl.inputs[nome].default_value = v
                except Exception as e:
                    print("glare", nome, e)
        if hasattr(gl, "glare_type"):
            gl.glare_type = "FOG_GLOW"
        ng.links.new(rl.outputs["Image"], gl.inputs["Image"])
        ng.links.new(gl.outputs["Image"], out.inputs[0])
        sc.compositing_node_group = ng
    except Exception as e:
        print("comp", e)
    sc.render.resolution_x = larg
    sc.render.resolution_y = int(larg * 9 / 16)
    sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = "PNG"
    sc.render.filepath = saida
    bpy.ops.render.render(write_still=True)
    print("FOTO", saida)
