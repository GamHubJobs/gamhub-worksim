import { describe, expect, it } from 'vitest'
import { diffLines, history, initRepository, isAncestor, status } from './git'
import { runTerminal, words } from './terminal'

type State = { files: Record<string, string>; git: ReturnType<typeof initRepository> }

function shell(state: State, ...lines: string[]): { state: State; output: string[] } {
  let output: string[] = []
  for (const line of lines) {
    const r = runTerminal(state.files, state.git, line)
    state = { files: r.files, git: r.git }
    output = r.output
  }
  return { state, output }
}

const start = (): State => {
  const files = { 'app.js': 'one\ntwo\n', 'app.test.js': 'test\n' }
  return { files, git: initRepository(files) }
}

describe('git in the terminal', () => {
  it('stages and commits changes, and shows them in status and log', () => {
    let s = start()
    s.files = { ...s.files, 'app.js': 'one\nTWO\n' }
    expect(shell(s, 'git status').output).toContain('\tmodified:   app.js')
    const committed = shell(s, 'git add app.js', 'git commit -m "Capitalise two"')
    s = committed.state
    expect(committed.output[0]).toMatch(/^\[main [0-9a-f]{7}\] Capitalise two$/)
    expect(status(s.git, s.files).clean).toBe(true)
    expect(shell(s, 'git log --oneline').output.map((l) => l.slice(8))).toEqual([
      'Capitalise two',
      'Initial commit',
    ])
    expect(shell(s, 'git commit -m "again"').output).toContain(
      'nothing to commit, working tree clean',
    )
  })

  it('works on a branch, refuses to lose changes, and fast-forwards a merge', () => {
    let s = shell(start(), 'git checkout -b fix/two').state
    s.files = { ...s.files, 'app.js': 'one\n2\n' }
    expect(shell(s, 'git checkout main').output[0]).toContain('would be overwritten')
    s = shell(s, 'git add .', 'git commit -m "Fix two"', 'git checkout main').state
    expect(s.files['app.js']).toBe('one\ntwo\n')
    const merged = shell(s, 'git merge fix/two')
    expect(merged.output).toContain('Fast-forward')
    expect(merged.state.files['app.js']).toBe('one\n2\n')
    expect(
      isAncestor(
        merged.state.git,
        merged.state.git.branches['fix/two'],
        merged.state.git.branches.main,
      ),
    ).toBe(true)
  })

  it('makes a merge commit when both branches changed different files, and stops on a conflict', () => {
    let s = shell(start(), 'git branch feature', 'git checkout feature').state
    s.files = { ...s.files, 'app.test.js': 'test 2\n' }
    s = shell(s, 'git commit -am "More tests"', 'git checkout main').state
    s.files = { ...s.files, 'app.js': 'one\ntwo\nthree\n' }
    s = shell(s, 'git commit -am "Three"').state
    const merged = shell(s, 'git merge feature')
    expect(merged.output[0]).toBe("Merge made by the 'ort' strategy.")
    expect(merged.state.files).toEqual({
      'app.js': 'one\ntwo\nthree\n',
      'app.test.js': 'test 2\n',
    })
    expect(
      history(merged.state.git, merged.state.git.branches.main)[0].parents,
    ).toHaveLength(2)

    let c = shell(start(), 'git branch other').state
    c.files = { ...c.files, 'app.js': 'A\n' }
    c = shell(c, 'git commit -am "A"', 'git checkout other').state
    c.files = { ...c.files, 'app.js': 'B\n' }
    c = shell(c, 'git commit -am "B"', 'git checkout main').state
    expect(shell(c, 'git merge other').output[0]).toBe(
      'CONFLICT (content): Merge conflict in app.js',
    )
  })

  it('shows diffs and restores files', () => {
    const s = start()
    s.files = { ...s.files, 'app.js': 'one\nthree\n' }
    expect(diffLines('one\ntwo\n', 'one\nthree\n')).toEqual(['-two', '+three'])
    expect(shell(s, 'git diff app.js').output).toContain('+three')
    expect(shell(s, 'git restore app.js').state.files['app.js']).toBe('one\ntwo\n')
  })

  it('parses quotes, and explains unknown commands', () => {
    expect(words('git commit -m "Fix the total" --x')).toEqual([
      'git',
      'commit',
      '-m',
      'Fix the total',
      '--x',
    ])
    expect(shell(start(), 'rm -rf /').output[0]).toContain('command not found')
    expect(shell(start(), 'git push').output[0]).toContain('is not a git command')
    expect(runTerminal({}, initRepository({}), 'npm test').runTests).toBe(true)
  })
})
