/**
 * What WorkSim AI knows about the player's life at home, as context items for
 * a request: the week's money, the evening (or morning) ahead, and what to
 * learn next. Each item's text is a short plain summary (what a model would
 * see, without the player's name); its data holds the built-in guide's advice,
 * worked out here with deterministic rules from the save.
 */
import type { ContextItem } from '../ai/types'
import { JOB_ADS } from '../content/careerLife'
import { getSkill } from '../content/careers'
import {
  ALARM,
  COMMUTES,
  HOME_ACTIONS,
  NEEDS,
  SLEEP_NEEDED,
  formatMoney,
  type NeedId,
} from '../content/life'
import { HOURS } from '../content/workday'
import { careerLevel, promotionProgress, type ProfileData } from './career'
import { basePay, roleFor, screening, weeklyPay } from './careerLife'
import { formatTime, weekdayIndex, weekNumber } from './clock'
import { homeOf } from './home'
import { arrivalFor, canDo, commuteMinutes, lifePhase } from './life'

// ---------------------------------------------------------------------------
// Money
// ---------------------------------------------------------------------------

type Category = 'Pay' | 'Side business' | 'Rent' | 'Car' | 'Travel' | 'Food' | 'Other'

const TRAVEL = new RegExp(`^(${COMMUTES.map((c) => c.name).join('|')}) (to work|home)$`)

export function categoryOf(text: string, amount: number): Category {
  if (amount > 0) return /^Pay for week/.test(text) ? 'Pay' : 'Side business'
  if (/^Rent/.test(text)) return 'Rent'
  if (/lease|^Car /.test(text)) return 'Car'
  if (TRAVEL.test(text)) return 'Travel'
  if (/breakfast|dinner|meal|groceries|takeaway|coffee|Kettle/i.test(text)) return 'Food'
  return 'Other'
}

export interface Budget {
  money: number
  /** This week so far, by category (spending negative). */
  week: Partial<Record<Category, number>>
  /** What is due before the next pay day, and when that is. */
  due: Array<{ text: string; amount: number }>
  nextPay: number
  advice: string[]
}

export function budgetOf(profile: ProfileData): Budget {
  const life = profile.work.life
  const week = weekNumber(profile.work.day)
  const totals: Budget['week'] = {}
  let taxis = 0
  for (const entry of life.ledger) {
    if (weekNumber(entry.day) !== week) continue
    const category = categoryOf(entry.text, entry.amount)
    totals[category] = (totals[category] ?? 0) + entry.amount
    if (/^Taxi /.test(entry.text)) taxis++
  }
  const nextPay = weeklyPay(profile)
  const due: Budget['due'] = []
  // Rent and the car lease come on Monday, after Friday's pay.
  const beforePay = weekdayIndex(profile.work.day) < 4
  const rent = homeOf(life).rent
  if (!beforePay) {
    due.push({ text: 'Rent on Monday', amount: rent })
  }
  const advice: string[] = []
  if (life.money < 0)
    advice.push(
      `You are overdrawn by ${formatMoney(-life.money)}. Spend only on essentials until pay day, and cook rather than buy food out.`,
    )
  else if (!beforePay && life.money < rent)
    advice.push(
      `Rent of ${formatMoney(rent)} is due on Monday and you have ${formatMoney(life.money)}. Hold back until then.`,
    )
  if (taxis > 0) {
    const bus = COMMUTES.find((c) => c.id === 'bus')!
    const taxi = COMMUTES.find((c) => c.id === 'taxi')!
    advice.push(
      `${taxis} taxi journey(s) this week: the bus would have saved ${formatMoney(taxis * (taxi.cost - bus.cost))}. Leaving 15 minutes earlier makes the bus work.`,
    )
  }
  const food = -(totals.Food ?? 0)
  if (food > 3000 && life.food < 3)
    advice.push(
      `${formatMoney(food)} on food bought out this week. A week of groceries is ${formatMoney(2400)} for 7 meals.`,
    )
  const fixed = rent + (life.vehicles.car ? 6000 : 0)
  const spare = nextPay - fixed
  if (spare > 0)
    advice.push(
      `Each week you earn ${formatMoney(nextPay)} and your fixed costs are ${formatMoney(fixed)} (rent${life.vehicles.car ? ' and the car' : ''}). Setting aside a tenth of what is left, ${formatMoney(Math.round(spare / 10))}, builds a cushion.`,
    )
  if (
    life.career.raisePct === 0 &&
    basePay(profile) === nextPay &&
    profile.work.reviews.length
  )
    advice.push(
      'You have a review on record: it may be worth asking for a rise (laptop, Pay).',
    )
  if (!advice.length) advice.push('Your money looks in order this week.')
  return { money: life.money, week: totals, due, nextPay, advice }
}

