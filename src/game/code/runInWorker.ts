/**
 * Runs tests or grading in a fresh Web Worker, with a time limit. Code that
 * never finishes (an endless loop) is stopped and reported, instead of
 * freezing the page.
 */
import type { Assignment } from '../../content/schemas'
import type { CodeContent } from '../../persistence/schemas'
import { failedCodeChecks } from './grading'
import type { CheckResult } from '../grading'
import type { CallResult, RunResult, SourceFile } from './runner'
import type { WorkerRequest } from './codeWorker'
import type { DebugRun } from './debugger'

export const TIME_LIMIT_MS = 5000
export const TOO_SLOW = `The code did not finish within ${TIME_LIMIT_MS / 1000} seconds. Is there a loop that never ends?`
/** How long the worker itself may take to start (a busy machine, a first download). */
export const START_LIMIT_MS = 60_000
export const NO_START =
  'The code runner did not start. Close some other programs or tabs, then try again.'

type Reply<T> = { ready: true } | { ok: boolean; result?: T; error?: string }

function inWorker<T>(request: WorkerRequest): Promise<T> {
  const worker = new Worker(new URL('./codeWorker.ts', import.meta.url), {
    type: 'module',
  })
  return new Promise<T>((resolve, reject) => {
    const stop = (error: Error) => {
      clearTimeout(timer)
      worker.terminate()
      reject(error)
    }
    // First the worker must start; only then does the run's own time limit begin.
    let timer = setTimeout(() => stop(new Error(NO_START)), START_LIMIT_MS)
    worker.onmessage = (event: MessageEvent<Reply<T>>) => {
      const reply = event.data
      if ('ready' in reply) {
        clearTimeout(timer)
        timer = setTimeout(() => stop(new Error(TOO_SLOW)), TIME_LIMIT_MS)
        worker.postMessage(request)
        return
      }
      clearTimeout(timer)
      worker.terminate()
      if (reply.ok) resolve(reply.result as T)
      else reject(new Error(reply.error ?? 'The code could not be run.'))
    }
    worker.onerror = (event) =>
      stop(new Error(event.message || 'The code could not be run.'))
  })
}

/** Calls one function in the debug console. */
export async function callInWorker(
  files: SourceFile[],
  file: string,
  fn: string,
  args: unknown[],
): Promise<CallResult> {
  try {
    return await inWorker<CallResult>({ type: 'call', files, file, fn, args })
  } catch (error) {
    return {
      value: null,
      logs: [],
      error: error instanceof Error ? error.message : String(error),
      line: null,
    }
  }
}

/** Runs one function in the debugger, recording each line it reaches. */
export async function debugInWorker(
  files: SourceFile[],
  file: string,
  fn: string,
  args: unknown[],
): Promise<DebugRun> {
  try {
    return await inWorker<DebugRun>({ type: 'debug', files, file, fn, args })
  } catch (error) {
    return {
      value: null,
      logs: [],
      error: error instanceof Error ? error.message : String(error),
      line: null,
      steps: [],
      truncated: false,
      skipped: [],
    }
  }
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
