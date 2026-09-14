export default function NotFound() {
  return (
    <div
      className="min-h-dvh w-full flex flex-col items-center justify-center gap-6 px-8 text-center select-none"
      style={{ background: "linear-gradient(180deg, #1a0533 0%, #4a0a6b 45%, #0a0918 100%)" }}
    >
      <p className="text-white/40 text-xs uppercase tracking-[0.3em]">Cidade Neon</p>
      <h1 className="text-white text-xl font-semibold max-w-xs leading-relaxed">
        Esse lugar não existe na cidade.
      </h1>
      <p className="text-white/50 text-sm max-w-xs leading-relaxed">
        O endereço mudou ou nunca existiu por aqui.
      </p>
      <a
        href="/"
        className="px-6 py-3 rounded-2xl bg-white text-black text-sm font-medium active:scale-95 transition-transform"
      >
        Voltar ao início
      </a>
    </div>
  )
}
