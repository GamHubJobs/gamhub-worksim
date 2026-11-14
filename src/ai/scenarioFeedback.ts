/** The request for coaching on what the player said in a live scenario (see office/ScenarioAiFeedback.tsx). */
export interface SpokenAnswer {
  /** What the player was asked. */
  prompt: string
  /** What they said. */
  answer: string
  /** The points a good answer covers, and a model answer. */
  mentions: string[][]
  model: string
  /** The scenario, for context, e.g. "Hearing: Brightwater v Millstone". */
  scenario: string
}

/** The request sent to the player's model (exported for tests). */
export function feedbackRequest(spoken: SpokenAnswer) {
  const points = spoken.mentions.map((group) => group[0]).join('; ')
  return {
    text: `Give me brief, specific feedback (3 or 4 sentences) on what I said in this workplace training scenario: what was good, what was missing, and one way to say it better. Do not give me a mark.\n\nScenario: ${spoken.scenario}\nI was asked: ${spoken.prompt}\nI said: ${spoken.answer}\nA strong answer covers: ${points}`,
    context: {
      label: `Scenario: ${spoken.scenario}`,
      text: `A model answer, for your reference only: ${spoken.model}`,
    },
  }
}
