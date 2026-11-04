/**
 * How well the player uses AI at work: the quality of their prompts, whether
 * they check AI answers before relying on them, whether they keep personal
 * and secret information out of AI tools, and whether they review proposed
 * changes. Never how much they use it: asking more questions earns nothing.
 *
 * Kept in the career record (`work.record.ai`); pure functions, like the rest
 * of the game rules.
 */
import { fill } from '../content/departments'
import { createId } from '../lib/ids'
import type { MailMessage } from '../persistence/schemas'
import { firstName, type ProfileData } from './career'

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

export interface PromptReview {
  /** 0–4: one point each for a clear task, context, constraints and enough detail. */
  score: number
  tips: string[]
}

const TASK =
  /\b(explain|summari[sz]e|draft|write|rewrite|review|check|list|compare|suggest|analy[sz]e|calculate|plan|prioriti[sz]e|why|how|what|which|help me)\b/i
const CONTEXT_WORDS =
  /\b(this|these|attached|the (email|task|report|data|sheet|ticket|figures|document|slides))\b/i
const CONSTRAINTS =
  /\b(\d+\s*(words?|bullets?|points?|sentences?|lines?)|bullet|table|short|brief|formal|polite|professional|tone|for (my|the|a) (manager|client|customer|team|board)|in (plain|simple) (english|words)|step by step)\b/i

export function reviewPrompt(text: string, sharedContext: number): PromptReview {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  const hasTask = TASK.test(text)
  const hasContext = sharedContext > 0 || CONTEXT_WORDS.test(text)
  const hasConstraints = CONSTRAINTS.test(text)
  const detailed = words >= 8
  const tips = [
    hasTask ? '' : 'Start with what you want: "Explain…", "Draft…", "Check…".',
    hasContext
      ? ''
      : 'Give the context the answer depends on (or tick it in the Context panel).',
    hasConstraints
      ? ''
      : 'Say what a good answer looks like: length, format, tone or audience.',
    detailed ? '' : 'Add detail: one-line prompts get generic answers.',
  ].filter(Boolean)
  return {
    score: [hasTask, hasContext, hasConstraints, detailed].filter(Boolean).length,
    tips,
  }
}

// ---------------------------------------------------------------------------
// Personal and secret information
// ---------------------------------------------------------------------------

const SENSITIVE: Array<[string, RegExp]> = [
  ['an email address', /[\w.+-]+@[\w-]+\.[\w.-]+/],
  ['a phone number', /(?:\+\d{1,3}[\s-]?)?(?:\(?\d{2,5}\)?[\s-]?){2,}\d{3,4}\b/],
  ['a card number', /\b(?:\d{4}[\s-]?){3}\d{4}\b/],
  ['a password', /\b(password|passcode|pin)\b\s*[:=]?\s*\S+/i],
  [
    'a National Insurance number',
    /\b[A-CEGHJ-PR-TW-Z]{2}\s?\d{2}\s?\d{2}\s?\d{2}\s?[A-D]\b/i,
  ],
  ['bank details', /\b(sort code|account (no|number))\b|\b\d{2}-\d{2}-\d{2}\b/i],
]

/** What in a prompt looks personal or secret (and should not go into an AI tool). */
export function sensitiveIn(text: string): string[] {
  return SENSITIVE.filter(([, pattern]) => pattern.test(text)).map(([name]) => name)
}

// ---------------------------------------------------------------------------
// The record
// ---------------------------------------------------------------------------

export type AiEvent =
  /** `typed`: the player's own words (menu questions are WorkSim's, so their prompts do not count). */
  | { kind: 'question'; score: number; model: boolean; learning: boolean; typed: boolean }
  | { kind: 'verified' }
  | { kind: 'proposal'; outcome: 'applied' | 'dismissed' }
  | { kind: 'privacy'; heeded: boolean }

type AiRecord = ProfileData['work']['record']['ai']

/** The latest prompt scores kept (the average uses these). */
export const PROMPTS_KEPT = 30

/**
 * The manager's email the first time the player uses WorkSim AI: the
 * company's expectations, as a real employer would set them.
 */
export function aiPolicyMail(profile: ProfileData, now: number): MailMessage {
  return {
    id: createId(),
    from: 'manager',
    kind: 'info',
    receivedAt: now,
    readAt: null,
    subject: 'Using WorkSim AI: what we expect',
    body: fill(`Hi ${firstName(profile.name)},

I see you have started using WorkSim AI. Good: it is our approved assistant, and used well it saves a lot of time. A few expectations, the same for everyone here:

• You are responsible for anything you send, however it was written. Check every figure and claim against the source before it goes out.

• Never put personal data (customers' or colleagues' details, salaries, health), passwords or confidential client information into an AI tool. Take personal details out first.

• Only WorkSim AI is approved for company work. No free online chatbots.

• Use it to think and work better, not to skip the thinking. If you could not explain the answer yourself, it is not ready to send.

• If AI helped with a piece of work, it is fine to say so.

Ask me if anything is unclear.

{manager}`),
  }
}

