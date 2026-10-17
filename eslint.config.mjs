import nextCoreWebVitals from "eslint-config-next/core-web-vitals"

export default [
  ...nextCoreWebVitals,
  {
    ignores: [".next/**", "node_modules/**", "blender/**", "public/**", "**/*.tmp.mjs", "test-results/**", "playwright-report/**"],
  },
  {
    // Regras do React Compiler. O projeto não usa o Compiler, e estes padrões são
    // intencionais aqui: ler localStorage/matchMedia depois de montar (evita erro de
    // hidratação) e mexer em DOM/Three.js direto dentro de efeitos e loops de render 3D.
    // Seguem como aviso pra aparecerem no relatório; as regras que pegam bug de verdade
    // (rules-of-hooks, exhaustive-deps, purity) continuam como erro.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
    },
  },
]
