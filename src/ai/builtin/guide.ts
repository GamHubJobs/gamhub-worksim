/**
 * The built-in guide: WorkSim's own help, answering from the context with
 * deterministic rules (the spreadsheet's parser, the task's own steps and
 * hints, simple text analysis). It works offline, costs nothing, and is
 * always labelled as not being an AI model. For open questions it says so,
 * and explains how to turn on a model.
 */
import { itemOf } from '../context'
import type { AiAnswer, AiMode, AiRequest, ContextItem, Engine } from '../types'
import { explainError, explainFormula } from './formula'
import { actionItems, reviewWriting, summarise } from './text'
import {
  analyseData,
  explainCode,
  OUTLINE,
  reportStructure,
  resolveTicket,
  reviewSlides,
  rewriteHelp,
  speakerNotes,
  suggestFormula,
  TESTS_HELP,
} from './work'

const SOURCE = { engine: 'builtin', label: 'Built-in guide', model: false } as const

type Intent =
  | 'explain-formula'
  | 'summarise'
  | 'action-items'
  | 'reply'
  | 'approach'
  | 'review'
  | 'prompting'
  | 'analyse-data'
  | 'suggest-formula'
  | 'rewrite'
  | 'improve-draft'
  | 'structure'
  | 'outline'
  | 'review-slides'
  | 'speaker-notes'
  | 'explain-code'
  | 'write-tests'
  | 'resolve-ticket'
  | 'budget'
  | 'plan-day'
  | 'learn-next'
  | 'other'

const INTENTS: Array<[Intent, RegExp]> = [
  [
    'analyse-data',
    /\b(analy[sz]e|trend|outlier|unusual values?|which chart|recommend a chart|averages?)\b/i,
  ],
  ['suggest-formula', /\b(suggest|write|give me|what) (a |the )?formula\b/i],
  ['rewrite', /\b(rewrite|reword|rephrase|make (this|it) (more )?professional)\b/i],
  ['improve-draft', /\bimprove (my|the) (draft|reply|email)\b/i],
  [
    'structure',
    /\b(structure|sections?|headings?) (of|for) (a|the|my) (report|document)\b/i,
  ],
  ['outline', /\b(outline|slides? (for|about)|presentation (outline|plan))\b/i],
  ['speaker-notes', /\b(speaker notes|what (should|do) i say)\b/i],
  ['review-slides', /\breview (my|the|this) (slides|presentation|deck)\b/i],
  ['write-tests', /\b(write|suggest|generate|which) (some |more )?tests?\b/i],
  [
    'explain-code',
    /\b(explain (this|the|my) code|debug|failing tests?|why (does|is) (my|the|this) (code|test))\b/i,
  ],
  ['resolve-ticket', /\b(ticket|resolve|troubleshoot|resolution|escalat)\w*/i],
  [
    'explain-formula',
    /\b(formula|function|#[A-Z/]+[!?]?|not working|error in (the )?cell)\b/i,
  ],
  [
    'action-items',
    /\b(action items?|to-?dos?|what do (i|they) need|what is being asked|tasks? in)\b/i,
  ],
  ['summarise', /\b(summar|tl;?dr|gist|key points|what does (this|it) say)\w*/i],
  ['reply', /\b(reply|respond|response|answer (this|the) (e-?mail|message))\b/i],
  ['review', /\b(review|check|feedback on|improve|proofread|grammar|tone)\b/i],
  [
    'approach',
    /\b(approach|how (should|do|can) i|where (do|should) i start|steps?|break (it|this) down|plan|prioriti[sz]e|stuck)\b/i,
  ],
  ['prompting', /\b(prompt|ask (you|ai)|context engineering|how to use ai)\b/i],
]

/**
 * Questions about life at home, answered only when the home's context is
 * there (the laptop's WorkSim AI tab gives it).
 */
const LIFE_INTENTS: Array<[Intent, ContextItem['kind'], RegExp]> = [
  [
    'budget',
    'budget',
    /\b(budget|money|afford|spend|spent|save|saving|savings|rent|overdrawn|bills?)\b/i,
  ],
  [
    'learn-next',
    'learning',
    /\b(learn|study|skills?|promot\w*|career|get better|improve at|next job)\b/i,
  ],
  [
    'plan-day',
    'plan',
    /\b(plan|tonight|this evening|this morning|what should i do|schedule|bed|sleep|routine)\b/i,
  ],
]

export function intentOf(request: AiRequest): Intent {
  const actions = [...INTENTS.map(([i]) => i), ...LIFE_INTENTS.map(([i]) => i)]
  if (request.action && actions.includes(request.action as Intent))
    return request.action as Intent
  const last = [...request.messages].reverse().find((m) => m.role === 'user')?.text ?? ''
  const life = LIFE_INTENTS.find(
    ([, kind, pattern]) => itemOf(request.context, kind) && pattern.test(last),
  )
  if (life) return life[0]
  return INTENTS.find(([, pattern]) => pattern.test(last))?.[0] ?? 'other'
}

const list = (items: string[]) => items.map((item) => `- ${item}`).join('\n')

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === 'string')
    : []
}

