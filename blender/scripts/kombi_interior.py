# O interior da Kombi da Linha 222 (primeira pessoa), modelado: painel, portas,
# teto de tábuas curvo, paredes de ripas, bancos de pelúcia, sofá com manta
# xadrez, o estúdio no fundo. Reconstrói tudo do zero na coleção
# "KombiInterior". No Blender (MCP ou Text Editor):
#   cole o arquivo inteiro (o MCP roda em modo seguro: sem exec/open, sem
#   passar função como parâmetro), depois kombi_interior_bake.py
#
# Coordenadas: o jogo é Y pra cima e a frente é -Z; o Blender é Z pra cima e a
# frente é +Y (o exportador glTF faz a troca). As posições vêm do layout da
# Kombi no código (lib/kombi-layout.ts, o espaço de dentro da Cabine), que tem
# escala não uniforme: P() e S() convertem pro espaço da Kombi em metros.
#
# Cada objeto leva o grupo dele (lata, fosco, cromo, brilho, pelo): no fim
# vira uma malha por grupo, com a sombra de canto assada na cor dos vértices
# (kombi_interior_bake.py).

import bpy, bmesh, math
from mathutils import Vector, Matrix, Color

E = (0.98, 1.3, 1.3)
D = (0.0, 0.3, -0.35)

def P(lx, ly, lz):
    return Vector((lx * E[0] + D[0], -(lz * E[2] + D[2]), ly * E[1] + D[1]))

def S(sx, sy, sz):
    return Vector((sx * E[0], sz * E[2], sy * E[1]))

def rotG(rx=0.0, ry=0.0, rz=0.0):
    # euler XYZ do jogo -> matriz do Blender (Xj=Xb, Yj=Zb, Zj=-Yb)
    return Matrix.Rotation(rx, 4, "X") @ Matrix.Rotation(ry, 4, "Z") @ Matrix.Rotation(-rz, 4, "Y")

# ── paleta ──
ROSA, MAGENTA, AZUL, AGUA = "#ff8fc8", "#d81f86", "#3a7bff", "#6ff0d6"
BETULA = ["#ecd3ab", "#e4c79c", "#f0dab8"]
BRANCO, FELTRO, VINIL, CROMADO = "#e2dad2", "#8e1a64", "#231a1f", "#d7dde6"
PELE, MADEIRA, BORRACHA = "#c99b76", "#8a5a2b", "#24202a"

# ── coleção e materiais ──
NOME = "KombiInterior"
for nome_c in (NOME, NOME + "_cortes"):
    velha = bpy.data.collections.get(nome_c)
    if velha:
        for o in list(velha.all_objects):
            bpy.data.objects.remove(o, do_unlink=True)
        bpy.data.collections.remove(velha)
for o in list(bpy.data.objects):
    if o.name in ("Cube",):
        bpy.data.objects.remove(o, do_unlink=True)
COL = bpy.data.collections.new(NOME)
bpy.context.scene.collection.children.link(COL)
CORTES = bpy.data.collections.new(NOME + "_cortes")
bpy.context.scene.collection.children.link(CORTES)
CORTES.hide_render = True
CORTES.hide_viewport = True

def lin(h):
    c = Color((int(h[1:3], 16) / 255, int(h[3:5], 16) / 255, int(h[5:7], 16) / 255))
    c = c.from_srgb_to_scene_linear()
    return (c.r, c.g, c.b, 1.0)

def mat(cor, grupo):
    nome = f"ki_{grupo}_{cor}"
    m = bpy.data.materials.get(nome)
    if m:
        return m
    m = bpy.data.materials.new(nome)
    m.use_nodes = True
    b = None
    for n in m.node_tree.nodes:
        if n.type == "BSDF_PRINCIPLED":
            b = n
    b.inputs["Base Color"].default_value = lin(cor)
    b.inputs["Roughness"].default_value = {"cromo": 0.2, "pelo": 1.0, "lata": 0.35}.get(grupo, 0.6)
    b.inputs["Metallic"].default_value = 0.85 if grupo == "cromo" else 0.0
    if grupo == "brilho":
        b.inputs["Emission Color"].default_value = lin(cor)
        b.inputs["Emission Strength"].default_value = 2.0
    m["grupo"] = grupo
    return m

