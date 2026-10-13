# GUITAR DRIVER — notas a partir das stems reais, presas na grade de cada faixa.
#
# uso: ~/.venvs/gd-audio/bin/python tools/gd/gd_notas.py public/gd [faixa ...]
# stems: iCloud/CIDADE NEON/SLIMBI/<pasta>/<NOME> (GUITARRA|GRAVES|...).mp3
#
# Uma nota nasce num ataque (onset) OU quando o acorde/nota muda sem ataque
# (guitarra que desliza). A trilha sobe/desce com a altura (como no Guitar
# Hero); a nota vira longa quando o som sustenta; acordes só no difícil/expert.
# As dificuldades são um olhar cada vez mais fundo na mesma faixa:
#   fácil = o pulso · médio = o groove · difícil = a frase · expert = tudo
import os, glob, json, sys, numpy as np, librosa

B = os.path.expanduser("~/Library/Mobile Documents/com~apple~CloudDocs/CIDADE NEON/SLIMBI/")
OUT = sys.argv[1] if len(sys.argv) > 1 else "public/gd"
FAIXAS = {  # id: (pasta, bpm, 1º tempo em s) — grade medida em 06/10 (tempo constante)
  "chuva": ("CHUVA", 79, 0.016), "copo": ("copo americano", 80, 0.063), "dopamina": ("dopaminA", 125, 0.060),
  "nectar": ("nectar", 79, 0.016), "ojala": ("oja", 118, 0.275), "rollercoaster": ("rollercoaster", 104, 0.024),
  "ontem": ("sabe ontem", 100, 0.013), "sexta": ("sextafeira", 88, 0.014), "swav": ("swav", 135, 0.019),
}
SR, HOP = 22050, 256
# subdivisão por tempo, intervalo mínimo (s), trilhas, acordes (fração), nota longa mínima (tempos)
DIF = {
  "facil":   (1, 0.42, 3, 0.0, 2.0),
  "medio":   (2, 0.2, 4, 0.0, 1.0),
  "dificil": (4, 0.11, 4, 0.10, 0.75),
  "expert":  (4, 0.07, 4, 0.20, 0.5),
}

def pasta(p):
    return next(d for d in glob.glob(B + "*/") if os.path.basename(d[:-1]).strip().lower().startswith(p.lower()[:4]))

def notas_cruas(arq, grave, fino=False):
    # fino (expert): ouve ataques fracos e notas fantasmas
    dl, jn = (0.022, 0.045) if fino else (0.05, 0.07)
    y, _ = librosa.load(arq, sr=SR, mono=True)
    rms = librosa.feature.rms(y=y, hop_length=HOP)[0]
    pico = np.percentile(rms, 99) + 1e-9
    ativo = rms > pico * 0.06
    env = librosa.onset.onset_strength(y=y, sr=SR, hop_length=HOP, fmax=1200 if grave else 8000)
    env = env / (np.percentile(env, 99) + 1e-9)
    ev = set(int(f) for f in librosa.onset.onset_detect(onset_envelope=env, sr=SR, hop_length=HOP, delta=dl, wait=2 if fino else 3))
    fmin = librosa.note_to_hz("E1" if grave else "E2")
    midi0 = librosa.hz_to_midi(fmin)
    m = None
    if grave:
        f0, voz, _ = librosa.pyin(y, fmin=35, fmax=400, sr=SR, frame_length=2048, hop_length=HOP)
        m = np.where(voz, np.round(librosa.hz_to_midi(np.nan_to_num(f0, nan=1.0))), -1)
        ant = -1
        for i in range(len(m) - 6):  # nota nova quando a altura muda e fica estável ~70 ms
            if m[i] > 0 and m[i] != ant and (m[i:i + 6] == m[i]).all():
                ev.add(i); ant = m[i]
            elif m[i] < 0 and (m[i:i + 4] < 0).all():
                ant = -1
        Cr = None
    else:
        Cr = librosa.feature.chroma_cqt(y=y, sr=SR, hop_length=HOP, fmin=fmin)
        Cr = Cr / (np.linalg.norm(Cr, axis=0, keepdims=True) + 1e-9)
        w = 8
        dist = np.zeros(Cr.shape[1])
        for i in range(w, Cr.shape[1] - w):
            a = Cr[:, i - w:i].mean(axis=1); b = Cr[:, i:i + w].mean(axis=1)
            dist[i] = 1 - a @ b / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-9)
        pk = librosa.util.peak_pick(dist, pre_max=6, post_max=6, pre_avg=12, post_avg=12, delta=0.05 if fino else 0.08, wait=6 if fino else 8)
        ev |= set(int(p) for p in pk if dist[p] > (0.08 if fino else 0.12))
    C = np.abs(librosa.cqt(y, sr=SR, hop_length=HOP, fmin=fmin, n_bins=48 if grave else 60, bins_per_octave=12))
    on = sorted(f for f in ev if f < len(rms) and ativo[min(f + 2, len(rms) - 1)])
    jun = []
    for f in on:  # junta eventos a menos de 70 ms
        if jun and (f - jun[-1]) * HOP / SR < jn: continue
        jun.append(f)
    out = []
    for i, f in enumerate(jun):
        a, b = f + 1, min(f + 6, C.shape[1])
        espec = C[:, a:b].mean(axis=1)
        if grave:
            mm = m[f:f + 6]; mm = mm[mm > 0]
            alt = float(np.median(mm)) if len(mm) else midi0 + int(np.argmax(espec))
            acordice = 0.0
        else:
            pesos = espec ** 2
            alt = midi0 + float((np.arange(len(espec)) * pesos).sum() / (pesos.sum() + 1e-9))
            croma = np.sort(Cr[:, a:b].mean(axis=1))[::-1]
            croma = croma / (croma[0] + 1e-9)
            acordice = float(croma[1] + croma[2])
        prox = jun[i + 1] if i + 1 < len(jun) else len(rms) - 1
        r0 = rms[f:f + 4].max(); g = f
        while g < prox and rms[g] > r0 * 0.45: g += 1
        out.append({"t": librosa.frames_to_time(f, sr=SR, hop_length=HOP), "alt": alt, "acordice": acordice,
                    "forca": float(env[f]) + 0.3, "sus": librosa.frames_to_time(g - f, sr=SR, hop_length=HOP)})
    return out, len(y) / SR

