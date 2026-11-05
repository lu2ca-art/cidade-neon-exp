import type { Page } from "@playwright/test"

// (notas 04/11, app/linha/chaveSave.ts) o save que vale na aba: o /linha aberto
// com ?parte= ou ?teste=1 liga o modo teste (sessionStorage "cn-modo-teste") e
// grava em "cn-linha-222-teste"; sem ele, o save de verdade "cn-linha-222".
// Os testes leem o mesmo save que o jogo está usando.
export const CHAVE_REAL = "cn-linha-222"
export const CHAVE_TESTE = "cn-linha-222-teste"

export const saveDoJogo = (page: Page) =>
  page.evaluate(([real, teste]) => {
    const chave = sessionStorage.getItem("cn-modo-teste") === "1" ? teste : real
    return JSON.parse(localStorage.getItem(chave) ?? "null")
  }, [CHAVE_REAL, CHAVE_TESTE] as const)

// o save de verdade, cru (pra conferir que o link de teste não mexeu nele)
export const saveReal = (page: Page) => page.evaluate((k) => localStorage.getItem(k), CHAVE_REAL)
