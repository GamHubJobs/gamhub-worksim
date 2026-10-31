import { useEffect, useState } from 'react'
import { getDeviceId } from './persistence/db'

type DatabaseStatus =
  | { state: 'opening' }
  | { state: 'ready'; deviceId: string }
  | { state: 'error'; message: string }

function App() {
  const [status, setStatus] = useState<DatabaseStatus>({ state: 'opening' })

  useEffect(() => {
    getDeviceId()
      .then((deviceId) => setStatus({ state: 'ready', deviceId }))
      .catch((error: unknown) => setStatus({ state: 'error', message: String(error) }))
  }, [])

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-4xl font-bold tracking-tight text-blue-900">GamHub WorkSim</h1>
      <p className="mt-2 text-slate-500">Development Build · Phase 0: Foundations</p>

      <section className="mt-8 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-semibold">Local database</h2>
        {status.state === 'opening' && <p className="mt-1 text-slate-500">Opening…</p>}
        {status.state === 'ready' && (
          <p className="mt-1 text-emerald-700">
            Ready · Device ID: <code className="text-sm">{status.deviceId}</code>
          </p>
        )}
        {status.state === 'error' && (
          <p className="mt-1 text-red-700">
            Could not open the database: {status.message}
          </p>
        )}
      </section>
    </main>
  )
}

export default App
