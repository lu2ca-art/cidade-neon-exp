# O KIT das salas de música (06/11): a balada da Sexta-Feira (balada.py) e a
# casa de shows (shows.py). As primitivas são as do bar.py (bmesh acumulado por
# (nó, grupo), cor por face no vértice), com um atalho em COORDENADAS DO JOGO:
#   G(x, y, z)   ponto do jogo (Y pra cima, z pra câmera) → Blender (x, -z, y)
#   Bj/Cj/Vj/Tj  caixa, cilindro, viga e tubo com posição e tamanho do jogo
# e o fim de sempre: vira objetos, AO assada (Cycles) na cor do vértice, um
# pouco da luz das fontes assada também, exporta o glb bruto. E a foto da
# câmera do jogo (foto()).
#
# Os grupos: _solido (cor no vértice × AO × luz assada), _luz (brilho fixo),
# _neon (tubos e o piso de LED, o jogo anima a cor do material), _vidro.

import bpy, bmesh, math, sys
from mathutils import Vector, Matrix, Color

TAU = 2 * math.pi
BUF = {}
ATUAL = [None]
PAI = [Matrix.Identity(4)]
COL = [None]


def inicio(nome):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    c = bpy.data.collections.new(nome)
    bpy.context.scene.collection.children.link(c)
    COL[0] = c


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


def ph(c, *k):
    return hh(round(c.x * 17), round(c.y * 17), round(c.z * 17), *k)


def T(x, y, z):
    return Matrix.Translation((x, y, z))


def R(rx=0.0, ry=0.0, rz=0.0):
    return Matrix.Rotation(rz, 4, "Z") @ Matrix.Rotation(ry, 4, "Y") @ Matrix.Rotation(rx, 4, "X")


def para(d):
    return Vector((0, 0, 1)).rotation_difference(Vector(d).normalized()).to_matrix().to_4x4()


def G(x, y, z):
    return (x, -z, y)


def add(bm, g, cor="#ffffff", M=None, cf=None, sujo=0.25, afiar=40):
    MM = PAI[-1] @ M if M is not None else PAI[-1]
    bmesh.ops.transform(bm, matrix=MM, verts=bm.verts)
    bm.normal_update()
    ij = bm.faces.layers.int.get("ij")
    cores = {}
    c0 = lin(cor or "#ffffff")
    for f in bm.faces:
        if cf:
            x = f[ij] if ij else 0
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


def Esfera(g, p, raio, u, v, cor=None, cf=None):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=u, v_segments=v, radius=raio)
    add(bm, g, cor, T(*p), cf, 0, afiar=10 if cf else 40)


def Viga(g, a, b, esp, cor=None, sujo=0.2):
    a, b = Vector(a), Vector(b)
    dv = b - a
    add(bm_caixa(esp, esp, dv.length), g, cor, T(*((a + b) / 2)) @ para(dv), None, sujo)


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
    """Uma grade de um lado só (a normal é U × V). o, U, V no Blender."""
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


# ── atalhos em coordenadas do jogo ──
def Bj(g, p, s, cor=None, ry=0.0, d=None, cf=None, sujo=0.25, rx=0.0):
    """caixa: centro p e tamanho s (largura x, altura y, fundo z) do jogo; ry gira em volta do Y do jogo."""
    dd = d
    if isinstance(d, tuple):
        dd = (d[0], d[2], d[1])
    B(g, G(*p), (s[0], s[2], s[1]), cor, (rx, 0, ry), dd, cf, sujo)


def Cj(g, p, r0, r1, h, seg, cor=None, eixo="y", ry=0.0, cf=None, sujo=0.2, tampa=True):
    """cilindro com a base em p (jogo). eixo y = em pé; z = deitado pra câmera; x = deitado de lado."""
    r = {"y": (0, 0, ry), "z": (math.pi / 2, 0, ry), "x": (0, math.pi / 2, ry)}[eixo]
    Cil(g, G(*p), r0, r1, h, seg, cor, r, cf, sujo, tampa)


def Vj(g, a, b, esp, cor=None, sujo=0.2):
    Viga(g, G(*a), G(*b), esp, cor, sujo)


def Tj(g, pts, raio, lados, cor=None, sujo=0.1):
    Tubo(g, [G(*p) for p in pts], raio, lados, cor, sujo)


def Treli(a, b, larg, passo, cor, esp=0.035, g="solido"):
    """Treliça quadrada (4 banzos + diagonais em zigue-zague nas 4 faces), de a até b (jogo)."""
    a, b = Vector(G(*a)), Vector(G(*b))
    dv = b - a
    L = dv.length
    t = dv.normalized()
    up = Vector((0, 0, 1)) if abs(t.z) < 0.9 else Vector((0, 1, 0))
    u = t.cross(up).normalized()
    v = t.cross(u).normalized()
    h = larg / 2
    cantos = [u * h + v * h, -u * h + v * h, -u * h - v * h, u * h - v * h]
    for c in cantos:
        Viga(g, a + c, b + c, esp, cor, 0.05)
    n = max(1, round(L / passo))
    for k in range(n):
        p0, p1 = a + t * (L * k / n), a + t * (L * (k + 1) / n)
        for f in range(4):
            c0, c1 = cantos[f], cantos[(f + 1) % 4]
            if k % 2:
                Viga(g, p0 + c0, p1 + c1, esp * 0.6, cor, 0.05)
            else:
                Viga(g, p0 + c1, p1 + c0, esp * 0.6, cor, 0.05)


