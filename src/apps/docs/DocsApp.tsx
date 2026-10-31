/** Docs: the player's documents. Opening one shows it in a document window. */
import { createDocument } from '../../persistence/documentsRepo'
import { FileBrowser } from '../shared/FileBrowser'
import { DOC_TEMPLATES, getDocTemplate } from './templates'

interface DocsAppProps {
  playerName: string
  /** Documents that belong to a task, with the task's title. */
  linked: Record<string, string>
  onOpen: (documentId: string) => void
}

export function DocsApp({ playerName, linked, onOpen }: DocsAppProps) {
  return (
    <FileBrowser
      kind="doc"
      heading="Docs"
      icon="docs"
      iconColors="bg-blue-100 text-blue-700"
      templates={DOC_TEMPLATES}
      linked={linked}
      onOpen={onOpen}
      onCreate={async (templateId) => {
        const template = getDocTemplate(templateId)
        const document = await createDocument({
          kind: 'doc',
          title: template.title,
          content: template.build(playerName),
        })
        onOpen(document.id)
      }}
    />
  )
}
