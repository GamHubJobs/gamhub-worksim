/**
 * A small, faithful Git for the Code app: a staging area, commits with
 * parents, branches, checkout, fast-forward and simple merges, status, log
 * and diff, all over the project's files. Pure functions on plain data, so
 * it is saved with the project and can be graded.
 */
import { z } from 'zod'

const FileMap = z.record(z.string(), z.string())

export const CommitSchema = z.object({
  id: z.string().regex(/^[0-9a-f]{7}$/),
  message: z.string().max(500),
  /** Parent commit IDs: none for the first, two for a merge. */
  parents: z.array(z.string()).max(2),
  files: FileMap,
  /** Order in which commits were made. */
  seq: z.number().int().positive(),
})

export const GitSchema = z.object({
  commits: z.array(CommitSchema).max(500),
  /** Branch name → the commit it points to. */
  branches: z.record(z.string(), z.string()),
  /** The checked-out branch. */
  head: z.string(),
  /** The staging area: what the next commit will contain. */
  index: FileMap,
})

export type Commit = z.infer<typeof CommitSchema>
export type Git = z.infer<typeof GitSchema>
type Files = Record<string, string>

/** A short, repeatable commit ID from its contents (like Git's hashes, shorter). */
function hash(text: string): string {
  let h1 = 0x811c9dc5
  let h2 = 0x01000193
  for (let i = 0; i < text.length; i++) {
    h1 = Math.imul(h1 ^ text.charCodeAt(i), 0x01000193) >>> 0
    h2 = Math.imul(h2 ^ text.charCodeAt(i), 0x5bd1e995) >>> 0
  }
  return ((h1 ^ h2) >>> 0).toString(16).padStart(8, '0').slice(0, 7)
}

function makeCommit(git: Git, message: string, parents: string[], files: Files): Commit {
  const seq = git.commits.reduce((m, c) => Math.max(m, c.seq), 0) + 1
  let id = hash(`${seq}\n${message}\n${parents.join(',')}\n${JSON.stringify(files)}`)
  while (git.commits.some((c) => c.id === id)) id = hash(`${id}!`)
  return { id, message, parents, files, seq }
}

/** A new repository whose first commit is the project as it is. */
export function initRepository(files: Files, message = 'Initial commit'): Git {
  const empty: Git = { commits: [], branches: {}, head: 'main', index: files }
  const first = makeCommit(empty, message, [], files)
  return {
    commits: [first],
    branches: { main: first.id },
    head: 'main',
    index: { ...files },
  }
}

export function commitById(git: Git, id: string | undefined): Commit | undefined {
  return git.commits.find((c) => c.id === id)
}

export function headCommit(git: Git): Commit | undefined {
  return commitById(git, git.branches[git.head])
}

const same = (a: Files, b: Files) =>
  Object.keys(a).length === Object.keys(b).length &&
  Object.keys(a).every((k) => a[k] === b[k])

export interface Status {
  staged: Array<{ file: string; change: 'new' | 'modified' | 'deleted' }>
  unstaged: Array<{ file: string; change: 'modified' | 'deleted' }>
  untracked: string[]
  clean: boolean
}

export function status(git: Git, working: Files): Status {
  const head = headCommit(git)?.files ?? {}
  const staged: Status['staged'] = []
  for (const file of new Set([...Object.keys(head), ...Object.keys(git.index)])) {
    if (!(file in head)) staged.push({ file, change: 'new' })
    else if (!(file in git.index)) staged.push({ file, change: 'deleted' })
    else if (head[file] !== git.index[file]) staged.push({ file, change: 'modified' })
  }
  const unstaged: Status['unstaged'] = []
  const untracked: string[] = []
  for (const file of new Set([...Object.keys(git.index), ...Object.keys(working)])) {
    if (!(file in git.index)) untracked.push(file)
    else if (!(file in working)) unstaged.push({ file, change: 'deleted' })
    else if (git.index[file] !== working[file])
      unstaged.push({ file, change: 'modified' })
  }
  return {
    staged,
    unstaged,
    untracked,
    clean: !staged.length && !unstaged.length && !untracked.length,
  }
}

