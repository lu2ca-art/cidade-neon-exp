#!/usr/bin/env python3
"""Gera os kits de CHOPS da B4TIDA a partir de áudios do LU2CA.

Cada kit = 8 pads: 6 pedaços cortados em cima dos ataques (onsets) da faixa,
1 pedaço invertido e 1 "slowed" (uma oitava abaixo). Saída em
public/batida/kits/<kit>/<n>.mp3 + public/batida/kits/index.json.

Uso:
  python3 scripts/batida-kits.py                  # kits das faixas lançadas
  python3 scripts/batida-kits.py pasta/ nome COR  # kit novo de uma pasta de WAVs seus

Regra: só entra áudio que é do LU2CA e já pode estar no jogo (faixa lançada
ou T-21 passado). Sample de banco (Splice etc.) NÃO entra — a licença não
permite redistribuir o sample cru dentro de um app.
"""
import json
import os
import subprocess
import sys

import numpy as np

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SAIDA = os.path.join(RAIZ, "public", "batida", "kits")
SR = 44100

FAIXAS = [
    # id, nome, arquivo, bpm, cor
    ("chuva", "CHUVA", "public/audio/tracks/222-chuva.mp3", 95, "#2fe8ff"),
    ("copo", "COPO AMERICANO", "public/audio/tracks/222-copo-americano.mp3", 110, "#ff6a35"),
    ("dopamina", "DOPAMINA", "public/audio/tracks/dopamina.mp3", 128, "#5dffa0"),
    ("sexta", "SEXTA-FEIRA", "public/audio/tracks/sextafeira.mp3", 105, "#ff3fb0"),
    ("ontem", "SABE ONTEM?", "public/audio/tracks/sabe-ontem.mp3", 100, "#ffc857"),
]


def ler(caminho):
    pcm = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", caminho, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
        capture_output=True, check=True,
    ).stdout
    return np.frombuffer(pcm, dtype=np.float32)


def onsets(x, n=48):
    hop = 512
    frames = len(x) // hop
    energia = np.array([np.sqrt(np.mean(x[i * hop:(i + 1) * hop] ** 2)) for i in range(frames)])
    fluxo = np.maximum(0, np.diff(energia, prepend=energia[0]))
    # picos locais, os mais fortes primeiro, com distância mínima de ~0.25s
    picos = [i for i in range(2, frames - 2) if fluxo[i] >= fluxo[i - 1] and fluxo[i] >= fluxo[i + 1] and fluxo[i] > 0]
    picos.sort(key=lambda i: -fluxo[i])
    escolhidos = []
    for p in picos:
        if all(abs(p - e) * hop / SR > 0.25 for e in escolhidos):
            escolhidos.append(p)
        if len(escolhidos) >= n:
            break
    return sorted(e * hop for e in escolhidos)


def cortar(x, ini, dur):
    fim = min(len(x), ini + dur)
    c = x[ini:fim].copy()
    f = int(0.004 * SR)
    c[:f] *= np.linspace(0, 1, f)
    fo = int(0.03 * SR)
    c[-fo:] *= np.linspace(1, 0, fo)
    pico = np.max(np.abs(c)) or 1
    return c * (0.89 / pico)


def gravar(c, destino, filtros=None):
    cmd = ["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-"]
    if filtros:
        cmd += ["-af", filtros]
    cmd += ["-ac", "1", "-b:a", "96k", destino]
    subprocess.run(cmd, input=c.astype(np.float32).tobytes(), check=True)


def kit(kid, nome, caminho, bpm, cor):
    x = ler(os.path.join(RAIZ, caminho) if not os.path.isabs(caminho) else caminho)
    tempo = int(SR * 60 / bpm)
    ons = onsets(x)
    pasta = os.path.join(SAIDA, kid)
    os.makedirs(pasta, exist_ok=True)
    # 6 pedaços espalhados pela faixa: 2 de 1 tempo (golpes), 4 de 2 tempos (frases)
    escolha = [ons[int(i * (len(ons) - 1) / 5)] for i in range(6)] if len(ons) >= 6 else [i * tempo * 2 for i in range(6)]
    pads = []
    for i, ini in enumerate(escolha):
        dur = tempo if i < 2 else tempo * 2
        gravar(cortar(x, ini, dur), os.path.join(pasta, f"{i}.mp3"))
        pads.append({"n": i, "rotulo": "golpe" if i < 2 else f"frase {i - 1}"})
    gravar(cortar(x, escolha[2], tempo * 2), os.path.join(pasta, "6.mp3"), "areverse")
    pads.append({"n": 6, "rotulo": "invertido"})
    gravar(cortar(x, escolha[3], tempo * 2), os.path.join(pasta, "7.mp3"), f"asetrate={SR // 2},aresample={SR}")
    pads.append({"n": 7, "rotulo": "slowed"})
    return {"id": kid, "nome": nome, "bpm": bpm, "cor": cor, "pads": pads}


def principal():
    os.makedirs(SAIDA, exist_ok=True)
    indice_caminho = os.path.join(SAIDA, "index.json")
    indice = json.load(open(indice_caminho)) if os.path.exists(indice_caminho) else []
    if len(sys.argv) >= 3:
        pasta, nome = sys.argv[1], sys.argv[2]
        cor = sys.argv[3] if len(sys.argv) > 3 else "#b38cff"
        arquivos = sorted(f for f in os.listdir(pasta) if f.lower().endswith((".wav", ".mp3", ".m4a", ".aif", ".aiff")))
        if not arquivos:
            sys.exit("nenhum áudio na pasta")
        kid = nome.lower().replace(" ", "-")
        novo = kit(kid, nome.upper(), os.path.join(os.path.abspath(pasta), arquivos[0]), 100, cor)
        indice = [k for k in indice if k["id"] != kid] + [novo]
    else:
        indice = [kit(*f) for f in FAIXAS]
    json.dump(indice, open(indice_caminho, "w"), ensure_ascii=False, indent=1)
    print(f"{len(indice)} kits em {SAIDA}")


if __name__ == "__main__":
    principal()
