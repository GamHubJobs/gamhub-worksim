/**
 * Career life outside the office: job adverts from other (fictional) employers,
 * their interviews, asking for a pay rise, and a side business. The rules are
 * in game/careerLife.ts; everything here is deterministic content.
 */
import type { REVIEW_RATINGS } from './schemas'

type ReviewRating = (typeof REVIEW_RATINGS)[number]

export interface JobAd {
  id: string
  employer: string
  about: string
  /** The role, at the player's level (0) or one above it (1), in their career. */
  step: 0 | 1
  /** The pay offered, against the player's base pay now. */
  payFactor: number
  /** What the employer screens for. */
  minLevel: number
  minRating: ReviewRating | null
  minTasks: number
  /** Three interview questions (IDs in INTERVIEW_QUESTIONS). */
  questions: [string, string, string]
}

export const JOB_ADS: JobAd[] = [
  {
    id: 'larkspur',
    employer: 'Larkspur Housing Trust',
    about: 'A local housing charity: friendly, steady, a little less pay.',
    step: 0,
    payFactor: 1.04,
    minLevel: 1,
    minRating: null,
    minTasks: 2,
    questions: ['why-us', 'mistake', 'priorities'],
  },
  {
    id: 'harbour-lane',
    employer: 'Harbour Lane Logistics',
    about: 'A busy freight company by the docks. Fast-paced and well run.',
    step: 0,
    payFactor: 1.1,
    minLevel: 1,
    minRating: 'solid',
    minTasks: 4,
    questions: ['pressure', 'teamwork', 'mistake'],
  },
  {
    id: 'quill-ledger',
    employer: 'Quill & Ledger Partners',
    about: 'A growing firm of advisers. They promote people who learn quickly.',
    step: 1,
    payFactor: 1.18,
    minLevel: 2,
    minRating: 'strong',
    minTasks: 6,
    questions: ['learning', 'pressure', 'difficult-person'],
  },
  {
    id: 'brightwater',
    employer: 'Brightwater District Council',
    about: 'Public service with good holidays and a pension. Thorough interviews.',
    step: 1,
    payFactor: 1.24,
    minLevel: 3,
    minRating: 'strong',
    minTasks: 9,
    questions: ['priorities', 'difficult-person', 'why-us'],
  },
]

export interface InterviewAnswer {
  text: string
  /** 2 a strong answer, 1 an adequate one, 0 a weak one. */
  points: 0 | 1 | 2
  feedback: string
}

export interface InterviewQuestion {
  id: string
  question: string
  answers: [InterviewAnswer, InterviewAnswer, InterviewAnswer]
}

/** Competency questions: the strongest answers give a real example and its result. */
export const INTERVIEW_QUESTIONS: InterviewQuestion[] = [
  {
    id: 'why-us',
    question: 'Why do you want to work here?',
    answers: [
      {
        text: 'Honestly, the pay is better than where I am.',
        points: 0,
        feedback: 'Pay matters, but leading with it says nothing about the job or them.',
      },
      {
        text: 'I read about what you do and it fits the work I enjoy most, and I would like to grow with a team like yours.',
        points: 2,
        feedback: 'Specific to them and to you: it shows you did your homework.',
      },
      {
        text: 'It seems like a good company and I am looking for a change.',
        points: 1,
        feedback: 'Polite but vague: say what in particular draws you.',
      },
    ],
  },
  {
    id: 'mistake',
    question: 'Tell us about a mistake you made at work.',
    answers: [
      {
        text: 'I once sent figures before checking them. I told my manager straight away, corrected them, and now I always check totals against the source.',
        points: 2,
        feedback:
          'Owning it, fixing it and saying what you changed is exactly what they hope to hear.',
      },
      {
        text: 'I do not really make mistakes; I am very careful.',
        points: 0,
        feedback: 'Everyone makes mistakes. This sounds either unaware or untrue.',
      },
      {
        text: 'Sometimes I rush, but I am working on it.',
        points: 1,
        feedback: 'Honest, but give a real example and what happened next.',
      },
    ],
  },
  {
    id: 'priorities',
    question: 'You have three urgent jobs and time for two. What do you do?',
    answers: [
      {
        text: 'Work late until all three are done.',
        points: 1,
        feedback: 'Committed, but it hides the problem and is not sustainable.',
      },
      {
        text: 'Pick the two I like best.',
        points: 0,
        feedback: 'Priorities come from the impact and the deadline, not preference.',
      },
      {
        text: 'Check which matters most and when each is really needed, agree the order with my manager, and tell whoever is waiting for the third.',
        points: 2,
        feedback: 'Clear, honest and practical: you manage expectations early.',
      },
    ],
  },
  {
    id: 'pressure',
    question: 'Describe a time you worked under pressure.',
    answers: [
      {
        text: 'Month-end once came with two people off sick. I listed what had to be done, asked for help with one part, and we closed on time.',
        points: 2,
        feedback: 'A real situation, what you did and the result: a complete answer.',
      },
      {
        text: 'I work well under pressure.',
        points: 0,
        feedback: 'A claim with no example: interviewers want evidence.',
      },
      {
        text: 'Deadlines are stressful but I always get there in the end.',
        points: 1,
        feedback: 'Fair, but tell them how you got there.',
      },
    ],
  },
  {
    id: 'teamwork',
    question: 'How do you work with colleagues?',
    answers: [
      {
        text: 'I prefer to work on my own so nobody slows me down.',
        points: 0,
        feedback: 'Every job involves other people; this rings alarm bells.',
      },
      {
        text: 'I get on with everyone.',
        points: 1,
        feedback: 'Nice, but give an example of working together on something.',
      },
      {
        text: 'I keep people updated, ask early when I am stuck, and help out when someone is snowed under. Last month I covered a colleague’s invoices so they could finish a report.',
        points: 2,
        feedback: 'Habits plus an example: that is convincing.',
      },
    ],
  },
  {
    id: 'learning',
    question: 'How do you learn something new for work?',
    answers: [
      {
        text: 'I wait to be sent on a course.',
        points: 0,
        feedback: 'Passive: they want people who take the first step.',
      },
      {
        text: 'I try it on a small real task, look things up when I am stuck, and ask someone who knows to check my work.',
        points: 2,
        feedback: 'Practical and self-driven, with a check on quality.',
      },
      {
        text: 'I look it up online.',
        points: 1,
        feedback: 'A start, but say how you practise and check you have it right.',
      },
    ],
  },
  {
    id: 'difficult-person',
    question: 'Tell us about working with someone difficult.',
    answers: [
      {
        text: 'A supplier kept missing deadlines. I asked what was getting in the way, we agreed a clear date with a reminder, and it worked after that.',
        points: 2,
        feedback: 'Calm, curious and solution-focused, with a result.',
      },
      {
        text: 'I just avoid people like that.',
        points: 0,
        feedback: 'Avoiding the problem rarely works at work.',
      },
      {
        text: 'I stay professional and do not let it bother me.',
        points: 1,
        feedback: 'Good attitude; add what you actually did.',
      },
    ],
  },
]

