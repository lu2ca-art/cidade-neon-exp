#!/usr/bin/env python3
"""Tom (tônica + modo) de cada faixa em public/audio/tracks, pra as notas
de interface da Linha 222 tocarem afinadas desde o primeiro segundo.

Cromagrama da faixa inteira (FFT 16384, 80Hz–2kHz, janelas de silêncio
ignoradas) comparado com os perfis de Krumhansl-Kessler. Gera
app/linha/tons.ts. Rodar de novo quando entrar faixa nova:

  python3 scripts/linha-tons.py
"""
import os
import subprocess

import numpy as np

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PASTA = os.path.join(RAIZ, "public", "audio", "tracks")
SR = 44100
KM = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]
KN = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]


def tom(c):
    melhor = None
    for t in range(12):
        for modo, perfil in (("maior", KM), ("menor", KN)):
            r = np.corrcoef(c, np.roll(perfil, t))[0, 1]
            if melhor is None or r > melhor[0]:
                melhor = (r, t, modo)
    return melhor


def croma(caminho):
    x = np.frombuffer(
        subprocess.run(["ffmpeg", "-v", "error", "-i", caminho, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout,
        dtype=np.float32,
    )
    n = 16384
    hz = SR / n
    fr = np.arange(n // 2 + 1) * hz
    m = (fr >= 80) & (fr <= 2000)
    pc = ((np.round(12 * np.log2(fr[m] / 440)) + 69) % 12).astype(int)
    c = np.zeros(12)
    for i in range(0, len(x) - n, n // 2):
        sp = np.abs(np.fft.rfft(x[i:i + n] * np.hanning(n)))[m]
        s = sp.sum()
        if s <= 1e-6:
            continue
        c += np.bincount(pc, weights=sp, minlength=12) / s
    return c


linhas = []
for arq in sorted(os.listdir(PASTA)):
    if not arq.endswith(".mp3"):
        continue
    r, t, modo = tom(croma(os.path.join(PASTA, arq)))
    linhas.append(f'  "/audio/tracks/{arq}": {{ tonica: {t}, modo: "{modo}" }}, // r={r:.2f}')
    print(arq, t, modo, f"{r:.2f}")

saida = os.path.join(RAIZ, "app", "linha", "tons.ts")
with open(saida, "w") as f:
    f.write("// Gerado por scripts/linha-tons.py — tom de cada faixa (cromagrama da faixa\n")
    f.write("// inteira × perfis de Krumhansl-Kessler). Não editar à mão.\n\n")
    f.write('import type { Tom } from "./som"\n\n')
    f.write("export const TONS: Record<string, Tom> = {\n")
    f.write("\n".join(linhas))
    f.write("\n}\n")
print("→", saida)
