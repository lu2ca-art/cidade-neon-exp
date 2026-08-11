"use client"

import { ChordInstrumentPage } from "../components/ChordInstrumentPage"
import { GUITAR_TIMBRE_LABEL, GUITAR_TIMBRE_EFFECT } from "../lib/synths"
import { INSTRUMENT_COLOR } from "../lib/types"

export default function GuitarraPage() {
  return (
    <ChordInstrumentPage
      instrument="guitarra"
      label="GUITARRA"
      accent={INSTRUMENT_COLOR.guitarra}
      timbreLabels={GUITAR_TIMBRE_LABEL}
      timbreEffects={GUITAR_TIMBRE_EFFECT}
      intro="escolha um acorde, dedilhe ou dê um rasgado no braço, e toque no trilho pra colocar na música."
    />
  )
}
