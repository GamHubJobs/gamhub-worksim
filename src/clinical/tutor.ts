/**
 * The tutor: answers questions from a built-in knowledge base (general
 * healthcare-support topics plus the case's own teaching), gives hints during
 * a case on the easier settings, and explains the debrief afterwards. With
 * the player's own AI model switched on, the same knowledge goes to the
 * model to phrase a fuller answer; without one, the knowledge base answers.
 *
 * The patient's AI voice works the same way: the engine decides what the
 * patient says (from the case's facts), and a model may only reword it.
 *
 * SIMULATION ONLY: teaching material, simplified; not medical advice.
 */
import type { AiMessage } from '../ai/types'
import { getAction } from './actions'
import { assess } from './assessment'
import { phaseOf, timesDone } from './engine'
import type { CaseDef, Difficulty } from './model'
import { CATEGORY_NAMES } from './model'
import type { Encounter } from './schema'

interface Entry {
  id: string
  topics: string[]
  text: string
}

export const KNOWLEDGE: Entry[] = [
  {
    id: 'score',
    topics: ['early warning', 'warning score', 'news', 'score', 'points'],
    text: 'The early-warning score adds points for each observation outside the usual range: breathing rate, oxygen saturation, temperature, blood pressure, pulse and alertness. 0 is routine; 1–4 tell the nurse; 5–6, or 3 in any one observation, is urgent; 7 or more is an emergency.',
  },
  {
    id: 'sbar',
    topics: ['sbar', 'escalate', 'escalation', 'handover', 'tell the nurse', 'report'],
    text: 'SBAR: Situation (who you are, who the patient is, what worries you), Background (why they are here), Assessment (your observations with the numbers, the score, what you saw), Recommendation (what you need: "please come and see them now"). If you are worried, say so: it is never wrong to escalate.',
  },
  {
    id: 'acvpu',
    topics: ['acvpu', 'avpu', 'alert', 'confusion', 'confused', 'conscious'],
    text: 'ACVPU: Alert, new Confusion, responds to Voice, responds to Pain, Unresponsive. New confusion scores 3 on its own: always find out whether it is new for that person.',
  },
  {
    id: 'hands',
    topics: ['hand hygiene', 'hands', 'gel', 'wash', 'infection', 'five moments'],
    text: 'Clean your hands before touching a patient, before a clean procedure, after contact with body fluids, after touching a patient, and after touching their surroundings. Use soap and water for diarrhoea and when hands are visibly dirty.',
  },
  {
    id: 'ppe',
    topics: ['ppe', 'gloves', 'apron', 'gown', 'mask', 'isolation', 'side room'],
    text: 'Protective equipment protects you and the next patient: gloves and apron for body fluids; gown, gloves and sometimes a mask for isolation. Put it on before going in; take it off and clean your hands before leaving. Check for latex allergy.',
  },
  {
    id: 'consent',
    topics: ['consent', 'permission', 'refuse', 'refusal', 'capacity', 'say no'],
    text: 'Explain what you want to do and ask permission, every time. Adults with capacity can refuse any care; find out why, explain, offer another time, tell the nurse and document it.',
  },
  {
    id: 'scope',
    topics: [
      'scope',
      'allowed',
      'can i',
      'my role',
      'oxygen',
      'medicine',
      'diagnose',
      'prescribe',
    ],
    text: 'Healthcare support staff observe, record, care, communicate and escalate. Starting or changing oxygen, giving medicines, stopping a drip, interpreting an ECG and diagnosing are for registered nurses and doctors: tell them what you see, clearly and quickly.',
  },
  {
    id: 'resp',
    topics: ['breathing rate', 'respiratory', 'breaths', 'breathing'],
    text: 'Count breaths for a full minute without telling the patient (they change their breathing if they know). 12–20 a minute is usual; over 24 scores 3. It is the observation most often missed and one of the earliest signs of getting worse.',
  },
  {
    id: 'spo2',
    topics: ['saturation', 'oxygen level', 'oximeter', 'sats', 'spo2'],
    text: 'Oxygen saturation is measured with a finger clip; wait for a steady reading with a good trace. Most adults should be 94–98% (some people with lung disease have a lower target set by the doctor). Below target: tell the nurse.',
  },
  {
    id: 'bp',
    topics: ['blood pressure', 'bp', 'cuff'],
    text: 'Use the right size cuff on a bare upper arm, at heart level, with the patient resting. A top number of 90 or less scores 3; a very high reading with headache, chest pain or blurred vision is urgent.',
  },
  {
    id: 'pulse',
    topics: ['pulse', 'heart rate'],
    text: 'Feel the pulse at the wrist for a full minute and note if it is irregular. Over 130 or under 40 scores 3. A rising pulse with a falling blood pressure is a warning sign (for example, bleeding).',
  },
  {
    id: 'temp',
    topics: ['temperature', 'fever', 'temp', 'shivering'],
    text: 'Usual temperature is about 36–38 °C. High temperature with shivering, a fast pulse or confusion can mean a serious infection: escalate. A low temperature can matter too.',
  },
  {
    id: 'sepsis',
    topics: ['sepsis', 'infection'],
    text: 'Sepsis is the body’s harmful reaction to infection. Warning signs: high or low temperature, fast breathing, fast pulse, low blood pressure, new confusion, passing little urine, mottled skin. Escalate urgently: early treatment saves lives.',
  },
  {
    id: 'stroke',
    topics: ['stroke', 'fast', 'face', 'arm', 'speech'],
    text: 'FAST: Face drooping, Arm weakness, Speech difficulty, Time to call for help. Note the time it started, keep them nil by mouth, and call for help immediately.',
  },
  {
    id: 'hypo',
    topics: ['hypo', 'glucose', 'sugar', 'diabetes', 'insulin'],
    text: 'Low blood glucose (under 4.0 mmol/L) can cause shaking, sweating, irritability, confusion and drowsiness. Check the glucose if you are trained to, and tell the nurse at once: they follow the hypo plan.',
  },
  {
    id: 'anaphylaxis',
    topics: ['anaphylaxis', 'allergic', 'allergy', 'rash', 'swelling'],
    text: 'A severe allergic reaction can cause rash, swelling of the lips, tongue or throat, wheeze, and collapse, often minutes after a new medicine. Call for help immediately and stay with the patient.',
  },
  {
    id: 'falls',
    topics: ['fall', 'fell', 'floor', 'lift'],
    text: 'After a fall: call for help, do not lift or move the patient until a nurse has checked them, look for injuries (especially the head and hips), stay with them, and document and report it.',
  },
  {
    id: 'pressure',
    topics: [
      'pressure sore',
      'pressure ulcer',
      'pressure area',
      'skin',
      'heel',
      'reposition',
      'blanch',
    ],
    text: 'Pressure damage forms over bony areas (heels, sacrum, hips, elbows). Check skin at every turn; red skin that stays red when pressed is non-blanching and must be reported. Reposition as the care plan says and float heels off the mattress.',
  },
  {
    id: 'fluids',
    topics: ['fluid', 'drink', 'dehydrat', 'fluid balance', 'intake'],
    text: 'The fluid balance chart records everything in and out. Low intake, dark urine and little urine are signs of dehydration. Ask why someone is not drinking: often they cannot reach or hold the cup.',
  },
  {
    id: 'nbm',
    topics: ['nil by mouth', 'nbm', 'fasting', 'operation', 'surgery'],
    text: 'Nil by mouth means nothing to eat or drink, usually before an anaesthetic or when swallowing might be unsafe. Check the care plan before giving anything; mouth care is usually allowed.',
  },
  {
    id: 'identity',
    topics: ['identity', 'wristband', 'date of birth', 'name band', 'right patient'],
    text: 'Ask the patient to tell you their full name and date of birth, then check them against the wristband and the form. If anything does not match, stop and report it before going on.',
  },
  {
    id: 'specimens',
    topics: ['specimen', 'sample', 'label', 'urine', 'stool', 'sputum', 'blood test'],
    text: 'Check identity, explain, collect with clean technique, label at the bedside in front of the patient, and send promptly. Never label pots in advance; never send a specimen when identity does not match.',
  },
  {
    id: 'ecg',
    topics: ['ecg', 'electrocardiogram', 'heart tracing'],
    text: 'Trained healthcare support staff can record an ECG; the doctor interprets it. For chest pain, record it within 10 minutes and hand it straight to the doctor.',
  },
  {
    id: 'docs',
    topics: ['document', 'notes', 'write', 'record'],
    text: 'Good notes say what you saw (with numbers), what the patient said, what you did, who you told and when. If it is not written down, it did not happen.',
  },
]

