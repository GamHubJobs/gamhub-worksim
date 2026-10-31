/** The shape of a department: its people and what working there sounds like. */
import type { Person } from '../company'

export interface Department {
  /** The career this department belongs to. */
  careerId: string
  /** e.g. "Finance & Administration". */
  name: string
  /** The sign on the office wall, e.g. "FINANCE & ADMINISTRATION". */
  sign: string
  /** The manager (role ID "manager"). */
  manager: Person
  /** The experienced colleague who can become a mentor (role ID "senior"). */
  senior: Person
  /** Who the manager reports to, e.g. "the finance director". */
  director: string
  /** One paragraph for the welcome email: what the team does. */
  intro: string
  /** What the senior colleague and Tom say at the daily stand-up. */
  standup: { senior: string; facilities: string }
  /** Weekly planning: the extra piece of work the manager needs help with. */
  planning: {
    lines: string[]
    volunteerReply: string
    /** Said by the senior colleague when nobody volunteers. */
    nobodyReply: string
  }
  /** The senior colleague introduces their work (first conversation). */
  seniorWork: string
  /** What the senior colleague offers to teach. */
  seniorTeaches: string
  /** Things the senior colleague says in passing. */
  seniorSmallTalk: string[]
  /** Practical tips for this kind of work (shared over coffee). */
  tips: string[]
  /** Short notices for the notice board. */
  news: string[]
}
