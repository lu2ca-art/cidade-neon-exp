# A PLANTA DA ELLA (09/11, ep. 7: "as flores serão modeladas como cannabis bem
# realista"): a geometria, sem bpy, usada pelo planta_ella.py (o glb com as duas
# versões) e pelo lugares_cidade.py (o jardim da casa dela).
#
# planta(saida, nivel, seed, H): a origem no pé da planta (no chão), Z pra cima,
# H de altura. saida(P, C, F) recebe cada pedaço: pontos (Vector), cor por ponto
# (Vector linear) e faces (índices).
#   nivel "casa"  folha serrilhada de 7 e 5 pontas, nervura, flores com
#                 cálices, folhinhas e pelos                     ≤ 2000 tri
#   nivel "leve"  a mesma silhueta sem o serrilhado, pra instanciar ≤ 300 tri

import math, random
from mathutils import Vector, Color

TAU = 2 * math.pi


def lin(h):
    c = Color((int(h[1:3], 16) / 255, int(h[3:5], 16) / 255, int(h[5:7], 16) / 255)).from_srgb_to_scene_linear()
    return Vector((c.r, c.g, c.b))


def mix(a, b, t):
    return a * (1 - t) + b * t


ESC, MED, CLA = lin("#1c4a22"), lin("#2a6a2a"), lin("#4a8e36")     # as folhas
NERV = lin("#86ad58")                                              # a nervura
CAULE, CAULE2 = lin("#4c5a2c"), lin("#3a6a2c")                     # o pé (lenhoso) e a ponta
CALICE, GEADA = lin("#4a7230"), lin("#7f9a5c")                     # a flor: cálice e resina
PELO, PELO2 = lin("#8a3c10"), lin("#8a7a55")                       # os pelos: laranja e creme

# as pontas da folha: (ângulo em graus, comprimento, dentes de cada lado)
PONTAS = {
    7: ((0, 1.0, 5), (25, 0.86, 4), (-25, 0.86, 4), (52, 0.63, 3), (-52, 0.63, 3), (82, 0.34, 2), (-82, 0.34, 2)),
    5: ((0, 1.0, 4), (32, 0.78, 3), (-32, 0.78, 3), (68, 0.42, 2), (-68, 0.42, 2)),
}


def dedo(saida, base, d, n, comp, larg, dentes, cai, cor, ponta):
    """Uma ponta da folha: a nervura vincada no meio, a borda em dentes voltados
    pra frente. dentes = 0: a versão leve, 4 triângulos sem serrilhado."""
    s = d.cross(n).normalized()

    def centro(t):
        return base + d * comp * t - n * (cai * comp * t * t)

    def meia(t):
        return larg * 0.5 * max(0.0, math.sin(math.pi * t ** 0.8)) ** 0.75

    def borda(t, lado, k, frente=0.0):
        w = meia(t) * k
        return centro(t + frente) + s * (lado * w) + n * (w * 0.14)

    if dentes == 0:
        P = [base, borda(0.3, 1, 1.0), borda(0.62, 1, 1.0), centro(1.0), borda(0.62, -1, 1.0), borda(0.3, -1, 1.0)]
        e = mix(cor, ponta, 0.4)
        C = [cor * 0.8, e * 0.9, e, ponta, e, e * 0.9]
        saida(P, C, [(0, 2, 1), (0, 3, 2), (0, 4, 3), (0, 5, 4)])
        return

    N = dentes
    P, C, F = [], [], []
    M = []
    for i in range(N + 1):
        t = i / N
        M.append(len(P))
        P.append(centro(t))
        C.append(mix(mix(cor, ponta, t), NERV, 0.55) * (0.8 + 0.2 * t))
    for lado in (1, -1):
        tip, ent = [], [M[0]]
        for i in range(N):
            t = i / N
            dt = 1 / N
            tt = min(0.97, t + dt * 0.62)
            tip.append(len(P))
            P.append(borda(tt, lado, 1.08, dt * 0.32))
            C.append(mix(cor, ponta, tt) * 1.05)
            if i + 1 < N:
                ent.append(len(P))
                P.append(borda(t + dt, lado, 0.78))
                C.append(mix(cor, ponta, t + dt) * 0.82)
        ent.append(M[N])
        for i in range(N):
            q = [(M[i], ent[i], tip[i]), (M[i], tip[i], M[i + 1]), (tip[i], ent[i + 1], M[i + 1])]
            if i == 0:
                q = q[1:]
            if i == N - 1:
                q = q[:-1]
            F += [f if lado < 0 else (f[0], f[2], f[1]) for f in q]
    saida(P, C, F)


