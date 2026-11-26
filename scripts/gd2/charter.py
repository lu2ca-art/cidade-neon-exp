"""O CHARTER DO GUITAR DRIVER 2 (21/10, item A5 do BACKLOG).

As notas de cada instrumento, tiradas da própria faixa, com as regras de um
charter de Guitar Hero (docs/guitar-driver-estudo.md):
  1. a banda separada (Demucs htdemucs_6s: voz, bateria, baixo, guitarra, piano, outros)
  2. a grade do BPM, com o 1º tempo achado nos ataques da bateria
  3. as notas (Basic Pitch) e os ataques da bateria (por faixa de frequência)
  4. o charter: encaixa na grade, cor = contorno relativo da frase, acordes,
     sustain, densidade por nível; nunca um vazio (puxa a "função" de outra stem)
  5. a janela de 22 s de cada instrumento (a mais cheia, sem buraco)
  6. a prova: notas, maior buraco, % de notas em cima de um ataque real

Roda na máquina do LU2CA, com o ambiente do disco "IA Cidade Neon" (SSD):
  "/Volumes/IA Cidade Neon/venv/bin/python" scripts/gd2/charter.py \
      --stems "/Volumes/IA Cidade Neon/stems/htdemucs_6s" --saida public/gd --relatorio <arquivo.json>
Só as notas (JSON) entram no repo; o áudio separado fica no SSD.
"""

import argparse
import json
import math
import os
import re
import sys

import numpy as np
import librosa

LANES = 4  # as cores do Guitar Driver (app/neon-tiles/cena.ts)
SR = 22050
JANELA_S = 22.0  # "é sempre 22 segundos, em qualquer modalidade" (LU2CA 21/10)
MACIAS = os.environ.get("GD_MACIAS", "0") == "1"  # a nota longa sem ataque fica? (A/B na CHUVA: sem elas, mais notas em cima do ataque e os mesmos buracos)

# o BPM e o id de cada faixa (app/linha/estrada/pistas.ts)
BPM = {"ontem": 100, "copo": 80, "swav": 135, "sexta": 88, "rollercoaster": 104, "dopamina": 125, "chuva": 79, "ojala": 118, "nectar": 79}

# as faixas que ainda não saíram entram só com o instrumental (a voz não fica no repo
# antes do lançamento): sem melodia da voz, mesmo que um synth pareça voz na separação
SO_INSTRUMENTAL = {"ojala", "swav", "rollercoaster"}

# por nível: a grade (fração do tempo), quantas cores, acordes, notas por tempo no máximo
NIVEIS = {
    "facil": {"grades": [1.0], "cores": 3, "acorde": False, "por_tempo": 1},
    "medio": {"grades": [0.5], "cores": 4, "acorde": False, "por_tempo": 2},
    "dificil": {"grades": [0.25], "cores": 4, "acorde": True, "por_tempo": 4},
    "expert": {"grades": [0.25, 1 / 3], "cores": 4, "acorde": True, "por_tempo": 6},
}

# de onde vem cada instrumento (a 1ª stem manda; as outras tapam os buracos: nunca um vazio)
FONTES = {
    "guitarra": ["guitar", "other", "piano"],
    "baixo": ["bass", "other"],
    "teclado": ["piano", "other", "guitar"],
}


def carregar(caminho):
    y, _ = librosa.load(caminho, sr=SR, mono=True)
    return y


def ataques(y):
    """os ataques reais de uma stem (s), pra conferir o chart"""
    env = librosa.onset.onset_strength(y=y, sr=SR)
    return librosa.onset.onset_detect(onset_envelope=env, sr=SR, units="time", backtrack=False)


def primeiro_tempo(y_bateria, y_mix, bpm):
    """o 1º tempo da grade: a fase que mais cai em cima dos ataques (bateria; sem bateria, a mistura)"""
    y = y_bateria if np.abs(y_bateria).mean() > 1e-4 else y_mix
    env = librosa.onset.onset_strength(y=y, sr=SR)
    tempos = librosa.times_like(env, sr=SR)
    passo = 60.0 / bpm
    melhor, fase = -1, 0.0
    for f in np.arange(0, passo, 0.005):
        grade = np.arange(f, tempos[-1], passo)
        idx = np.clip(np.searchsorted(tempos, grade), 0, len(env) - 1)
        s = env[idx].sum()
        if s > melhor:
            melhor, fase = s, f
    return float(fase)


