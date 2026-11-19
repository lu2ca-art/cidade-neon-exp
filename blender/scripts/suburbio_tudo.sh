#!/bin/zsh
# A receita inteira do subúrbio (ver o topo de suburbio_reduzir.py). Da raiz do repo:
#   GT=~/.npm/_npx/<hash>/node_modules blender/scripts/suburbio_tudo.sh
set -e
C=blender/cenas
mkdir -p $C docs/blender
[ -f $C/suburbio-aberto.glb ] || node blender/scripts/glb_abrir.mjs public/models/suburbio.glb $C/suburbio-aberto.glb
blender -b --factory-startup --python blender/scripts/suburbio_reduzir.py -- $C/suburbio-aberto.glb $C/suburbio-a.glb > $C/suburbio-a.log 2>&1
grep -E "^(ANTES|CASAS|MODELOS|PULAR|ETAPA_A)" $C/suburbio-a.log
ERRO_M=${ERRO_M:-0.1} SEM_NORMAL=1 node blender/scripts/glb_simplificar.mjs $C/suburbio-a.glb $C/suburbio-b.glb 0.3 0.05 "$(cat $C/suburbio-pular.txt)"
# a câmera do retrato é a mesma do "antes" (centro e raio da caixa do modelo original)
blender -b --factory-startup --python blender/scripts/suburbio_final.py -- $C/suburbio-b.glb $C/suburbio-bruto.glb \
  $PWD/docs/blender/suburbio-depois.png 21.736,-5.879,18.186 128.198 2>&1 | grep -E "^(TELA|POR_MATERIAL)"
npx @gltf-transform/cli optimize $C/suburbio-bruto.glb $C/suburbio-final.glb \
  --compress meshopt --simplify false --join false --instance false --texture-compress webp --texture-size 1024