// ---------------------------------------------------------------------------
// Answers
// ---------------------------------------------------------------------------

function formulaAnswer(item: ContextItem | undefined, mode: AiMode): string {
  const formula = typeof item?.data?.formula === 'string' ? item.data.formula : item?.text
  const shown = typeof item?.data?.value === 'string' ? item.data.value : null
  if (!formula || !formula.trim().startsWith('='))
    return 'Select a cell that contains a formula (it starts with =) and ask again: I will explain how it works and what to check.'
  const explanation = explainFormula(formula)
  const parts = [`**${formula.trim()}**`]
  if (explanation.problem) parts.push(explanation.problem)
  else {
    parts.push(`It calculates ${explanation.reading}.`)
    if (explanation.functions.length) parts.push(list(explanation.functions))
    parts.push(...explanation.notes)
  }
  const error = shown ? explainError(shown) : null
  if (error) {
    parts.push(`The cell shows **${shown}**: ${error}`)
    parts.push(
      mode === 'learning'
        ? 'To find the cause, click each cell the formula refers to and check what it contains. Which one is empty, text, or an error itself?'
        : 'Check each referenced cell for an empty value, text or an error, then fix the input rather than hiding the error.',
    )
  }
  return parts.join('\n\n')
}

function summaryAnswer(item: ContextItem | undefined): string {
  if (!item)
    return 'Open the email or document you want summarised (or select some text), then ask again.'
  const points = summarise(item.text)
  return points.length
    ? `The main points of ${item.label.toLowerCase()}:\n\n${list(points)}\n\nThis is the opening sentence of each paragraph, picked by simple rules: read the full text before you act on it.`
    : 'There is not enough text here to summarise.'
}

function actionAnswer(item: ContextItem | undefined): string {
  if (!item) return 'Open the email or document first, then ask what it asks you to do.'
  const items = actionItems(item.text)
  if (!items.length)
    return 'I could not spot any direct requests in it. Read it once more for anything implied, such as a question that needs an answer.'
  return `What it asks for:\n\n${list(items.map((i) => (i.when ? `${i.text} (timing: ${i.when})` : i.text)))}\n\nAdd these to your plan, with the timing where there is one.`
}

function replyAnswer(item: ContextItem | undefined, mode: AiMode): string {
  if (!item) return 'Open the email you want to answer, then ask again.'
  const asks = actionItems(item.text)
  const outline = [
    'A greeting using their name.',
    'One line that shows you understood what they need.',
    ...(asks.length
      ? asks.slice(0, 4).map((a) => `Your answer to: "${a.text}"`)
      : ['Your answer to their main question.']),
    'What happens next, and when.',
    'A short sign-off.',
  ]
  const intro =
    mode === 'learning'
      ? 'A good reply answers every request, in the order they were made. Write it yourself using this outline:'
      : 'Outline for your reply:'
  return `${intro}\n\n${list(outline)}\n\nKeep it short, use their wording for the items, and check figures before you send.`
}

