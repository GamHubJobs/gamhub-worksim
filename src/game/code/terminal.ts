/**
 * The Code app's terminal: a few shell commands, git, and npm test. Pure
 * except for npm test, which the screen runs in the test worker (the
 * command result says so with `runTests`).
 */
import * as git from './git'
import type { Git } from './git'

type Files = Record<string, string>

export interface TerminalResult {
  files: Files
  git: Git
  output: string[]
  /** The screen should run the tests and print their result. */
  runTests?: boolean
  clear?: boolean
}

/** Splits a command line into words, keeping "quoted text" together. */
export function words(line: string): string[] {
  const out: string[] = []
  const pattern = /"([^"]*)"|'([^']*)'|(\S+)/g
  for (const m of line.matchAll(pattern)) out.push(m[1] ?? m[2] ?? m[3])
  return out
}

export const HELP = [
  'Commands:',
  '  ls                      list the files',
  '  cat <file>              show a file',
  '  npm test                run the tests',
  '  git status              what has changed, and what is staged',
  '  git add <file> | .      stage changes for the next commit',
  '  git commit -m "message" commit what is staged',
  '  git log [--oneline]     the history of this branch',
  '  git diff [--staged] [file]  show changes line by line',
  '  git branch [name]       list branches, or create one',
  '  git checkout <branch>   switch branch (-b to create it first)',
  '  git switch [-c] <branch>  the same, newer style',
  '  git merge <branch>      bring another branch’s commits into this one',
  '  git restore <file>      throw away changes to a file',
  '  clear                   clear the terminal',
]

function gitCommand(
  repo: Git,
  files: Files,
  args: string[],
): { git: Git; working: Files; output: string[] } {
  const [sub, ...rest] = args
  const done = (output: string[]) => ({ git: repo, working: files, output })
  switch (sub) {
    case undefined:
    case 'help':
      return done(HELP.filter((l) => l.includes('git')))
    case 'status': {
      const s = git.status(repo, files)
      const lines = [`On branch ${repo.head}`]
      if (s.staged.length) {
        lines.push(
          'Changes to be committed:',
          ...s.staged.map(
            (f) => `\t${f.change === 'new' ? 'new file' : f.change}:   ${f.file}`,
          ),
        )
      }
      if (s.unstaged.length) {
        lines.push(
          'Changes not staged for commit:',
          '  (use "git add <file>..." to stage them)',
          ...s.unstaged.map((f) => `\t${f.change}:   ${f.file}`),
        )
      }
      if (s.untracked.length)
        lines.push('Untracked files:', ...s.untracked.map((f) => `\t${f}`))
      if (s.clean) lines.push('nothing to commit, working tree clean')
      return done(lines)
    }
    case 'add':
      return git.add(repo, files, rest)
    case 'commit': {
      if (rest.includes('-a') || rest.includes('-am')) {
        const staged = git.add(repo, files, ['.'])
        repo = staged.git
      }
      const m = rest.findIndex((a) => a === '-m' || a === '-am')
      if (m === -1 || rest[m + 1] === undefined) {
        return done(['Please give a message: git commit -m "what you changed"'])
      }
      return git.commit(repo, files, rest[m + 1])
    }
    case 'log': {
      const commits = git.history(repo, repo.branches[repo.head])
      return done(
        rest.includes('--oneline')
          ? commits.map((c) => `${c.id} ${c.message}`)
          : commits.flatMap((c) => [
              `commit ${c.id}${c.parents.length > 1 ? ` (merge of ${c.parents.join(' and ')})` : ''}`,
              '',
              `    ${c.message}`,
              '',
            ]),
      )
    }
    case 'diff': {
      const staged = rest.includes('--staged') || rest.includes('--cached')
      const file = rest.find((a) => !a.startsWith('-'))
      const out = git.diff(repo, files, file, staged)
      return done(out.length ? out : [])
    }
    case 'branch': {
      const name = rest.find((a) => !a.startsWith('-'))
      if (name) return git.createBranch(repo, files, name)
      return done(
        Object.keys(repo.branches)
          .sort()
          .map((b) => `${b === repo.head ? '*' : ' '} ${b}`),
      )
    }
    case 'checkout':
    case 'switch': {
      const create = rest.includes('-b') || rest.includes('-c')
      const name = rest.find((a) => !a.startsWith('-'))
      if (!name) return done([`usage: git ${sub} ${create ? '-b ' : ''}<branch>`])
      return git.checkout(repo, files, name, create)
    }
    case 'merge': {
      const name = rest.find((a) => !a.startsWith('-'))
      if (!name) return done(['usage: git merge <branch>'])
      return git.merge(repo, files, name)
    }
    case 'restore': {
      const file = rest.find((a) => !a.startsWith('-'))
      if (!file) return done(['usage: git restore <file>'])
      return git.restore(repo, files, file)
    }
    default:
      return done([`git: '${sub}' is not a git command. See 'git help'.`])
  }
}

export function runTerminal(files: Files, repo: Git, line: string): TerminalResult {
  const [command, ...args] = words(line)
  const plain = (output: string[]): TerminalResult => ({ files, git: repo, output })
  switch (command) {
    case undefined:
      return plain([])
    case 'help':
      return plain(HELP)
    case 'clear':
      return { ...plain([]), clear: true }
    case 'ls':
    case 'dir':
      return plain([Object.keys(files).sort().join('  ')])
    case 'cat':
    case 'type': {
      if (!args[0]) return plain(['usage: cat <file>'])
      const text = files[args[0]]
      return plain(
        text === undefined ? [`cat: ${args[0]}: No such file`] : text.split('\n'),
      )
    }
    case 'npm':
      if (
        args[0] === 'test' ||
        (args[0] === 'run' && args[1] === 'test') ||
        args[0] === 't'
      ) {
        return { ...plain([]), runTests: true }
      }
      return plain([`npm: only "npm test" is available here.`])
    case 'git': {
      const result = gitCommand(repo, files, args)
      return { files: result.working, git: result.git, output: result.output }
    }
    default:
      return plain([`${command}: command not found. Type help for the list of commands.`])
  }
}
