/**
 * Anchors for something drawn from plain boxes (a counter, a printer, a
 * filing cabinet): put inside the same group as the thing, in its own space.
 * Furniture with a component of its own registers its anchors itself (see
 * world/anchors.ts).
 */
import { useAnchors, type AnchorSpec } from './anchors'

export function Anchors({ specs }: { specs: readonly AnchorSpec[] }) {
  const ref = useAnchors(specs)
  return <group ref={ref} />
}
