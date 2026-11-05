# Confere que nenhum lugar do chão ficou dentro (ou colado) de uma ruína.
# Python puro, lê as fontes de verdade: app/linha/disco/historia.ts (CHAO_LUGARES,
# CASA, SUBURBIO) e app/linha/estrada/ruinasDados.ts (as peças e o traçado).
#   python3 blender/scripts/ruinas_conferir.py
# Mostra, pra cada lugar, a distância (m) até a parede/entulho mais perto e a
# distância da rampa da boca do túnel (40 m da porta pro centro) até a ruína
# mais perto. Sai com erro se algum ficar a menos de 20 m (o mesmo FOLGA_LUGAR
# de ruinas.ts) ou se a rampa encostar numa ruína.
import json, math, os, re, sys

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
hist = open(os.path.join(RAIZ, "app/linha/disco/historia.ts")).read()
dados = open(os.path.join(RAIZ, "app/linha/estrada/ruinasDados.ts")).read()

casa = re.search(r"export const CASA = \{ x: (-?[\d.]+), z: (-?[\d.]+) \}", hist)
sub = re.search(r"export const SUBURBIO = \{ x: (-?[\d.]+), z: (-?[\d.]+), r: ([\d.]+) \}", hist)
SUB = tuple(float(v) for v in sub.groups())
bloco = hist[hist.index("export const CHAO_LUGARES"):]
bloco = bloco[: bloco.index("} as const")]
lugares = {m.group(1): (float(m.group(2)), float(m.group(3))) for m in re.finditer(r"^\s+(\w+): \{ x: (-?[\d.]+), z: (-?[\d.]+),", bloco, re.M)}
lugares["casa"] = (float(casa.group(1)), float(casa.group(2)))
lugares["chegada a pé"] = (SUB[0] + 40, SUB[1] + 60)

pecas = [json.loads(m.group(1)) for m in re.finditer(r"caixas: (\[\[.*?\]\]) \}", dados)]
traco = [float(v) for v in re.search(r"TRACO_RUINAS: number\[\] = \[(.*?)\]", dados, re.S).group(1).replace("\n", " ").split(",") if v.strip()]

caixas = []
for k in range(0, len(traco), 4):
    pi, x, z, g = int(traco[k]), traco[k + 1], traco[k + 2], traco[k + 3] * math.pi / 2
    s, c = math.sin(g), math.cos(g)
    for cx, cz, hx, hz, _ in pecas[pi]:
        caixas.append((x + cx * c + cz * s, z - cx * s + cz * c, s, c, hx, hz))

def dist(px, pz, b):
    wx, wz, s, c, hx, hz = b
    dx, dz = px - wx, pz - wz
    lx, lz = dx * c - dz * s, dx * s + dz * c
    return math.hypot(max(0, abs(lx) - hx), max(0, abs(lz) - hz))

ruim = False
print(f"{len(traco) // 4} peças, {len(caixas)} caixas")
for nome, (lx, lz) in lugares.items():
    d = min(dist(lx, lz, b) for b in caixas)
    dentro = math.hypot(lx - SUB[0], lz - SUB[1]) < SUB[2]
    marca = "OK" if d >= 20 else "PERTO DEMAIS"
    ruim |= d < 20
    print(f"  {nome:14s} {d:7.1f} m   {'no subúrbio' if dentro else 'fora do subúrbio'}   {marca}")
# a rampa da boca do túnel: do lugar "tuneis" 40 m pro centro do subúrbio
tx, tz = lugares["tuneis"]
L = math.hypot(tx - SUB[0], tz - SUB[1])
amostras = [(tx - (tx - SUB[0]) / L * t, tz - (tz - SUB[1]) / L * t) for t in range(0, 41, 2)]
dr = min(dist(x, z, b) for x, z in amostras for b in caixas)
print(f"  {'rampa do túnel':14s} {dr:7.1f} m   (a vala tem 6,5 m de meia largura)   {'OK' if dr > 6.5 else 'ENCOSTA'}")
ruim |= dr <= 6.5
sys.exit(1 if ruim else 0)
