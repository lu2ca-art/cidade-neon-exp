"use client"

import { ProChordPage } from "../../components/ProChordPage"
import { PAD_TIMBRE_LABEL, PAD_TIMBRE_EFFECT } from "../../lib/synths"
import { INSTRUMENT_COLOR } from "../../lib/types"

export default function PadProPage() {
  return (
    <ProChordPage
      instrument="pad"
      label="PAD"
      accent={INSTRUMENT_COLOR.pad}
      timbreLabels={PAD_TIMBRE_LABEL}
      timbreEffects={PAD_TIMBRE_EFFECT}
    />
  )
}
