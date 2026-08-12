"use client"

import { ProChordPage } from "../../components/ProChordPage"
import { GUITAR_TIMBRE_LABEL, GUITAR_TIMBRE_EFFECT } from "../../lib/synths"
import { INSTRUMENT_COLOR } from "../../lib/types"

export default function GuitarraProPage() {
  return (
    <ProChordPage
      instrument="guitarra"
      label="GUITARRA"
      accent={INSTRUMENT_COLOR.guitarra}
      timbreLabels={GUITAR_TIMBRE_LABEL}
      timbreEffects={GUITAR_TIMBRE_EFFECT}
    />
  )
}
