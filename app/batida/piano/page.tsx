"use client"

import { ChordInstrumentPage } from "../components/ChordInstrumentPage"
import { PIANO_TIMBRE_LABEL, PIANO_TIMBRE_EFFECT } from "../lib/synths"
import { INSTRUMENT_COLOR } from "../lib/types"

export default function PianoPage() {
  return (
    <ChordInstrumentPage
      instrument="piano"
      label="PIANO"
      accent={INSTRUMENT_COLOR.piano}
      timbreLabels={PIANO_TIMBRE_LABEL}
      timbreEffects={PIANO_TIMBRE_EFFECT}
      intro="escolha um acorde, toque nas teclas destacadas, e toque no trilho pra colocar na música."
    />
  )
}
