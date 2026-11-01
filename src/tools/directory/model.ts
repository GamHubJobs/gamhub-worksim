/**
 * Directory actions. Pure functions: each returns the new state (or the
 * problems that stop it), and records what was done in the audit log.
 */
import type { Asset, AssetStatus, DirectoryState, User } from './schema'

type Result = { state: DirectoryState; problems: string[] }

function log(
  state: DirectoryState,
  action: string,
  target: string,
  detail = '',
): DirectoryState {
  const seq = state.audit.reduce((max, e) => Math.max(max, e.seq), 0) + 1
  return {
    ...state,
    audit: [...state.audit, { seq, action, target, detail, byYou: true }],
  }
}

export function findUser(state: DirectoryState, id: string): User | undefined {
  return state.users.find((u) => u.id === id)
}

function changeUser(
  state: DirectoryState,
  id: string,
  change: (user: User) => User,
  action: string,
  detail = '',
): Result {
  const user = findUser(state, id)
  if (!user) return { state, problems: ['That account no longer exists.'] }
  const next = { ...state, users: state.users.map((u) => (u.id === id ? change(u) : u)) }
  return { state: log(next, action, user.username, detail), problems: [] }
}

/** The usual sign-in name: first.last, lower case, with a number if taken. */
export function suggestUsername(state: DirectoryState, name: string): string {
  const parts = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z\s-]/g, '')
    .trim()
    .split(/\s+/)
  const base =
    parts.length > 1 ? `${parts[0]}.${parts[parts.length - 1]}` : (parts[0] ?? '')
  let candidate = base
  let n = 2
  while (state.users.some((u) => u.username === candidate)) candidate = `${base}${n++}`
  return candidate
}

export function createUser(
  state: DirectoryState,
  input: { name: string; username: string; department: string; title: string },
): Result & { id: string } {
  const problems: string[] = []
  const name = input.name.trim()
  if (name === '') problems.push('Enter the person’s full name.')
  if (!/^[a-z0-9.-]+$/.test(input.username)) {
    problems.push('Usernames use lower-case letters, numbers, dots and hyphens.')
  } else if (state.users.some((u) => u.username === input.username)) {
    problems.push(`The username ${input.username} is already taken.`)
  }
  if (input.department.trim() === '') problems.push('Choose the department.')
  if (problems.length > 0) return { state, problems, id: '' }
  let n = state.users.length + 1
  while (state.users.some((u) => u.id === `u${n}`)) n++
  const user: User = {
    id: `u${n}`,
    name,
    username: input.username,
    department: input.department.trim(),
    title: input.title.trim(),
    status: 'active',
    locked: false,
    mfa: false,
    mustChangePassword: true,
    groups: [],
    lastSignIn: '',
    failedSignIns: 0,
    signInLocation: '',
  }
  return {
    state: log(
      { ...state, users: [...state.users, user] },
      'Create account',
      user.username,
      `${user.title}, ${user.department}`,
    ),
    problems: [],
    id: user.id,
  }
}

export const disableUser = (state: DirectoryState, id: string) =>
  changeUser(
    state,
    id,
    (u) => ({ ...u, status: 'disabled', locked: false }),
    'Disable account',
  )

export const enableUser = (state: DirectoryState, id: string) =>
  changeUser(state, id, (u) => ({ ...u, status: 'active' }), 'Enable account')

export const unlockUser = (state: DirectoryState, id: string) =>
  changeUser(
    state,
    id,
    (u) => ({ ...u, locked: false, failedSignIns: 0 }),
    'Unlock account',
  )

export function resetPassword(state: DirectoryState, id: string): Result {
  const user = findUser(state, id)
  if (user?.status === 'disabled') {
    return {
      state,
      problems: ['The account is disabled. Enable it first if that is intended.'],
    }
  }
  return changeUser(
    state,
    id,
    // A reset does not unlock: unlocking is a separate decision (see lockouts).
    (u) => ({ ...u, mustChangePassword: true }),
    'Reset password',
    'Temporary password issued; must be changed at next sign-in',
  )
}

/** Removes the registered MFA method, so the user registers a new one (e.g. a lost phone). */
export const resetMfa = (state: DirectoryState, id: string) =>
  changeUser(state, id, (u) => ({ ...u, mfa: false }), 'Reset MFA', 'Must register again')

/** Marks MFA as registered (the user completed set-up with IT). */
export const registerMfa = (state: DirectoryState, id: string) =>
  changeUser(state, id, (u) => ({ ...u, mfa: true }), 'Register MFA')

