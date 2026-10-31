/**
 * Which files a career save sees: its own, and files without an owner (made
 * before careers existed, such as the practice workbook).
 */
import type { AnyDocument } from '../../persistence/schemas'

export function visibleTo(ownerId: string) {
  return (file: AnyDocument) => file.owner === undefined || file.owner === ownerId
}