def Cortina(x0, x1, z, y0, y1, n, cor, prof=0.12):
    """Cortina pregueada no jogo: de x0 a x1, no plano z (virada pra +z), de y0 a y1."""
    bm = bmesh.new()
    ij = bm.faces.layers.int.new("ij")
    vs = []
    for i in range(n + 1):
        x = x0 + (x1 - x0) * i / n
        zz = z + (prof if i % 2 else 0.0)
        vs.append([bm.verts.new(G(x, y, zz)) for y in (y0, (y0 + y1) / 2, y1)])
    for i in range(n):
        for j in range(2):
            f = bm.faces.new((vs[i][j], vs[i + 1][j], vs[i + 1][j + 1], vs[i][j + 1]))
            f[ij] = i * 1000 + j
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces:
        if f.normal.y > 0:
            f.normal_flip()
    add(bm, "solido", None, None, lambda c, nn, i, j: dim(cor, 0.55) if i % 2 else lin(cor), 0.1, afiar=None)


# ════════════════════════ o fim: objetos, AO, luz assada, exporta ════════════════════════
GRUPOS = ("solido", "luz", "neon", "vidro")


def _material(g, pre):
    m = bpy.data.materials.new(pre + "_" + g)
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


def c3(h, k):
    c = lin(h)
    return (c[0] * k, c[1] * k, c[2] * k)


def fim(saida, nos, fontes, pre, amb=0.55, ao_dist=0.9, amostras=64):
    sc = bpy.context.scene
    C = COL[0]
    MATS = {g: _material(g, pre) for g in GRUPOS}
    raizes = {}
    for no in nos:
        e = bpy.data.objects.new(no, None)
        C.objects.link(e)
        raizes[no] = e
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
            C.objects.link(o)
            o.parent = e
            o["grupo"] = g
            me.materials.append(MATS[g])
    vl = bpy.context.view_layer
    vl.update()
    solidos = [o for o in C.objects if o.type == "MESH" and o["grupo"] == "solido"]
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
    sc.world.light_settings.distance = ao_dist
    vl.update()
    for o in sc.objects:
        o.select_set(False)
    for o in solidos:
        o.select_set(True)
    vl.objects.active = solidos[0]
    print("BAKE", bpy.ops.object.bake(type="AO", target="VERTEX_COLORS"))

    for o in C.objects:
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
                fr = fg = fb = amb
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
    for o in C.objects:
        o.select_set(True)
    vl.objects.active = raizes[nos[0]]
    print(bpy.ops.export_scene.gltf(filepath=saida, export_format="GLB", use_selection=True, export_texcoords=False,
          export_normals=True, export_materials="EXPORT", export_yup=True, export_apply=True, export_vertex_color="ACTIVE"))
    tot = {}
    for o in C.objects:
        if o.type == "MESH":
            tot[o.name] = sum(len(p.vertices) - 2 for p in o.data.polygons)
    print("TRI", tot)
    print("TRI total", sum(tot.values()))


# ════════════════════════ a foto da câmera do jogo ════════════════════════
def Jv(x, y, z):
    return Vector(G(x, y, z))