export function addToGroup(
  state: DirectoryState,
  userId: string,
  groupId: string,
): Result {
  const group = state.groups.find((g) => g.id === groupId)
  if (!group) return { state, problems: ['That group does not exist.'] }
  const user = findUser(state, userId)
  if (user?.groups.includes(groupId)) {
    return { state, problems: [`${user.name} is already in ${group.name}.`] }
  }
  return changeUser(
    state,
    userId,
    (u) => ({ ...u, groups: [...u.groups, groupId] }),
    'Add to group',
    group.name,
  )
}

export function removeFromGroup(
  state: DirectoryState,
  userId: string,
  groupId: string,
): Result {
  const group = state.groups.find((g) => g.id === groupId)
  return changeUser(
    state,
    userId,
    (u) => ({ ...u, groups: u.groups.filter((g) => g !== groupId) }),
    'Remove from group',
    group?.name ?? groupId,
  )
}

export function findAsset(state: DirectoryState, tag: string): Asset | undefined {
  return state.assets.find((a) => a.tag === tag)
}

function changeAsset(
  state: DirectoryState,
  tag: string,
  change: (asset: Asset) => Asset,
  action: string,
  detail = '',
): Result {
  if (!findAsset(state, tag)) return { state, problems: ['That asset no longer exists.'] }
  const next = {
    ...state,
    assets: state.assets.map((a) => (a.tag === tag ? change(a) : a)),
  }
  return { state: log(next, action, tag, detail), problems: [] }
}

export function assignAsset(state: DirectoryState, tag: string, userId: string): Result {
  const asset = findAsset(state, tag)
  const user = findUser(state, userId)
  if (!asset || !user) return { state, problems: ['Choose the device and the person.'] }
  if (asset.status === 'in-use') {
    const holder = findUser(state, asset.assignedTo)?.name ?? 'someone'
    return {
      state,
      problems: [`${tag} is already in use by ${holder}. Return it first.`],
    }
  }
  if (asset.status === 'retired' || asset.status === 'repair') {
    return {
      state,
      problems: [
        `${tag} is ${asset.status === 'retired' ? 'retired' : 'in for repair'}.`,
      ],
    }
  }
  if (user.status === 'disabled') {
    return { state, problems: [`${user.name}’s account is disabled.`] }
  }
  return changeAsset(
    state,
    tag,
    (a) => ({ ...a, status: 'in-use', assignedTo: userId }),
    'Assign asset',
    user.name,
  )
}

/** Takes a device back into stock (a leaver, a replacement). */
export function returnAsset(state: DirectoryState, tag: string): Result {
  const asset = findAsset(state, tag)
  if (asset?.status !== 'in-use')
    return { state, problems: [`${tag} is not assigned to anyone.`] }
  const holder = findUser(state, asset.assignedTo)?.name ?? ''
  return changeAsset(
    state,
    tag,
    (a) => ({ ...a, status: 'in-stock', assignedTo: '' }),
    'Return asset',
    holder ? `From ${holder}` : '',
  )
}

export function setAssetStatus(
  state: DirectoryState,
  tag: string,
  status: Exclude<AssetStatus, 'in-use'>,
  notes?: string,
): Result {
  const asset = findAsset(state, tag)
  if (!asset) return { state, problems: ['That asset no longer exists.'] }
  if (asset.status === 'in-use')
    return { state, problems: [`Return ${tag} before changing its status.`] }
  return changeAsset(
    state,
    tag,
    (a) => ({ ...a, status, ...(notes !== undefined ? { notes } : {}) }),
    'Change asset status',
    status,
  )
}

/** Records a device as lost or stolen: it leaves the person and can't be reissued. */
export function reportLost(state: DirectoryState, tag: string): Result {
  const asset = findAsset(state, tag)
  if (asset?.status !== 'in-use') {
    return { state, problems: [`${tag} is not assigned to anyone.`] }
  }
  const holder = findUser(state, asset.assignedTo)?.name ?? ''
  return changeAsset(
    state,
    tag,
    (a) => ({ ...a, status: 'lost', assignedTo: '' }),
    'Report lost',
    holder ? `Was with ${holder}` : '',
  )
}

/** Whether a device is still under warranty on the directory's "today". */
export function inWarranty(state: DirectoryState, asset: Asset): boolean {
  return asset.warrantyEnd >= state.today
}

export function assetsOf(state: DirectoryState, userId: string): Asset[] {
  return state.assets.filter((a) => a.status === 'in-use' && a.assignedTo === userId)
}
