"use client"

import { ProChordPage } from "../../components/ProChordPage"
import { PIANO_TIMBRE_LABEL, PIANO_TIMBRE_EFFECT } from "../../lib/synths"
import { INSTRUMENT_COLOR } from "../../lib/types"

export default function PianoProPage() {
  return (
    <ProChordPage
      instrument="piano"
      label="PIANO"
      accent={INSTRUMENT_COLOR.piano}
      timbreLabels={PIANO_TIMBRE_LABEL}
      timbreEffects={PIANO_TIMBRE_EFFECT}
    />
  )
}