def notas_basic_pitch(caminho, mono, grave=False):
    """notas [(início, fim, altura, força)] com o Basic Pitch; mono = uma por vez"""
    from basic_pitch.inference import predict
    from basic_pitch import ICASSP_2022_MODEL_PATH

    _, _, eventos = predict(caminho, ICASSP_2022_MODEL_PATH, onset_threshold=0.55, frame_threshold=0.3, minimum_note_length=80, melodia_trick=True)
    ev = sorted([(float(a), float(b), int(p), float(f)) for a, b, p, f, *_ in eventos], key=lambda e: e[0])
    if not mono:
        return ev
    # uma nota por vez: entre as que se sobrepõem, a mais forte (no baixo, a mais grave)
    out = []
    for e in ev:
        if out and e[0] < out[-1][1] - 0.03:
            atual = out[-1]
            melhor = (e[2] < atual[2]) if grave else (e[3] > atual[3])
            if melhor:
                out[-1] = (atual[0], e[0], atual[2], atual[3])
                out.append(e)
            continue
        out.append(e)
    return [e for e in out if e[1] - e[0] > 0.05]


def bateria(y):
    """os ataques da bateria por peça: 0 bumbo, 1 caixa, 2 chimbal, 3 prato"""
    S = np.abs(librosa.stft(y, n_fft=2048, hop_length=512))
    freqs = librosa.fft_frequencies(sr=SR, n_fft=2048)
    faixas = {0: (20, 150), 1: (150, 2500), 2: (6000, 11000)}
    out = []
    for peca, (lo, hi) in faixas.items():
        banda = S[(freqs >= lo) & (freqs < hi)].sum(axis=0)
        env = np.maximum(0, np.diff(banda, prepend=banda[:1]))
        env = env / (env.max() + 1e-9)
        picos = librosa.util.peak_pick(env, pre_max=3, post_max=3, pre_avg=10, post_avg=10, delta=0.08 if peca else 0.12, wait=4)
        for p in picos:
            out.append((float(librosa.frames_to_time(p, sr=SR, hop_length=512)), peca, float(env[p])))
    # o prato: chimbal muito forte (os acentos)
    fortes = [o for o in out if o[1] == 2]
    if fortes:
        limiar = np.percentile([o[2] for o in fortes], 92)
        out = [(t, 3 if (p == 2 and f >= limiar) else p, f) for t, p, f in out]
    return sorted(out)


def encaixar(t, t0, passo, grades, tol=0.035):
    """o tempo encaixado na grade mais perto (entre as grades do nível). Se a grade
    fica longe do ataque real (swing, síncope, uma tercina fora da grade do nível),
    vale o ataque real: a nota tem que cair onde a pessoa OUVE o som"""
    melhor = None
    for g in grades:
        q = passo * g
        k = round((t - t0) / q)
        tq = t0 + k * q
        if melhor is None or abs(tq - t) < abs(melhor - t):
            melhor = tq
    return melhor if abs(melhor - t) <= tol else t