const norm = (t: string) =>
  ` ${t
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')} `

function search(question: string, def?: CaseDef): string[] {
  const q = norm(question)
  const caseEntries: Entry[] = def
    ? [
        ...def.debrief.terms.map((t, i) => ({
          id: `term-${i}`,
          topics: [t.term.toLowerCase()],
          text: `${t.term}: ${t.meaning}`,
        })),
        {
          id: 'case',
          topics: [def.type.toLowerCase(), 'this case', 'this patient'],
          text: def.debrief.points.join(' '),
        },
      ]
    : []
  return [...caseEntries, ...KNOWLEDGE]
    .map((e) => ({
      e,
      best: Math.max(
        0,
        ...e.topics
          .filter((p) => q.includes(` ${p} `) || q.includes(` ${p}`))
          .map((p) => p.length),
      ),
    }))
    .filter((x) => x.best > 0)
    .sort((a, b) => b.best - a.best)
    .slice(0, 2)
    .map((x) => x.e.text)
}

/** What would help most now: the first critical action still to do (for hints). */
export function nextStep(def: CaseDef, enc: Encounter): string | null {
  const reached = new Set(enc.phases.map((p) => p.id))
  const pending = Object.entries(def.actions)
    .filter(
      ([, a]) => a.as === 'critical' && (!a.within?.from || reached.has(a.within.from)),
    )
    .filter(([id, a]) => ![id, ...(a.alt ?? [])].some((x) => timesDone(enc, x).length))
  return pending[0]?.[0] ?? null
}