def chart(cru, bpm, t0, dif):
    sub, gap, nl, frac_acorde, longa = DIF[dif]
    if dif == "expert" and bpm < 95: sub = 8  # faixa lenta: grade de fusas
    beat = 60 / bpm; passo = beat / sub
    slots = {}
    for n in cru:  # encaixa na grade; no mesmo ponto fica o ataque mais forte
        k = round((n["t"] - t0) / passo)
        if k < 0: continue
        if k not in slots or n["forca"] > slots[k]["forca"]: slots[k] = n
    vivos = []
    for k in sorted(slots):  # intervalo mínimo: fica o mais forte
        if vivos and (k - vivos[-1]) * passo < gap - 1e-6:
            if slots[k]["forca"] > slots[vivos[-1]]["forca"]: vivos[-1] = k
            continue
        vivos.append(k)
    corte = 99.0
    if frac_acorde > 0 and vivos:
        ac = [slots[k]["acordice"] for k in vivos]
        corte = max(1.25, float(np.percentile(ac, 100 - frac_acorde * 100)))
    res, lane, alt_ant = [], 1, None
    for j, k in enumerate(vivos):
        n = slots[k]
        if alt_ant is not None:
            d = n["alt"] - alt_ant
            if abs(d) >= 0.75:
                pl = int(np.sign(d)) * (1 if abs(d) < 4 else 2)
                novo = lane + pl
                if novo < 0 or novo >= nl: novo = lane - pl  # bateu na borda: espelha
                lane = int(np.clip(novo, 0, nl - 1))
        alt_ant = n["alt"]
        t = round(t0 + k * passo, 4)
        prox_t = t0 + vivos[j + 1] * passo if j + 1 < len(vivos) else t + 99
        dur = 0.0
        if n["sus"] >= longa * beat:
            dur = min(n["sus"], prox_t - t - passo)
            dur = max(0.0, round(round(dur / passo) * passo, 4))
            if dur < longa * beat * 0.9: dur = 0.0
        nota = [t, lane, dur]
        if n["acordice"] >= corte:
            nota.append(lane + 1 if lane + 1 < nl else lane - 1)
        res.append(nota)
    return res

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for fid in sys.argv[2:] or list(FAIXAS):
        p, bpm, t0 = FAIXAS[fid]
        d = pasta(p)
        arqs = glob.glob(d + "*")
        ga = next(a for a in arqs if "GUITARRA" in a.upper()); ba = next(a for a in arqs if "GRAVES" in a.upper())
        cg, dur = notas_cruas(ga, False); cb, _ = notas_cruas(ba, True)
        cgf, _ = notas_cruas(ga, False, True); cbf, _ = notas_cruas(ba, True, True)
        fonte = lambda inst, k: (cgf if inst == "g" else cbf) if k == "expert" else (cg if inst == "g" else cb)
        js = {"bpm": bpm, "t0": t0, "dur": round(dur, 2),
              "guitarra": {k: chart(fonte("g", k), bpm, t0, k) for k in DIF}, "baixo": {k: chart(fonte("b", k), bpm, t0, k) for k in DIF}}
        json.dump(js, open(f"{OUT}/{fid}.json", "w"), separators=(",", ":"))
        print(f"== {fid}: " + " · ".join(f"{i[0]}{k[0]} {len(js[i][k])}" for i in ("guitarra", "baixo") for k in DIF), flush=True)
