"use client"

import { ChordInstrumentPage } from "../components/ChordInstrumentPage"
import { PAD_TIMBRE_LABEL, PAD_TIMBRE_EFFECT } from "../lib/synths"
import { INSTRUMENT_COLOR } from "../lib/types"

// PAD: o acorde fica soando até o próximo — a cama da música
export default function PadPage() {
  return (
    <ChordInstrumentPage
      instrument="pad"
      label="PAD"
      accent={INSTRUMENT_COLOR.pad}
      timbreLabels={PAD_TIMBRE_LABEL}
      timbreEffects={PAD_TIMBRE_EFFECT}
      intro="escolha um acorde e coloque no trilho — ele fica soando até o próximo."
    />
  )
}
