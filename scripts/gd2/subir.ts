// A SUBIDA DAS CAMADAS (27/11): manda os .bin de uma pasta (já cifrados por
// scripts/gd2/cifrar.ts) para o Blob em gd/v2/<nome>/, onde o jogo procura (GD_AUDIO).
//
//   BLOB_READ_WRITE_TOKEN=... bun scripts/gd2/subir.ts <pasta> <nome, ex. chuva-vivo>
//
// Não sobrescreve: se o arquivo já existe no Blob, para.
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { put, head } from "@vercel/blob"

const [pasta, nome] = process.argv.slice(2)
if (!pasta || !nome || !process.env.BLOB_READ_WRITE_TOKEN) {
  console.error("uso: BLOB_READ_WRITE_TOKEN=... bun scripts/gd2/subir.ts <pasta> <nome>"); process.exit(1)
}
async function main() {
  for (const f of readdirSync(pasta).filter((x) => x.endsWith(".bin"))) {
    const caminho = `gd/v2/${nome}/${f}`
    const existe = await head(caminho).then(() => true, () => false)
    if (existe) { console.error("já existe, não mexo:", caminho); process.exit(1) }
    const r = await put(caminho, readFileSync(join(pasta, f)), {
      access: "public", addRandomSuffix: false, contentType: "application/octet-stream",
    })
    console.log(r.url)
  }
}
main()