/** A hint during a case; how much it says depends on the difficulty. */
export function hint(def: CaseDef, enc: Encounter): string {
  const d = enc.difficulty as Difficulty
  if (d === 'advanced' || d === 'expert')
    return 'At this level there are no hints during the case. Think: is the patient safe, what do the numbers say, who needs to know?'
  const id = nextStep(def, enc)
  if (!id)
    return phaseOf(def, enc.phase).concerning
      ? 'You have done the essentials. Stay with the patient and keep watching.'
      : 'You have done the essentials. Check your notes and the call bell before you finish.'
  const action = getAction(id)
  if (!action) return 'Look at the patient again: what has changed?'
  return d === 'beginner'
    ? `Try this next: ${action.label}. ${def.actions[id].why}`
    : `Think about ${CATEGORY_NAMES[action.category].toLowerCase()}: something important there has not been done yet.`
}

/** The tutor's own answer, from the knowledge base and (after the case) the debrief. */
export function tutorAnswer(
  question: string,
  def?: CaseDef,
  enc?: Encounter | null,
): string {
  const q = norm(question)
  if (
    def &&
    enc &&
    !enc.ended &&
    /( hint | next | what should i | stuck | help me )/.test(q)
  )
    return hint(def, enc)
  if (
    def &&
    enc?.ended &&
    /( why | missed | wrong | score | mark | debrief | better )/.test(q)
  ) {
    const d = assess(def, enc)
    const first = d.improvements[0]
    return first
      ? `${first}${d.improvements.length > 1 ? ` (and ${d.improvements.length - 1} more point${d.improvements.length > 2 ? 's' : ''} in the debrief)` : ''}`
      : 'You did everything this case looks for. Try it again at a harder setting.'
  }
  const found = search(question, def)
  if (found.length) return found.join('\n\n')
  return 'I don’t have notes on that. Try asking about observations, the early-warning score, SBAR, consent, infection prevention, specimens, or the signs in this case.'
}

/** The request for the player's own model: a fuller tutor answer from the same knowledge. */
export function tutorRequest(
  question: string,
  def: CaseDef | undefined,
  enc: Encounter | null | undefined,
): { messages: AiMessage[]; context: { label: string; text: string } } {
  const known = tutorAnswer(question, def, enc)
  const state =
    def && enc
      ? `Case: ${def.title} (${def.type}). ${enc.ended ? 'The case has ended.' : 'The case is in progress: do not give away more than a hint.'}`
      : 'No case open.'
  return {
    messages: [
      {
        role: 'user',
        text: `You are a clinical educator in a hospital training game for healthcare support staff (not nurses or doctors). Answer the trainee's question in plain English in 2 to 5 sentences, using the notes below. This is a simulation for learning: keep within a support worker's role (observe, record, care, communicate, escalate), never advise diagnosing, prescribing or treating, and say "ask the nurse" for anything beyond that.\n\nQuestion: ${question}`,
      },
    ],
    context: {
      label: def ? `Patient case: ${def.title}` : 'Clinical tutor',
      text: `${state}\nNotes:\n${known}`,
    },
  }
}

/** The request to reword what the engine decided the patient says (facts unchanged). */
export function patientRequest(
  def: CaseDef,
  enc: Encounter,
  said: string,
  decided: string,
): { messages: AiMessage[]; context: { label: string; text: string } } {
  const p = def.patient
  const phase = phaseOf(def, enc.phase)
  return {
    messages: [
      {
        role: 'user',
        text: `You are voicing ${p.callMe}, a fictional ${p.age}-year-old patient in a hospital training game. ${p.manner} Right now: ${phase.mood}. The trainee said: "${said}". Reword the patient's reply below in their own voice, in 1 to 3 short spoken sentences. Keep exactly the same facts: add no new symptoms, history, numbers or opinions, and do not mention anything not in the reply.\n\nReply: ${decided}`,
      },
    ],
    context: { label: `Patient: ${p.callMe}`, text: `${p.background}\n${phase.looks}` },
  }
}
