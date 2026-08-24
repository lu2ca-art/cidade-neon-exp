"use client"

// Splash de carregamento inspirado na tela "CIDADE NEON · PLAY" da home
// do jogo. Aparece fullscreen sobre o Canvas até o mundo terminar de
// carregar (via Suspense fallback OU state controlado pelo pai).

interface CidadeNeonSplashProps {
  visible: boolean
  onDismiss?: () => void
}

export function CidadeNeonSplash({ visible, onDismiss }: CidadeNeonSplashProps) {
  if (!visible) return null
  return (
    <div
      className="pointer-events-auto fixed inset-0 z-[100] flex flex-col items-center justify-center"
      style={{
        background:
          "radial-gradient(ellipse at 50% 30%, #3b0764 0%, #1a0533 45%, #050510 100%)",
      }}
    >
      {/* Estrelas de fundo */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 60 }).map((_, i) => {
          const x = (i * 137) % 100
          const y = (i * 91) % 100
          const size = ((i * 17) % 3) + 1
          return (
            <div
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                width: size,
                height: size,
                opacity: 0.4 + ((i * 7) % 60) / 100,
              }}
            />
          )
        })}
      </div>

      {/* Sol synthwave — semicírculo laranja */}
      <div
        className="absolute"
        style={{
          left: "50%",
          top: "48%",
          transform: "translate(-50%, -50%)",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background:
            "radial-gradient(circle at 50% 50%, #ffcc00 0%, #ff6b35 30%, #ff2d78 60%, transparent 80%)",
          filter: "blur(2px)",
          opacity: 0.9,
        }}
      />

      {/* Grid neon perspectiva */}
      <div
        className="absolute inset-x-0 bottom-0 h-1/2 overflow-hidden"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, #1a0533 40%, #050510 100%)",
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(to right, #ff00ff 1px, transparent 1px), linear-gradient(to bottom, #ff00ff 1px, transparent 1px)",
            backgroundSize: "60px 60px",
            transform: "perspective(400px) rotateX(60deg) scale(2, 1.5)",
            transformOrigin: "50% 100%",
            opacity: 0.5,
          }}
        />
      </div>

      {/* Título CIDADE NEON */}
      <div className="relative z-10 mt-8 text-center">
        <h1
          className="text-6xl font-black tracking-widest sm:text-8xl"
          style={{
            color: "#ff5fae",
            textShadow:
              "0 0 20px #ff00ff, 0 0 40px #ff00ff, 3px 3px 0 #a855f7, -3px -3px 0 #00ffff",
            letterSpacing: "0.1em",
          }}
        >
          CIDADE NEON
        </h1>
        <p
          className="mt-2 text-xs font-mono uppercase tracking-[0.4em] text-white/70 sm:text-sm"
        >
          uma experiência interativa imersiva
        </p>
      </div>

      {/* Loader animado (dots pulsantes) */}
      <div className="relative z-10 mt-16 flex flex-col items-center gap-3">
        <div className="flex gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-3 w-3 rounded-full"
              style={{
                background: ["#ff00ff", "#00ffff", "#ffcc00", "#ff6b35"][i],
                animation: `pulse-load 1.4s ease-in-out ${i * 0.2}s infinite`,
                boxShadow: `0 0 10px currentColor`,
              }}
            />
          ))}
        </div>
        <div className="mt-1 text-[10px] font-mono uppercase tracking-widest text-white/50">
          carregando cidade…
        </div>
      </div>

      {/* PLAY button (só aparece se onDismiss) */}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="relative z-10 mt-12 rounded-full px-10 py-3 text-lg font-black uppercase tracking-widest text-white transition hover:scale-105"
          style={{
            background: "linear-gradient(90deg, #ff00ff, #00ffff)",
            boxShadow: "0 0 30px rgba(255, 0, 255, 0.6), inset 0 -3px 0 rgba(0,0,0,0.3)",
          }}
        >
          ▶ PLAY
        </button>
      )}

      <div className="absolute bottom-4 text-[9px] font-mono uppercase tracking-widest text-white/30">
        LU2CA.ART · CIDADE NEON
      </div>

      <style jsx>{`
        @keyframes pulse-load {
          0%, 80%, 100% {
            transform: scale(0.6);
            opacity: 0.3;
          }
          40% {
            transform: scale(1.2);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}
