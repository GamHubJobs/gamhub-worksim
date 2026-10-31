/** Slides: the player's presentations. Opening one shows it in a presentation window. */
import { createDocument } from '../../persistence/documentsRepo'
import { FileBrowser } from '../shared/FileBrowser'
import { getSlidesTemplate, SLIDES_TEMPLATES } from './model'

interface SlidesAppProps {
  playerName: string
  /** Presentations that belong to a task, with the task's title. */
  linked: Record<string, string>
  onOpen: (documentId: string) => void
}

export function SlidesApp({ playerName, linked, onOpen }: SlidesAppProps) {
  return (
    <FileBrowser
      kind="slides"
      heading="Slides"
      icon="slides"
      iconColors="bg-amber-100 text-amber-700"
      templates={SLIDES_TEMPLATES}
      linked={linked}
      onOpen={onOpen}
      onCreate={async (templateId) => {
        const template = getSlidesTemplate(templateId)
        const document = await createDocument({
          kind: 'slides',
          title: template.title,
          content: template.build(playerName),
        })
        onOpen(document.id)
      }}
    />
  )
}
