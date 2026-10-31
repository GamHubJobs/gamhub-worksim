/** Slides: the player's files. Opening one shows it in its own window. */
import { createDocument } from '../../persistence/documentsRepo'
import { FileBrowser } from '../shared/FileBrowser'
import { getSlidesTemplate, SLIDES_TEMPLATES } from './model'

interface SlidesAppProps {
  playerName: string
  /** Presentations that belong to a task, with the task's title. */
  linked: Record<string, string>
  /** The career save the files belong to. */
  ownerId: string
  onOpen: (documentId: string) => void
}

export function SlidesApp({ playerName, linked, ownerId, onOpen }: SlidesAppProps) {
  return (
    <FileBrowser
      kind="slides"
      heading="Slides"
      icon="slides"
      iconColors="bg-amber-100 text-amber-700"
      templates={SLIDES_TEMPLATES}
      linked={linked}
      ownerId={ownerId}
      onOpen={onOpen}
      onCreate={async (templateId) => {
        const template = getSlidesTemplate(templateId)
        const document = await createDocument({
          kind: 'slides',
          title: template.title,
          content: template.build(playerName),
          owner: ownerId,
        })
        onOpen(document.id)
      }}
    />
  )
}