export function recordAiUse(
  profile: ProfileData,
  event: AiEvent,
  now = Date.now(),
): ProfileData {
  const ai: AiRecord = { ...profile.work.record.ai }
  const firstUse = event.kind === 'question' && ai.firstUsedDay === null
  switch (event.kind) {
    case 'question':
      ai.questions += 1
      if (event.typed)
        ai.promptScores = [...ai.promptScores, event.score].slice(-PROMPTS_KEPT)
      if (event.model) ai.modelAnswers += 1
      if (event.learning) ai.learning += 1
      ai.firstUsedDay ??= profile.work.day
      break
    case 'verified':
      ai.verified += 1
      break
    case 'proposal':
      ai.proposals = {
        ...ai.proposals,
        [event.outcome]: ai.proposals[event.outcome] + 1,
      }
      break
    case 'privacy':
      ai.privacyWarnings += 1
      if (event.heeded) ai.privacyHeeded += 1
      break
  }
  return {
    ...profile,
    inbox: firstUse ? [...profile.inbox, aiPolicyMail(profile, now)] : profile.inbox,
    work: { ...profile.work, record: { ...profile.work.record, ai } },
  }
}

// ---------------------------------------------------------------------------
// Competencies
// ---------------------------------------------------------------------------

export type AiLevel = 'not-yet' | 'developing' | 'competent' | 'strong'

export const AI_LEVEL_NAMES: Record<AiLevel, string> = {
  'not-yet': 'Not shown yet',
  developing: 'Developing',
  competent: 'Competent',
  strong: 'Strong',
}

export interface AiCompetency {
  id: 'prompting' | 'verification' | 'responsible' | 'review'
  name: string
  description: string
  level: AiLevel
  /** What the level is based on, in plain words. */
  evidence: string
}

function level(ratio: number | null): AiLevel {
  if (ratio === null) return 'not-yet'
  return ratio >= 0.8 ? 'strong' : ratio >= 0.5 ? 'competent' : 'developing'
}

/** The AI competencies shown in the Career app, from the evidence so far. */
export function aiCompetencies(profile: ProfileData): AiCompetency[] {
  const ai = profile.work.record.ai
  const scores = ai.promptScores
  const prompting =
    scores.length >= 5 ? scores.reduce((a, b) => a + b, 0) / (scores.length * 4) : null
  const checks = ai.modelAnswers >= 3 ? Math.min(1, ai.verified / ai.modelAnswers) : null
  const reviewed = ai.proposals.applied + ai.proposals.dismissed
  return [
    {
      id: 'prompting',
      name: 'Prompting',
      description:
        'Clear requests with the task, the context, and what a good answer looks like.',
      level: level(prompting),
      evidence:
        prompting === null
          ? 'Shown after 5 questions to WorkSim AI.'
          : `Your last ${scores.length} prompts scored ${Math.round(prompting * 100)}% on task, context, constraints and detail.`,
    },
    {
      id: 'verification',
      name: 'Checking AI answers',
      description:
        'Checking what an AI model says against the facts before relying on it.',
      level: level(checks),
      evidence:
        checks === null
          ? 'Shown after 3 answers from an AI model (and in the AI cases).'
          : `You marked ${ai.verified} of ${ai.modelAnswers} AI-model answers as checked.`,
    },
    {
      id: 'responsible',
      name: 'Protecting data',
      description: 'Keeping personal and confidential information out of AI tools.',
      level:
        ai.privacyWarnings === 0
          ? 'not-yet'
          : level(ai.privacyHeeded / ai.privacyWarnings),
      evidence:
        ai.privacyWarnings === 0
          ? 'No personal or secret information has been spotted in your prompts.'
          : `You removed it ${ai.privacyHeeded} of ${ai.privacyWarnings} times when warned.`,
    },
    {
      id: 'review',
      name: 'Reviewing AI changes',
      description:
        'Reading proposed changes before accepting them, and rejecting poor ones.',
      level:
        reviewed >= 3 ? (ai.proposals.dismissed > 0 ? 'strong' : 'competent') : 'not-yet',
      evidence:
        reviewed === 0
          ? 'Shown once you have reviewed changes WorkSim AI proposed.'
          : `${ai.proposals.applied} applied and ${ai.proposals.dismissed} turned down after review.`,
    },
  ]
}