def novo(nome, bm, grupo, cor, bevel=0.0, seg=3, sub=0, col=None):
    me = bpy.data.meshes.new(nome)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(nome, me)
    (col or COL).objects.link(o)
    me.materials.append(mat(cor, grupo))
    o["grupo"] = grupo
    o["cor"] = cor
    if bevel:
        m = o.modifiers.new("bv", "BEVEL")
        m.width = bevel
        m.segments = seg
        m.limit_method = "ANGLE"
        m.harden_normals = sub == 0
    if sub:
        m = o.modifiers.new("sd", "SUBSURF")
        m.levels = sub
        m.render_levels = sub
    me.shade_smooth()
    return o

def M(pos, dims=None, rot=None):
    m = Matrix.Translation(pos)
    if rot is not None:
        m = m @ rot
    if dims is not None:
        m = m @ Matrix.Diagonal((dims[0], dims[1], dims[2], 1.0))
    return m

def bloco(nome, pos, dims, grupo, cor, rot=None, **kw):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0, matrix=M(pos, dims, rot))
    return novo(nome, bm, grupo, cor, **kw)

def caixa(nome, pl, sl, grupo, cor, rg=(0, 0, 0), **kw):
    kw.setdefault("bevel", 0.008)
    return bloco(nome, P(*pl), S(*sl), grupo, cor, rot=rotG(*rg), **kw)

def cil(nome, pos, r1, r2, alt, grupo, cor, rot=None, seg=24, **kw):
    # eixo do cilindro = Z do Blender (o Y do jogo), antes de rot
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg, radius1=r1, radius2=r2, depth=alt, matrix=M(pos, None, rot))
    return novo(nome, bm, grupo, cor, **kw)

