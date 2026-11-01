/** The employability profile as a PDF. */
import type { EmployabilityProfile } from '../../game/employabilityProfile'
import { profileBlocks } from '../profile'
import { PdfWriter } from './writer'

export function profilePdf(profile: EmployabilityProfile): Uint8Array {
  const w = new PdfWriter(`${profile.name} - profile`)
  w.heading(profile.name, 1)
  w.blocks(profileBlocks(profile))
  return w.finish(
    'GamHub WorkSim profile - simulated workplace tasks with simulated data',
  )
}
