/** The Projects app's sections (kept apart so the desktop can name them without loading the app). */
export const PROJECT_TABS = [
  'overview',
  'design',
  'cadcraft',
  'freecad',
  'documents',
  'site',
] as const
export type ProjectTab = (typeof PROJECT_TABS)[number]
