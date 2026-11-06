# Revisão 7 (06/11): integração dos 6 .glb novos

Escopo: instrumentos, lugares-chao, terror, elevadores, mundo-depois, moto (git diff c1970f0..HEAD).

## O que já estava certo
- Todo `useGLTF` novo estava dentro de um `<Suspense>` local (a suspensão não sobe pro Canvas) e dentro de um error boundary local (404 não derruba a cena).
- meshopt: `useGLTF(url)` do drei 10.7 já liga draco e meshopt por padrão; os novos usam a mesma chamada de InteriorModelado/Suburbio. Nada a configurar.
- Caminho: `/models/x.glb` absoluto, igual aos outros; o projeto não usa basePath/assetPrefix.
- Cópias em Float32 (`emFloat`/`geoDe`): o cache do drei nunca é alterado nem descartado por quem copia; bounding: `computeBoundingSphere` nas moto/mundo-depois, e nas mescladas o three calcula no primeiro render; as instâncias que andam no shader têm `frustumCulled = false`.
- Preload: instrumentos já pré-carrega (o módulo só entra com o chunk do Interior). Os demais carregam só quando montam (lugares-chao no `<Perto>`, mundo-depois só depois do final, terror só no poço, moto só ao escolher a moto) e têm o procedural como reserva: sem preload, a carga inicial não pesa.

## Corrigido
1. Cinco cópias de `SeFalhar` (uma por arquivo) engoliam o erro em silêncio (um nó faltando no glb ficaria invisível). Agora um helper único `ModeloSeguro` (`app/linha/estrada/Seguro.tsx`) = `Seguro` (log no console + PostHog) + `Suspense` local, com `reserva` (procedural) enquanto baixa e se falhar. Usado nos 6 modelos.
2. mundo-depois: enquanto baixava, mostrava nada (fallback null); agora mostra o procedural, como os outros.
3. elevadores: continua sem procedural (some e volta), mas agora com log do erro (`enquanto={null}`).
4. lugares-chao: as geometrias mescladas (sólido, brilho, letreiros) nunca eram soltas ao desmontar o `<Perto>`; agora `dispose` no cleanup (cache do drei intocado).

## Observações (sem mudança)
- PocoTerror faz `useGLTF.clear(URL_TERROR)` ao sair: ok porque nenhum outro componente usa terror.glb; se passar a usar, tirar.
- Moto: não há preload de propósito; o fallback procedural cobre os ~125 KB. Se quiser, chamar `useGLTF.preload("/models/moto.glb")` ao concluir a missão dos túneis (não no módulo: Pilotos é importado pelo chunk da Corrida).