def folha(saida, base, d, n, comp, pontas, serrilha, rr):
    """A folha de 5 ou 7 pontas abertas em leque, no plano perpendicular a n."""
    d, n = d.normalized(), n.normalized()
    n = (n - d * n.dot(d)).normalized()
    s = d.cross(n)
    tom = mix(ESC, MED, rr.uniform(0.25, 1.0))
    claro = mix(MED, CLA, rr.uniform(0.2, 0.9))
    for ang, k, dentes in PONTAS[pontas]:
        a = math.radians(ang + rr.uniform(-3, 3))
        df = (d * math.cos(a) + s * math.sin(a)).normalized()
        ab = abs(ang) / 90
        # as de fora caem mais e abrem pra trás, como na planta de verdade
        nf = (n + df * (-0.18 * ab)).normalized()
        dedo(saida, base, df, nf, comp * k, comp * k * 0.24, dentes if serrilha else 0,
             0.3 + 0.25 * ab + rr.uniform(0, 0.08), tom, claro)


def talo(saida, pts, r0, r1, lados, cor, cor2):
    """Caule ou pecíolo em tubo fino; lados = 0: uma fita de 2 triângulos (o leve)."""
    pts = [Vector(p) for p in pts]
    n = len(pts)
    if lados == 0:
        a, b = pts[0], pts[-1]
        ld = (b - a).cross(Vector((0.3, 0.2, 1))).normalized()
        saida([a + ld * r0, a - ld * r0, b + ld * r1, b - ld * r1], [cor, cor, cor2, cor2], [(0, 1, 3), (0, 3, 2)])
        return
    T = [(pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)]).normalized() for i in range(n)]
    a = Vector((0, 0, 1)) if abs(T[0].z) < 0.9 else Vector((1, 0, 0))
    N = [(a - T[0] * a.dot(T[0])).normalized()]
    for i in range(1, n):
        q = N[-1] - T[i] * N[-1].dot(T[i])
        N.append(q.normalized() if q.length > 1e-8 else N[-1])
    P, C, F = [], [], []
    for i in range(n):
        t = i / max(1, n - 1)
        r = r0 + (r1 - r0) * t
        bb = T[i].cross(N[i])
        for k in range(lados):
            P.append(pts[i] + r * (math.cos(TAU * k / lados) * N[i] + math.sin(TAU * k / lados) * bb))
            C.append(mix(cor, cor2, t))
    for i in range(n - 1):
        for k in range(lados):
            j = (k + 1) % lados
            F.append((i * lados + k, i * lados + j, (i + 1) * lados + j, (i + 1) * lados + k))
    saida(P, C, F)


def cola_leve(saida, p, d, comp, r, rr):
    """A flor do leve: um fuso de 10 triângulos, de longe os cálices viram um só."""
    d = d.normalized()
    u = d.cross(Vector((0.3, 0.9, 0.1))).normalized()
    v = d.cross(u)
    meio = p + d * (comp * 0.42)
    P = [p, p + d * comp]
    C = [CALICE * 0.7, mix(CALICE, GEADA, 0.5)]
    for k in range(5):
        a = TAU * k / 5 + rr.uniform(0, 0.4)
        P.append(meio + (u * math.cos(a) + v * math.sin(a)) * (r * rr.uniform(0.8, 1.15)))
        C.append(mix(CALICE, GEADA, 0.15 + 0.4 * (k % 2)))
    F = []
    for k in range(5):
        j = (k + 1) % 5
        F += [(0, 2 + j, 2 + k), (1, 2 + k, 2 + j)]
    saida(P, C, F)