export function budgetItem(profile: ProfileData): ContextItem {
  const b = budgetOf(profile)
  const lines = [
    `Balance: ${formatMoney(b.money)}.`,
    `Weekly pay: ${formatMoney(b.nextPay)}, on Fridays. Rent: ${formatMoney(homeOf(profile.work.life).rent)} on Mondays.`,
    `This week so far: ${
      Object.entries(b.week)
        .map(([k, v]) => `${k} ${formatMoney(v!)}`)
        .join(', ') || 'nothing in or out yet'
    }.`,
    ...b.due.map((d) => `Due: ${d.text}, ${formatMoney(d.amount)}.`),
  ]
  return {
    kind: 'budget',
    label: 'Your money this week',
    text: lines.join('\n'),
    data: { advice: b.advice },
  }
}

// ---------------------------------------------------------------------------
// The evening or morning ahead
// ---------------------------------------------------------------------------

/** The time to be in bed for a full night before the alarm. */
export const IDEAL_BEDTIME = 24 * 60 + ALARM - SLEEP_NEEDED * 60

export function planOf(profile: ProfileData): string[] {
  const life = profile.work.life
  const phase = lifePhase(profile)
  const steps: string[] = []
  if (phase === 'morning') {
    const left = HOURS.start - life.minute
    const bus = commuteMinutes(life, 'bus')
    if (!life.ready.ate)
      steps.push('Eat breakfast (kitchen): starting hungry costs energy.')
    if (!life.ready.showered && life.needs.hygiene < 50)
      steps.push('Have a shower (bathroom).')
    if (!life.ready.dressed) steps.push('Get dressed for work (bedroom).')
    const late = arrivalFor(profile, 'bus').late
    steps.push(
      late > 0
        ? `Leave now: even the bus gets you in ${late} minutes late.`
        : `Leave by ${formatTime(HOURS.start - bus)} for the bus (${bus} minutes); you have ${left} minutes before work starts.`,
    )
    return steps
  }
  if (phase !== 'evening')
    return ['You are at work: this is for evenings and mornings at home.']
  const left = IDEAL_BEDTIME - life.minute
  // The lowest needs first, each with the best thing to do about it now.
  const low = NEEDS.filter((n) => life.needs[n.id] < 60).sort(
    (a, b) => life.needs[a.id] - life.needs[b.id],
  )
  const best = (need: NeedId) =>
    HOME_ACTIONS.filter(
      (a) => (a.needs?.[need] ?? 0) > 0 && !canDo(profile, a) && a.minutes <= left,
    ).sort((a, b) => (b.needs?.[need] ?? 0) - (a.needs?.[need] ?? 0))[0]
  for (const need of low) {
    const action = best(need.id)
    if (action)
      steps.push(
        `${need.name} is at ${life.needs[need.id]}: ${action.label.toLowerCase()} (${action.minutes} min).`,
      )
  }
  if (life.food === 0) steps.push('The fridge is empty: order groceries for the week.')
  const interview = life.career.applications.find((a) => a.stage === 'interview')
  if (interview)
    steps.push(
      `You have an interview to do with ${JOB_ADS.find((j) => j.id === interview.jobId)?.employer} (laptop, Jobs, 60 min).`,
    )
  steps.push(
    left > 0
      ? `Be in bed by ${formatTime(IDEAL_BEDTIME)} for ${SLEEP_NEEDED} hours’ sleep: that leaves ${Math.floor(left / 60)} h ${left % 60} min.`
      : `It is past ${formatTime(IDEAL_BEDTIME)}: go to bed now to sleep as much as you can.`,
  )
  return steps
}

