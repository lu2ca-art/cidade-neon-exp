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
      intro="monte uma progressão com os acordes da tonalidade da música."
    />
  )
}
