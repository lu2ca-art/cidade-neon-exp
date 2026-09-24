// Conteúdo do painel interno Central Cidade Neon — espelha
// ~/repos/LU2CA/operacional/artifacts/central-cidade-neon.html
// Atualizar os dois em conjunto quando o checklist mudar.
export const PANEL_HTML = `<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1"><style>:root{color-scheme:light}body{margin:0;padding:0;font:14px -apple-system,BlinkMacSystemFont,sans-serif;background:#faf9f5;color:#141413}img{max-width:100%}</style></head><body>
<title>Central Cidade Neon</title>
<style>
  :root {
    --bg: #0a0918;
    --bg-grid: #100e24;
    --surface: #15132b;
    --surface-2: #1c1938;
    --surface-3: #221e42;
    --border: #2c2650;
    --border-soft: #221e42;
    --text: #eef0fb;
    --text-dim: #9089b8;
    --text-faint: #635a8f;
    --cyan: #2fe8ff;
    --cyan-dim: #1a8fa3;
    --magenta: #ff3fb0;
    --gold: #ffcf4d;
    --green: #34e5a8;
    --red: #ff5c7a;
    --overlay: rgba(6,5,16,0.72);
    --font-display: -apple-system, "Segoe UI", system-ui, "Helvetica Neue", Arial, sans-serif;
    --font-body: -apple-system, "Segoe UI", system-ui, "Helvetica Neue", Arial, sans-serif;
    --font-mono: ui-monospace, "SF Mono", "Cascadia Code", "Roboto Mono", Menlo, Consolas, monospace;
  }

  * { box-sizing: border-box; }

  html, body {
    margin: 0;
    padding: 0;
    background: var(--bg);
  }

  /* reset for card-as-button elements, declared before the component
     classes below so source order lets the later rules win on ties */
  .card-btn {
    display: block;
    width: 100%;
    background: none;
    border: 0;
    margin: 0;
    padding: 0;
    font: inherit;
    color: inherit;
    text-align: left;
    cursor: pointer;
    -webkit-appearance: none;
    appearance: none;
    transition: transform .15s ease, box-shadow .15s ease, background-color .15s ease, border-color .15s ease;
  }
  .card-btn .affordance {
    font-family: var(--font-mono);
    color: var(--text-faint);
    transition: color .15s ease, transform .15s ease;
  }
  .card-btn:hover .affordance, .card-btn:focus-visible .affordance { color: var(--cyan); transform: translateX(2px); }
  .card-btn.liftable:hover, .card-btn.liftable:focus-visible {
    transform: translateY(-3px);
    border-color: var(--cyan-dim);
    box-shadow: 0 10px 26px -12px rgba(47,232,255,0.4);
  }

  body {
    background:
      radial-gradient(ellipse 900px 500px at 15% -10%, rgba(47,232,255,0.10), transparent 60%),
      radial-gradient(ellipse 700px 500px at 100% 0%, rgba(255,63,176,0.09), transparent 55%),
      var(--bg);
    color: var(--text);
    font-family: var(--font-body);
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
    min-height: 100vh;
    padding: 0 0 5rem;
  }

  a { color: var(--cyan); text-decoration: none; }
  a:hover { text-decoration: underline; }
  a:focus-visible, button:focus-visible { outline: 2px solid var(--cyan); outline-offset: 3px; }

  .wrap {
    max-width: 1180px;
    margin: 0 auto;
    padding: 0 1.75rem;
  }

  /* ---------- top bar ---------- */
  .topbar {
    border-bottom: 1px solid var(--border-soft);
    background: rgba(10,9,24,0.7);
    backdrop-filter: blur(6px);
    position: sticky;
    top: 0;
    z-index: 20;
  }
  .topbar-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.9rem 1.75rem;
    max-width: 1180px;
    margin: 0 auto;
  }
  .brand {
    display: flex;
    align-items: baseline;
    gap: 0.6rem;
    font-family: var(--font-display);
    font-weight: 900;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    font-size: 0.95rem;
  }
  .brand-mark {
    width: 9px; height: 9px; border-radius: 2px;
    background: var(--cyan);
    box-shadow: 0 0 10px 2px rgba(47,232,255,0.7);
  }
  .brand small {
    font-family: var(--font-mono);
    font-weight: 400;
    letter-spacing: 0.04em;
    color: var(--text-faint);
    text-transform: none;
    font-size: 0.72rem;
  }
  .topbar-meta {
    font-family: var(--font-mono);
    font-size: 0.76rem;
    color: var(--text-dim);
    letter-spacing: 0.02em;
    text-align: right;
    line-height: 1.4;
  }
  .topbar-meta b { color: var(--gold); font-weight: 600; }

  /* ---------- hero / cycle status ---------- */
  .hero {
    padding: 2.6rem 0 2rem;
    border-bottom: 1px solid var(--border-soft);
  }
  .eyebrow {
    font-family: var(--font-mono);
    font-size: 0.72rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--cyan-dim);
    margin: 0 0 0.9rem;
  }
  .hero h1 {
    font-family: var(--font-display);
    font-weight: 900;
    font-size: clamp(1.9rem, 4.2vw, 3.1rem);
    letter-spacing: 0.01em;
    text-wrap: balance;
    margin: 0 0 0.5rem;
    text-shadow: 0 0 26px rgba(47,232,255,0.35);
  }
  .hero h1 em {
    font-style: normal;
    color: var(--magenta);
    text-shadow: 0 0 26px rgba(255,63,176,0.45);
  }
  .hero p.lede {
    color: var(--text-dim);
    max-width: 62ch;
    font-size: 1rem;
    margin: 0 0 0.9rem;
  }
  .hint {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    font-family: var(--font-mono);
    font-size: 0.72rem;
    color: var(--cyan-dim);
    background: rgba(47,232,255,0.06);
    border: 1px solid rgba(47,232,255,0.2);
    border-radius: 100px;
    padding: 0.3rem 0.75rem;
    margin: 0 0 1.6rem;
  }

  .cycle-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1px;
    background: var(--border);
    border: 1px solid var(--border);
    border-radius: 10px;
    overflow: hidden;
  }
  .cycle-cell {
    background: var(--surface);
    padding: 1rem 1.2rem;
    position: relative;
  }
  .cycle-cell.card-btn:hover, .cycle-cell.card-btn:focus-visible {
    background: var(--surface-2);
    box-shadow: inset 0 0 0 1px rgba(47,232,255,0.35);
  }
  .cycle-cell .k {
    font-family: var(--font-mono);
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-faint);
    margin: 0 0 0.4rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: .5rem;
  }
  .cycle-cell .v {
    font-family: var(--font-mono);
    font-weight: 600;
    font-size: 1.35rem;
    color: var(--text);
    font-variant-numeric: tabular-nums;
  }
  .cycle-cell .v.accent { color: var(--gold); }
  .cycle-cell .sub {
    font-size: 0.76rem;
    color: var(--text-dim);
    margin-top: 0.25rem;
  }

  @media (max-width: 720px) {
    .cycle-row { grid-template-columns: repeat(2, 1fr); }
  }

  /* ---------- section heading ---------- */
  .section {
    padding: 2.6rem 0;
    border-bottom: 1px solid var(--border-soft);
  }
  .section-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1.4rem;
    flex-wrap: wrap;
  }
  .section-head h2 {
    font-family: var(--font-display);
    font-weight: 800;
    letter-spacing: 0.03em;
    font-size: 1.05rem;
    text-transform: uppercase;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.55rem;
  }
  .section-head h2 .rail {
    width: 22px; height: 2px;
    background: linear-gradient(90deg, var(--cyan), transparent);
  }
  .section-head .note {
    font-size: 0.82rem;
    color: var(--text-faint);
    font-family: var(--font-mono);
  }

  /* ---------- progress cards (A-E) ---------- */
  .prog-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 0.9rem;
  }
  @media (max-width: 980px) {
    .prog-grid { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 560px) {
    .prog-grid { grid-template-columns: 1fr; }
  }
  .prog-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 1.1rem 1.15rem 1.2rem;
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
  }
  .prog-card .letter-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .prog-card .letter {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    color: var(--text-faint);
    letter-spacing: 0.08em;
  }
  .prog-card h3 {
    margin: 0;
    font-size: 0.92rem;
    font-weight: 700;
    line-height: 1.3;
  }
  .prog-bar-track {
    height: 6px;
    border-radius: 3px;
    background: var(--surface-2);
    overflow: hidden;
  }
  .prog-bar-fill {
    height: 100%;
    border-radius: 3px;
    background: linear-gradient(90deg, var(--cyan-dim), var(--cyan));
  }
  .prog-bar-fill.done { background: linear-gradient(90deg, #1c9d78, var(--green)); }
  .prog-count {
    font-family: var(--font-mono);
    font-size: 0.78rem;
    color: var(--text-dim);
    display: flex;
    justify-content: space-between;
    font-variant-numeric: tabular-nums;
  }
  .prog-count b { color: var(--text); font-weight: 600; }
  .prog-next {
    font-size: 0.8rem;
    color: var(--text-dim);
    border-top: 1px dashed var(--border);
    padding-top: 0.6rem;
    margin-top: 0.1rem;
  }
  .prog-next b { color: var(--gold); font-weight: 600; }

  /* ---------- two column: today + findings ---------- */
  .split {
    display: grid;
    grid-template-columns: 1.1fr 1fr;
    gap: 1.6rem;
  }
  @media (max-width: 860px) {
    .split { grid-template-columns: 1fr; }
  }

  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 1.3rem 1.4rem;
  }

  .today-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.65rem; }
  .today-item {
    display: flex;
    align-items: flex-start;
    gap: 0.7rem;
    font-size: 0.88rem;
    padding-bottom: 0.65rem;
    border-bottom: 1px solid var(--border-soft);
  }
  .today-item:last-child { border-bottom: none; padding-bottom: 0; }
  .chk {
    flex: none;
    width: 18px; height: 18px;
    border-radius: 4px;
    display: flex; align-items: center; justify-content: center;
    font-size: 0.65rem;
    margin-top: 0.15rem;
    font-family: var(--font-mono);
  }
  .chk.done { background: rgba(52,229,168,0.15); color: var(--green); border: 1px solid rgba(52,229,168,0.4); }
  .chk.doing { background: rgba(255,207,77,0.14); color: var(--gold); border: 1px solid rgba(255,207,77,0.4); }
  .chk.todo { background: transparent; border: 1px solid var(--border); color: transparent; }
  .today-item .label { color: var(--text); }
  .today-item .label .status { display: block; font-size: 0.76rem; color: var(--text-dim); margin-top: 0.15rem; }

  .stat-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.8rem;
    margin-bottom: 1.2rem;
  }
  .stat {
    background: var(--surface-2);
    border: 1px solid var(--border-soft);
    border-radius: 8px;
    padding: 0.75rem 0.9rem;
  }
  .stat .plat {
    font-family: var(--font-mono);
    font-size: 0.66rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-faint);
    margin-bottom: 0.3rem;
  }
  .stat .num {
    font-family: var(--font-mono);
    font-size: 1.15rem;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
  .stat .num .delta { font-size: 0.7rem; margin-left: 0.35rem; }
  .stat .num .delta.up { color: var(--green); }
  .stat .num .delta.down { color: var(--red); }
  .stat .sub2 { font-size: 0.72rem; color: var(--text-dim); margin-top: 0.15rem; }

  .findings-title {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-faint);
    margin: 0 0 0.6rem;
  }
  .chip-row { display: flex; flex-wrap: wrap; gap: 0.5rem; }
  .chip {
    font-size: 0.76rem;
    padding: 0.3rem 0.65rem;
    border-radius: 100px;
    border: 1px solid;
    font-family: var(--font-mono);
  }
  .chip.warn { color: var(--gold); border-color: rgba(255,207,77,0.4); background: rgba(255,207,77,0.08); }
  .chip.block { color: var(--red); border-color: rgba(255,92,122,0.4); background: rgba(255,92,122,0.08); }
  .chip.done { color: var(--green); border-color: rgba(52,229,168,0.35); background: rgba(52,229,168,0.07); text-decoration: line-through; text-decoration-color: rgba(52,229,168,0.5); opacity: 0.75; }

  /* ---------- cortes / identity strip ---------- */
  .reel {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 0.8rem;
  }
  @media (max-width: 860px) {
    .reel { grid-template-columns: repeat(2, 1fr); }
  }
  .reel-card {
    background: linear-gradient(160deg, var(--surface-2), var(--surface));
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 1rem 0.95rem;
    position: relative;
    overflow: hidden;
  }
  .reel-card::before {
    content: "";
    position: absolute; inset: 0;
    background: linear-gradient(135deg, rgba(47,232,255,0.08), transparent 55%);
    pointer-events: none;
  }
  .reel-card .tag {
    display: inline-block;
    font-family: var(--font-mono);
    font-size: 0.62rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 0.15rem 0.5rem;
    border-radius: 100px;
    margin-bottom: 0.6rem;
  }
  .tag.confirmed { color: var(--green); background: rgba(52,229,168,0.12); border: 1px solid rgba(52,229,168,0.35); }
  .tag.pending { color: var(--text-dim); background: rgba(255,255,255,0.04); border: 1px solid var(--border); }
  .reel-card h4 {
    margin: 0 0 0.3rem;
    font-size: 0.92rem;
    font-family: var(--font-display);
    font-weight: 800;
    letter-spacing: 0.01em;
  }
  .reel-card .file {
    font-family: var(--font-mono);
    font-size: 0.68rem;
    color: var(--text-faint);
    word-break: break-word;
  }
  .reel-card .affordance { position: absolute; top: 0.7rem; right: 0.8rem; font-size: 0.8rem; }

  .id-note {
    margin-top: 1.4rem;
    font-size: 0.85rem;
    color: var(--text-dim);
    max-width: 74ch;
  }
  .id-note b { color: var(--text); }

  /* ---------- footer ---------- */
  footer {
    padding: 2.2rem 0 0;
    text-align: center;
    font-family: var(--font-mono);
    font-size: 0.72rem;
    color: var(--text-faint);
  }
  footer .rails {
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--magenta), var(--cyan), transparent);
    margin: 0 0 1.4rem;
    opacity: 0.5;
  }

  @media (prefers-reduced-motion: no-preference) {
    .brand-mark { animation: pulse 2.4s ease-in-out infinite; }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.45; }
  }

  /* ---------- modal ---------- */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: var(--overlay);
    backdrop-filter: blur(3px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
    z-index: 100;
  }
  .modal-backdrop[hidden] { display: none; }
  .modal {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 14px;
    max-width: 640px;
    width: 100%;
    max-height: min(82vh, 720px);
    display: flex;
    flex-direction: column;
    box-shadow: 0 30px 80px -20px rgba(0,0,0,0.65), 0 0 0 1px rgba(47,232,255,0.08);
  }
  @media (prefers-reduced-motion: no-preference) {
    .modal { animation: modalIn 0.18s ease; }
  }
  @keyframes modalIn {
    from { opacity: 0; transform: translateY(10px) scale(0.98); }
    to { opacity: 1; transform: none; }
  }
  .modal-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    padding: 1.3rem 1.4rem 1rem;
    border-bottom: 1px solid var(--border-soft);
  }
  .modal-eyebrow {
    font-family: var(--font-mono);
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--cyan-dim);
    margin: 0 0 0.35rem;
  }
  .modal-head h3 {
    margin: 0;
    font-family: var(--font-display);
    font-size: 1.2rem;
    font-weight: 800;
    text-wrap: balance;
  }
  .modal-close {
    all: unset;
    cursor: pointer;
    flex: none;
    width: 30px; height: 30px;
    display: flex; align-items: center; justify-content: center;
    border-radius: 8px;
    color: var(--text-dim);
    font-size: 0.9rem;
    font-family: var(--font-mono);
  }
  .modal-close:hover, .modal-close:focus-visible { background: var(--surface-3); color: var(--text); }
  .modal-body {
    padding: 1.2rem 1.4rem 1.6rem;
    overflow-y: auto;
    font-size: 0.87rem;
    color: var(--text-dim);
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  .modal-body h4 {
    margin: 1.1rem 0 0.6rem;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-faint);
    font-family: var(--font-mono);
  }
  .modal-body h4:first-child { margin-top: 0; }
  .modal-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 0.3rem;
  }
  .modal-lede { color: var(--text-dim); font-size: 0.88rem; line-height: 1.55; }
  .mlist { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.6rem; }
  .mlist li {
    display: flex;
    gap: 0.65rem;
    align-items: flex-start;
    font-size: 0.85rem;
    padding-bottom: 0.6rem;
    border-bottom: 1px solid var(--border-soft);
  }
  .mlist li:last-child { border-bottom: none; padding-bottom: 0; }
  .mlist .txt b { color: var(--text); }
  .mlist .txt span.note { display: block; font-size: 0.78rem; color: var(--text-dim); margin-top: 0.1rem; }
  .modal-hook {
    background: var(--surface);
    border: 1px solid var(--border-soft);
    border-radius: 8px;
    padding: 0.7rem 0.85rem;
    font-size: 0.82rem;
    color: var(--text-dim);
  }
  .modal-hook b { color: var(--gold); font-family: var(--font-mono); font-size: 0.76rem; }
  .modal-empty { font-size: 0.85rem; color: var(--text-faint); font-style: italic; }
</style>

<div class="topbar">
  <div class="topbar-inner">
    <div class="brand">
      <span class="brand-mark"></span>
      CENTRAL <small>cidade&nbsp;neon · execução</small>
    </div>
    <div class="topbar-meta">
      qui 24/09/2026 · dia 21 de 26 &nbsp;·&nbsp; <b>T-6</b> pra "Sabe Ontem?"
    </div>
  </div>
</div>

<div class="wrap">

  <section class="hero">
    <p class="eyebrow">Mentoria 2026-09-04 &middot; checklist de execução</p>
    <h1>De onde vem <em>até onde vamos</em>.</h1>
    <p class="lede">
      Painel interno do ciclo de lançamento — sem enfeite, só o estado real
      do que já foi feito, o que falta, e o que trava. Atualizado conforme
      avançamos juntos.
    </p>
    <div class="hint">⌗ tudo com "›" abre — clique nos cards pra ver o detalhe</div>

    <div class="cycle-row">
      <button class="card-btn cycle-cell" data-open="phase">
        <div class="k">Fase atual <span class="affordance">›</span></div>
        <div class="v">Aquecimento</div>
        <div class="sub">dia 7 de 12 · encerra 29/set</div>
      </button>
      <button class="card-btn cycle-cell" data-open="track:sabe-ontem">
        <div class="k">Sabe Ontem? <span class="affordance">›</span></div>
        <div class="v accent">30 SET</div>
        <div class="sub">lançamento · vol. 1 (adiado de 25/set)</div>
      </button>
      <button class="card-btn cycle-cell" data-open="track:nectar">
        <div class="k">Nectar <span class="affordance">›</span></div>
        <div class="v">02 OUT</div>
        <div class="sub">próxima faixa · vol. 1 (9)</div>
      </button>
      <button class="card-btn cycle-cell" data-open="checklist-all">
        <div class="k">Checklist geral <span class="affordance">›</span></div>
        <div class="v">14<span style="color:var(--text-faint)">/37</span></div>
        <div class="sub">38% concluído</div>
      </button>
    </div>
  </section>

  <section class="section">
    <div class="section-head">
      <h2><span class="rail"></span>Progresso por frente</h2>
      <span class="note">checklist.md · seções A–E</span>
    </div>
    <div class="prog-grid">

      <button class="card-btn liftable prog-card" data-open="section:A">
        <div class="letter-row"><span class="letter">A</span><span class="affordance">›</span></div>
        <h3>Dados &amp; instrumentação do jogo</h3>
        <div class="prog-bar-track"><div class="prog-bar-fill" style="width:86%"></div></div>
        <div class="prog-count"><span>prioridade máxima</span><b>12/14</b></div>
        <div class="prog-next">Próximo: <b>painel único</b> no PostHog + testar todos os eventos no navegador</div>
      </button>

      <button class="card-btn liftable prog-card" data-open="section:B">
        <div class="letter-row"><span class="letter">B</span><span class="affordance">›</span></div>
        <h3>Rotas de acesso &amp; conversão</h3>
        <div class="prog-bar-track"><div class="prog-bar-fill" style="width:0%"></div></div>
        <div class="prog-count"><span>não iniciado</span><b>0/5</b></div>
        <div class="prog-next">Próximo: <b>link único</b> por plataforma até o jogo/Spotify</div>
      </button>

      <button class="card-btn liftable prog-card" data-open="section:C">
        <div class="letter-row"><span class="letter">C</span><span class="affordance">›</span></div>
        <h3>Plataformas &amp; identidade</h3>
        <div class="prog-bar-track"><div class="prog-bar-fill" style="width:25%"></div></div>
        <div class="prog-count"><span>em curso</span><b>1/4</b></div>
        <div class="prog-next">Próximo: <b>aplicar nas plataformas</b> (destaques IG, bio/banner Spotify, banner YT)</div>
      </button>

      <button class="card-btn liftable prog-card" data-open="section:D">
        <div class="letter-row"><span class="letter">D</span><span class="affordance">›</span></div>
        <h3>Conteúdo &amp; linha editorial</h3>
        <div class="prog-bar-track"><div class="prog-bar-fill" style="width:13%"></div></div>
        <div class="prog-count"><span>atrasado — Fase 3 vencia 17/set</span><b>1/8</b></div>
        <div class="prog-next">Próximo: <b>fechar cortes verticais</b> restantes (Copo Americano, Sexta-Feira) + calendário diário</div>
      </button>

      <button class="card-btn liftable prog-card" data-open="section:E">
        <div class="letter-row"><span class="letter">E</span><span class="affordance">›</span></div>
        <h3>Monitoramento do lançamento</h3>
        <div class="prog-bar-track"><div class="prog-bar-fill" style="width:0%"></div></div>
        <div class="prog-count"><span>aguarda 30/set</span><b>0/6</b></div>
        <div class="prog-next">Só começa no dia do lançamento</div>
      </button>

    </div>
  </section>

  <section class="section">
    <div class="section-head">
      <h2><span class="rail"></span>Hoje &amp; achados</h2>
      <span class="note">últimas ações · 18–24/set</span>
    </div>

    <div class="split">
      <div class="card">
        <div class="findings-title" style="margin-bottom:1rem;">Jogo — /drive, últimos dias</div>
        <ul class="today-list">
          <li class="today-item">
            <span class="chk done">✓</span>
            <span class="label">PR #17 — painel do /drive redesenhado
              <span class="status">mergeada e no ar 23/set: painel alargado, rádio 1 fileira, porta-luvas removido, toca-discos realinhado</span>
            </span>
          </li>
          <li class="today-item">
            <span class="chk done">✓</span>
            <span class="label">Estática de sintonização machucando o ouvido
              <span class="status">causa achada (ruído branco sem filtro a 30% gain) — fix pronto na PR #18</span>
            </span>
          </li>
          <li class="today-item">
            <span class="chk doing">…</span>
            <span class="label">PR #18 — fix do áudio de sintonização
              <span class="status">aberta, typecheck limpo, esperando você mergear (github.com/lu2ca-art/cidade-neon-exp/pull/18)</span>
            </span>
          </li>
          <li class="today-item">
            <span class="chk todo"></span>
            <span class="label">Backlog visual/UX levantado 23/set
              <span class="status">clique fora da área do objeto, volante sem cara de volante, painel sem sensação de carro, dinâmica de liberação das rádios pouco clara</span>
            </span>
          </li>
        </ul>
      </div>

      <div class="card">
        <div class="findings-title">Baseline · 28-30 dias (levantado 6/set, não reatualizado)</div>
        <div class="stat-grid">
          <div class="stat">
            <div class="plat">Spotify</div>
            <div class="num">188 <span class="delta up">▲22%</span></div>
            <div class="sub2">streams · 54 ouvintes/mês</div>
          </div>
          <div class="stat">
            <div class="plat">Instagram</div>
            <div class="num">13.439</div>
            <div class="sub2">seguidores · 25.305 views</div>
          </div>
          <div class="stat">
            <div class="plat">YouTube</div>
            <div class="num">1.169 <span class="delta down">▼9%</span></div>
            <div class="sub2">inscritos · 4/9 vídeos do ciclo lançados</div>
          </div>
          <div class="stat">
            <div class="plat">lu2ca.art</div>
            <div class="num">0</div>
            <div class="sub2">Analytics ativado hoje</div>
          </div>
        </div>

        <div class="findings-title">O que precisa mudar</div>
        <div class="chip-row">
          <span class="chip warn">IG sem destaques</span>
          <span class="chip warn">Spotify sem bio</span>
          <span class="chip warn">Spotify sem banner</span>
          <span class="chip warn">Spotify sem link</span>
          <span class="chip block">TikTok não verificado</span>
          <span class="chip block">Seção B (rotas de acesso) 0/5 — não iniciada</span>
          <span class="chip block">PR #18 esperando merge</span>
          <span class="chip done">YouTube handle → @LU2CA</span>
          <span class="chip done">links unificados → lu2ca.art</span>
          <span class="chip done">CIDADE NEON MIDIA organizada — 9 faixas + galeria</span>
        </div>
      </div>
    </div>
  </section>

  <section class="section" style="border-bottom:none;">
    <div class="section-head">
      <h2><span class="rail"></span>Banco audiovisual — Vol. 1 "Sabe Ontem?"</h2>
      <span class="note">cortes.md · biblioteca completa agora em CIDADE NEON MIDIA/</span>
    </div>

    <div class="reel">
      <button class="card-btn liftable reel-card" data-open="reel:sabe-ontem">
        <span class="affordance">›</span>
        <span class="tag confirmed">pronto pra postar</span>
        <h4>Sabe Ontem?</h4>
        <div class="file">hook vertical + rascunho completo em CIDADE NEON MIDIA/Sabe Ontem/</div>
      </button>
      <button class="card-btn liftable reel-card" data-open="reel:chuva">
        <span class="affordance">›</span>
        <span class="tag confirmed">confirmado</span>
        <h4>CHUVA</h4>
        <div class="file">reapresentação · hook confirmado por transcrição</div>
      </button>
      <button class="card-btn liftable reel-card" data-open="reel:sextafeira">
        <span class="affordance">›</span>
        <span class="tag confirmed">confirmado</span>
        <h4>Sexta-Feira</h4>
        <div class="file">reapresentação · hook confirmado, falta corte vertical</div>
      </button>
      <button class="card-btn liftable reel-card" data-open="reel:ojala">
        <span class="affordance">›</span>
        <span class="tag confirmed">confirmado</span>
        <h4>Ojalá</h4>
        <div class="file">próxima faixa (16/out) · hook confirmado por transcrição</div>
      </button>
      <button class="card-btn liftable reel-card" data-open="reel:rollercoaster">
        <span class="affordance">›</span>
        <span class="tag pending">fora de escopo agora</span>
        <h4>Rollercoaster</h4>
        <div class="file">lança 13/nov — não é prioridade do ciclo "Sabe Ontem?"</div>
      </button>
    </div>

    <p class="id-note">
      Cidade Neon completo tem 22 faixas (Vol.1 + Vol.2), vendido no Untitled
      com acesso ilimitado a tudo — live, instrumental e o side album
      "Suburbio Xenom" inclusos. Vol.1 tem 9 faixas: 4 já lançadas ("músicas
      anteriores" pra reapresentação = CHUVA, Copo Americano, Dopamina,
      Sexta-Feira), "Sabe Ontem?" é a 5ª, "Nectar" é a 6ª (02/out).
      Calendário completo em
      <span style="color:var(--text-dim)">roadmap-cidade-neon.md</span>.
      Biblioteca de mídia (vídeos finais, verticais, stems, galeria de
      bastidores) organizada em
      <span style="color:var(--text-dim)">CIDADE NEON MIDIA/</span>
      — uma subpasta por faixa, arquivos "(nuvem)" apontam pro iCloud
      original quando não baixado localmente.
    </p>
  </section>

  <footer>
    <div class="rails"></div>
    Central Cidade Neon — atualizada conforme o trabalho avança &middot; última sync 24/09/2026 &middot;
    fonte: <span style="color:var(--text-dim)">~/repos/LU2CA/projetos/lancamentos/sabe-ontem-2026-09-30/</span>
  </footer>

</div>

<div class="modal-backdrop" id="modalBackdrop" hidden>
  <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
    <div class="modal-head">
      <div>
        <div class="modal-eyebrow" id="modalEyebrow"></div>
        <h3 id="modalTitle"></h3>
      </div>
      <button class="modal-close" id="modalClose" aria-label="Fechar">✕ ESC</button>
    </div>
    <div class="modal-body" id="modalBody"></div>
  </div>
</div>

<script>
(function () {
  var SECTIONS = {
    A: {
      title: "Dados & instrumentação do jogo",
      note: "prioridade máxima · 12/14",
      items: [
        ["done", "Definir qual ferramenta de analytics será usada", "PostHog EU Cloud (rationale em ~/vault/projetos/cidade-neon/analytics.md)"],
        ["done", "Integrar ao jogo o SDK ou APIs necessárias", "posthog-js no cidade-neon-exp, testado em produção local (eventos confirmados no dashboard)"],
        ["done", "Criar ID anônima de usuário e sessão", "distinct_id do PostHog + session_id próprio (sessionStorage), sem dados pessoais desnecessários"],
        ["done", "Definir mapa de eventos ANTES de programar", "18 eventos documentados antes de codar"],
        ["done", "Rastrear abertura, início/fim de sessão, duração, retorno", "14/set: game_opened/session_started/session_ended 1x por sessão real (bug de remount corrigido). Falta só timeout de idle"],
        ["done", "Rastrear entrada em áreas, caminhos, pontos descobertos, locais de abandono", "14/set: place_entered/place_exited automático via usePathname, abandonment no fechar/esconder aba"],
        ["done", "Rastrear interações: cliques, itens, missões, escolhas, recursos", "14/set: mission_started/mission_completed nas 3 missões reais (nectar/batida/guitarDriver)"],
        ["done", "Rastrear música por faixa: início, 25/50/75/100%, repetição, abandono", "14/set: music_progress (25/50/75/100), music_replayed, music_abandoned implementados"],
        ["done", "Rastrear cliques de saída para Spotify + outras", "14/set: external_link_click nos 3 pontos reais de saída (hub, missão, botão NECTAR)"],
        ["done", "Adicionar UTMs em todos os links externos", "14/set: withUtm() acrescenta utm_source/medium/campaign em todo link de saída instrumentado"],
        ["todo", "Painel único com acessos + perfil + localização + movimentação + interações + plays", "não iniciado (Sprint 3, dentro do PostHog)"],
        ["todo", "Testar todos eventos em homologação", "build/typecheck limpos; falta rodar de verdade no navegador e conferir no PostHog"],
        ["done", "Registrar baseline PRÉ-lançamento (24h/7d/21d)", "levantado 6/set, ver baseline.md"],
        ["done", "Revisar consentimento, aviso de privacidade e tratamento agregado (LGPD)", "banner de consentimento (aceitar tudo / só essencial) implementado e testado"]
      ]
    },
    B: {
      title: "Rotas de acesso & conversão",
      note: "não iniciado · 0/5",
      items: [
        ["todo", "Link do Spotify na bio + página de links", "enquanto tracking do jogo não valida"],
        ["todo", "Confirmar: música alcançada em NO MÁXIMO 2 cliques", ""],
        ["todo", "Links diferentes e rastreáveis pra jogo, Spotify, pré-save, outros", ""],
        ["todo", "Revisar todos os links em celular E computador antes de publicar", ""],
        ["todo", "Definir chamada principal de cada publicação", "entrar/ouvir/salvar/compartilhar/responder"]
      ]
    },
    C: {
      title: "Plataformas & identidade",
      note: "em curso · 1/4",
      items: [
        ["done", "Definir padrão visual do Cidade Neon Vol.1", "fechado 10/set: Outward + Facade como fontes de título, paleta azul/indigo+cyan+magenta+laranja — vale pras 9 faixas"],
        ["todo", "Atualizar fotos, capas, bios, descrições, destaques em TODAS as plataformas ativas", "auditoria feita, aplicação ainda não iniciada. TikTok não auditado (bloqueio anti-bot)"],
        ["todo", "Garantir coerência entre identidade do artista, capas das músicas e visual do jogo", "inconsistência encontrada: capa do single “Sexta-Feira” no Spotify não bate com a paleta azul do resto"],
        ["todo", "Fixar publicação-âncora explicando quem é LU2CA, o que é o jogo, onde ouvir", ""]
      ]
    },
    D: {
      title: "Conteúdo & linha editorial",
      note: "atrasado — Fase 3 vencia 17/set · 1/8",
      items: [
        ["done", "Mapear músicas anteriores que serão reapresentadas", "CHUVA, Copo Americano, Dopamina, Sexta-Feira — as 4 faixas do Vol.1 já lançadas antes de Sabe Ontem?"],
        ["todo", "Pelo menos 1 conteúdo de contexto/convite pra cada música anterior selecionada", ""],
        ["todo", "Finalizar cortes de “Sabe Ontem?” ANTES da fase de aquecimento (18/set)", ""],
        ["todo", "Calendário diário equilibrando os 5 pilares", ""],
        ["todo", "Chamada pra ouvir + link claro em todos os conteúdos de música", ""],
        ["todo", "Stories de apoio pra cada publicação principal", ""],
        ["todo", "Mostrar testes, erros, mudanças, aprendizados do desenvolvimento do jogo", ""],
        ["todo", "Abrir pontos objetivos de co-criação (sem transferir decisão artística)", ""]
      ]
    },
    E: {
      title: "Monitoramento do lançamento",
      note: "aguarda 30/set · 0/6",
      items: [
        ["todo", "Acompanhar primeiras horas de “Sabe Ontem?” em 30/set e registrar ocorrências", ""],
        ["todo", "Consolidar resultados 24h e 7d (jogo × Spotify × conteúdos)", ""],
        ["todo", "Identificar publicações que geraram + acessos, plays completos, retornos, compartilhamentos", ""],
        ["todo", "Aplicar aprendizados de “Sabe Ontem?” em “Nectar”", "próxima faixa do Vol.1, não um ciclo novo"],
        ["todo", "Repetir mesmo painel de análise em 02/out (“Nectar”)", "ver roadmap-cidade-neon.md pro calendário completo"],
        ["todo", "Registrar decisões, aprendizados, próximos testes do ciclo seguinte", ""]
      ]
    }
  };
  var SECTION_ORDER = ["A", "B", "C", "D", "E"];

  var REEL = {
    "sabe-ontem": { track: "Sabe Ontem?", file: "CIDADE NEON MIDIA/Sabe Ontem/", size: "hook vertical pronto + rascunho completo", tag: "pronto pra postar", note: "Hook já vertical (21s, sabe-ontem-hook.mp4) pronto pra Story/Destaque. Vertical completo é rascunho de crop automático — conferir enquadramento antes de publicar.", hook: "00:23–00:44 — grito “Luka!” repetido até “Entra! Clario, e precisa esconder”." },
    "chuva": { track: "CHUVA", file: "CIDADE NEON MIDIA/CHUVA/", size: "reapresentação · vertical pronto", tag: "confirmado", note: "Letra bate com a faixa CHUVA — confirmado. Vertical completo já existe.", hook: "00:30–00:49 — “Te vai de verão / Fica tudo bem, tudo bem / Se a chuva não vem / Deixa que eu te molho, amor...”, refrão completo e fechado, 19s." },
    "rollercoaster": { track: "Rollercoaster", file: "CIDADE NEON MIDIA/Rollercoaster/", size: "353 MB", tag: "fora de escopo agora", note: "Lança 13/nov — fora do ciclo ativo de \\"Sabe Ontem?\\". Sem vocal detectável na transcrição; quando entrar na janela de preparação, precisa audição manual.", hook: "Transcrição saiu vazia/alucinada (erro clássico do Whisper em trecho sem fala clara). Não dá pra sugerir corte por texto — precisa audição manual." },
    "sextafeira": { track: "Sexta-Feira", file: "CIDADE NEON MIDIA/Sexta-Feira/", size: "reapresentação · falta vertical", tag: "confirmado", note: "Letra bate com a faixa Sexta-Feira — confirmado. Falta produzir o corte vertical completo (só as outras 4 reapresentações + Sabe Ontem têm).", hook: "00:10–00:29 — “Move your body, uh uh / Hoje só acaba amanhã (...) Já falei que eu sou teu fã...”, 19s — o vídeo praticamente já é o hook." },
    "ojala": { track: "Ojalá", file: "CIDADE NEON MIDIA/Ojalá/", size: "próxima faixa · 16/out", tag: "confirmado", note: "Confiança alta na transcrição — verso fechado e coerente.", hook: "00:17–00:34 — “Quando eu te olhei, foi mó parada / Tu rala a você, minha namorada / Quer saber o que eu sei, falar pra casa / Vou te deixar mal acostumada”, 17s." }
  };

  var TRACKS = {
    "chuva-2024":       { name: "CHUVA", vol: 1, pos: "1 de 9", status: "lançada", date: null },
    "copo-americano":   { name: "Copo Americano", vol: 1, pos: "2 de 9", status: "lançada", date: null },
    "dopamina":         { name: "Dopamina", vol: 1, pos: "3 de 9", status: "lançada", date: null },
    "sexta-feira":      { name: "Sexta-Feira", vol: 1, pos: "4 de 9", status: "lançada", date: null },
    "sabe-ontem":       { name: "Sabe Ontem?", vol: 1, pos: "5 de 9", status: "ciclo ativo", date: "30/09/2026 (qua)", checklist: true, reel: "sabe-ontem" },
    "nectar":           { name: "Nectar", vol: 1, pos: "6 de 9", status: "a lançar", date: "02/10/2026 (sex)" },
    "ojala":            { name: "Ojalá", vol: 1, pos: "7 de 9", status: "a lançar", date: "16/10/2026 (sex)" },
    "swav":             { name: "Swav", vol: 1, pos: "8 de 9", status: "a lançar", date: "30/10/2026 (sex)" },
    "rollercoaster-t":  { name: "Rollercoaster", vol: 1, pos: "9 de 9", status: "a lançar", date: "13/11/2026 (sex)", reel: "rollercoaster" },
    "chuva-remix":      { name: "CHUVA (nova mix)", vol: 1, pos: "fecha o Vol.1", status: "a lançar — não anunciada como lançamento novo", date: "27/11/2026 (sex)", isrcNote: true },
    "naufrago":         { name: "náufrago", vol: 2, pos: "10 de 22", status: "a lançar", date: "01/01/2027 (sex)" },
    "dnovo":            { name: "DNOVO", vol: 2, pos: "11 de 22", status: "a lançar", date: "22/01/2027 (sex)" },
    "cliche":           { name: "cliche", vol: 2, pos: "12 de 22", status: "a lançar", date: "12/02/2027 (sex)" },
    "planeta-agua":     { name: "planeta agua", vol: 2, pos: "13 de 22", status: "a lançar", date: "05/03/2027 (sex)" },
    "stylist":          { name: "stylist", vol: 2, pos: "14 de 22", status: "a lançar", date: "26/03/2027 (sex)" },
    "hollywood":        { name: "hollywood", vol: 2, pos: "15 de 22", status: "a lançar", date: "16/04/2027 (sex)" },
    "sushi":            { name: "sushi", vol: 2, pos: "16 de 22", status: "a lançar", date: "07/05/2027 (sex)" },
    "bombay":           { name: "bombay", vol: 2, pos: "17 de 22", status: "a lançar", date: "28/05/2027 (sex)" },
    "oasis":            { name: "oasis", vol: 2, pos: "18 de 22", status: "a lançar", date: "18/06/2027 (sex)" },
    "tukehukabra":      { name: "tukehukabra", vol: 2, pos: "19 de 22", status: "a lançar", date: "09/07/2027 (sex)" },
    "qm-e-vc":          { name: "qm é vc?", vol: 2, pos: "20 de 22", status: "a lançar", date: "30/07/2027 (sex)" },
    "circo":            { name: "circo", vol: 2, pos: "21 de 22", status: "a lançar", date: "20/08/2027 (sex)" },
    "astronauta":       { name: "astronauta", vol: 2, pos: "22 de 22", status: "a lançar", date: "10/09/2027 (sex)" }
  };

  var backdrop = document.getElementById("modalBackdrop");
  var titleEl = document.getElementById("modalTitle");
  var eyebrowEl = document.getElementById("modalEyebrow");
  var bodyEl = document.getElementById("modalBody");
  var lastFocused = null;

  function esc(s) { return s == null ? "" : String(s); }

  function chkHtml(state) {
    if (state === "done") return '<span class="chk done">✓</span>';
    return '<span class="chk todo"></span>';
  }

  function renderSectionBody(key) {
    var s = SECTIONS[key];
    var html = '<p class="modal-lede">' + esc(s.note) + '</p><ul class="mlist">';
    s.items.forEach(function (it) {
      html += '<li>' + chkHtml(it[0]) + '<span class="txt"><b>' + esc(it[1]) + '</b>' +
        (it[2] ? '<span class="note">' + esc(it[2]) + '</span>' : '') + '</span></li>';
    });
    html += '</ul>';
    return html;
  }

  function renderChecklistAll() {
    var html = '<p class="modal-lede">37 itens no total (checklist.md, seções A–E) · 14 concluídos · 38%.</p>';
    SECTION_ORDER.forEach(function (key) {
      var s = SECTIONS[key];
      html += '<h4>' + key + ' · ' + esc(s.title) + '</h4>' + renderSectionBody(key).replace(/^<p class="modal-lede">.*?<\\/p>/, '');
    });
    return html;
  }

  function renderReel(key) {
    var r = REEL[key];
    if (!r) return '<p class="modal-empty">Sem banco visual mapeado ainda pra essa faixa.</p>';
    var html = '<div class="modal-meta"><span class="chip ' + (r.tag === 'confirmado' ? 'done' : 'warn') + '" style="text-decoration:none;opacity:1;">' + esc(r.tag) + '</span></div>';
    html += '<p class="modal-lede"><b style="color:var(--text)">' + esc(r.file) + '</b> · ' + esc(r.size) + '</p>';
    html += '<p class="modal-lede">' + esc(r.note) + '</p>';
    html += '<h4>Sugestão de corte (transcrição Whisper)</h4>';
    html += '<div class="modal-hook">' + esc(r.hook) + '</div>';
    return html;
  }

  function renderTrack(key) {
    var t = TRACKS[key];
    var html = '<div class="modal-meta">';
    html += '<span class="chip ' + (t.status.indexOf('lançada') === 0 ? 'done' : (t.status.indexOf('ativo') >= 0 ? 'warn' : 'block')) + '" style="text-decoration:none;opacity:1;">' + esc(t.status) + '</span>';
    html += '<span class="chip" style="color:var(--text-dim);border-color:var(--border);background:transparent;">Vol.' + t.vol + ' · faixa ' + esc(t.pos) + '</span>';
    html += '</div>';
    if (t.date) html += '<p class="modal-lede">Data: <b style="color:var(--text)">' + esc(t.date) + '</b></p>';

    if (t.isrcNote) {
      html += '<h4>Pendência</h4><p class="modal-lede">Localizar o ISRC original do CHUVA (2024) na distribuidora que fez o lançamento na época. Na Ditto: criar release novo com a nova mix, colar o <b style="color:var(--text)">mesmo ISRC original</b>, publicar, esperar ficar no ar, só então apagar o release de 2024 — preserva stream count e posição em playlists.</p>';
    }

    if (t.checklist) {
      html += '<h4>Checklist ativa (37 itens, seções A–E)</h4>';
      html += renderChecklistAll().replace(/^<p class="modal-lede">.*?<\\/p>/, '');
    } else if (t.vol === 1) {
      html += '<h4>Status</h4><p class="modal-lede">Ainda não entrou na janela de preparação. Pasta de ciclo detalhado é criada perto de T-21 do lançamento — ver roadmap-cidade-neon.md.</p>';
    } else {
      html += '<h4>Status</h4><p class="modal-lede">Vol.2 ainda não iniciado. Áudio e audiovisual (Slimbi) já existem pro álbum completo, mas o banco desta faixa específica ainda não foi organizado no vault.</p>';
    }

    if (t.reel) {
      html += '<h4>Banco visual</h4>' + renderReel(t.reel);
    }
    return html;
  }

  function renderPhase() {
    var html = '<p class="modal-lede">Fase 4 — Aquecimento (18–29 set, esticada +5 dias pelo adiamento do lançamento), hoje é dia 21 de 26 da janela total (4/set → 30/set, T-6).</p>';
    html += '<ul class="mlist">' +
      '<li>' + chkHtml('todo') + '<span class="txt"><b>Publicação diária equilibrando os 5 pilares</b><span class="note">calendário ainda não fechado — seção D do checklist</span></span></li>' +
      '<li>' + chkHtml('todo') + '<span class="txt"><b>Intensificar narrativa progressivamente, mostrar bastidores</b><span class="note">material real já existe: PR #17/#18 do jogo, redesign do cockpit</span></span></li>' +
      '<li>' + chkHtml('todo') + '<span class="txt"><b>Ativar comunidade + reforçar data e acesso</b><span class="note">seção B (rotas de acesso) ainda 0/5</span></span></li>' +
      '</ul>';
    html += '<h4>Atrás do previsto</h4><p class="modal-lede">Fase 3 "Banco de conteúdo" devia ter fechado em 17/set — cortes verticais de Copo Americano e Sexta-Feira ainda faltam, calendário diário não existe. Estamos publicando (ou deveríamos estar) sem esse banco 100% fechado.</p>';
    html += '<h4>Depois</h4><p class="modal-lede">29/set: fim do Aquecimento. 30/set: lançamento de "Sabe Ontem?". 02/out: lançamento de "Nectar" (janela de 2 dias, tratado como extensão deste ciclo).</p>';
    return html;
  }

  function openModal(spec) {
    var parts = spec.split(":");
    var kind = parts[0], key = parts[1];
    var eyebrow = "", title = "", body = "";

    if (kind === "section") {
      eyebrow = "Checklist · seção " + key;
      title = SECTIONS[key].title;
      body = renderSectionBody(key);
    } else if (kind === "checklist-all") {
      eyebrow = "checklist.md · seções A–E";
      title = "Checklist geral";
      body = renderChecklistAll();
    } else if (kind === "track") {
      eyebrow = "Cidade Neon · faixa";
      title = TRACKS[key].name;
      body = renderTrack(key);
    } else if (kind === "reel") {
      eyebrow = "Banco audiovisual · cortes.md";
      title = REEL[key].track;
      body = renderReel(key);
    } else if (kind === "phase") {
      eyebrow = "cronograma.md";
      title = "Fase atual — Padronização";
      body = renderPhase();
    }

    eyebrowEl.textContent = eyebrow;
    titleEl.textContent = title;
    bodyEl.innerHTML = body;
    lastFocused = document.activeElement;
    backdrop.hidden = false;
    document.getElementById("modalClose").focus();
    document.addEventListener("keydown", onKeydown);
  }

  function closeModal() {
    backdrop.hidden = true;
    document.removeEventListener("keydown", onKeydown);
    if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
  }

  function onKeydown(e) {
    if (e.key === "Escape") closeModal();
  }

  document.addEventListener("click", function (e) {
    var trigger = e.target.closest("[data-open]");
    if (trigger) { openModal(trigger.getAttribute("data-open")); return; }
    if (e.target === backdrop) closeModal();
  });
  document.getElementById("modalClose").addEventListener("click", closeModal);
})();
</script>

</body></html>
`
