# Revisão 6 (06/11): ganchos D-Bee/Xenom, visitas, jogador novo, elevadores, elevador de terror

Corrigido:
1. Dois WebGL ao mesmo tempo: o Canvas dos túneis só era pausado (frameloop never) enquanto o do terror rodava. Agora é desmontado (Trincheiras.tsx); o terror sempre termina subindo, nunca volta.
2. Kombi no lugar errado: `limparSubida` só limpava `foraEmCima` se houvesse subida pendente. Descer pelo elevador, subir pela porta, descer pela porta e subir pelo elevador punha a Kombi no ponto velho da torre. Agora limpa sempre.
3. "?" sem texto: o botão "descer · túneis" tinha data-info="elevador" sem entrada em INFO (Holo.tsx). Adicionada.
4. Terror preso: se o iOS perdesse o contexto WebGL, o relógio do useFrame parava e só o toque saía. Agora há um tempo-limite (duração + 4 s).
5. Save: o "já viu o terror" fica em chave própria; "apagar" (estado.ts) não a removia, então um jogo novo pulava a 1ª subida obrigatória. Agora remove.
6. Botões sobrepostos: o botão do elevador nos túneis (38% + 34px) encostava no texto de 2 linhas da torre; desceu pra 38% + 48px.

Conferido, sem mudança: abafar(true/false) do terror é balanceado (efeito com cleanup); descartar() libera geometrias, materiais e instâncias; descer/violão/entrar não se sobrepõem (304px/bottom 150px; "entrar" não aparece na torre da ponta); partes de teste elevador.subir/terror estão em PARTES_TESTE e abrem o que o cartão diz (torre.ponta abre com cadeado, como o cartão).

Não corrigido (decisão de design): subindo pela porta depois de descer pelo elevador, a Kombi nasce na boca, não na torre onde ficou. O "já viu" do terror continua fora do save.json (por aba/teste via chaveSave).
