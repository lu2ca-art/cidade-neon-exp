// (09/11) As peças do brechó (aba roupas da loja): cada uma desenhada como peça
// usada de verdade, em vez do contorno de antes. Corte de época, costura, tecido,
// etiqueta, desgaste. Só SVG parado: nada por quadro, sem filtro e sem imagem.
// Roupa real da Bee Shop entra depois; aqui não tem marca nem foto.
// RASCUNHO: os números das etiquetas (tamanho) não são regra de jogo.

import { useId, type ReactNode } from "react"

// a etiqueta de papel do brechó, amarrada na peça
function Etiqueta({ x, y, giro, texto, de }: { x: number; y: number; giro: number; texto: string; de: [number, number] }) {
  return (
    <g>
      <path d={`M${de[0]} ${de[1]}Q${(de[0] + x) / 2 + 5} ${(de[1] + y) / 2 + 12} ${x} ${y}`} fill="none" stroke="#c9bb9c" strokeWidth=".9" />
      <g transform={`translate(${x} ${y}) rotate(${giro})`}>
        <path d="M-5 -3L5 -3 12 4V27H-12V4Z" fill="#c9a877" stroke="#7d6240" strokeWidth=".8" />
        <circle cy="3" r="1.9" fill="#1a141c" stroke="#7d6240" strokeWidth=".6" />
        <text y="20" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontSize="12" fontWeight="700" fill="#3a2a1a">{texto}</text>
      </g>
    </g>
  )
}

// o cabide de madeira, com o gancho de arame
function Cabide() {
  return (
    <g>
      <path d="M100 37V25C100 18 110 18 110 24" fill="none" stroke="#a7a9ad" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M100 36C86 40 66 46 46 56L49 60C68 53 86 47 100 44 114 47 132 53 151 60L154 56C134 46 114 40 100 36Z" fill="#7b5230" stroke="#3f2815" strokeWidth=".8" />
      <path d="M58 52C72 46 86 42 100 39" fill="none" stroke="#a97d4f" strokeWidth=".9" />
    </g>
  )
}

// o fundo: a parede escura do brechó, com a luz caindo no meio
function Fundo({ u, a, b }: { u: string; a: string; b: string }) {
  return (
    <>
      <defs>
        <radialGradient id={`${u}f`} cx=".5" cy=".42" r=".78">
          <stop offset="0" stopColor={a} />
          <stop offset="1" stopColor={b} />
        </radialGradient>
      </defs>
      <rect width="200" height="200" rx="20" fill={`url(#${u}f)`} />
    </>
  )
}