def cores_por_contorno(alturas, cores):
    """cor = o desenho da melodia dentro da frase (sobe → direita), como no Guitar Hero.
    Notas diferentes que cairiam na mesma cor andam uma casa na direção do movimento."""
    if not alturas:
        return []
    lo, hi = min(alturas), max(alturas)
    if hi == lo:
        base = [cores // 2] * len(alturas)
    else:
        base = [int(round((a - lo) / (hi - lo) * (cores - 1))) for a in alturas]
    for i in range(1, len(base)):
        if alturas[i] != alturas[i - 1] and base[i] == base[i - 1]:
            d = 1 if alturas[i] > alturas[i - 1] else -1
            base[i] = min(cores - 1, max(0, base[i] + d))
    return base


def frases(notas, passo):
    """separa em frases: um silêncio de mais de 1 tempo fecha a frase"""
    out, atual = [], []
    for n in notas:
        if atual and n[0] - atual[-1][1] > passo:
            out.append(atual)
            atual = []
        atual.append(n)
    if atual:
        out.append(atual)
    return out


def colar_nos_ataques(notas, reais, bpm, macias=None):
    """o Basic Pitch erra um pouco o começo da nota: cada nota cola no ataque real
    mais perto da stem (até 80 ms); nota curta sem ataque nenhum perto é ruído e sai
    (a nota longa fica: é a que entra macia, um acorde de pad, uma voz)"""
    if len(reais) == 0:
        return notas
    if macias is None:
        macias = MACIAS
    r = np.asarray(reais)
    passo = 60.0 / bpm
    out = []
    for a, b, p, f in notas:
        i = int(np.argmin(np.abs(r - a)))
        if abs(r[i] - a) <= 0.08:
            out.append((float(r[i]), b, p, f))
        elif macias and b - a >= passo:
            out.append((a, b, p, f))
    return out


def chart_tonal(notas, t0, bpm, nivel):
    """o chart de um instrumento com altura (guitarra, baixo, teclado) num nível"""
    cfg = NIVEIS[nivel]
    passo = 60.0 / bpm
    # acordes: notas que começam juntas (até 35 ms) viram um grupo
    grupos = []
    for n in sorted(notas):
        if grupos and n[0] - grupos[-1][0][0] < 0.035:
            grupos[-1].append(n)
        else:
            grupos.append([n])
    principais = [max(g, key=lambda n: n[2]) for g in grupos]  # a voz de cima do acorde
    saida = []
    padroes = {}  # repetição: a mesma frase (intervalos + ritmo) ganha o mesmo desenho
    # as frases: um silêncio de mais de 1 tempo fecha a frase
    pares = list(zip(principais, grupos))
    blocos = []
    atual = []
    for p, g in pares:
        if atual and p[0] - atual[-1][0][1] > passo:
            blocos.append(atual)
            atual = []
        atual.append((p, g))
    if atual:
        blocos.append(atual)
    for bloco in blocos:
        alts = [p[2] for p, _ in bloco]
        chave = (tuple(np.diff(alts).tolist()), tuple(np.round(np.diff([p[0] for p, _ in bloco]) / passo, 2).tolist()))
        if chave in padroes and len(bloco) >= 3:
            cores = padroes[chave]
        else:
            cores = cores_por_contorno(alts, cfg["cores"])
            padroes[chave] = cores
        for (p, g), c in zip(bloco, cores):
            tq = encaixar(p[0], t0, passo, cfg["grades"])
            dur_s = p[1] - p[0]
            l2 = None
            if cfg["acorde"] and len(g) >= 2:
                outra = max(0, min(LANES - 1, c + (1 if c < LANES - 1 else -1)))
                l2 = outra
            saida.append([round(tq, 3), int(c), dur_s, l2])
    return finalizar(saida, passo, cfg)


def finalizar(saida, passo, cfg):
    """sem duas notas no mesmo lugar da grade, a densidade do nível e o sustain"""
    saida.sort(key=lambda n: n[0])
    limpo = []
    for n in saida:
        if limpo and abs(n[0] - limpo[-1][0]) < 1e-3:
            continue
        limpo.append(n)
    # densidade: no máximo `por_tempo` notas por tempo (fica a de tempo mais forte)
    minimo = passo / cfg["por_tempo"] - 1e-3
    denso = []
    for n in limpo:
        if denso and n[0] - denso[-1][0] < minimo:
            continue
        denso.append(n)
    # sustain: a nota que dura mais que 0,6 tempo segura; a cauda acaba 1/8 de tempo antes da próxima
    out = []
    for i, n in enumerate(denso):
        prox = denso[i + 1][0] if i + 1 < len(denso) else n[0] + 8 * passo
        dur = n[2] if n[2] > 0.6 * passo else 0.0
        dur = max(0.0, min(dur, prox - n[0] - passo / 8))
        nota = [n[0], n[1], round(dur, 3)]
        if n[3] is not None and n[3] != n[1]:
            nota.append(int(n[3]))
        out.append(nota)
    return out


def chart_bateria(golpes, t0, bpm, nivel):
    cfg = NIVEIS[nivel]
    passo = 60.0 / bpm
    pecas = {"facil": {0, 1}, "medio": {0, 1, 2}, "dificil": {0, 1, 2, 3}, "expert": {0, 1, 2, 3}}[nivel]
    saida = []
    for t, p, f in golpes:
        if p not in pecas:
            continue
        saida.append([round(encaixar(t, t0, passo, cfg["grades"]), 3), int(p), 0.0, None])
    # na bateria, duas peças juntas valem (bumbo + prato): vira "acorde" no difícil
    saida.sort(key=lambda n: (n[0], n[1]))
    juntos = []
    for n in saida:
        if juntos and abs(n[0] - juntos[-1][0]) < 1e-3:
            if cfg["acorde"] and juntos[-1][3] is None and n[1] != juntos[-1][1]:
                juntos[-1][3] = n[1]
            continue
        juntos.append(n)
    return finalizar(juntos, passo, cfg)


def tapar_buracos(prim, extras, passo):
    """nunca um vazio: onde a stem principal some por mais de 2 tempos, entram as notas
    da próxima fonte (a mesma função tocada por outro instrumento)"""
    if not extras:
        return prim
    out = list(prim)
    inícios = [n[0] for n in prim]
    for e in extras:
        i = np.searchsorted(inícios, e[0])
        antes = inícios[i - 1] if i > 0 else -1e9
        depois = inícios[i] if i < len(inícios) else 1e9
        if depois - antes > 2 * passo and e[0] - antes > passo / 2 and depois - e[0] > passo / 2:
            out.append(e)
    return sorted(out)


def janela(notas, t0, bpm, dur):
    """a janela de 22 s mais cheia, começando num compasso, sem buraco de mais de 2 tempos"""
    passo = 60.0 / bpm
    ts = np.array([n[0] for n in notas])
    if len(ts) == 0:
        return 0.0, 0, JANELA_S
    melhor = (-1e9, 0.0, 0, JANELA_S)
    ini = t0
    while ini + JANELA_S <= dur:
        dentro = ts[(ts >= ini) & (ts < ini + JANELA_S)]
        if len(dentro):
            buracos = np.diff(np.concatenate([[ini], dentro, [ini + JANELA_S]]))
            maior = float(buracos.max())
        else:
            maior = JANELA_S
        nota = len(dentro) - 25 * max(0.0, maior - 2 * passo)
        if nota > melhor[0]:
            melhor = (nota, round(float(ini), 3), int(len(dentro)), round(maior, 2))
        ini += 4 * passo  # de compasso em compasso
    return melhor[1], melhor[2], melhor[3]


def em_cima(notas, reais, tol=0.05):
    if not notas or len(reais) == 0:
        return 0.0
    r = np.asarray(reais)
    ok = sum(1 for n in notas if np.min(np.abs(r - n[0])) <= tol)
    return round(100.0 * ok / len(notas), 1)


def processar(pasta, fid, saida, antigo):
    bpm = BPM[fid]
    passo = 60.0 / bpm
    stem = lambda s: os.path.join(pasta, f"{s}.mp3")
    ys = {s: carregar(stem(s)) for s in ["vocals", "drums", "bass", "guitar", "piano", "other"] if os.path.exists(stem(s))}
    mix = sum(ys.values())
    dur = len(mix) / SR
    t0 = primeiro_tempo(ys["drums"], mix, bpm)
    rel = {"id": fid, "bpm": bpm, "t0": round(t0, 3), "dur": round(dur, 2), "instrumentos": {}}
    chart = {"versao": 2, "bpm": bpm, "t0": round(t0, 3), "dur": round(dur, 2), "janelas": {}}

    # a voz (o afinador segue a melodia): só nas faixas com voz
    energia_voz = float(np.abs(ys.get("vocals", np.zeros(1))).mean())
    if energia_voz > 2e-3 and fid not in SO_INSTRUMENTAL:
        mel = colar_nos_ataques(notas_basic_pitch(stem("vocals"), mono=True), ataques(ys["vocals"]), bpm)
        chart["voz"] = {"melodia": [[round(a, 3), p, round(b - a, 3)] for a, b, p, _ in mel]}
        ini, n, maior = janela([[a] for a, _, _, _ in mel], t0, bpm, dur)
        chart["janelas"]["voz"] = ini
        rel["instrumentos"]["voz"] = {"notas": len(mel), "janela": ini, "na_janela": n, "maior_buraco_s": maior, "em_cima_%": em_cima([[a] for a, *_ in mel], ataques(ys["vocals"]))}

    # guitarra, baixo, teclado
    cache = {}
    for inst, fontes in FONTES.items():
        fontes = [f for f in fontes if f in ys]
        for f in fontes:
            if f not in cache:
                cache[f] = colar_nos_ataques(notas_basic_pitch(stem(f), mono=(f == "bass"), grave=(f == "bass")), ataques(ys[f]), bpm)
        chart[inst] = {}
        for nivel in NIVEIS:
            prim = chart_tonal(cache[fontes[0]], t0, bpm, nivel) if fontes else []
            for extra in fontes[1:]:
                prim = tapar_buracos(prim, chart_tonal(cache[extra], t0, bpm, nivel), passo)
            chart[inst][nivel] = prim
        dif = chart[inst]["dificil"]
        ini, n, maior = janela(dif, t0, bpm, dur)
        chart["janelas"][inst] = ini
        reais = ataques(sum(ys[f] for f in fontes)) if fontes else []
        rel["instrumentos"][inst] = {"fontes": fontes, "notas_dificil": len(dif), "janela": ini, "na_janela": n, "maior_buraco_s": maior, "em_cima_%": em_cima(dif, reais)}

    # a bateria
    golpes = bateria(ys["drums"])
    chart["bateria"] = {nivel: chart_bateria(golpes, t0, bpm, nivel) for nivel in NIVEIS}
    dif = chart["bateria"]["dificil"]
    ini, n, maior = janela(dif, t0, bpm, dur)
    chart["janelas"]["bateria"] = ini
    rel["instrumentos"]["bateria"] = {"notas_dificil": len(dif), "janela": ini, "na_janela": n, "maior_buraco_s": maior, "em_cima_%": em_cima(dif, ataques(ys["drums"]))}

    # o antes: o chart antigo (guitarra e baixo), nas mesmas medidas
    if antigo and os.path.exists(antigo):
        velho = json.load(open(antigo))
        rel["antes"] = {}
        for inst, fontes in [("guitarra", FONTES["guitarra"]), ("baixo", FONTES["baixo"])]:
            v = velho.get(inst, {}).get("dificil", [])
            fontes = [f for f in fontes if f in ys]
            ini, n, maior = janela(v, velho.get("t0", t0), velho.get("bpm", bpm), dur)
            rel["antes"][inst] = {"notas_dificil": len(v), "na_janela": n, "maior_buraco_s": maior, "em_cima_%": em_cima(v, ataques(sum(ys[f] for f in fontes)) if fontes else [])}

    json.dump(chart, open(os.path.join(saida, f"{fid}.json"), "w"), separators=(",", ":"))
    return rel


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--stems", required=True)
    ap.add_argument("--saida", required=True)
    ap.add_argument("--antigo", default=None, help="pasta com os charts antigos (pro antes/depois)")
    ap.add_argument("--relatorio", required=True)
    ap.add_argument("--so", default=None, help="só estas faixas (ids separados por vírgula)")
    ap.add_argument("--bpm", default=None, help="troca o BPM (id=bpm,...): as versões ao vivo (26/11) não têm o BPM do estúdio")
    a = ap.parse_args()
    if a.bpm:
        for par in a.bpm.split(","):
            k, v = par.split("=")
            BPM[k] = float(v)
    ids = sorted(d for d in os.listdir(a.stems) if os.path.isdir(os.path.join(a.stems, d)) and d in BPM)
    if a.so:
        ids = [i for i in ids if i in a.so.split(",")]
    os.makedirs(a.saida, exist_ok=True)
    rels = []
    for fid in ids:
        print("faixa", fid, flush=True)
        rels.append(processar(os.path.join(a.stems, fid), fid, a.saida, os.path.join(a.antigo, f"{fid}.json") if a.antigo else None))
        json.dump(rels, open(a.relatorio, "w"), indent=1, ensure_ascii=False)
    print("pronto", len(rels), flush=True)


if __name__ == "__main__":
    main()
