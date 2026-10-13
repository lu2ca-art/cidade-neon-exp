# B4TIDA — o "Pack Cidade Neon": golpes de bateria e uma nota de baixo
# tirados das stems das faixas lançadas do LU2CA (som único, de disco).
#
# uso: ~/.venvs/gd-audio/bin/python tools/batida/packs.py public/batida/packs
# Cada faixa vira um kit de 8 pads (bumbo, caixa, chimbal, chimbal aberto,
# palma, percussão, tom, prato) + 1 nota de baixo (com a altura medida, pro
# app transpor). Saída: WAV 44.1k 16-bit mono + kits.json.
import os, glob, json, sys, numpy as np, librosa, soundfile as sf

B = os.path.expanduser("~/Library/Mobile Documents/com~apple~CloudDocs/CIDADE NEON/SLIMBI/")
OUT = sys.argv[1] if len(sys.argv) > 1 else "public/batida/packs"
FAIXAS = {"chuva": "CHUVA", "copo": "copo americano", "dopamina": "dopaminA", "sexta": "sextafeira", "ontem": "sabe ontem", "nectar": "nectar"}
SR = 44100
PADS = ["bumbo", "caixa", "chimbal", "aberto", "palma", "perc", "tom", "prato"]

def pasta(p):
    return next(d for d in glob.glob(B + "*/") if os.path.basename(d[:-1]).strip().lower().startswith(p.lower()[:4]))

def recorte(y, a, n, fade=0.02):
    s = y[a:a + n].copy()
    if len(s) < n: s = np.pad(s, (0, n - len(s)))
    f = int(fade * SR)
    s[-f:] *= np.linspace(1, 0, f) ** 2
    s[:64] *= np.linspace(0, 1, 64)
    pk = np.max(np.abs(s)) + 1e-9
    return (s / pk * 0.89).astype(np.float32)

def kit(arq):
    y, _ = librosa.load(arq, sr=SR, mono=True)
    on = librosa.onset.onset_detect(y=y, sr=SR, hop_length=256, backtrack=True, units="samples", delta=0.08)
    cand = []
    for i, a in enumerate(on):
        b = on[i + 1] if i + 1 < len(on) else len(y)
        seg = y[a:min(b, a + int(1.4 * SR))]
        if len(seg) < int(0.05 * SR): continue
        pico = float(np.max(np.abs(seg)))
        if pico < 0.05: continue
        janela = seg[:int(0.08 * SR)]
        S = np.abs(np.fft.rfft(janela * np.hanning(len(janela))))
        fr = np.fft.rfftfreq(len(janela), 1 / SR)
        tot = S.sum() + 1e-9
        grave = S[fr < 150].sum() / tot
        agudo = S[fr > 5000].sum() / tot
        centro = float((S * fr).sum() / tot)
        env = np.abs(seg)
        # quanto dura o som (até cair 30 dB)
        lim = pico * 0.03
        dur = (np.where(env > lim)[0].max() + 1) / SR if (env > lim).any() else 0.05
        cand.append(dict(a=int(a), livre=len(seg) / SR, pico=pico, grave=grave, agudo=agudo, centro=centro, dur=dur))
    def melhor(filtro, chave):
        c = [x for x in cand if filtro(x)]
        return max(c, key=chave) if c else None
    sc = lambda x: x["pico"] * min(x["livre"], 0.6)
    esc = {
        "bumbo": melhor(lambda x: x["grave"] > 0.45 and x["centro"] < 900, sc),
        "caixa": melhor(lambda x: x["grave"] < 0.3 and 1200 < x["centro"] < 5000 and x["agudo"] < 0.45, sc),
        "chimbal": melhor(lambda x: x["agudo"] > 0.45 and x["dur"] < 0.25, sc),
        "aberto": melhor(lambda x: x["agudo"] > 0.4 and x["dur"] >= 0.25, lambda x: x["pico"] * min(x["livre"], 1.0)),
        "palma": melhor(lambda x: x["grave"] < 0.2 and 1800 < x["centro"] < 6000, lambda x: x["centro"] * sc(x)),
        "perc": melhor(lambda x: 600 < x["centro"] < 3000 and x["grave"] < 0.4, lambda x: x["livre"] * x["pico"]),
        "tom": melhor(lambda x: 0.15 < x["grave"] < 0.6 and 200 < x["centro"] < 1400, sc),
        "prato": melhor(lambda x: x["agudo"] > 0.35 and x["dur"] > 0.6, lambda x: x["dur"] * x["pico"]),
    }
    usados = set()
    out = {}
    for pad in PADS:
        x = esc.get(pad)
        if not x or x["a"] in usados: continue
        usados.add(x["a"])
        n = int((1.3 if pad in ("prato", "aberto") else 0.6 if pad in ("bumbo", "tom") else 0.45) * SR)
        n = min(n, int(max(0.12, x["livre"]) * SR))
        out[pad] = recorte(y, x["a"], n)
    return out

def nota_baixo(arq):
    y, _ = librosa.load(arq, sr=SR, mono=True)
    yd = librosa.resample(y, orig_sr=SR, target_sr=11025)
    f0, voz, _ = librosa.pyin(yd, fmin=35, fmax=300, sr=11025, frame_length=1024, hop_length=256)
    m = np.where(voz, librosa.hz_to_midi(np.nan_to_num(f0, nan=1)), np.nan)
    rms = librosa.feature.rms(y=yd, frame_length=1024, hop_length=256)[0]
    melhor, inicio = None, 0
    i = 0
    while i < len(m):
        if np.isnan(m[i]): i += 1; continue
        j = i
        while j + 1 < len(m) and not np.isnan(m[j + 1]) and abs(m[j + 1] - m[i]) < 0.4: j += 1
        dur = (j - i) * 256 / 11025
        if dur > 0.55:
            sc = dur * float(rms[i:j].mean())
            if not melhor or sc > melhor[0]: melhor = (sc, i, float(np.median(m[i:j + 1])))
        i = j + 1
    if not melhor: return None, None
    _, fi, midi = melhor
    a = int(fi * 256 / 11025 * SR)
    # recua até o ataque (onset logo antes)
    a = max(0, a - int(0.03 * SR))
    return recorte(y, a, int(1.6 * SR), fade=0.3), round(midi, 2)

os.makedirs(OUT, exist_ok=True)
indice = {}
for fid, p in FAIXAS.items():
    d = pasta(p)
    arqs = glob.glob(d + "*")
    k = kit(next(a for a in arqs if "BATERIA" in a.upper()))
    for pad, s in k.items(): sf.write(f"{OUT}/{fid}-{pad}.wav", s, SR, subtype="PCM_16")
    bx, midi = nota_baixo(next(a for a in arqs if "GRAVES" in a.upper()))
    if bx is not None: sf.write(f"{OUT}/{fid}-baixo.wav", bx, SR, subtype="PCM_16")
    indice[fid] = {"pads": list(k.keys()), "baixo": midi}
    print(fid, list(k.keys()), "baixo midi", midi, flush=True)
json.dump(indice, open(f"{OUT}/kits.json", "w"), indent=1)