// BONÉ: o de espuma e tela dos anos 80, aba reta, queimado de sol
function Bone({ u }: { u: string }) {
  return (
    <>
      <Fundo u={u} a="#3a2b33" b="#15101a" />
      <defs>
        <pattern id={`${u}t`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(38)">
          <rect width="6" height="6" fill="#8e3f62" />
          <circle cx="3" cy="3" r="1.55" fill="#2b1420" />
        </pattern>
        <linearGradient id={`${u}e`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e6d9ba" />
          <stop offset="1" stopColor="#bda77e" />
        </linearGradient>
      </defs>
      {/* a tela de trás, a tira do ajuste */}
      <path d="M96 48C134 46 165 76 168 128C145 136 118 137 96 136Z" fill={`url(#${u}t)`} stroke="#46202f" strokeWidth="1.4" />
      <path d="M131 58C146 76 152 104 150 134" fill="none" stroke="#6d3049" strokeWidth="2" />
      <path d="M134 135C146 134 158 132 168 127L169 137C158 143 146 144 134 145Z" fill="#7a3553" stroke="#3b1a29" strokeWidth="1" />
      {[0, 1, 2, 3].map((k) => <circle key={k} cx={141 + k * 7} cy={139 - k * 1.6} r="1.5" fill="#d8d0bf" />)}
      {/* a frente de espuma, amarelada */}
      <path d="M96 48C60 48 38 82 37 126C58 134 78 137 96 136Z" fill={`url(#${u}e)`} stroke="#6d5a3c" strokeWidth="1.4" />
      <path d="M96 48C88 74 86 106 96 136" fill="none" stroke="#a8946d" strokeWidth="1.5" />
      <path d="M39 122C58 130 78 133 96 132" fill="none" stroke="#7a6545" strokeWidth="1" strokeDasharray="3 2" />
      {/* a mancha de suor, a sujeira da testa */}
      <path d="M42 118C60 126 78 129 92 128C92 122 78 120 62 116 52 113 45 113 42 118Z" fill="#8c7145" opacity=".42" />
      <ellipse cx="82" cy="72" rx="9" ry="6" fill="#a58f65" opacity=".28" />
      {/* o brasão bordado (sem marca): sol e montanha */}
      <g transform="translate(66 92)">
        <ellipse rx="23" ry="19" fill="#23303f" stroke="#c98a31" strokeWidth="2.4" />
        <ellipse rx="19.5" ry="15.5" fill="none" stroke="#e6d9ba" strokeWidth=".8" strokeDasharray="2 1.6" />
        <circle cy="-2" r="7.5" fill="#d68a2e" />
        <path d="M-17 9L-6 -3 1 5 8 -1 17 9C8 15-8 15-17 9Z" fill="#a84a35" />
        <path d="M-7 3H7M-10 7H10" stroke="#e6d9ba" strokeWidth="1" />
      </g>
      {/* o botão de cima */}
      <ellipse cx="96" cy="47" rx="6" ry="2.8" fill="#7a3553" stroke="#3b1a29" />
      {/* a ABA RETA, com os cordões de costura e a beira gasta */}
      <path d="M38 124L7 151C6 154 8 156 11 156L78 164C83 164 86 162 89 159L100 136C80 138 58 134 38 124Z" fill="#8a3e60" stroke="#3b1a29" strokeWidth="1.4" />
      <path d="M36 133L15 151 79 159 93 140" fill="none" stroke="#caa9b4" strokeWidth=".9" strokeDasharray="3.2 2" />
      <path d="M33 140L24 150 75 155 86 144" fill="none" stroke="#caa9b4" strokeWidth=".9" strokeDasharray="3.2 2" />
      <path d="M8 152L11 156 78 164" fill="none" stroke="#d6b4bf" strokeWidth="1.5" strokeDasharray="6 3 1 3 9 2" />
      <path d="M46 138C60 145 76 147 84 144L80 152C66 153 52 148 46 138Z" fill="#b76b8a" opacity=".35" />
      <Etiqueta x={168} y={156} giro={8} texto="U" de={[158, 138]} />
    </>
  )
}

// ÓCULOS: a armação grande de acetato, casco de tartaruga, lente degradê dos anos 70
function Oculos({ u }: { u: string }) {
  const lente = "M0 0C-2 -11 8 -19 22 -20C36 -21 54 -19 60 -11C66 -2 62 22 50 32C39 41 19 41 8 30C2 24 1 12 0 0Z"
  return (
    <>
      <Fundo u={u} a="#2f3d42" b="#101419" />
      <defs>
        <pattern id={`${u}c`} width="30" height="15" patternUnits="userSpaceOnUse" patternTransform="rotate(28)">
          <rect width="30" height="15" fill="#8a5424" />
          <path d="M0 3C6 0 15 1 18 4 13 8 4 7 0 3Z" fill="#2f1a0c" opacity=".82" />
          <path d="M14 11C20 8 27 9 30 12 24 15 17 15 14 11Z" fill="#3f2411" opacity=".75" />
          <path d="M20 2C24 1 28 2 29 4 25 6 21 5 20 2Z" fill="#c98a3f" opacity=".55" />
          <path d="M2 11C5 10 9 11 10 13 7 15 3 14 2 11Z" fill="#b2742f" opacity=".5" />
        </pattern>
        <linearGradient id={`${u}l`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#123c46" />
          <stop offset=".55" stopColor="#2f7380" />
          <stop offset="1" stopColor="#d9a35a" />
        </linearGradient>
      </defs>
      {/* o pano onde os óculos estão, com a beira desfiada */}
      <path d="M12 128L188 122 192 176 8 180Z" fill="#6d5843" stroke="#3a2d21" />
      <path d="M12 136L188 130M10 172L190 168" stroke="#927a5d" strokeDasharray="4 3" />
      {/* as hastes dobradas, atrás */}
      <path d="M24 108C60 150 130 152 176 106" fill="none" stroke="#3e2410" strokeWidth="7" strokeLinecap="round" />
      <path d="M24 108C60 150 130 152 176 106" fill="none" stroke={`url(#${u}c)`} strokeWidth="5" strokeLinecap="round" />
      <path d="M100 150V146" stroke="#d6c493" strokeWidth="1" />
      {/* a armação */}
      <path d="M12 78C10 58 30 48 58 46C78 45 92 52 100 62C108 52 122 45 142 46C170 48 190 58 188 78C188 104 178 130 150 137C124 143 108 124 102 98 100 94 100 94 98 98 92 124 76 143 50 137 22 130 12 104 12 78Z" fill={`url(#${u}c)`} stroke="#2a170b" strokeWidth="1.8" />
      <path d="M16 74C20 56 42 51 60 50" fill="none" stroke="#e5b873" strokeWidth="1.6" opacity=".7" />
      <path d="M140 50C160 51 178 56 184 74" fill="none" stroke="#e5b873" strokeWidth="1.6" opacity=".5" />
      {/* as lentes */}
      <path d={lente} transform="translate(22 78)" fill={`url(#${u}l)`} stroke="#23130a" strokeWidth="1.4" />
      <path d={lente} transform="translate(178 78) scale(-1 1)" fill={`url(#${u}l)`} stroke="#23130a" strokeWidth="1.4" />
      {/* o reflexo e os riscos de uso */}
      <path d="M36 66L54 62 44 102 28 100ZM60 60L66 60 54 106 49 104Z" fill="#dff4f2" opacity=".2" />
      <path d="M138 64L150 62 142 102 130 102Z" fill="#dff4f2" opacity=".16" />
      <path d="M34 96L58 88M42 112L64 100M128 72L150 86M144 110L158 96M130 94L140 100" stroke="#e9f2ee" strokeWidth=".6" opacity=".55" />
      {/* a ponte com buraco de fechadura, os rebites */}
      <path d="M92 70C96 64 104 64 108 70" fill="none" stroke="#2a170b" strokeWidth="1.5" />
      {[[22, 64], [178, 64]].map(([x, y]) => <path key={x} d={`M${x - 5} ${y}L${x} ${y - 3} ${x + 5} ${y} ${x} ${y + 3}Z`} fill="#c8ad6b" stroke="#6c5525" strokeWidth=".6" />)}
      {/* lascas na armação */}
      <path d="M12 86L16 92 13 96Z" fill="#d6a56a" />
      <Etiqueta x={170} y={148} giro={-8} texto="M" de={[174, 116]} />
    </>
  )
}

// CAMISA DA 222: a de gola e punho contrastantes, malha fina, estampa rachada
function Camisa({ u }: { u: string }) {
  const dois = "M0 12C0 -3 29 -3 29 13C29 27 6 30 1 46H31"
  const num = (x: number) => (
    <g key={x} transform={`translate(${x} 98)`}>
      <path d={dois} fill="none" stroke="#2c2026" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
      <path d={dois} fill="none" stroke="#c35a2a" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      <path d={dois} fill="none" stroke="#e0a13a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" transform="translate(-1 -1)" />
    </g>
  )
  return (
    <>
      <Fundo u={u} a="#3e3027" b="#151014" />
      <defs>
        <linearGradient id={`${u}m`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e4d8bc" />
          <stop offset=".6" stopColor="#d9c8a4" />
          <stop offset="1" stopColor="#c7b48e" />
        </linearGradient>
      </defs>
      <Cabide />
      {/* o corpo e as mangas, de corte reto */}
      <path d="M72 42L33 58 15 100 39 112 50 92 50 182H150V92L161 112 185 100 167 58 128 42C120 56 80 56 72 42Z" fill={`url(#${u}m)`} stroke="#6f5e41" strokeWidth="1.5" strokeLinejoin="round" />
      {/* o fundo do decote, a etiqueta de dentro */}
      <path d="M78 41C86 54 114 54 122 41C114 47 86 47 78 41Z" fill="#3b2f26" />
      <rect x="93" y="44" width="14" height="8" fill="#efe7d4" stroke="#8d7c5c" strokeWidth=".5" />
      <text x="100" y="50.5" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="6" fontWeight="700" fill="#493a2a">M</text>
      {/* gola e punhos na cor de contraste */}
      <path d="M72 42C80 56 120 56 128 42L132 44C124 62 76 62 68 44Z" fill="#c78c2f" stroke="#7d5719" strokeWidth=".8" />
      <path d="M15 100L39 112 42 105 19 93Z" fill="#c78c2f" stroke="#7d5719" strokeWidth=".8" />
      <path d="M185 100L161 112 158 105 181 93Z" fill="#c78c2f" stroke="#7d5719" strokeWidth=".8" />
      {/* a costura simples na barra, a da manga e o ombro */}
      <path d="M50 177H150" stroke="#8b7856" strokeWidth=".9" strokeDasharray="3 2" />
      <path d="M21 90L44 101M179 90L156 101" stroke="#8b7856" strokeWidth=".9" strokeDasharray="3 2" />
      <path d="M50 92C49 76 52 64 62 49M150 92C151 76 148 64 138 49" fill="none" stroke="#a79572" strokeWidth="1" />
      {/* vincos do cabide e manchas do tempo */}
      <path d="M64 142C80 148 92 146 104 152M112 170C124 164 134 166 146 160M56 118C62 124 62 134 58 142" fill="none" stroke="#b6a37e" strokeWidth="1.2" />
      <ellipse cx="60" cy="100" rx="9" ry="13" fill="#b49a62" opacity=".35" />
      <ellipse cx="140" cy="100" rx="9" ry="13" fill="#b49a62" opacity=".3" />
      <ellipse cx="124" cy="158" rx="7" ry="4.5" fill="#a58c5a" opacity=".3" />
      {/* a rádio no peito: as ondas, o número, o nome */}
      <path d="M72.3 76A32 32 0 0 1 127.7 76M81 81A22 22 0 0 1 119 81M89.6 86A12 12 0 0 1 110.4 86" fill="none" stroke="#27606a" strokeWidth="3.4" strokeLinecap="round" />
      {num(58)}
      {num(87)}
      {num(116)}
      <text x="100" y="167" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontSize="12.5" fontWeight="900" letterSpacing="4.5" fill="#27606a">RÁDIO</text>
      {/* a estampa rachada de tanta lavagem */}
      <path d="M61 108L71 116 67 124 78 135M88 103L96 112 92 122 104 130 100 144M120 102L126 116 121 126 132 136 130 146M70 161L78 168M112 159L120 169M76 76L84 82M116 70L122 78" fill="none" stroke="#dccfaf" strokeWidth=".9" />
      {/* o furinho de traça, com a linha puxada */}
      <path transform="translate(2 24)" d="M138 142C141 139 145 141 144 145 142 148 137 146 138 142Z" fill="#20171b" stroke="#a89670" strokeWidth=".6" />
      <path transform="translate(2 24)" d="M144 147C147 151 145 153 149 156" fill="none" stroke="#a89670" strokeWidth=".7" />
      <Etiqueta x={36} y={146} giro={-6} texto="M" de={[36, 108]} />
    </>
  )
}

// TÊNIS: o de corrida antigo em lona e camurça, entressola amarelada e sola crua
function Tenis({ u }: { u: string }) {
  return (
    <>
      <Fundo u={u} a="#3b3a35" b="#13120f" />
      <defs>
        <pattern id={`${u}l`} width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="4" height="4" fill="#69867a" />
          <path d="M0 0H4M0 2H4" stroke="#55705f" strokeWidth=".7" />
          <path d="M1 0V4M3 0V4" stroke="#7d9b8d" strokeWidth=".5" />
        </pattern>
      </defs>
      <ellipse cx="100" cy="160" rx="88" ry="6" fill="#07060a" opacity=".65" />
      <g transform="translate(0 35) scale(1 .76)">
      {/* a sola crua, com os cravos gastos */}
      <path d="M16 148C20 158 36 161 54 160H164C176 160 184 154 184 147Z" fill="#a9743a" stroke="#4e3216" strokeWidth="1.3" />
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((k) => <path key={k} d={`M${32 + k * 11} 154V160`} stroke="#5f3f1d" strokeWidth={k > 4 && k < 9 ? 1 : 2} />)}
      {/* a entressola amarelada */}
      <path d="M15 137C15 132 22 130 30 130L182 124C186 130 186 142 184 149H50C30 151 17 148 15 137Z" fill="#d8c48f" stroke="#7e6b3f" strokeWidth="1.3" />
      <path d="M22 141C60 142 140 141 183 137" fill="none" stroke="#a8925c" strokeWidth="1" />
      <path d="M125 133L132 148M149 131L158 148M60 137L66 149" stroke="#b9a570" strokeWidth=".9" />
      <path d="M24 148C40 150 55 150 72 150L76 146C56 146 38 146 22 142Z" fill="#6e6650" opacity=".5" />
      </g>
      <g transform="translate(0 38) scale(1 .7)">
      {/* a lona do cabedal */}
      <path d="M22 132C20 113 46 104 72 94L116 59C124 52 142 52 151 59 158 64 157 73 168 75 179 77 185 88 183 104L182 126 102 131Z" fill={`url(#${u}l)`} stroke="#2e3a31" strokeWidth="1.5" strokeLinejoin="round" />
      {/* biqueira de camurça */}
      <path d="M22 132C20 113 46 104 72 94C78 104 74 124 62 131Z" fill="#ad8a56" stroke="#5e4522" strokeWidth="1.2" />
      <path d="M31 123C38 113 50 109 66 104M31 128C39 120 52 116 68 113" fill="none" stroke="#c2a36e" strokeWidth="1" opacity=".75" />
      <path d="M26 124C32 114 46 107 63 101" fill="none" stroke="#6b5230" strokeWidth=".9" strokeDasharray="2.6 1.8" />
      {/* reforço do meio, do calcanhar, a língua */}
      <path d="M74 94L102 131H62C74 124 78 104 72 94ZM139 118L156 75C161 75 166 76 171 78 180 82 184 91 183 104L182 126 141 128Z" fill="#ad8a56" stroke="#5e4522" strokeWidth="1.2" />
      <path d="M77 100L100 128M143 121L158 80" fill="none" stroke="#6b5230" strokeWidth=".9" strokeDasharray="2.6 1.8" />
      <path d="M116 59C120 45 137 41 150 47 158 51 157 62 151 59 140 53 126 53 116 59Z" fill="#7d9a8e" stroke="#2e3a31" strokeWidth="1.2" />
      {/* a etiqueta do calcanhar, em branco (nada de marca) */}
      <rect x="168" y="92" width="11" height="22" rx="1.5" fill="#e7dec7" stroke="#7a6a48" strokeWidth=".8" />
      <path d="M170 98H177M170 103H177M170 108H175" stroke="#8d7c5c" strokeWidth=".8" />
      {/* os ilhoses e o cadarço puído */}
      {[[90, 78], [100, 70], [110, 63], [120, 56]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="2.8" fill="#2f2a26" stroke="#c5bfae" strokeWidth="1.1" />)}
      {[[90, 78], [100, 70], [110, 63], [120, 56]].map(([x, y], k) => (
        <path key={k} d={`M${x} ${y}L${x + 14} ${y + 12}M${x - 3} ${y - 2}L${x + 17} ${y + 15}`} stroke="#d8ccae" strokeWidth={k % 2 ? 2.4 : 3} strokeLinecap="round" />
      ))}
      <path d="M124 54C136 50 144 66 134 80M128 54C118 44 108 50 112 58" fill="none" stroke="#d8ccae" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M134 80L137 87M133 80L130 86" stroke="#b6a783" strokeWidth="1" />
      {/* a dobra da frente e as ralações */}
      <path d="M82 92C94 98 110 100 124 96M88 86C100 92 114 94 128 90" fill="none" stroke="#3f5146" strokeWidth="1.3" />
      <path d="M118 112C130 104 142 108 150 104 142 118 126 122 118 112Z" fill="#92aa9f" opacity=".32" />
      <path d="M33 122C42 121 52 116 60 118L52 126C44 128 38 126 33 122Z" fill="#7a6039" opacity=".55" />
      </g>
      <Etiqueta x={40} y={54} giro={-10} texto="41" de={[110, 82]} />
    </>
  )
}

// JAQUETA: couro de motoqueiro dos anos 70, ziper de lado, gola larga, ferragem gasta
function Jaqueta({ u }: { u: string }) {
  return (
    <>
      <Fundo u={u} a="#352d37" b="#120e16" />
      <defs>
        <linearGradient id={`${u}c`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7c3323" />
          <stop offset=".55" stopColor="#5c2219" />
          <stop offset="1" stopColor="#3f1712" />
        </linearGradient>
      </defs>
      <Cabide />
      {/* o forro, por dentro da gola */}
      <path d="M78 44C86 54 114 54 122 44L108 110 92 110Z" fill="#6f6152" />
      <path d="M84 52L114 80M116 52L88 84M88 62L110 96" stroke="#55493d" strokeWidth="1" />
      {/* mangas, com as dobras no cotovelo */}
      <path d="M58 56C39 62 24 80 18 128L14 176C22 182 34 182 41 178L54 122 60 84Z" fill={`url(#${u}c)`} stroke="#22100c" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M142 56C161 62 176 80 182 128L186 176C178 182 166 182 159 178L146 122 140 84Z" fill={`url(#${u}c)`} stroke="#22100c" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M20 124C30 120 44 128 52 122M20 132C30 138 42 132 50 136M148 122C156 128 170 120 180 124M150 136C158 132 170 138 180 132" fill="none" stroke="#a65a42" strokeWidth="1.5" />
      <path d="M15 168C25 172 34 172 42 170M185 168C175 172 166 172 158 170" fill="none" stroke="#2c130e" strokeWidth="1.1" strokeDasharray="3 2" />
      {/* o zíper do punho */}
      <path d="M30 148L37 178M170 148L163 178" stroke="#a9a59c" strokeWidth="1.6" strokeDasharray="1.8 1.2" />
      {/* o corpo */}
      <path d="M72 42C60 48 58 52 55 62L54 84 58 168C80 174 120 174 142 168L146 84 145 62C142 52 140 48 128 42C118 54 112 72 106 102L100 122 94 102C88 72 82 54 72 42Z" fill={`url(#${u}c)`} stroke="#22100c" strokeWidth="1.5" strokeLinejoin="round" />
      {/* a gola larga, as lapelas de botão de pressão */}
      <path d="M72 42C58 50 50 66 48 72L70 96 88 82C84 64 78 50 72 42Z" fill="#6a291e" stroke="#22100c" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M128 42C142 50 150 66 152 72L130 96 112 82C116 64 122 50 128 42Z" fill="#6a291e" stroke="#22100c" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M53 72L70 91 84 80M147 72L130 91 116 80" fill="none" stroke="#b56a4e" strokeWidth="1" strokeDasharray="2.6 1.8" />
      {/* as dragonas com tacha */}
      <path d="M58 60L74 50 77 56 61 67Z" fill="#4a1a13" stroke="#22100c" />
      <path d="M142 60L126 50 123 56 139 67Z" fill="#4a1a13" stroke="#22100c" />
      {[[62, 62], [138, 62], [68, 57], [132, 57]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="2" fill="#c4c0b5" stroke="#5f5c52" strokeWidth=".6" />)}
      {[[72, 87], [128, 87]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="3" fill="#b9b5a9" stroke="#55524a" strokeWidth=".8" />)}
      {/* o zíper torto, de ferro gasto */}
      <path d="M110 92C104 112 96 120 96 138V170" fill="none" stroke="#a9a59c" strokeWidth="3" strokeDasharray="1.8 1.3" />
      <path d="M110 92C104 112 96 120 96 138V170" fill="none" stroke="#2b120d" strokeWidth=".8" />
      <rect x="107" y="86" width="6" height="11" rx="1.5" fill="#d0ccbf" stroke="#55524a" strokeWidth=".7" />
      {/* a costura do peito e os bolsos de ziper */}
      <path d="M58 104C72 112 86 110 94 106M142 104C128 112 118 110 110 106" fill="none" stroke="#b56a4e" strokeWidth="1" strokeDasharray="2.6 1.8" />
      <path d="M64 128L84 122M136 128L116 122" stroke="#a9a59c" strokeWidth="2.6" strokeDasharray="1.7 1.3" />
      {/* o cinto com a fivela */}
      <path d="M57 150C80 156 120 156 143 150L143 160C120 166 80 166 57 160Z" fill="#401611" stroke="#22100c" strokeWidth="1.2" />
      <rect x="111" y="150" width="13" height="13" rx="1.5" fill="none" stroke="#c4c0b5" strokeWidth="2.2" />
      <path d="M118 155H131" stroke="#c4c0b5" strokeWidth="1.5" />
      {/* a pátina: o couro claro onde dobrou e ralou */}
      <path d="M60 86C68 94 70 104 68 116M140 86C132 94 130 104 132 116M76 130C84 134 86 142 82 146" fill="none" stroke="#a65a42" strokeWidth="1.5" />
      <path d="M58 158C62 164 74 168 86 168L68 170C63 168 59 164 58 158ZM131 134C137 136 140 142 138 148 134 146 130 140 131 134Z" fill="#b5735a" opacity=".55" />
      <path d="M44 74L49 66M152 68L156 74M16 170L20 178M186 170L182 178" stroke="#b5735a" strokeWidth="1.6" strokeLinecap="round" />
      <Etiqueta x={172} y={36} giro={10} texto="42" de={[140, 54]} />
    </>
  )
}

const PECAS: Record<string, (p: { u: string }) => ReactNode> = {
  "roupa:bone": Bone,
  "roupa:oculos": Oculos,
  "roupa:camisa-222": Camisa,
  "roupa:tenis": Tenis,
  "roupa:jaqueta": Jaqueta,
}

export const temDesenhoVintage = (id: string) => id in PECAS

// a peça desenhada; o id é o da loja ("roupa:bone")
export function RoupaVintage({ id, size }: { id: string; size?: number }) {
  // a peça aparece duas vezes na tela (na grade e no detalhe): cada desenho tem seus ids
  const u = "rv" + useId().replace(/[^a-zA-Z0-9]/g, "")
  const Peca = PECAS[id]
  return (
    <svg width={size ?? "100%"} viewBox="0 0 200 200" aria-hidden="true" className="l-loja-icone">
      {Peca && <Peca u={u} />}
    </svg>
  )
}
