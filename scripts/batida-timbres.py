#!/usr/bin/env python3
"""Timbres do B4TIDA tirados das faixas do LU2CA — só timbre, nunca trecho.

Separa cada instrumental em bateria / baixo / resto (Demucs, htdemucs) e
caça, em cada stem, UM som isolado:

  bateria → golpes mais limpos de bumbo, caixa, chimbal e percussão (kit)
  baixo   → uma nota sustentada e afinada (vira sampler, afinado por
            playbackRate)
  resto   → uma nota de synth/teclado estável (SYNTH) e um trecho parado e
            sustentado (PAD)

Nada de frase, melodia ou loop da música: cada arquivo é um golpe ou uma
nota só. Saída em public/batida/timbres/<faixa>/ + index.json com a nota
raiz de cada amostra. Uso:

  python3 -m demucs -n htdemucs -o <stems> <instrumentais>.mp3
  python3 scripts/batida-timbres.py <stems>/htdemucs

Só faixas já lançadas (regra do T-21).
"""
import json
import os
import subprocess
import sys

import numpy as np

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SAIDA = os.path.join(RAIZ, "public", "batida", "timbres")
SR = 44100
FAIXAS = {  # pasta do stem → (id, nome na tela)
    "chuva": ("chuva", "DA CHUVA"),
    "copo": ("copo", "DO COPO"),
    "dopamina": ("dopamina", "DA DOPAMINA"),
    "ontem": ("ontem", "DO SABE ONTEM"),
    "sexta": ("sexta", "DA SEXTA"),
}


