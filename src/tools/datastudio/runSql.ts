/** Runs SQL in a worker with a time limit (the browser side of sql.ts). */
import type { Result } from './schema'
import type { NamedTable } from './sql'

const TIME_LIMIT_MS = 5000
/** How long the worker and its database engine may take to start. */
const START_LIMIT_MS = 60_000

type Reply = { ready: true } | { ok: boolean; result?: Result; error?: string }

export function runSql(tables: NamedTable[], sql: string): Promise<Result> {
  const worker = new Worker(new URL('./sqlWorker.ts', import.meta.url), {
    type: 'module',
  })
  return new Promise<Result>((resolve, reject) => {
    const stop = (error: Error) => {
      clearTimeout(timer)
      worker.terminate()
      reject(error)
    }
    // First the engine must load; only then does the query's own time limit begin.
    let timer = setTimeout(
      () => stop(new Error('The database engine did not start. Try again.')),
      START_LIMIT_MS,
    )
    worker.onmessage = (event: MessageEvent<Reply>) => {
      const reply = event.data
      if ('ready' in reply) {
        clearTimeout(timer)
        timer = setTimeout(
          () =>
            stop(
              new Error(
                `The query did not finish within ${TIME_LIMIT_MS / 1000} seconds.`,
              ),
            ),
          TIME_LIMIT_MS,
        )
        worker.postMessage({ tables, sql })
        return
      }
      clearTimeout(timer)
      worker.terminate()
      if (reply.ok && reply.result) resolve(reply.result)
      else reject(new Error(reply.error ?? 'The query could not be run.'))
    }
    worker.onerror = (event) =>
      stop(new Error(event.message || 'The query could not be run.'))
  })
}