export const getJobAd = (id: string) => JOB_ADS.find((ad) => ad.id === id)
export const getQuestion = (id: string) => INTERVIEW_QUESTIONS.find((q) => q.id === id)!

/** Out of 6 (three questions, 2 each), what an interview needs for an offer. */
export const INTERVIEW_PASS = 4
/** How long an offer stands, in days. */
export const OFFER_DAYS = 7
/** How long before applying to the same employer again, in days. */
export const REAPPLY_DAYS = 28
export const APPLY_MINUTES = 45
export const INTERVIEW_MINUTES = 60

/** The rises the player can ask for, in per cent. */
export const PAY_ASKS = [3, 6, 10, 15] as const
/** Weeks between pay talks. */
export const PAY_TALK_WEEKS = 4
export const PAY_TALK_MINUTES = 30
/** The most a rise can add up to, in per cent. */
export const MAX_RAISE = 40

/** How much each review rating supports a rise, in per cent. */
export const RATING_SUPPORT: Record<ReviewRating, number> = {
  outstanding: 8,
  strong: 5,
  solid: 2,
  developing: 0,
}

export type BusinessId = 'tutoring' | 'crafts' | 'repairs'

export interface SideBusiness {
  id: BusinessId
  name: string
  description: string
  /** What it costs to set up, in pence. */
  setup: number
  /** Each evening's session. */
  minutes: number
  /** Materials each session, in pence. */
  materials: number
  /** Paid each session, at 0 regulars, and for each regular customer. */
  base: number
  perLevel: number
  energy: number
  needs: Partial<Record<'hunger' | 'hygiene' | 'social' | 'fun', number>>
  needsBike?: boolean
}

export const SIDE_BUSINESSES: SideBusiness[] = [
  {
    id: 'tutoring',
    name: 'Evening tutoring',
    description:
      'Online lessons in the skills you use at work. An advert on a local board gets you started.',
    setup: 3000,
    minutes: 90,
    materials: 0,
    base: 1800,
    perLevel: 400,
    energy: -6,
    needs: { social: 6, fun: -2 },
  },
  {
    id: 'crafts',
    name: 'Handmade cards and prints',
    description: 'Make cards and prints at the kitchen table and sell them online.',
    setup: 6000,
    minutes: 120,
    materials: 300,
    base: 1000,
    perLevel: 300,
    energy: -4,
    needs: { fun: 8 },
  },
  {
    id: 'repairs',
    name: 'Bike tune-ups',
    description: 'Fix neighbours’ bikes outside your door. You need a bike of your own.',
    setup: 4500,
    minutes: 90,
    materials: 150,
    base: 1500,
    perLevel: 400,
    energy: -5,
    needs: { hygiene: -8, social: 4 },
    needsBike: true,
  },
]

export const getBusiness = (id: string) => SIDE_BUSINESSES.find((b) => b.id === id)
/** Sessions for each new regular customer, and the most regulars. */
export const SESSIONS_PER_LEVEL = 3
export const MAX_BUSINESS_LEVEL = 5
/** Evenings a week before the side business starts to wear the player down. */
export const BUSINESS_EVENINGS = 3
