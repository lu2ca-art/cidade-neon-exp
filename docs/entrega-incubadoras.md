# A entrega e as incubadoras (16/11) — RASCUNHO

Fonte: `projetos/cidade-neon/episodios.md`, "A entrega e as incubadoras" (palavras do dono).
Só o caminho da entrega. O final (todos capturados, a sala de controle do Núcleo) ainda é decisão do dono.

## Quem não pode ser entregue (16/11, decisão do dono)
O **LU2CA** e a **D-Bee** nunca podem ser entregues: o LU2CA está sempre fazendo o show e a
D-Bee é a guia da missão do jogo. Os outros podem. Fica em `NUNCA_ENTREGAR` (`disco/entrega.ts`);
`podeEntregar` devolve false pros dois e o cartão não mostra o botão "entregar".

## A recompensa e a entrega única (16/11, decisões do dono)
- **Bem mais alta, pra tentar de verdade:** entre 1.000 e 2.000 Água$ conforme o personagem
  (RASCUNHO, `ENTREGA_CFG.agua`). É o MESMO número que o cartão mostra (`cartoes.ts`, `entrega`
  do cartão): não existe mais um valor separado em `CARTOES`.
- **Depois do resgate, não dá pra entregar de novo:** o botão some pra aquele personagem.
  `podeEntregar` olha `entreguesPagos` (toda entrega já feita fica ali, inclusive no save de antes).

## O cartão (ligado em 16/11)
No lugar `l-cartao-escolha` do `MapaCartoes.tsx`: **liberar** (o caminho de aceitar a missão:
marca no mapa e chegar lá começa) e **entregar · N Água$**, que pede um segundo toque
("entregar X? sim"), fecha o mapa e chama `pedirEntrega(missao)`.

## Arquivos
- `app/linha/disco/entrega.ts`: as regras puras e os números (`ENTREGA_CFG`, RASCUNHO): quem dá pra entregar, a grana, o save, a quebra das incubadoras e o pedido (o cartão chama).
- `app/linha/disco/entregaTextos.ts`: as falas (RASCUNHO; a da D-Bee sai das palavras do dono).
- `app/linha/disco/EntregaCena.tsx` + `entrega.css`: a cena (o hack e o corredor).
- `page.tsx`: ouve o pedido, muda o save, monta a cena (next/dynamic) e pausa a estrada.

## Como o cartão liga (frente do mapa e dos cartões)
```ts
import { pedirEntrega, podeEntregar, entregue, ENTREGA_CFG } from "./entrega"
// o botão "entregar" do cartão:
onClick={() => pedirEntrega(missaoId)}
// mostrar ou não o botão / o valor:
podeEntregar(historiaDe(save), missaoId)   // false: não é entregável ou já está entregue
ENTREGA_CFG.agua[missaoId]                 // a recompensa (Água$)
```
Só isso: o page.tsx paga, marca "entregue" no save e abre o hack. Se o cartão estiver
dentro do holo/mapa, feche o painel junto (a cena abre por cima de tudo, z-index 60).

## O save (sem quebrar o antigo)
- `disco.entregues?: MissaoId[]`: entregue e ainda nas incubadoras. Enquanto está aqui,
  a missão sai da sequência (`missaoLiberada` em episodios.ts devolve false).
- `disco.entreguesPagos?: MissaoId[]`: a grana da entrega paga (não paga duas vezes; `pagaUmaVez`).
- Achou no corredor: sai de `entregues` (`recuperar`) e segue nos episódios.
- Recarregou no meio do corredor: ao voltar pra estrada, o corredor abre de novo (sem o hack).

## A cena
1. **O hack** (DOM): as 15 propagandas do Núcleo (a arte dos outdoors, `outdoorsArte.ts`) pintadas uma vez
   e aparecendo cada vez mais rápido (900 → 90 ms) com um blip; a camada delas borra e treme (a "visão
   turva", só CSS `filter` nela, sem pós-processamento), as bordas escurecem e tudo apaga.
2. **O corredor**: Canvas próprio, a cápsula do `terror.glb` (o T47; `lerGlb` exportado do PocoTerror),
   12 incubadoras em duas fileiras, névoa curta, tudo `MeshBasicMaterial`, uma InstancedMesh por peça.
   Escuro com o drone grave (o mesmo do T47) por 3,2 s, a luz volta aos trancos, e chega o chamado da D-Bee.
   Tocar quebra (o vidro some, o som de vidro, a câmera dá um tranco) e a câmera anda pra próxima fileira.
   Se o glb falhar, as formas simples de antes.

## Reaproveitar pra muitos amigos (o final)
`pedirIncubadoras(["drew", "ella", ...])` abre o corredor direto com todos. A regra
(`novaQuebra`/`quebrarCapsula`) espalha os amigos pelas quebras e põe o último na última
incubadora: a pessoa quebra todas e acha um por um. `onAchou` é chamado pra cada um.
Pro final: o save dos capturados e a saída pelo elevador do fim da sala ficam na outra frente.

## Teste
Mesa: `entrega.hack` (entrega a Ella ao entrar) e `entrega.incubadoras` (direto no corredor).