type Result = { git: Git; working: Files; output: string[] }

const fail = (git: Git, working: Files, ...output: string[]): Result => ({
  git,
  working,
  output,
})

export function add(git: Git, working: Files, paths: string[]): Result {
  if (paths.length === 0)
    return fail(
      git,
      working,
      'Nothing specified, nothing added.',
      'Maybe you wanted to say: git add .',
    )
  const index = { ...git.index }
  const all = paths.includes('.') || paths.includes('-A')
  const targets = all
    ? [...new Set([...Object.keys(working), ...Object.keys(index)])]
    : paths
  for (const file of targets) {
    if (file in working) index[file] = working[file]
    else if (file in index) delete index[file]
    else return fail(git, working, `fatal: pathspec '${file}' did not match any files`)
  }
  return { git: { ...git, index }, working, output: [] }
}

export function commit(git: Git, working: Files, message: string): Result {
  const head = headCommit(git)
  if (!message.trim())
    return fail(
      git,
      working,
      'Aborting commit due to empty commit message.',
      'Use: git commit -m "what you changed"',
    )
  if (head && same(head.files, git.index)) {
    const s = status(git, working)
    return fail(
      git,
      working,
      `On branch ${git.head}`,
      s.unstaged.length || s.untracked.length
        ? 'no changes added to commit (use "git add" and/or "git commit -a")'
        : 'nothing to commit, working tree clean',
    )
  }
  const c = makeCommit(git, message.trim(), head ? [head.id] : [], { ...git.index })
  const changed = Object.keys({ ...head?.files, ...git.index }).filter(
    (f) => head?.files[f] !== git.index[f],
  ).length
  return {
    git: {
      ...git,
      commits: [...git.commits, c],
      branches: { ...git.branches, [git.head]: c.id },
    },
    working,
    output: [
      `[${git.head} ${c.id}] ${c.message}`,
      ` ${changed} file${changed === 1 ? '' : 's'} changed`,
    ],
  }
}

/** Every commit reachable from a commit, newest first. */
export function history(git: Git, from: string | undefined): Commit[] {
  const seen = new Set<string>()
  const stack = from ? [from] : []
  const out: Commit[] = []
  while (stack.length) {
    const id = stack.pop()!
    if (seen.has(id)) continue
    seen.add(id)
    const c = commitById(git, id)
    if (!c) continue
    out.push(c)
    stack.push(...c.parents)
  }
  return out.sort((a, b) => b.seq - a.seq)
}

export function isAncestor(git: Git, ancestor: string, of: string): boolean {
  return history(git, of).some((c) => c.id === ancestor)
}

export function createBranch(git: Git, working: Files, name: string): Result {
  if (!/^[A-Za-z0-9._/-]+$/.test(name))
    return fail(git, working, `fatal: '${name}' is not a valid branch name.`)
  if (git.branches[name])
    return fail(git, working, `fatal: a branch named '${name}' already exists.`)
  const head = git.branches[git.head]
  if (!head) return fail(git, working, 'fatal: no commits yet')
  return {
    git: { ...git, branches: { ...git.branches, [name]: head } },
    working,
    output: [],
  }
}

export function checkout(git: Git, working: Files, name: string, create = false): Result {
  let g = git
  if (create) {
    const made = createBranch(git, working, name)
    if (made.output.length) return made
    g = made.git
  }
  const target = commitById(g, g.branches[name])
  if (!target)
    return fail(
      git,
      working,
      `error: pathspec '${name}' did not match any branch known to git.`,
    )
  if (name === g.head) return { git: g, working, output: [`Already on '${name}'`] }
  const s = status(g, working)
  if (!s.clean && !create) {
    return fail(
      git,
      working,
      'error: Your local changes to the following files would be overwritten by checkout:',
      ...[...s.staged, ...s.unstaged].map((f) => `\t${f.file}`),
      'Please commit your changes before you switch branches.',
    )
  }
  if (create) {
    return {
      git: { ...g, head: name },
      working,
      output: [`Switched to a new branch '${name}'`],
    }
  }
  return {
    git: { ...g, head: name, index: { ...target.files } },
    working: { ...target.files },
    output: [`Switched to branch '${name}'`],
  }
}