export function planItem(profile: ProfileData): ContextItem {
  const life = profile.work.life
  const phase = lifePhase(profile)
  return {
    kind: 'plan',
    label: phase === 'morning' ? 'Your morning' : 'Your evening',
    text: [
      `It is ${formatTime(life.minute)} (${phase}). Work starts at ${formatTime(HOURS.start)}.`,
      `Needs out of 100: ${NEEDS.map((n) => `${n.name.toLowerCase()} ${life.needs[n.id]}`).join(', ')}.`,
      `Energy ${profile.work.wellbeing.energy}, stress ${profile.work.wellbeing.stress}. Meals in the fridge: ${life.food}.`,
    ].join('\n'),
    data: { advice: planOf(profile) },
  }
}

// ---------------------------------------------------------------------------
// Learning
// ---------------------------------------------------------------------------

export function learningOf(profile: ProfileData): string[] {
  const { career } = careerLevel(profile)
  const progress = promotionProgress(profile)
  const advice: string[] = []
  const weakest = career.skills
    .filter((id) => id !== 'ai-use')
    .sort((a, b) => (profile.skills[a] ?? 0) - (profile.skills[b] ?? 0))
    .slice(0, 2)
    .map((id) => getSkill(id)?.name ?? id)
  if (weakest.length)
    advice.push(
      `Your least practised skills: ${weakest.join(' and ')}. An hour’s study at home (it needs a desk) adds to the weakest one.`,
    )
  if (progress.next) {
    const left: string[] = []
    if (progress.xpNeeded > 0) left.push(`${progress.xpNeeded} more XP`)
    if (progress.assignmentsPassed < progress.assignmentsTotal)
      left.push(
        `${progress.assignmentsTotal - progress.assignmentsPassed} more task(s) at this level done to standard`,
      )
    if (!progress.reviewMet) left.push('a better performance review')
    if (!progress.reputationMet) left.push('a better reputation')
    if (progress.assessment && !progress.assessmentMet)
      left.push(`the ${progress.assessment.title} assessment`)
    advice.push(
      left.length
        ? `For promotion to ${progress.next.title}: ${left.join(', ')}.`
        : `You are ready for promotion to ${progress.next.title}.`,
    )
  }
  // The nearest job advert the record does not yet meet, and why.
  const gap = JOB_ADS.map((ad) => ({ ad, reasons: screening(profile, ad) })).find(
    (x) => x.reasons.length > 0,
  )
  if (gap)
    advice.push(
      `${gap.ad.employer} (${roleFor(profile, gap.ad)}) would not shortlist you yet: ${gap.reasons[0]}`,
    )
  advice.push(
    'At work, ask WorkSim AI in Learning mode for hints rather than answers: you keep the skill.',
  )
  return advice
}

export function learningItem(profile: ProfileData): ContextItem {
  const { career, current } = careerLevel(profile)
  return {
    kind: 'learning',
    label: 'Your skills and career',
    text: [
      `Career: ${career.name}, level ${current.title}. XP ${profile.xp}.`,
      `Skills (XP): ${career.skills.map((id) => `${getSkill(id)?.name ?? id} ${profile.skills[id] ?? 0}`).join(', ')}.`,
      `Latest review: ${profile.work.reviews.at(-1)?.rating ?? 'none yet'}.`,
    ].join('\n'),
    data: { advice: learningOf(profile) },
  }
}

/** Everything about life at home WorkSim AI can be given, most relevant first. */
export function lifeContext(profile: ProfileData): ContextItem[] {
  return [planItem(profile), budgetItem(profile), learningItem(profile)]
}
