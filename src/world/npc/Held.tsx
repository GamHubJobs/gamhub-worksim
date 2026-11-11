/**
 * What a person holds in one hand (a phone, a document, a cup, a clipboard,
 * a pen, a watering can), chosen by what they are doing (activities.ts).
 * Only the thing in use is drawn; it is swapped when the activity changes,
 * without redrawing the person.
 */
import { useFrame } from '@react-three/fiber'
import { useState, type RefObject } from 'react'
import type { PropKind } from '../interaction/activity'
import { Prop } from '../props'

export function Held({ kind }: { kind: RefObject<PropKind | null> }) {
  const [shown, setShown] = useState<PropKind | null>(null)
  useFrame(() => {
    if (kind.current !== shown) setShown(kind.current)
  })
  return shown ? <Prop kind={shown} /> : null
}
