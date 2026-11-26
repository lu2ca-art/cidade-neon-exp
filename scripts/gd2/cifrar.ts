// A CIFRA DAS CAMADAS (26/11): cada camada vira [12 bytes de IV][áudio cifrado + tag]
// (AES-256-GCM), o formato que o jogo abre (app/neon-tiles/som.ts carregarBuffer).
//
//   GD_CHAVE=<a chave em base64> bun scripts/gd2/cifrar.ts <pasta com os .mp3>
//
// Escreve um .bin do lado de cada .mp3. A chave é a mesma da Vercel (GD_CHAVE):
// nunca entra no repo nem no registro.
import { readdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const pasta = process.argv[2]
const b64 = process.env.GD_CHAVE
if (!pasta || !b64) { console.error("uso: GD_CHAVE=... bun scripts/gd2/cifrar.ts <pasta>"); process.exit(1) }
const bruta = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
if (bruta.length !== 32) { console.error("a chave não tem 32 bytes"); process.exit(1) }
async function main() {
const chave = await crypto.subtle.importKey("raw", bruta, "AES-GCM", false, ["encrypt"])
for (const f of readdirSync(pasta).filter((x) => x.endsWith(".mp3"))) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const cifrado = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, chave, readFileSync(join(pasta, f))))
  const out = new Uint8Array(12 + cifrado.length)
  out.set(iv); out.set(cifrado, 12)
  writeFileSync(join(pasta, f.replace(/\.mp3$/, ".bin")), out)
  console.log(f, "→", f.replace(/\.mp3$/, ".bin"), out.length)
}
}
main()