def calice(saida, p, d, comp, r, rr):
    """Um cálice da flor: um cone de 3 lados pontudo, escuro no pé e com resina na ponta."""
    d = d.normalized()
    u = d.cross(Vector((0.4, 0.8, 0.2))).normalized()
    v = d.cross(u)
    P, C = [], []
    a0 = rr.uniform(0, TAU)
    for k in range(3):
        a = a0 + TAU * k / 3
        P.append(p + (u * math.cos(a) + v * math.sin(a)) * r)
        C.append(mix(MED, CALICE, 0.7) * 0.8)
    P.append(p + d * comp)
    C.append(mix(CALICE, GEADA, rr.uniform(0.55, 1.0)))
    saida(P, C, [(0, 1, 3), (1, 2, 3), (2, 0, 3)])


def cola(saida, p, d, comp, r, rr, n_calices, n_folhas):
    """A flor: cálices pontudos empilhados em volta de um miolo escuro, as folhinhas
    de resina saindo do meio e os pelos laranja e creme nas pontas."""
    d = d.normalized()
    u = d.cross(Vector((0.3, 0.9, 0.1))).normalized()
    v = d.cross(u)
    # o miolo: um fuso escuro (não deixa ver através entre os cálices)
    meio = p + d * (comp * 0.45)
    P = [p, p + d * (comp * 0.95)]
    C = [CALICE * 0.5, CALICE * 0.8]
    for k in range(4):
        a = TAU * k / 4
        P.append(meio + (u * math.cos(a) + v * math.sin(a)) * (r * 0.72))
        C.append(CALICE * 0.65)
    F = []
    for k in range(4):
        j = (k + 1) % 4
        F += [(0, 2 + j, 2 + k), (1, 2 + k, 2 + j)]
    saida(P, C, F)
    # os cálices em espiral: gordos no meio, finos na ponta; a cada dois, um pelo
    for k in range(n_calices):
        t = 0.05 + 0.92 * k / n_calices
        a = k * 2.4 + rr.uniform(-0.3, 0.3)
        fora = (u * math.cos(a) + v * math.sin(a)).normalized()
        rt = r * (0.42 + 0.68 * math.sin(math.pi * (0.1 + 0.88 * t)))
        b = p + d * (comp * t) + fora * (rt * rr.uniform(0.55, 0.9))
        sai = (fora + d * rr.uniform(0.35, 0.8)).normalized()
        cc = r * rr.uniform(0.55, 0.8) * (1.1 - 0.5 * t)
        calice(saida, b, sai, cc, r * rr.uniform(0.32, 0.46), rr)
        if k % 2 == 0:
            ponta = b + sai * cc
            sp = (sai + fora * rr.uniform(0.2, 0.6) + d * rr.uniform(0, 0.4)).normalized()
            lado = sp.cross(d).normalized() * (r * 0.07)
            saida([ponta - lado, ponta + lado, ponta + sp * (r * rr.uniform(0.75, 1.1))], [PELO, PELO, mix(PELO2, PELO, 0.2 if k % 3 else 0.9)], [(0, 1, 2)])
    # as folhinhas de resina, entre os cálices
    for k in range(n_folhas):
        a = k * 2.4 + rr.uniform(0, 1)
        t = 0.25 + k * 0.28
        fora = u * math.cos(a) + v * math.sin(a)
        b = p + d * (comp * t) + fora * (r * 0.7)
        dd = (fora + d * 0.9).normalized()
        for ang in (0, 38, -38):
            df = (dd * math.cos(math.radians(ang)) + dd.cross(fora).normalized() * math.sin(math.radians(ang))).normalized()
            dedo(saida, b, df, fora, comp * (0.32 if ang == 0 else 0.22), comp * 0.1, 0, 0.1, mix(MED, CALICE, 0.6), mix(CALICE, GEADA, 0.55))