function approachAnswer(item: ContextItem | undefined, mode: AiMode): string {
  if (!item)
    return 'Open the task in Tasks (or the case you are working on), then ask again: I will help you plan it from its brief and steps.'
  const steps = strings(item.data?.steps)
  const hints = strings(item.data?.hints)
  const done = typeof item.data?.done === 'number' ? item.data.done : 0
  const lines = [`**${item.label}**`]
  if (steps.length) {
    if (mode === 'learning') {
      const next = steps[Math.min(done, steps.length - 1)]
      lines.push(
        `Work through it one step at a time. Start with: **${next}**`,
        hints[Math.min(done, hints.length - 1)]
          ? `Hint: ${hints[Math.min(done, hints.length - 1)]}`
          : '',
        'When that step is done, ask again for the next one. What do you think the first thing to check is?',
      )
    } else {
      lines.push(
        `The steps, in order:\n\n${steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`,
      )
      if (mode === 'expert')
        lines.push(
          'Decide the order yourself where steps do not depend on each other, and keep notes on any assumption you make: reviewers will ask.',
        )
      else lines.push('Check each result against the brief before moving on.')
    }
  } else {
    lines.push(
      'Read the brief again and list: what is the result, who is it for, what data you have, and when it is due. Then plan the steps backwards from the result.',
    )
  }
  return lines.filter(Boolean).join('\n\n')
}

function reviewAnswer(item: ContextItem | undefined, mode: AiMode): string {
  if (!item)
    return 'Select the text (or open the document) you want reviewed, then ask again.'
  const review = reviewWriting(item.text)
  const lines = [`${review.words} words in ${review.sentences} sentences.`]
  if (review.longSentences.length)
    lines.push(
      `${review.longSentences.length} sentence(s) are longer than 30 words. Split them, for example: "${review.longSentences[0].slice(0, 90)}…"`,
    )
  if (review.passive)
    lines.push(
      `${review.passive} sentence(s) use the passive voice ("was prepared by"). Say who did what where it matters.`,
    )
  if (review.informal.length)
    lines.push(
      `Informal wording in: "${review.informal[0].slice(0, 90)}". Keep workplace writing neutral.`,
    )
  if (lines.length === 1)
    lines.push('No long sentences, passive constructions or informal wording spotted.')
  lines.push(
    mode === 'learning'
      ? 'These are simple checks on style. Whether the content is right is for you to judge: does each paragraph answer what the reader needs?'
      : 'Simple style checks only: review the facts and figures yourself.',
  )
  return lines.join('\n\n')
}

const PROMPTING = `Good prompts at work have four parts:

- **Task**: what you want ("Draft a reply…", "Explain why…").
- **Context**: the facts the answer depends on (the email, the figures, who it is for). WorkSim AI adds what you are working on; check the context panel.
- **Constraints**: length, tone, format ("three bullet points, formal").
- **Check**: ask for sources or reasoning you can verify.

Never paste passwords, personal data about real people, or confidential information into an AI tool your employer has not approved.`

