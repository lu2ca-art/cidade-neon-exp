# Revisão 9 (06/11): integração dos interiores modelados no Blender

Escopo: `git diff 06bdb7e..HEAD` (postos, elevador antigo, balada, shows, topo, quarto, beco, escondido, posto-loja, cartões da Mesa). Sem build/medição; só `tsc` (0).

## Corrigido
1. **Elevador antigo x PocoTerror (mesmo terror.glb).** Os dois chamavam `useGLTF.clear(URL_TERROR)` ao sair. Na troca de uma tela pela outra o cleanup de quem sai roda antes do efeito de quem entra, então o cache era limpo com o glb ainda em uso; qualquer re-render do `MundoGlb` suspendia de novo (reserva piscando no meio do passeio e o glb baixando outra vez; em dev o StrictMode faz isso na montagem). Agora `estrada/glbUso.ts` (`segurarGlb`) conta quem usa e só limpa quando ninguém segura, 2,5 s depois. Usado em `Elevador.tsx` e `PocoTerror.tsx`.
2. **Elevador, por quadro:** `Color.set("#ff2a2a")`/`set(VERMELHO)` (lê o texto todo quadro, 2x) trocado por cores pré-criadas + `copy`.

## Conferido, sem mudança
- **Preload não pesa a abertura:** os `useGLTF.preload` dos módulos das salas (Balada, Shows, Topo, Quarto, Beco, Escondido, Posto, Bar) moram em chunks `import()` do `interior/registro.ts`. Só rodam quando `precarregarSala`/`cenaDe` pede (missão aponta pro lugar, ocioso) ou a sala abre. O posto de rua (`Bombas.tsx`) não tem preload: baixa os 40 KB ao montar, com a reserva.
- **ModeloSeguro:** todos os pontos com glb novo usam (Bombas, Balada, Shows, Topo, Quarto, Beco, Escondido, Posto, Elevador).
- **Materiais por render:** criados uma vez (módulo ou `useMemo`); `SalaGlb`, `matsBalada`, `matsShows`, `mats` das Bombas são globais e vivem a sessão (de propósito; não dá `dispose`). Os `InstancedMesh` e materiais do Elevador são descartados no unmount.
- **Piso de LED (Balada):** `led.color.setScalar` por quadro, sem alocação. Shows: neon/luz só mexem num `useEffect` quando o apagão muda.
- **`useGLTF.clear`:** só o terror.glb é limpo; os glbs das salas ficam no cache (~100-190 KB cada) e geometrias do cache não sofrem dispose pelo R3F.
- **Mesa/VISITAS:** `vitrine.beco/escondido/posto/terraco/balada/shows/drewboy`, `elevador` e `livre` estão em `PARTES_TESTE`; as visitas passam por `visitarSala` → `cenaDe(lugar)` e existem cenas pra todos os lugares (beco, escondido, posto, topo, balada, casa-shows, casa-drewboy). "Há três postos" confere com `postos.ts`.

## Pendências pequenas (não mexidas)
- `matsBalada`, `matsShows` e `modelo.tsx` repetem a mesma fábrica de materiais (só mudam a opacidade do vidro e o `led`); dá pra unificar depois.
- `Topo.tsx` (`color.set` por quadro) e `Poste` em `Shows.tsx` são de antes; mesma troca por cores pré-criadas se pesar.
- `Escondido.tsx` `Planta`: `new THREE.Color` por render (re-renderiza só quando `k` muda).