def esfera(nome, pos, r, grupo, cor, achata=(1, 1, 1), rot=None, seg=16, **kw):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=max(6, seg * 2 // 3), radius=r, matrix=M(pos, achata, rot))
    return novo(nome, bm, grupo, cor, **kw)

def toro(nome, pos, R, r, grupo, cor, rot=None, seg=40, segr=10, arco=2 * math.pi, **kw):
    bm = bmesh.new()
    mm = M(pos, None, rot)
    fech = arco >= 2 * math.pi - 1e-6
    n = seg if fech else seg + 1
    aneis = []
    for i in range(n):
        a = arco * i / seg
        anel = []
        for j in range(segr):
            b = 2 * math.pi * j / segr
            v = Vector(((R + r * math.cos(b)) * math.cos(a), (R + r * math.cos(b)) * math.sin(a), r * math.sin(b)))
            anel.append(bm.verts.new(mm @ v))
        aneis.append(anel)
    for i in range(n if fech else n - 1):
        A, B = aneis[i], aneis[(i + 1) % n]
        for j in range(segr):
            bm.faces.new((A[j], B[j], B[(j + 1) % segr], A[(j + 1) % segr]))
    return novo(nome, bm, grupo, cor, **kw)

def furo(o, pos, dims, raio):
    # buraco de canto redondo (o cortador é uma caixa arredondada escondida)
    c = bloco(o.name + "_corte", pos, dims, "fosco", "#000000", bevel=raio, seg=8, col=CORTES)
    c.modifiers["bv"].limit_method = "NONE"
    m = o.modifiers.new("furo", "BOOLEAN")
    m.operation = "DIFFERENCE"
    m.solver = "EXACT"
    m.object = c
    # o furo vem antes do chanfro (a borda do furo também arredonda)
    o.modifiers.move(len(o.modifiers) - 1, 0)

def aplica(o):
    # aplica os modificadores e devolve a malha final
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(o.evaluated_get(dg))
    o.modifiers.clear()
    velho = o.data
    o.data = me
    bpy.data.meshes.remove(velho)
    return o

def pinta_por(o, modo, a=None):
    # cor por canto de face, pelo centro da face (o modo seguro do MCP não
    # deixa passar função: os padrões são nomeados)
    me = o.data
    at = me.color_attributes.get("Base") or me.color_attributes.new("Base", "FLOAT_COLOR", "CORNER")
    for p in me.polygons:
        q = p.center
        if modo == "xadrez":
            xw, L1, ytop, lo, T = a
            u = q.x - xw if q.z > ytop - 0.02 else L1 + (ytop - q.z)
            h = ROSA if (math.floor(u / T) + math.floor((q.y - lo) / T)) % 2 else AGUA
        else:
            h = AZUL if int((q.z - 1.0) / 0.035) % 2 else "#f1e7d6"
        c = lin(h)
        for li in p.loop_indices:
            at.data[li].color = c
    o["cor_por_face"] = 1

# ═════════════════════ a carcaça ═════════════════════

# assoalho de borracha
caixa("piso", (0, 0.24, 0.25), (1.74, 0.02, 3.2), "fosco", BORRACHA)

# laterais da frente (lata), com a janela da porta de canto redondo
for s, lado in ((-1, "esq"), (1, "dir")):
    o = caixa(f"porta_{lado}", (s * 0.875, 0.835, -0.64), (0.025, 1.17, 1.4), "lata", "#ffffff", bevel=0.01)
    furo(o, P(s * 0.875, 1.085, -0.64), S(0.2, 0.56, 1.3), 0.06)
    # vareta do quebra-vento
    cil(f"quebravento_{lado}", P(s * 0.87, 1.085, -1.13), 0.009, 0.009, 0.72, "cromo", CROMADO)
    # coluna que separa a cabine do estúdio
    caixa(f"coluna_{lado}", (s * 0.85, 0.86, 0.06), (0.07, 1.2, 0.07), "lata", "#ffffff", bevel=0.02)

# paredes de ripas no fundo: feltro magenta e ripas de bétula arredondadas
for s, lado in ((-1, "esq"), (1, "dir")):
    caixa(f"feltro_{lado}", (s * 0.878, 0.86, 0.94), (0.012, 1.14, 1.72), "fosco", FELTRO, bevel=0)
    for k in range(38):
        caixa(f"ripa_{lado}_{k}", (s * 0.86, 0.86, 0.12 + k * 0.045), (0.02, 1.12, 0.028), "fosco", BETULA[k % 3], bevel=0.006, seg=3)

# teto de tábuas curvo (cai nas bordas, como o teto da Kombi), com a claraboia
def altura_teto(x):
    a = abs(x)
    return 1.465 - (0.13 * ((a - 0.55) / 0.32) ** 2 if a > 0.55 else 0.0)

def tabua(nome, x, z0, z1, k):
    h = altura_teto(x)
    d = (altura_teto(x + 0.01) - altura_teto(x - 0.01)) / 0.02
    ang = math.atan(d * E[1] / E[0])
    caixa(nome, (x, h, (z0 + z1) / 2), (0.116, 0.018, z1 - z0), "fosco", BETULA[k % 3], rg=(0, 0, ang), bevel=0.004, seg=2)

for k in range(15):
    x = -0.812 + k * 0.116
    tabua(f"tabua_tras_{k}", x, 0.45, 1.82, k)
    tabua(f"tabua_frente_{k}", x, -1.42, -0.9, k + 1)
    if abs(x) > 0.5:
        tabua(f"tabua_meio_{k}", x, -0.9, 0.45, k + 2)
# moldura da claraboia, madeira mais escura
for s in (-1, 1):
    caixa(f"clara_lado_{s}", (s * 0.5, 1.452, -0.225), (0.025, 0.035, 1.37), "fosco", "#b8956a", bevel=0.008)
for z in (-0.9, 0.45):
    caixa(f"clara_ponta_{z}", (0, 1.452, z), (1.02, 0.035, 0.025), "fosco", "#b8956a", bevel=0.008)
# luzinhas embutidas
for i, z in enumerate((0.85, 1.25, 1.62)):
    cil(f"luz_{i}", P(0, 1.452, z), 0.035, 0.035, 0.006, "brilho", "#fff1d6")
    toro(f"luz_aro_{i}", P(0, 1.454, z), 0.038, 0.005, "cromo", CROMADO, seg=24, segr=6)

# para-brisa dividido (lata), cantos redondos
o = caixa("parabrisa", (0, 1.13, -1.345), (1.74, 0.66, 0.05), "lata", "#ffffff", bevel=0.012)
for s in (-1, 1):
    furo(o, P(s * 0.405, 1.11, -1.345), S(0.76, 0.54, 0.3), 0.07)
# fita da franja de pompom
caixa("franja_fita", (0, 1.372, -1.29), (1.52, 0.026, 0.012), "fosco", "#d0213a", bevel=0.004)
# quebra-sóis
for s in (-1, 1):
    caixa(f"quebrasol_{s}", (s * 0.42, 1.372, -1.2), (0.46 if s < 0 else 0.42, 0.016, 0.17), "fosco", "#ddd2b8", bevel=0.007, seg=4)
    cil(f"quebrasol_pino_{s}", P(s * 0.66, 1.385, -1.25), 0.008, 0.008, 0.03, "cromo", CROMADO)

# parede de trás branca, com o vidro de trás aberto
o = caixa("traseira", (0, 0.86, 1.8), (1.74, 1.2, 0.04), "fosco", BRANCO, bevel=0.01)
furo(o, P(0, 1.11, 1.8), S(1.44, 0.54, 0.3), 0.08)

# ═════════════════════ painel ═════════════════════

caixa("painel_frente", (0, 0.54, -0.89), (1.66, 0.46, 0.04), "lata", "#ffffff", bevel=0.012)
caixa("painel_tampo", (0, 0.79, -1.115), (1.72, 0.04, 0.45), "fosco", VINIL, bevel=0.012)
cil("painel_friso", P(0, 0.79, -0.88), 0.032, 0.032, 1.66 * E[0], "fosco", VINIL, rot=Matrix.Rotation(math.pi / 2, 4, "Y"), seg=20)
# casulo do velocímetro (virado pro olho)
CAS = (-0.4, 0.865, -0.965)
rc = Matrix.Rotation(math.pi / 2 - 0.26, 4, "X")  # eixo Z do cilindro -> pra trás e pra cima
rc_b = Matrix.Rotation(-(math.pi / 2 - 0.26), 4, "X")
cil("casulo", P(*CAS), 0.1, 0.095, 0.075, "lata", "#ffffff", rot=rc_b, seg=32, bevel=0.01)
toro("casulo_aro", P(CAS[0], CAS[1] + 0.008, CAS[2] + 0.028), 0.083, 0.007, "cromo", CROMADO, rot=rc_b, seg=36, segr=8)

# chave no contato
caixa("chave", (-0.63, 0.66, -0.864), (0.022, 0.03, 0.008), "cromo", CROMADO, bevel=0.003)
esfera("chaveiro", P(-0.63, 0.6, -0.858), 0.014, "brilho", "#ff3fb0")

# câmbio: coifa, vara e bola de cristal
base, topo = P(0.06, 0.27, -0.66), P(0.06, 0.7, -0.47)
cil("cambio_coifa", base + Vector((0, 0, 0.035)), 0.05, 0.018, 0.08, "fosco", "#111014", seg=16)
eixo = (topo - base)
rv = eixo.to_track_quat("Z", "Y").to_matrix().to_4x4()
cil("cambio_vara", (base + topo) / 2, 0.009, 0.008, eixo.length, "cromo", CROMADO, rot=rv, seg=10)
esfera("cambio_bola", topo, 0.034, "brilho", "#ff6ac1", seg=20)

# vasinho de flor no canto
V = P(-0.7, 0.81, -1.2)
cil("vaso_aro", V + Vector((0, 0, 0.012)), 0.022, 0.022, 0.02, "cromo", CROMADO, seg=16)
cil("vaso", V + Vector((0, 0, 0.07)), 0.02, 0.013, 0.1, "fosco", "#9fe6ff", seg=16)
cil("vaso_cabo", V + Vector((0, 0, 0.15)), 0.003, 0.003, 0.08, "fosco", "#3c8a2e", seg=6)
for k in range(8):
    a = k / 8 * 2 * math.pi
    esfera(f"petala_{k}", V + Vector((math.cos(a) * 0.02, 0.006, 0.2 + math.sin(a) * 0.02)), 0.011, "brilho", "#fffaf0",
           achata=(1.8, 0.4, 0.7), rot=Matrix.Rotation(a, 4, "Y"), seg=8)
esfera("miolo", V + Vector((0, -0.002, 0.2)), 0.009, "brilho", "#ffc21a", seg=10)

# havaiana: base, pernas, saia de palha (o tronco mexe, fica no código)
H, k = (-0.1, 0.822, -1.12), 1.7
hb = P(*H)
cil("hula_base", hb + Vector((0, 0, 0.0085)), 0.03 * k, 0.028 * k, 0.017, "fosco", "#1b1712", seg=24, bevel=0.003)
for x in (-0.008, 0.008):
    cil(f"hula_perna_{x}", hb + Vector((x * k, 0, 0.051)), 0.006 * k, 0.005 * k, 0.065, "fosco", PELE, seg=8)
o = cil("hula_saia", hb + Vector((0, 0, 0.1)), 0.032 * k, 0.012, 0.065, "fosco", "#4fa83a", seg=36)
for i, v in enumerate(o.data.vertices):
    if v.co.z < hb.z + 0.08:
        a = math.atan2(v.co.y - hb.y, v.co.x - hb.x)
        f = 1 + 0.12 * math.cos(a * 18)
        v.co.x = hb.x + (v.co.x - hb.x) * f
        v.co.y = hb.y + (v.co.y - hb.y) * f

# ═════════════════════ portas por dentro ═════════════════════

# forro capitonê (rolos) na porta do motorista, apoio de braço, maçaneta, manivela
caixa("porta_forro", (-0.857, 0.48, -0.45), (0.012, 0.3, 0.8), "fosco", "#8f3550", bevel=0.004)
for i in range(9):
    z = -0.8 + i * 0.0875
    cil(f"porta_rolo_{i}", P(-0.848, 0.48, z), 0.02, 0.02, 0.3 * E[1], "fosco", "#a8445f", seg=12)
caixa("apoio_braco", (-0.83, 0.64, -0.2), (0.06, 0.05, 0.42), "fosco", "#ddd2b8", bevel=0.02, seg=4)
caixa("macaneta", (-0.842, 0.61, -0.75), (0.015, 0.02, 0.1), "cromo", CROMADO, bevel=0.006)
cil("manivela_eixo", P(-0.845, 0.7, -0.62), 0.02, 0.02, 0.02, "cromo", CROMADO, rot=Matrix.Rotation(math.pi / 2, 4, "Y"), bevel=0.004)
caixa("manivela_braco", (-0.836, 0.7, -0.58), (0.01, 0.012, 0.09), "cromo", CROMADO, bevel=0.004)
cil("manivela_pega", P(-0.82, 0.7, -0.54), 0.012, 0.012, 0.035, "fosco", "#ddd2b8", rot=Matrix.Rotation(math.pi / 2, 4, "Y"), seg=12, bevel=0.003)
caixa("porta_forro_dir", (0.857, 0.48, -0.45), (0.012, 0.3, 0.8), "fosco", "#8f3550", bevel=0.004)
caixa("apoio_braco_dir", (0.83, 0.64, -0.2), (0.06, 0.05, 0.42), "fosco", "#ddd2b8", bevel=0.02, seg=4)

# ═════════════════════ bancos da frente (pelúcia) ═════════════════════

caixa("banco_base", (-0.25, 0.4, -0.05), (1.11, 0.32, 0.5), "fosco", "#3a2a30", bevel=0.02)
caixa("banco_base_dir", (0.55, 0.4, -0.05), (0.55, 0.32, 0.5), "fosco", "#3a2a30", bevel=0.02)
caixa("assento", (-0.25, 0.6, -0.05), (1.13, 0.08, 0.57), "pelo", ROSA, bevel=0.035, seg=4, sub=1)
caixa("assento_dir", (0.55, 0.6, -0.05), (0.57, 0.08, 0.57), "pelo", ROSA, bevel=0.035, seg=4, sub=1)
caixa("encosto", (-0.25, 0.73, 0.29), (1.11, 0.26, 0.09), "pelo", MAGENTA, bevel=0.035, seg=4, sub=1)
caixa("encosto_dir", (0.55, 0.73, 0.29), (0.55, 0.26, 0.09), "pelo", MAGENTA, bevel=0.035, seg=4, sub=1)

# ═════════════════════ o estúdio ═════════════════════

# sofá da esquerda: base de bétula, colchão, manta xadrez caindo pela frente
caixa("sofa_base", (-0.64, 0.375, 0.86), (0.42, 0.25, 1.12), "fosco", BETULA[0], bevel=0.015)
caixa("sofa_colchao", (-0.64, 0.525, 0.86), (0.42, 0.06, 1.12), "fosco", "#efe6d6", bevel=0.02, seg=3)

def manta():
    # uma folha: em cima do colchão (da parede até a beirada) e caindo pela frente
    z0, z1 = P(0, 0, 0.3).y, P(0, 0, 1.42).y  # no Blender, Y = -z do jogo
    xw = P(-0.85, 0, 0).x
    xb = P(-0.42, 0, 0).x
    ytop = P(0, 0.565, 0).z
    ybaixo = P(0, 0.31, 0).z
    L1, raio = xb - xw, 0.03
    L2 = (ytop - ybaixo)
    nu, nv = 44, 36
    T = 0.11
    bm = bmesh.new()
    vs = []
    for i in range(nv + 1):
        s = (L1 + L2) * i / nv
        linha = []
        for j in range(nu + 1):
            y = z0 + (z1 - z0) * j / nu
            if s <= L1 - raio:
                x, z = xw + s, ytop
            elif s <= L1 - raio + raio * math.pi / 2:
                a = (s - (L1 - raio)) / raio
                x, z = xb - raio + math.sin(a) * raio, ytop - raio + math.cos(a) * raio
            else:
                d = s - (L1 - raio + raio * math.pi / 2)
                onda = math.sin(y * 26) * 0.012 * min(1, d / 0.12)
                x, z = xb + onda, ytop - raio - d
            linha.append(bm.verts.new((x, y, z)))
        vs.append(linha)
    for i in range(nv):
        for j in range(nu):
            bm.faces.new((vs[i][j], vs[i][j + 1], vs[i + 1][j + 1], vs[i + 1][j]))
    o = novo("manta", bm, "pelo", ROSA)
    m = o.modifiers.new("esp", "SOLIDIFY")
    m.thickness = 0.022
    m.offset = 1
    aplica(o)
    # xadrez: pela posição ao longo da folha e do comprimento
    pinta_por(o, "xadrez", (xw, L1, ytop, min(z0, z1), T))
manta()

def almofada(nome, pl, dims, cor, rg=(0, 0, 0), grupo="fosco", listra=False):
    # caixa de quina redonda, depois estufa no meio (a espessura cai nas bordas)
    o = caixa(nome, pl, dims, grupo, cor, rg=rg, bevel=0.03, seg=3, sub=2)
    aplica(o)
    c = o.data.vertices
    cen = Vector()
    for v in c:
        cen += v.co
    cen /= len(c)
    ext = [0.0, 0.0, 0.0]
    for v in c:
        for i in range(3):
            ext[i] = max(ext[i], abs(v.co[i] - cen[i]))
    fino = 0
    for i in (1, 2):
        if ext[i] < ext[fino]:
            fino = i
    outros = [i for i in range(3) if i != fino]
    for v in c:
        a, b = outros
        r2 = (((v.co[a] - cen[a]) / ext[a]) ** 2 + ((v.co[b] - cen[b]) / ext[b]) ** 2) / 2
        v.co[fino] = cen[fino] + (v.co[fino] - cen[fino]) * (1.25 - 0.55 * r2)
    if listra:
        pinta_por(o, "listra")
    return o

for i, zl in enumerate((0.5, 1.22)):
    zc = P(0, 0, zl).y
    almofada(f"almofada_listra_{i}", (-0.77, 0.7, zl), (0.1, 0.27, 0.32),
             "#ffffff", rg=(0, 0, -0.25), listra=True)
almofada("almofada_pelucia", (-0.76, 0.68, 0.86), (0.11, 0.26, 0.28), MAGENTA, rg=(0, 0, -0.25), grupo="pelo")
# tapete felpudo verde-água
caixa("tapete", (0.02, 0.265, 0.86), (0.8, 0.02, 1.12), "pelo", AGUA, bevel=0.03, seg=4)

# a mesa de ponta a ponta, gaveteiro com três gavetas, fita de LED
caixa("mesa_tampo", (0, 0.78, 1.63), (1.66, 0.04, 0.3), "fosco", BRANCO, bevel=0.012, seg=3)
caixa("gaveteiro", (-0.66, 0.51, 1.63), (0.3, 0.5, 0.28), "fosco", BRANCO, bevel=0.01)
for i in range(3):
    caixa(f"gaveta_{i}", (-0.66, 0.36 + i * 0.155, 1.488), (0.27, 0.135, 0.012), "fosco", "#ebe5de", bevel=0.006)
    cil(f"puxador_{i}", P(-0.66, 0.39 + i * 0.155, 1.478), 0.012, 0.012, 0.016, "cromo", CROMADO, rot=Matrix.Rotation(math.pi / 2, 4, "X"), seg=12, bevel=0.003)
caixa("mesa_perna", (0.8, 0.51, 1.63), (0.035, 0.5, 0.28), "fosco", BRANCO, bevel=0.01)
caixa("mesa_led", (0, 0.756, 1.485), (1.6, 0.006, 0.008), "brilho", AGUA, bevel=0)

# monitor (a tela fica no código), pé cromado
caixa("monitor", (0.05, 1.03, 1.72), (0.64, 0.33, 0.025), "fosco", "#15161c", bevel=0.008)
caixa("monitor_pe", (0.05, 0.86, 1.745), (0.045, 0.14, 0.03), "cromo", CROMADO, bevel=0.008)
caixa("monitor_base", (0.05, 0.805, 1.72), (0.2, 0.012, 0.12), "cromo", CROMADO, bevel=0.005)

# caixas de som de estúdio, viradas pra cadeira
for s in (-1, 1):
    pl = (s * 0.5, 0.905, 1.68)
    rz = -(s * 0.25)  # em torno do eixo de cima
    rot = Matrix.Rotation(rz, 4, "Z")
    pc = P(*pl)
    bloco(f"caixa_som_{s}", pc, S(0.13, 0.21, 0.14), "fosco", BRANCO, rot=rot, bevel=0.012, seg=3)
    frente = rot @ Vector((0, 1, 0))
    face = pc + frente * (0.14 * E[2] / 2)
    rv = frente.to_track_quat("Z", "Y").to_matrix().to_4x4()
    cil(f"woofer_{s}", face + Vector((0, 0, -0.045)) - frente * 0.006, 0.05, 0.035, 0.015, "fosco", "#18181e", rot=rv, seg=28)
    toro(f"woofer_aro_{s}", face + Vector((0, 0, -0.045)), 0.05, 0.005, "cromo", "#9aa0aa", rot=rv, seg=28, segr=6)
    cil(f"tweeter_{s}", face + Vector((0, 0, 0.075)) - frente * 0.004, 0.02, 0.014, 0.01, "fosco", "#18181e", rot=rv, seg=20)
    esfera(f"led_som_{s}", face + Vector((0, 0, -0.11)), 0.005, "brilho", ROSA, seg=8)

# teclado MIDI: teclas brancas uma a uma, pretas por cima, botões

caixa("midi_corpo", (0.05, 0.815, 1.545), (0.44, 0.03, 0.14), "fosco", "#2a2730", bevel=0.008)
for k in range(15):
    caixa(f"midi_branca_{k}", (-0.135 + k * 0.0265, 0.834, 1.522), (0.025, 0.008, 0.075), "fosco", "#f4f1ec", bevel=0.002, seg=1)
for k in range(14):
    if k % 7 in (2, 6):
        continue
    caixa(f"midi_preta_{k}", (-0.122 + k * 0.0265, 0.842, 1.505), (0.014, 0.01, 0.042), "fosco", "#111111", bevel=0.002, seg=1)
for k in range(6):
    cil(f"midi_botao_{k}", P(-0.11 + k * 0.03, 0.838, 1.595), 0.009, 0.008, 0.016, "fosco", [ROSA, AGUA, AZUL][k % 3], seg=12, bevel=0.002)

# plantinha em cima do gaveteiro
cil("vasinho", P(-0.66, 0.84, 1.66), 0.045, 0.035, 0.1, "fosco", ROSA, seg=24, bevel=0.006)
for k in range(9):
    a = k * 2.4
    r = 0.025 + (k % 3) * 0.012
    esfera(f"folha_{k}", P(-0.66, 0.9, 1.66) + Vector((math.cos(a) * r, math.sin(a) * r, 0.02 + (k % 4) * 0.018)), 0.03,
           "fosco", "#3f9b4a" if k % 2 else "#56b85c", achata=(1.3, 0.6, 0.35), rot=Matrix.Rotation(a, 4, "Z") @ Matrix.Rotation(0.5, 4, "X"), seg=10)

# a cadeira de tela, virada pra mesa
C = P(0.05, 0, 1.2)
for k in range(5):
    a = k / 5 * 2 * math.pi + 0.3
    d = Vector((math.cos(a), math.sin(a), 0))
    bloco(f"cad_pe_{k}", C + d * 0.12 + Vector((0, 0, 0.66)), (0.24, 0.025, 0.02), "cromo", CROMADO, rot=Matrix.Rotation(a, 4, "Z"), bevel=0.006)
    esfera(f"cad_roda_{k}", C + d * 0.235 + Vector((0, 0, 0.645)), 0.02, "fosco", "#1b1b20", seg=10)
cil("cad_coluna", C + Vector((0, 0, 0.82)), 0.022, 0.022, 0.32, "cromo", CROMADO, seg=14)
caixa("cad_assento", (0.05, 0.56, 1.2), (0.42, 0.06, 0.4), "fosco", "#f1ece4", bevel=0.025, seg=4, sub=1)
# encosto curvo de ripas (como a tela da cadeira do vídeo), arcos laterais
for k in range(10):
    o = caixa(f"cad_ripa_{k}", (0.05, 0.66 + k * 0.048, 0.995 - 0.004 * k), (0.38, 0.028, 0.018), "fosco", AGUA if k % 2 else "#f1ece4", bevel=0.007, seg=3)
    aplica(o)
    for v in o.data.vertices:
        dx = v.co.x - C.x
        v.co.y += -1.6 * dx * dx  # as pontas curvam pra frente (pra mesa)
for s in (-1, 1):
    cil(f"cad_arco_{s}", P(0.05 + s * 0.2, 0.86, 0.99) + Vector((0, 0.06, 0)), 0.012, 0.012, 0.6, "fosco", "#f1ece4", seg=10)

# os dois sintetizadores no suporte em X, na direita; banquinho de pelúcia
def sinte(nome, yl, inclina):
    x, z = 0.6, 0.95
    r = (0, 0, inclina)
    caixa(f"{nome}_corpo", (x, yl, z), (0.24, 0.07, 0.72), "fosco", "#2a2730", rg=r, bevel=0.01)
    for dz in (-0.375, 0.375):
        caixa(f"{nome}_lateral_{dz}", (x, yl + 0.012, z + dz), (0.26, 0.11, 0.03), "fosco", BETULA[1], rg=r, bevel=0.012, seg=4)
    for k in range(29):
        caixa(f"{nome}_branca_{k}", (x - 0.07, yl + 0.04, z - 0.33 + k * 0.0235), (0.09, 0.012, 0.0215), "fosco", "#f4f1ec", rg=r, bevel=0.002, seg=1)
    for k in range(28):
        if k % 7 in (2, 6):
            continue
        caixa(f"{nome}_preta_{k}", (x - 0.05, yl + 0.05, z - 0.318 + k * 0.0235), (0.05, 0.014, 0.012), "fosco", "#111111", rg=r, bevel=0.002, seg=1)
    for k in range(10):
        cil(f"{nome}_botao_{k}", P(x + 0.05 + (k % 2) * 0.035, yl + 0.045, z - 0.28 + (k // 2) * 0.12), 0.01, 0.009, 0.018,
            "fosco", [ROSA, AGUA, AZUL, MAGENTA][k % 4], rot=Matrix.Rotation(-inclina, 4, "Y"), seg=12, bevel=0.002)
sinte("sinte_baixo", 0.62, 0.0)
sinte("sinte_cima", 0.82, 0.35)
for dz in (-0.28, 0.28):
    for a in (0.35, -0.35):
        cil(f"suporte_{dz}_{a}", P(0.6, 0.55, 0.95 + dz), 0.011, 0.011, 0.62 * E[1], "cromo", CROMADO, rot=Matrix.Rotation(-a, 4, "Y"), seg=10)
cil("banquinho_pe", P(0.3, 0.37, 0.95), 0.015, 0.03, 0.22 * E[1], "cromo", CROMADO, seg=12)
cil("banquinho_base", P(0.3, 0.255, 0.95), 0.1, 0.1, 0.012, "cromo", CROMADO, seg=24, bevel=0.004)
cil("banquinho_assento", P(0.3, 0.5, 0.95), 0.125, 0.12, 0.06, "pelo", AZUL, seg=28, bevel=0.025, sub=1)

# câmera no olho do motorista (o OLHO da Cabine), pra conferir
cam = bpy.data.objects.get("Camera")
if cam:
    cam.location = Vector((-0.176, 0.194, 1.795))
    cam.rotation_euler = (math.radians(85), 0, 0)
    cam.data.sensor_fit = "VERTICAL"
    cam.data.angle_y = math.radians(86)
    bpy.context.scene.render.resolution_x, bpy.context.scene.render.resolution_y = 1280, 800
print("objetos:", len(COL.objects))
