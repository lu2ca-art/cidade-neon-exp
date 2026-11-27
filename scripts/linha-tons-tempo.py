#!/usr/bin/env python3
"""O tom de cada faixa AO LONGO DO TEMPO (27/11, o dono: "os instrumentos mudam de
tom sozinhos com a música e estão sempre no tom certo").

linha-tons.py dá um tom pra faixa inteira; aqui é um tom por trecho: janelas de
12 s (passo de 3 s), cromagrama × perfis de Krumhansl-Kessler, como lá. Pra não
ficar pulando à toa:
- o trecho só sai do tom da faixa inteira quando o outro tom ganha com folga;
- a sequência passa por um filtro de mediana (5 janelas);
- trecho com menos de 9 s volta pro vizinho.

Gera app/linha/tons-tempo.json: { "/audio/...mp3": [[segundo, tonica, "maior"|"menor"], ...] }
(cada par vale do segundo dele até o próximo). Rodar de novo quando entrar faixa nova:

  python3 scripts/linha-tons-tempo.py      (precisa de numpy e ffmpeg)
"""
import json
import os
import subprocess

import numpy as np

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PASTAS = [
    ("/audio/pistas", os.path.join(RAIZ, "public", "audio", "pistas")),
    ("/audio/tracks", os.path.join(RAIZ, "public", "audio", "tracks")),
    ("/loja-discos", os.path.join(RAIZ, "public", "loja-discos")),
    ("/vinis", os.path.join(RAIZ, "public", "vinis")),
]
SR = 22050
N = 8192
JANELA, PASSO = 12.0, 3.0
FOLGA = 0.06      # quanto o tom do trecho tem que ganhar do tom da faixa
MINIMO = 9.0      # segundos: trecho menor que isso volta pro vizinho
KM = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]
KN = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]
TONS = [(t, m, np.roll(p, t)) for t in range(12) for m, p in (("maior", KM), ("menor", KN))]


def notas(c):
    return [np.corrcoef(c, p)[0, 1] if c.sum() > 0 else 0 for _, _, p in TONS]


def cromas(caminho):
    """um cromagrama por quadro de N amostras (meio quadro de passo)"""
    x = np.frombuffer(
        subprocess.run(["ffmpeg", "-v", "error", "-i", caminho, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout,
        dtype=np.float32,
    )
    fr = np.arange(N // 2 + 1) * SR / N
    m = (fr >= 80) & (fr <= 2000)
    pc = ((np.round(12 * np.log2(fr[m] / 440)) + 69) % 12).astype(int)
    jan = np.hanning(N)
    saida = []
    for i in range(0, len(x) - N, N // 2):
        sp = np.abs(np.fft.rfft(x[i:i + N] * jan))[m]
        s = sp.sum()
        saida.append(np.bincount(pc, weights=sp, minlength=12) / s if s > 1e-6 else np.zeros(12))
    return np.array(saida), (N // 2) / SR


def linha_do_tempo(caminho):
    q, dt = cromas(caminho)
    if not len(q):
        return None
    geral = notas(q.sum(0))
    g = int(np.argmax(geral))
    por = max(1, int(round(JANELA / dt)))
    passo = max(1, int(round(PASSO / dt)))
    escolha = []
    for i in range(0, max(1, len(q) - por + 1), passo):
        r = notas(q[i:i + por].sum(0))
        k = int(np.argmax(r))
        # fica no tom da faixa, a não ser que o outro ganhe com folga
        escolha.append(k if r[k] - r[g] > FOLGA else g)
    # mediana (5): tira o pulo de uma janela só
    e = escolha[:]
    for i in range(len(e)):
        viz = sorted(escolha[max(0, i - 2):i + 3], key=lambda v: (escolha[max(0, i - 2):i + 3].count(v), v == g))
        e[i] = viz[-1]
    # junta em trechos: [segundo, índice]
    trechos = []
    for i, k in enumerate(e):
        t = round(i * passo * dt, 1)
        if not trechos or trechos[-1][1] != k:
            trechos.append([t, k])
    # trecho curto volta pro vizinho de antes
    fim = len(q) * dt
    mudou = True
    while mudou and len(trechos) > 1:
        mudou = False
        for j in range(len(trechos)):
            ini = trechos[j][0]
            ate = trechos[j + 1][0] if j + 1 < len(trechos) else fim
            if ate - ini < MINIMO:
                if j == 0:
                    trechos[1][0] = 0.0
                trechos.pop(j)
                # dois vizinhos iguais viram um
                k = 1
                while k < len(trechos):
                    if trechos[k][1] == trechos[k - 1][1]:
                        trechos.pop(k)
                    else:
                        k += 1
                mudou = True
                break
    trechos[0][0] = 0.0
    return [[t, TONS[k][0], TONS[k][1]] for t, k in trechos]


saida = {}
for url, pasta in PASTAS:
    if not os.path.isdir(pasta):
        continue
    for arq in sorted(os.listdir(pasta)):
        if not arq.endswith(".mp3"):
            continue
        try:
            lt = linha_do_tempo(os.path.join(pasta, arq))
        except subprocess.CalledProcessError:
            print(arq, "não é áudio: pulei")
            continue
        if lt:
            saida[f"{url}/{arq}"] = lt
            print(f"{url}/{arq}", " → ".join(f"{t:.0f}s {n}{'m' if m == 'menor' else ''}" for t, n, m in lt))

caminho = os.path.join(RAIZ, "app", "linha", "tons-tempo.json")
with open(caminho, "w") as f:
    json.dump(saida, f, separators=(",", ":"))
print("→", caminho)
