import { dataCurta, linkDa, mesaOrdenada } from "./mesa"

// A mesa de testes: um cartão por coisa pronta pra testar (os dados em mesa.ts).
// Sem JavaScript no navegador: são só links.
export function Mesa() {
  const cartoes = mesaOrdenada()
  return (
    <section className="ms-mesa" aria-label="pra testar">
      {cartoes.length === 0 && <p className="ms-vazio">nada pra testar agora.</p>}
      {cartoes.map((c) => (
        <article key={c.parte} className="ms-cartao" data-parte={c.parte}>
          <div className="ms-topo">
            <time dateTime={c.data}>{dataCurta(c.data)}</time>
            {c.tarefa && <span>{c.tarefa}</span>}
          </div>
          <h2>{c.nome}</h2>
          <p className="ms-olhar">{c.olhar}</p>
          {c.perguntas.length > 0 && (
            <div className="ms-perguntas">
              <b>pra você responder</b>
              <ul>{c.perguntas.map((p) => <li key={p}>{p}</li>)}</ul>
            </div>
          )}
          <a className="ms-abrir" href={linkDa(c.parte)}>Abrir</a>
          {c.mais && c.mais.length > 0 && (
            <div className="ms-mais">
              {c.mais.map((m) => <a key={m.parte} href={linkDa(m.parte)}>{m.nome} →</a>)}
            </div>
          )}
        </article>
      ))}
    </section>
  )
}
