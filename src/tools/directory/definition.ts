/** Directory, the identity and asset console: its registration with the tools framework. */
import { z } from 'zod'
import { FileCheckBaseSchema } from '../../content/schemas'
import { checkResult } from '../checks'
import type { ToolDefinition } from '../types'
import { sampleDirectory } from './data'
import { DirectoryStateSchema, type DirectoryState, type User } from './schema'

export const DirectoryCheckSchema = z.discriminatedUnion('type', [
  /** An account is in the expected state. */
  FileCheckBaseSchema.extend({
    type: z.literal('account'),
    /** The person's full name (the username may vary). */
    name: z.string(),
    expect: z.object({
      exists: z.boolean().optional(),
      status: z.enum(['active', 'disabled']).optional(),
      locked: z.boolean().optional(),
      mfa: z.boolean().optional(),
      mustChangePassword: z.boolean().optional(),
      department: z.string().optional(),
      /** Group names the account must be in. */
      inGroups: z.array(z.string()).optional(),
      /** Group names the account must not be in. */
      notInGroups: z.array(z.string()).optional(),
      /** The account has exactly these groups and no others. */
      onlyGroups: z.array(z.string()).optional(),
    }),
  }),
  /** A device is in the expected state. */
  FileCheckBaseSchema.extend({
    type: z.literal('asset'),
    tag: z.string(),
    status: z.enum(['in-use', 'in-stock', 'repair', 'lost', 'retired']).optional(),
    /** Full name of the person it is assigned to ('' for nobody). */
    assignedTo: z.string().optional(),
  }),
  /** The player did this (it is in the audit log), e.g. a password reset. */
  FileCheckBaseSchema.extend({
    type: z.literal('action'),
    action: z.string(),
    /** Full name of the person, or an asset tag. */
    target: z.string(),
    /** Whether the action must NOT have been done (e.g. no reset for an attacker). */
    absent: z.boolean().default(false),
  }),
])
export type DirectoryCheck = z.infer<typeof DirectoryCheckSchema>

const byName = (state: DirectoryState, name: string): User | undefined =>
  state.users.find((u) => u.name.trim().toLowerCase() === name.trim().toLowerCase())

const groupName = (state: DirectoryState, id: string) =>
  state.groups.find((g) => g.id === id)?.name ?? id

function gradeCheck(check: DirectoryCheck, player: DirectoryState) {
  switch (check.type) {
    case 'account': {
      const user = byName(player, check.name)
      const e = check.expect
      if (e.exists === false) {
        return checkResult(
          check,
          user ? 0 : 1,
          user ? [`An account exists for ${check.name}.`] : [],
        )
      }
      if (!user) return checkResult(check, 0, [`There is no account for ${check.name}.`])
      const groups = user.groups.map((g) => groupName(player, g).toLowerCase())
      const problems: string[] = []
      let tests = 0
      const test = (ok: boolean, problem: string) => {
        tests++
        if (!ok) problems.push(problem)
      }
      if (e.status)
        test(
          user.status === e.status,
          `${user.name}’s account is ${user.status}; it should be ${e.status}.`,
        )
      if (e.locked !== undefined)
        test(
          user.locked === e.locked,
          e.locked
            ? `${user.name} should be locked.`
            : `${user.name} is still locked out.`,
        )
      if (e.mfa !== undefined)
        test(
          user.mfa === e.mfa,
          e.mfa
            ? `${user.name} has no MFA registered.`
            : `${user.name}’s old MFA registration was not reset.`,
        )
      if (e.mustChangePassword !== undefined) {
        test(
          user.mustChangePassword === e.mustChangePassword,
          `${user.name}’s password was not reset.`,
        )
      }
      if (e.department) {
        test(
          user.department.toLowerCase() === e.department.toLowerCase(),
          `${user.name}’s department is “${user.department}”; it should be ${e.department}.`,
        )
      }
      for (const g of e.inGroups ?? [])
        test(groups.includes(g.toLowerCase()), `${user.name} is not in ${g}.`)
      for (const g of e.notInGroups ?? [])
        test(!groups.includes(g.toLowerCase()), `${user.name} is still in ${g}.`)
      if (e.onlyGroups) {
        const extra = groups.filter(
          (g) => !e.onlyGroups!.some((o) => o.toLowerCase() === g),
        )
        const missing = e.onlyGroups.filter((o) => !groups.includes(o.toLowerCase()))
        test(
          extra.length === 0,
          `${user.name} has access they should not: ${extra.join(', ')}.`,
        )
        test(missing.length === 0, `${user.name} is missing: ${missing.join(', ')}.`)
      }
      return checkResult(check, tests === 0 ? 1 : 1 - problems.length / tests, problems)
    }
    case 'asset': {
      const asset = player.assets.find((a) => a.tag === check.tag)
      if (!asset) return checkResult(check, 0, [`There is no asset ${check.tag}.`])
      const problems: string[] = []
      let tests = 0
      if (check.status) {
        tests++
        if (asset.status !== check.status)
          problems.push(`${check.tag} is ${asset.status}; it should be ${check.status}.`)
      }
      if (check.assignedTo !== undefined) {
        tests++
        const holder = player.users.find((u) => u.id === asset.assignedTo)?.name ?? ''
        if (holder.toLowerCase() !== check.assignedTo.toLowerCase()) {
          problems.push(
            check.assignedTo
              ? `${check.tag} should be assigned to ${check.assignedTo}${holder ? `, not ${holder}` : ''}.`
              : `${check.tag} is still assigned to ${holder}.`,
          )
        }
      }
      return checkResult(check, tests === 0 ? 1 : 1 - problems.length / tests, problems)
    }
    case 'action': {
      const target = byName(player, check.target)?.username ?? check.target
      const done = player.audit.some(
        (a) => a.byYou && a.action === check.action && a.target === target,
      )
      const ok = check.absent ? !done : done
      return checkResult(
        check,
        ok ? 1 : 0,
        ok
          ? []
          : [
              check.absent
                ? `“${check.action}” should not have been done for ${check.target}.`
                : `No “${check.action}” for ${check.target} in the audit log.`,
            ],
      )
    }
  }
}