def ler(caminho):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", caminho, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def gravar(x, caminho):
    x = x / (np.max(np.abs(x)) + 1e-9) * 0.89  # -1 dBFS
    f = min(len(x) // 4, int(0.02 * SR))
    x[-f:] *= np.linspace(1, 0, f)
    x[: int(0.001 * SR)] *= np.linspace(0, 1, int(0.001 * SR))
    pcm = (np.clip(x, -1, 1) * 32767).astype("<i2").tobytes()
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", "-", caminho], input=pcm, check=True)


def bandas(x, n=1024, hop=256):
    """energia por banda (grave/médio/agudo) por quadro"""
    fr = np.fft.rfftfreq(n, 1 / SR)
    jan = np.hanning(n)
    q = (len(x) - n) // hop
    E = np.zeros((q, 3))
    for i in range(q):
        s = np.abs(np.fft.rfft(x[i * hop : i * hop + n] * jan)) ** 2
        E[i] = [s[fr < 150].sum(), s[(fr >= 150) & (fr < 3000)].sum(), s[fr >= 6000].sum()]
    return E, hop


def golpes(x):
    """onsets (em amostras) com as proporções de banda e o quanto o golpe
    está isolado (silêncio antes e nenhum golpe logo depois)"""
    E, hop = bandas(x)
    tot = E.sum(1) + 1e-12
    fluxo = np.maximum(0, np.diff(np.log(tot), prepend=np.log(tot[0])))
    lim = np.percentile(fluxo, 97)
    picos = [i for i in range(2, len(fluxo) - 2) if fluxo[i] > lim and fluxo[i] == fluxo[i - 2 : i + 3].max()]
    out = []
    for k, i in enumerate(picos):
        prox = picos[k + 1] - i if k + 1 < len(picos) else 999
        antes = tot[max(0, i - 8) : i - 1].mean() if i > 8 else tot[i]
        ataque = E[i : i + 4].sum(0)
        r = ataque / (ataque.sum() + 1e-12)
        out.append({"t": i * hop, "r": r, "forca": ataque.sum(), "limpo": ataque.sum() / (antes * 4 + 1e-12), "espaco": prox * hop / SR})
    return out


def kit(x, pasta, nome):
    gs = golpes(x)
    if len(gs) < 8:
        return None
    forca = np.array([g["forca"] for g in gs])
    ok = [g for g in gs if g["forca"] > np.percentile(forca, 40)]
    escolhas = {}
    # (pontuação, duração, é mesmo esse tipo de golpe?)
    crit = {
        "kick": (lambda g: g["r"][0] - g["r"][2], 0.45, lambda r: r[0] > 0.6),
        "snare": (lambda g: g["r"][1] - abs(g["r"][0] - 0.2), 0.3, lambda r: r[1] > 0.6 and r[0] < 0.35),
        "hat": (lambda g: g["r"][2] - g["r"][0], 0.15, lambda r: r[2] > 0.6),
        "perc": (lambda g: g["r"][1] + g["r"][2] * 0.5 - g["r"][0], 0.25, lambda r: r[0] < 0.2),
    }
    usados = set()
    arqs = {}
    for linha, (score, dur, eh) in crit.items():
        cands = [g for g in ok if g["t"] not in usados and g["espaco"] >= min(dur, 0.2) and eh(g["r"])]
        if not cands:
            continue  # essa linha fica no sintético
        g = max(cands, key=lambda g: score(g) * 2 + np.log1p(g["limpo"]) * 0.3)
        usados.add(g["t"])
        seg = x[max(0, g["t"] - int(0.004 * SR)) : g["t"] + int(min(dur, g["espaco"]) * SR)]
        env = np.linspace(1, 0.15, len(seg)) ** 1.5
        gravar(seg * env, os.path.join(pasta, f"{linha}.wav"))
        escolhas[linha] = {"r": [round(float(v), 2) for v in g["r"]], "t": round(g["t"] / SR, 2)}
        arqs[linha] = f"{linha}.wav"
    if len(arqs) < 2:
        return None
    return {"id": f"faixa-{nome}", "arqs": arqs, "debug": escolhas}


def yin(quadro, fmin, fmax):
    """f0 e confiança (1 - mínimo da diferença normalizada)"""
    n = len(quadro)
    tmax = min(n // 2, int(SR / fmin))
    tmin = int(SR / fmax)
    # diferença via autocorrelação (FFT): d(t) ≈ 2·(acf(0) − acf(t))
    F = np.fft.rfft(quadro, 2 * n)
    acf = np.fft.irfft(F * np.conj(F))[:tmax]
    d = 2 * (acf[0] - acf)
    cm = np.ones_like(d)
    cm[1:] = d[1:] * np.arange(1, tmax) / (np.cumsum(d[1:]) + 1e-12)
    t = tmin + int(np.argmin(cm[tmin:tmax]))
    return SR / t, 1 - cm[t]


def notas(x, fmin, fmax, minimo, n=2048, hop=1024):
    """trechos com uma nota só, estável, pelo menos `minimo` segundos"""
    q = (len(x) - n) // hop
    f0 = np.zeros(q)
    conf = np.zeros(q)
    rms = np.zeros(q)
    for i in range(q):
        fr = x[i * hop : i * hop + n]
        rms[i] = np.sqrt(np.mean(fr**2))
        if rms[i] < 1e-3:
            continue
        f0[i], conf[i] = yin(fr, fmin, fmax)
    vivo = rms > np.percentile(rms[rms > 0], 30)
    trechos = []
    i = 0
    while i < q:
        if not (vivo[i] and conf[i] > 0.8):
            i += 1
            continue
        j = i
        while j + 1 < q and vivo[j + 1] and conf[j + 1] > 0.75 and abs(12 * np.log2(f0[j + 1] / f0[i])) < 0.35:
            j += 1
        dur = (j - i + 1) * hop / SR
        if dur >= minimo:
            midi = 69 + 12 * np.log2(np.median(f0[i : j + 1]) / 440)
            trechos.append({"ini": i * hop, "fim": (j + 1) * hop + n, "dur": dur, "midi": float(midi), "conf": float(conf[i : j + 1].mean()), "rms": float(rms[i : j + 1].mean())})
        i = j + 1
    return sorted(trechos, key=lambda t: t["conf"] * t["dur"] * np.sqrt(t["rms"]), reverse=True)


def nota(x, pasta, arq, fmin, fmax, minimo, maximo, afinada=0.2):
    ts = [t for t in notas(x, fmin, fmax, minimo) if abs(t["midi"] - round(t["midi"])) < afinada]
    if not ts:
        return None
    t = ts[0]
    seg = x[t["ini"] : min(t["fim"], t["ini"] + int(maximo * SR))]
    gravar(seg.copy(), os.path.join(pasta, arq))
    return {"arq": arq, "raiz": int(round(t["midi"])), "dur": round(len(seg) / SR, 2), "conf": round(t["conf"], 2)}


def main(stems):
    os.makedirs(SAIDA, exist_ok=True)
    indice = {"kits": [], "baixo": [], "synth": [], "pad": []}
    for dirn, (fid, nome) in FAIXAS.items():
        base = os.path.join(stems, dirn)
        if not os.path.isdir(base):
            continue
        pasta = os.path.join(SAIDA, fid)
        os.makedirs(pasta, exist_ok=True)
        dr, bs, ot = (ler(os.path.join(base, f"{s}.wav")) for s in ("drums", "bass", "other"))
        k = kit(dr, pasta, fid)
        if k:
            indice["kits"].append({"id": k["id"], "nome": nome, "pasta": fid, "arqs": k["arqs"]})
        b = nota(bs, pasta, "baixo.wav", 35, 250, 0.25, 1.4, afinada=0.3)
        if b:
            indice["baixo"].append({"nome": nome, "pasta": fid, **b})
        s = nota(ot, pasta, "synth.wav", 110, 1100, 0.3, 1.6)
        if s:
            indice["synth"].append({"nome": nome, "pasta": fid, **s})
        # pad: a mesma nota do synth, tocada em loop com ataque lento
        if s and s["dur"] >= 0.5:
            indice["pad"].append({"nome": nome, "pasta": fid, **s})
        print(fid, k and k["debug"], b, s)
    ts = os.path.join(RAIZ, "app", "batida", "lib", "timbres-faixas.ts")
    with open(ts, "w") as f:
        f.write("// Gerado por scripts/batida-timbres.py — timbres tirados das faixas\n")
        f.write("// (um golpe ou uma nota só por arquivo). Não editar à mão.\n\n")
        f.write("export const TIMBRES_FAIXAS = " + json.dumps(indice, ensure_ascii=False, indent=2) + " as const\n")
    print("→", ts)


if __name__ == "__main__":
    main(sys.argv[1])
