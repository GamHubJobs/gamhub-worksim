/**
 * Runs the player's code away from the page. A new worker is started for
 * every run, so nothing one run does can affect the next, and the page can
 * stop a run that takes too long (an endless loop) by ending the worker.
 */
import type { Assignment } from '../../content/schemas'
import type { CodeContent } from '../../persistence/schemas'
import { gradeCode } from './grading'
import { runTests, type SourceFile } from './runner'

export type WorkerRequest =
  | { type: 'run'; files: SourceFile[] }
  | { type: 'grade'; assignment: Assignment; content: CodeContent | null }

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const request = event.data
  try {
    const result =
      request.type === 'run'
        ? runTests(request.files)
        : gradeCode(request.assignment, request.content)
    self.postMessage({ ok: true, result })
  } catch (error) {
    self.postMessage({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
