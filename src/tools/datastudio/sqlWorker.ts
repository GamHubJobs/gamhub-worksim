/** Runs one SQL query in a fresh worker, so a slow query never freezes the page. */
import initSqlJs from 'sql.js'
// The browser build of sql.js needs its own matching engine file.
import wasmUrl from 'sql.js/dist/sql-wasm-browser.wasm?url'
import { runSqlWith, type NamedTable } from './sql'

self.onmessage = async (event: MessageEvent<{ tables: NamedTable[]; sql: string }>) => {
  try {
    const SQL = await initSqlJs({ locateFile: () => wasmUrl })
    self.postMessage({
      ok: true,
      result: runSqlWith(SQL, event.data.tables, event.data.sql),
    })
  } catch (error) {
    self.postMessage({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
