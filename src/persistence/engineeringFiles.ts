/**
 * The Engineer career's files, kept as documents like every other file (so
 * autosave, version history, backups and exports work for them):
 *
 * - CAD files (`tool` documents of the tool "cad"): the project's drawing
 *   (DXF, edited in CAD Craft) and models imported from FreeCAD (OBJ, STL,
 *   STEP, FCStd and the .worksim.json data);
 * - the project's documents, as Word Craft documents and Grid Craft
 *   workbooks.
 */
import { z } from 'zod'
import { createDocument, getDocument, updateDocument } from './documentsRepo'
import type { DocContent, SheetContent } from './schemas'

export const CAD_TOOL = 'cad'

export const CadFileSchema = z.object({
  project: z.string().max(40),
  role: z.enum(['drawing', 'model']),
  format: z.enum(['dxf', 'obj', 'stl', 'json', 'step', 'fcstd']),
  name: z.string().min(1).max(160),
  /** The file: text formats as text, binary ones as base64. */
  data: z.string().max(12_000_000),
  encoding: z.enum(['text', 'base64']),
  /** The design revision it belongs to. */
  revision: z.number().int().min(1),
  /** A drawing: the fingerprint of the design it shows (drawn from it, or read as it). */
  basis: z.string().max(40).default(''),
})
export type CadFile = z.infer<typeof CadFileSchema>

export async function createCadFile(owner: string, file: CadFile): Promise<string> {
  const document = await createDocument({
    kind: 'tool',
    title: file.name,
    owner,
    content: { tool: CAD_TOOL, state: CadFileSchema.parse(file) },
  })
  return document.id
}

/** The CAD file, or null if it is missing (deleted, damaged, not a CAD file). */
export async function readCadFile(id: string): Promise<CadFile | null> {
  const document = await getDocument(id).catch(() => undefined)
  if (!document || document.kind !== 'tool' || document.content.tool !== CAD_TOOL)
    return null
  const parsed = CadFileSchema.safeParse(document.content.state)
  return parsed.success ? parsed.data : null
}

export async function updateCadFile(id: string, file: CadFile): Promise<void> {
  await updateDocument(id, {
    title: file.name,
    content: { tool: CAD_TOOL, state: CadFileSchema.parse(file) },
  })
}

/**
 * Makes a project document (or replaces the content of the one made before,
 * which keeps its earlier content in Version history). Returns its ID.
 */
export async function saveProjectDocument(
  existing: string | null,
  input:
    | { kind: 'doc'; owner: string; title: string; content: DocContent }
    | { kind: 'sheet'; owner: string; title: string; content: SheetContent },
): Promise<string> {
  if (existing) {
    const document = await getDocument(existing).catch(() => undefined)
    if (document && document.kind === input.kind) {
      await updateDocument(existing, { title: input.title, content: input.content })
      return existing
    }
  }
  const document = await createDocument(input)
  return document.id
}