/** Merges a branch into the current one: fast-forward, or a merge commit when the changes don't overlap. */
export function merge(git: Git, working: Files, name: string): Result {
  const theirs = commitById(git, git.branches[name])
  const ours = headCommit(git)
  if (!theirs) return fail(git, working, `merge: ${name} - not something we can merge`)
  if (!ours) return fail(git, working, 'fatal: no commits yet')
  if (!status(git, working).clean) {
    return fail(
      git,
      working,
      'error: Your local changes would be overwritten by merge.',
      'Please commit your changes before you merge.',
    )
  }
  if (isAncestor(git, theirs.id, ours.id))
    return fail(git, working, 'Already up to date.')
  if (isAncestor(git, ours.id, theirs.id)) {
    return {
      git: {
        ...git,
        branches: { ...git.branches, [git.head]: theirs.id },
        index: { ...theirs.files },
      },
      working: { ...theirs.files },
      output: [`Updating ${ours.id}..${theirs.id}`, 'Fast-forward'],
    }
  }
  // Three-way merge on whole files, from the newest common ancestor.
  const oursHistory = new Set(history(git, ours.id).map((c) => c.id))
  const base = history(git, theirs.id).find((c) => oursHistory.has(c.id))?.files ?? {}
  const merged: Files = {}
  const conflicts: string[] = []
  for (const file of new Set([
    ...Object.keys(base),
    ...Object.keys(ours.files),
    ...Object.keys(theirs.files),
  ])) {
    const b = base[file]
    const o = ours.files[file]
    const t = theirs.files[file]
    const pick = o === t ? o : o === b ? t : t === b ? o : undefined
    if (o !== t && o !== b && t !== b) conflicts.push(file)
    else if (pick !== undefined) merged[file] = pick
  }
  if (conflicts.length) {
    return fail(
      git,
      working,
      ...conflicts.map((f) => `CONFLICT (content): Merge conflict in ${f}`),
      'Automatic merge failed. Both branches changed the same file: change one branch so they agree, commit, and merge again.',
    )
  }
  const g = { ...git, index: merged }
  const c = makeCommit(
    g,
    `Merge branch '${name}' into ${git.head}`,
    [ours.id, theirs.id],
    merged,
  )
  return {
    git: {
      ...g,
      commits: [...g.commits, c],
      branches: { ...g.branches, [git.head]: c.id },
    },
    working: { ...merged },
    output: [`Merge made by the 'ort' strategy.`, `[${git.head} ${c.id}] ${c.message}`],
  }
}

/** Throws away changes to a file in the working tree (back to the staged version). */
export function restore(git: Git, working: Files, file: string): Result {
  if (!(file in git.index))
    return fail(
      git,
      working,
      `error: pathspec '${file}' did not match any file(s) known to git`,
    )
  return { git, working: { ...working, [file]: git.index[file] }, output: [] }
}

/** A simple line diff, in the usual + / - format. */
export function diffLines(before: string, after: string): string[] {
  const a = before.split('\n')
  const b = after.split('\n')
  // Longest common subsequence table (files here are small).
  const dp = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0),
  )
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      dp[i][j] =
        a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }
  const out: string[] = []
  let i = 0
  let j = 0
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      i++
      j++
    } else if (i < a.length && (j === b.length || dp[i + 1][j] >= dp[i][j + 1])) {
      // Removed lines come before added ones, as in Git.
      out.push(`-${a[i++]}`)
    } else {
      out.push(`+${b[j++]}`)
    }
  }
  return out
}