function otherAnswer(request: AiRequest): string {
  const kinds = new Set(request.context.items.map((i) => i.kind))
  const offers = [
    kinds.has('formula') || kinds.has('cells')
      ? '**explain the formula** in the selected cell'
      : '',
    kinds.has('email')
      ? '**summarise** this email, list its **action items** or outline a **reply**'
      : '',
    kinds.has('document') || kinds.has('selection')
      ? '**summarise** or **review** the writing'
      : '',
    kinds.has('cells') ? '**analyse** the selected data and recommend a chart' : '',
    kinds.has('slides') ? '**review** the slides or suggest an **outline**' : '',
    kinds.has('code') ? '**explain the code** and its failing tests' : '',
    kinds.has('ticket') ? '**summarise** the ticket and suggest a **resolution**' : '',
    kinds.has('assignment') || kinds.has('case')
      ? 'help you **plan your approach** to the task'
      : '',
    'give tips on **writing good prompts**',
  ].filter(Boolean)
  return `I am WorkSim's built-in guide, not an AI model, so I can only help with specific things. Right now I can:\n\n${list(offers)}\n\nFor open questions, turn on an AI model in WorkSim AI settings (a local model, or a cloud model through the AI bridge).`
}

/** Advice worked out from the save by WorkSim's rules (see game/lifeAdvice.ts). */
function lifeAnswer(item: ContextItem | undefined, title: string): string {
  const advice = strings(item?.data?.advice)
  if (!item || !advice.length)
    return 'Open your laptop at home in the evening or morning and ask again: I need your day, money and career to go on.'
  return `**${title}**

${list(advice)}

Worked out by WorkSim's rules from your save, not by an AI model.`
}

export function builtinAnswer(request: AiRequest): AiAnswer {
  const { context, mode } = request
  const intent = intentOf(request)
  if (intent === 'suggest-formula') {
    const { text, proposal } = suggestFormula(itemOf(context, 'formula'), mode)
    return { text, source: SOURCE, ...(proposal ? { proposal } : {}) }
  }
  const text = (() => {
    switch (intent) {
      case 'analyse-data':
        return analyseData(itemOf(context, 'cells'), mode)
      case 'rewrite':
        return rewriteHelp(itemOf(context, 'selection') ?? itemOf(context, 'document'))
      case 'improve-draft':
        return reviewAnswer(itemOf(context, 'selection'), mode)
      case 'structure':
        return reportStructure(itemOf(context, 'document'))
      case 'outline':
        return OUTLINE
      case 'speaker-notes':
        return speakerNotes(itemOf(context, 'slides'), mode)
      case 'review-slides':
        return reviewSlides(itemOf(context, 'slides'), mode)
      case 'explain-code':
        return explainCode(itemOf(context, 'code'), itemOf(context, 'tests'), mode)
      case 'write-tests':
        return TESTS_HELP
      case 'resolve-ticket':
        return resolveTicket(itemOf(context, 'ticket'), mode)
      case 'explain-formula':
        return formulaAnswer(itemOf(context, 'formula') ?? itemOf(context, 'cells'), mode)
      case 'summarise':
        return summaryAnswer(
          itemOf(context, 'selection') ??
            itemOf(context, 'email') ??
            itemOf(context, 'ticket') ??
            itemOf(context, 'document') ??
            itemOf(context, 'slides'),
        )
      case 'action-items':
        return actionAnswer(itemOf(context, 'email') ?? itemOf(context, 'document'))
      case 'reply':
        return replyAnswer(itemOf(context, 'email') ?? itemOf(context, 'ticket'), mode)
      case 'approach':
        return approachAnswer(
          itemOf(context, 'assignment') ?? itemOf(context, 'case'),
          mode,
        )
      case 'review':
        return reviewAnswer(
          itemOf(context, 'selection') ??
            itemOf(context, 'document') ??
            itemOf(context, 'email'),
          mode,
        )
      case 'budget':
        return lifeAnswer(itemOf(context, 'budget'), 'Your budget this week')
      case 'plan-day':
        return lifeAnswer(itemOf(context, 'plan'), 'A plan')
      case 'learn-next':
        return lifeAnswer(itemOf(context, 'learning'), 'What to learn next')
      case 'prompting':
        return PROMPTING
      case 'other':
        return otherAnswer(request)
    }
  })()
  return { text, source: SOURCE }
}

export const builtinEngine: Engine = {
  id: 'builtin',
  check: async () => ({ ready: true }),
  answer: async (request) => builtinAnswer(request),
}
