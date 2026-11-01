/** Runs SQL in a worker with a time limit (the browser side of sql.ts). */
import type { Result } from './schema'
import type { NamedTable } from './sql'

const TIME_LIMIT_MS = 5000

export function runSql(tables: NamedTable[], sql: string): Promise<Result> {
  const worker = new Worker(new URL('./sqlWorker.ts', import.meta.url), {
    type: 'module',
  })
  return new Promise<Result>((resolve, reject) => {
    const timer = setTimeout(() => {
      worker.terminate()
      reject(
        new Error(`The query did not finish within ${TIME_LIMIT_MS / 1000} seconds.`),
      )
    }, TIME_LIMIT_MS)
    worker.onmessage = (
      event: MessageEvent<{ ok: boolean; result?: Result; error?: string }>,
    ) => {
      clearTimeout(timer)
      worker.terminate()
      if (event.data.ok && event.data.result) resolve(event.data.result)
      else reject(new Error(event.data.error ?? 'The query could not be run.'))
    }
    worker.onerror = (event) => {
      clearTimeout(timer)
      worker.terminate()
      reject(new Error(event.message || 'The query could not be run.'))
    }
    worker.postMessage({ tables, sql })
  })
}