export function diff(git: Git, working: Files, file?: string, staged = false): string[] {
  const before = staged ? (headCommit(git)?.files ?? {}) : git.index
  const after = staged ? git.index : working
  const files = file
    ? [file]
    : [...new Set([...Object.keys(before), ...Object.keys(after)])].sort()
  return files.flatMap((f) => {
    if (before[f] === after[f]) return []
    return [
      `diff --git a/${f} b/${f}`,
      `--- a/${f}`,
      `+++ b/${f}`,
      ...diffLines(before[f] ?? '', after[f] ?? ''),
    ]
  })
}

// ---------------------------------------------------------------------------
// Merging with conflicts to resolve (the editor's Source Control view)
// ---------------------------------------------------------------------------

export type GitResult = Result

/**
 * One file as Git writes it when both branches changed the same lines:
 * the shared lines stay, the differing part shows both versions.
 */
export function conflictMarkers(ours: string, theirs: string, branch: string): string {
  const a = ours.split('\n')
  const b = theirs.split('\n')
  let start = 0
  while (start < a.length && start < b.length && a[start] === b[start]) start++
  let endA = a.length
  let endB = b.length
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--
    endB--
  }
  return [
    ...a.slice(0, start),
    '<<<<<<< HEAD',
    ...a.slice(start, endA),
    '=======',
    ...b.slice(start, endB),
    `>>>>>>> ${branch}`,
    ...a.slice(endA),
  ].join('\n')
}

export const hasConflictMarkers = (text: string) =>
  /^(<<<<<<< |=======$|>>>>>>> )/m.test(text)

/**
 * Merges `name` into the current branch. Where both changed the same file,
 * the file gets conflict markers for the player to resolve, then
 * `completeMerge` records the merge. Without conflicts it is `merge`.
 */
export function startMerge(
  git: Git,
  working: Files,
  name: string,
): Result & { conflicts: string[] } {
  const plain = merge(git, working, name)
  if (!plain.output.some((l) => l.startsWith('CONFLICT')))
    return { ...plain, conflicts: [] }
  const theirs = commitById(git, git.branches[name])!
  const ours = headCommit(git)!
  const oursHistory = new Set(history(git, ours.id).map((c) => c.id))
  const base = history(git, theirs.id).find((c) => oursHistory.has(c.id))?.files ?? {}
  const files: Files = {}
  const conflicts: string[] = []
  for (const file of new Set([
    ...Object.keys(ours.files),
    ...Object.keys(theirs.files),
  ])) {
    const b = base[file]
    const o = ours.files[file]
    const t = theirs.files[file]
    if (o !== undefined && t !== undefined && o !== t && o !== b && t !== b) {
      files[file] = conflictMarkers(o, t, name)
      conflicts.push(file)
    } else {
      const pick = o === t ? o : o === b ? t : o
      if (pick !== undefined) files[file] = pick
    }
  }
  return {
    git,
    working: files,
    output: [
      ...conflicts.map((f) => `CONFLICT (content): Merge conflict in ${f}`),
      'Resolve the conflicts, then complete the merge.',
    ],
    conflicts,
  }
}

/** Records a merge whose conflicts the player resolved. */
export function completeMerge(git: Git, working: Files, name: string): Result {
  const theirs = commitById(git, git.branches[name])
  const ours = headCommit(git)
  if (!theirs || !ours)
    return fail(git, working, `merge: ${name} - not something we can merge`)
  const left = Object.keys(working).filter((f) => hasConflictMarkers(working[f]))
  if (left.length)
    return fail(git, working, `Conflict markers are still in ${left.join(', ')}.`)
  const g = { ...git, index: { ...working } }
  const c = makeCommit(
    g,
    `Merge branch '${name}' into ${git.head}`,
    [ours.id, theirs.id],
    working,
  )
  return {
    git: {
      ...g,
      commits: [...g.commits, c],
      branches: { ...g.branches, [git.head]: c.id },
    },
    working,
    output: [`[${git.head} ${c.id}] ${c.message}`],
  }
}
