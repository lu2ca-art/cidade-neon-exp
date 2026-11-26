#!/bin/zsh
# AS CAMADAS DO GUITAR DRIVER (26/11): o áudio de um show em duas partes que somadas
# são a faixa: a SUA parte (guitarra ou baixo) e o resto da banda (sem-<instrumento>).
# Errou, a sua parte some (app/neon-tiles/som.ts).
#
#   scripts/gd2/camadas.sh <pasta das stems htdemucs_6s/<id>> <saída>
#
# Sai em <saída>/{guitarra,sem-guitarra,baixo,sem-baixo}.mp3. Depois a cifra
# (scripts/gd2/cifrar.ts) e a subida pro Blob. Roda no AIR (segundos por faixa).
set -e
S="$1"; O="$2"
mkdir -p "$O"
mix() { # saída, stems...
  local out="$1"; shift
  local args=() n=0
  for s in "$@"; do args+=(-i "$S/$s.mp3"); n=$((n+1)); done
  ffmpeg -loglevel error -y "${args[@]}" -filter_complex "amix=inputs=$n:normalize=0:duration=longest" -c:a libmp3lame -b:a 192k "$O/$out.mp3"
}
cp "$S/guitar.mp3" "$O/guitarra.mp3"
cp "$S/bass.mp3" "$O/baixo.mp3"
mix sem-guitarra vocals drums bass piano other
mix sem-baixo vocals drums guitar piano other
ls -la "$O"
