/**
 * Runs tests or grading in a fresh Web Worker, with a time limit. Code that
 * never finishes (an endless loop) is stopped and reported, instead of
 * freezing the page.
 */
import type { Assignment } from '../../content/schemas'
import type { CodeContent } from '../../persistence/schemas'
import { failedCodeChecks } from './grading'
import type { CheckResult } from '../grading'
import type { RunResult, SourceFile } from './runner'
import type { WorkerRequest } from './codeWorker'

export const TIME_LIMIT_MS = 5000
export const TOO_SLOW = `The code did not finish within ${TIME_LIMIT_MS / 1000} seconds. Is there a loop that never ends?`

function inWorker<T>(request: WorkerRequest): Promise<T> {
  const worker = new Worker(new URL('./codeWorker.ts', import.meta.url), {
    type: 'module',
  })
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      worker.terminate()
      reject(new Error(TOO_SLOW))
    }, TIME_LIMIT_MS)
    worker.onmessage = (
      event: MessageEvent<{ ok: boolean; result?: T; error?: string }>,
    ) => {
      clearTimeout(timer)
      worker.terminate()
      if (event.data.ok) resolve(event.data.result as T)
      else reject(new Error(event.data.error ?? 'The code could not be run.'))
    }
    worker.onerror = (event) => {
      clearTimeout(timer)
      worker.terminate()
      reject(new Error(event.message || 'The code could not be run.'))
    }
    worker.postMessage(request)
  })
}

/** Runs every test file in the project, as the Run tests button does. */
export async function runProjectTests(files: SourceFile[]): Promise<RunResult> {
  try {
    return await inWorker<RunResult>({ type: 'run', files })
  } catch (error) {
    return {
      tests: [],
      logs: [],
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/** The code checks of a task, graded safely. */
export async function gradeCodeSafely(
  assignment: Assignment,
  content: CodeContent | null,
): Promise<CheckResult[]> {
  try {
    return await inWorker<CheckResult[]>({ type: 'grade', assignment, content })
  } catch (error) {
    return failedCodeChecks(
      assignment,
      error instanceof Error ? error.message : String(error),
    )
  }
}