def foto(saida, cam_pos, cam_olha, fov, luzes, mundo, textos=(), extra=None, larg=1280, amostras=96, brilho=None):
    """luzes: (pos_jogo, cor, watts, raio). textos: (txt, pos_jogo, tamanho, cor, força). extra(): cena a mais (a gente)."""
    sc = bpy.context.scene
    forca = {"luz": 3.0, "neon": 6.0, "vidro": 1.2}
    if brilho:
        forca.update(brilho)

    def mat(nome, camada, tipo):
        m = bpy.data.materials.new(nome)
        try:
            m.use_nodes = True
        except Exception:
            pass
        nt = m.node_tree
        b = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
        a = nt.nodes.new("ShaderNodeVertexColor")
        a.layer_name = camada
        if tipo.endswith("solido"):
            nt.links.new(a.outputs["Color"], b.inputs["Base Color"])
            b.inputs["Roughness"].default_value = 0.8
        else:
            b.inputs["Base Color"].default_value = (0, 0, 0, 1)
            nt.links.new(a.outputs["Color"], b.inputs["Emission Color"])
            b.inputs["Emission Strength"].default_value = forca.get(tipo, 3.0)
            if tipo.endswith("vidro"):
                b.inputs["Alpha"].default_value = 0.8
        return m

    for o in list(bpy.data.objects):
        if o.type != "MESH":
            continue
        tipo = o.name.split("_")[-1].split(".")[0]
        if tipo not in GRUPOS:
            continue
        camada = o.data.color_attributes[0].name if len(o.data.color_attributes) else "Col"
        o.data.materials.clear()
        o.data.materials.append(mat("foto_" + o.name, camada, o.name.split(".")[0] if o.name.split(".")[0] in forca else tipo))

    for i, (p, cor, w, raio) in enumerate(luzes):
        d = bpy.data.lights.new(f"foto_luz{i}", "POINT")
        d.energy = w
        d.color = lin(cor)[:3]
        d.shadow_soft_size = raio
        lo = bpy.data.objects.new(f"foto_luz{i}", d)
        sc.collection.objects.link(lo)
        lo.location = Jv(*p)

    if sc.world is None:
        sc.world = bpy.data.worlds.new("Mundo")
    sc.world.use_nodes = True
    bg = next(n for n in sc.world.node_tree.nodes if n.type == "BACKGROUND")
    bg.inputs["Color"].default_value = mundo
    bg.inputs["Strength"].default_value = 1.0

    for k, (txt, p, tam, cor, forca_t) in enumerate(textos):
        cu = bpy.data.curves.new(f"foto_txt{k}", "FONT")
        cu.body = txt
        cu.align_x = "CENTER"
        cu.align_y = "CENTER"
        cu.size = tam
        cu.extrude = 0.005
        t = bpy.data.objects.new(f"foto_txt{k}", cu)
        sc.collection.objects.link(t)
        t.location = Jv(*p)
        t.rotation_euler = (math.pi / 2, 0, 0)
        mt = bpy.data.materials.new(f"foto_txtm{k}")
        mt.use_nodes = True
        bt = next(n for n in mt.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
        bt.inputs["Base Color"].default_value = (0, 0, 0, 1)
        bt.inputs["Emission Color"].default_value = lin(cor)
        bt.inputs["Emission Strength"].default_value = forca_t
        cu.materials.append(mt)

    if extra:
        extra()

    cd = bpy.data.cameras.new("foto_cam")
    cd.sensor_fit = "VERTICAL"
    cd.angle_y = math.radians(fov)
    cd.clip_start = 0.05
    cam = bpy.data.objects.new("foto_cam", cd)
    sc.collection.objects.link(cam)
    cam.location = Jv(*cam_pos)
    cam.rotation_euler = (Jv(*cam_olha) - cam.location).to_track_quat("-Z", "Y").to_euler()
    sc.camera = cam

    try:
        sc.render.engine = "CYCLES"
    except TypeError as e:
        print("engine", e)
    sc.cycles.samples = amostras
    sc.cycles.use_denoising = True
    try:
        pr = bpy.context.preferences.addons["cycles"].preferences
        pr.compute_device_type = "METAL"
        pr.get_devices()
        for d in pr.devices:
            d.use = True
        sc.cycles.device = "GPU"
    except Exception as e:
        print("gpu", e)
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


def gente_foto(pontos, pele="#2a2636"):
    """Pessoas de mentira pra foto (no jogo é o Npc/Multidao): cápsula + cabeça; celular aceso opcional.
    pontos: (x, y_chao, z, cor, celular)."""
    sc = bpy.context.scene
    mp = bpy.data.materials.new("foto_pele")
    mp.use_nodes = True
    bp = next(n for n in mp.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    bp.inputs["Base Color"].default_value = lin(pele)
    bp.inputs["Roughness"].default_value = 0.7
    cache = {}
    for i, (x, y, z, cor, cel) in enumerate(pontos):
        if cor not in cache:
            m = bpy.data.materials.new("foto_roupa" + cor)
            m.use_nodes = True
            b = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
            b.inputs["Base Color"].default_value = dim(cor, 0.35)
            b.inputs["Emission Color"].default_value = lin(cor)
            b.inputs["Emission Strength"].default_value = 0.25
            cache[cor] = m
        bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=0.19, depth=1.35, location=Jv(x, y + 0.68, z))
        o = bpy.context.active_object
        o.data.materials.append(cache[cor])
        bpy.ops.mesh.primitive_uv_sphere_add(segments=10, ring_count=6, radius=0.13, location=Jv(x, y + 1.52, z))
        bpy.context.active_object.data.materials.append(mp)
        if cel:
            bpy.ops.mesh.primitive_cube_add(size=1, location=Jv(x + 0.12, y + 1.75, z))
            c = bpy.context.active_object
            c.scale = (0.05, 0.05, 0.09)
            m = bpy.data.materials.get("foto_cel") or bpy.data.materials.new("foto_cel")
            if not m.use_nodes:
                m.use_nodes = True
                b = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
                b.inputs["Base Color"].default_value = (0, 0, 0, 1)
                b.inputs["Emission Color"].default_value = lin("#e6f0ff")
                b.inputs["Emission Strength"].default_value = 4.0
            c.data.materials.append(m)