export const directory: ToolDefinition<DirectoryState, DirectoryCheck> = {
  id: 'directory',
  name: 'Directory',
  category: 'Identity and asset management',
  icon: 'directory',
  sections: [
    {
      id: 'users',
      name: 'Users',
      description: 'Accounts: create, disable, unlock, reset passwords and MFA, groups.',
    },
    {
      id: 'groups',
      name: 'Groups',
      description: 'Security groups and what each one gives access to.',
    },
    {
      id: 'assets',
      name: 'Assets',
      description:
        'Laptops, phones and monitors: who has what, stock, repairs and warranties.',
    },
    { id: 'audit', name: 'Audit log', description: 'Every change made, in order.' },
  ],
  state: DirectoryStateSchema,
  practice: () => sampleDirectory(),
  summary: (state) => {
    const changes = state.audit.filter((a) => a.byYou).length
    return `${state.users.length} accounts, ${state.assets.length} assets${changes ? `, ${changes} change${changes === 1 ? '' : 's'} made` : ''}`
  },
  check: DirectoryCheckSchema,
  grade: (checks, player) =>
    checks.map((check) =>
      player
        ? gradeCheck(check, player)
        : checkResult(check, 0, ['The directory was not handed in.']),
    ),
  guide: {
    intro:
      'Directory is where IT support manages who can sign in, what they can reach and which equipment they have. Most service desk requests end here: a new starter, a leaver, a lockout, a lost phone. Every change is written to the audit log, because access to systems is something a company must always be able to account for.',
    topics: [
      {
        title: 'Set up a new starter (joiner)',
        body: 'In Users, click New account: enter the full name, check the suggested username (first.last), and choose the department and job title. Then add the groups their manager asked for: only those, because each group grants access. Register MFA with them on their first day, and assign their laptop (and phone) in Assets from stock.',
      },
      {
        title: 'Handle a leaver',
        body: 'Disable the account (never delete it straight away: their files and email may be needed). Remove them from every group except All Staff, especially privileged ones, and return their devices to stock in Assets so they can be wiped and reissued.',
      },
      {
        title: 'Lockouts, passwords and MFA',
        body: 'Before unlocking or resetting, confirm who you are talking to and look at the failed sign-ins: many failures from an unknown place may be an attack, not a forgetful user. A password reset issues a temporary password that must be changed at the next sign-in. Reset MFA when someone has lost or replaced their phone, so they can register again.',
      },
      {
        title: 'Least privilege',
        body: 'People should have the access their job needs, and no more. Privileged groups (marked with a shield) such as Domain Admins and Payroll Data must stay small: question every request to join one.',
      },
    ],
    glossary: [
      {
        term: 'Account / username',
        meaning: 'The identity a person signs in with, e.g. maya.patel.',
      },
      {
        term: 'Security group',
        meaning: 'A set of accounts that are given the same access.',
      },
      {
        term: 'MFA',
        meaning:
          'Multi-factor authentication: a second proof of identity, such as a phone app.',
      },
      { term: 'Lockout', meaning: 'An account blocked after too many wrong passwords.' },
      {
        term: 'Joiners, movers and leavers',
        meaning: 'The three moments when someone’s access must change.',
      },
      { term: 'Least privilege', meaning: 'Giving only the access a role needs.' },
      {
        term: 'Asset tag',
        meaning: 'The ID label on a company device, e.g. CR-LT-0142.',
      },
    ],
  },
}