def planta(saida, nivel, seed=1, H=1.5):
    rr = random.Random(seed * 7919 + 17)
    serrilha = nivel == "casa"
    # o caule, com uma leve torção
    n_seg = 6 if serrilha else 3
    torto = Vector((rr.uniform(-0.05, 0.05), rr.uniform(-0.05, 0.05), 0))
    def caule(t):
        return Vector((0, 0, H * t)) + torto * (t * t * H) + Vector((0.016 * math.sin(t * 9 + seed), 0.016 * math.cos(t * 7 + seed), 0))
    talo(saida, [caule(i / n_seg) for i in range(n_seg + 1)], 0.02 * H / 1.5, 0.006, 5 if serrilha else 3, CAULE, CAULE2)
    # os pares de folhas, opostos e girando 90 graus a cada nó (como a planta de verdade)
    if serrilha:
        nos = [(0.12, 0.52, 7), (0.24, 0.52, 7), (0.36, 0.46, 7), (0.48, 0.36, 7), (0.58, 0.28, 5), (0.68, 0.23, 5), (0.78, 0.18, 5)]
    else:
        nos = [(0.16, 0.46, 7), (0.33, 0.43, 7), (0.5, 0.34, 7), (0.62, 0.26, 5), (0.76, 0.2, 5)]
    a0 = rr.uniform(0, TAU)
    pet_lados, pet_r = (3, 0.008) if serrilha else (0, 0.009)
    for ni, (z, comp0, pontas) in enumerate(nos):
        giro = a0 + ni * math.pi / 2 + rr.uniform(-0.2, 0.2)
        lados = (1, -1) if (serrilha or ni < 3) else ((1, -1) if ni % 2 else (1,))
        for sinal in lados:
            ang = giro + (0 if sinal > 0 else math.pi) + rr.uniform(-0.25, 0.25)
            fora = Vector((math.cos(ang), math.sin(ang), 0))
            base = caule(z)
            comp = comp0 * rr.uniform(0.92, 1.08) * H / 1.5
            # o cabinho sobe e sai; a folha pende na ponta dele
            pet = base + fora * (comp * 0.5) + Vector((0, 0, comp * (0.18 + 0.25 * z)))
            talo(saida, [base, base + fora * (comp * 0.22) + Vector((0, 0, comp * 0.12)), pet], pet_r, pet_r * 0.7, pet_lados, CAULE2, mix(CAULE2, NERV, 0.4))
            # a direção da lâmina: sai pra fora, as de baixo descaem, as de cima sobem
            d = (fora + Vector((0, 0, 0.35 * z - 0.2 + rr.uniform(-0.08, 0.08)))).normalized()
            n = (Vector((0, 0, 1)) + fora * 0.6).normalized()
            folha(saida, pet, d, n, comp * 0.92, pontas, serrilha, rr)
    # as flores: a cabeça no topo e as de lado nos nós de cima
    if serrilha:
        cola(saida, caule(0.84), Vector((torto.x, torto.y, 1)), 0.36 * H / 1.5, 0.08 * H / 1.5, rr, 32, 3)
        for k, (z, ang) in enumerate(((0.52, 0.7), (0.63, 2.5), (0.73, 4.1))):
            b = caule(z)
            fora = Vector((math.cos(a0 + ang), math.sin(a0 + ang), 0))
            pe = b + fora * 0.14 + Vector((0, 0, 0.12))
            talo(saida, [b, b + fora * 0.07 + Vector((0, 0, 0.03)), pe], 0.007, 0.005, 3, CAULE2, CAULE2)
            cola(saida, pe, fora * 0.5 + Vector((0, 0, 1)), 0.2 * H / 1.5, 0.05 * H / 1.5, rr, 16, 1)
    else:
        cola_leve(saida, caule(0.86), Vector((torto.x, torto.y, 1)), 0.3 * H / 1.5, 0.06 * H / 1.5, rr)
        for z, ang in ((0.62, 1.2), (0.72, 3.6)):
            b = caule(z)
            fora = Vector((math.cos(a0 + ang), math.sin(a0 + ang), 0))
            cola_leve(saida, b + fora * 0.1 + Vector((0, 0, 0.1)), fora * 0.5 + Vector((0, 0, 1)), 0.16 * H / 1.5, 0.04 * H / 1.5, rr)
