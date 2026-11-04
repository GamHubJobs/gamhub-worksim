/**
 * WorkSim AI settings: which engine answers, the player's consent before
 * anything is sent to a model, the local model or bridge details, and the
 * daily limit. Changes are saved on this device only.
 */
import { useState } from 'react'
import { PROVIDER_NAMES } from '../../ai/engines'
import { engineFor } from '../../ai/service'
import { isLocalAddress, usedToday, type AiSettings } from '../../ai/settings'
import type { Availability, EngineId } from '../../ai/types'

const ENGINES: Array<{ id: EngineId; name: string; detail: string }> = [
  {
    id: 'builtin',
    name: 'Built-in guide',
    detail:
      'WorkSim’s own help. Free, works offline, and nothing leaves this computer. It is not an AI model, so it only answers specific questions.',
  },
  {
    id: 'local',
    name: 'A model on this computer',
    detail:
      'A free AI model you run yourself, such as Ollama or LM Studio. Questions stay on this computer.',
  },
  {
    id: 'bridge',
    name: 'A cloud model through the WorkSim AI bridge',
    detail:
      'Anthropic, OpenAI or Google, using your own API key in the bridge you run on this computer. The provider charges your account for each request.',
  },
]

export function AiSettingsPanel({
  settings,
  onChange,
  onClose,
}: {
  settings: AiSettings
  onChange: (settings: AiSettings) => void
  onClose: () => void
}) {
  const [check, setCheck] = useState<Availability | 'checking' | null>(null)
  const model = settings.engine !== 'builtin'
  const destination =
    settings.engine === 'local'
      ? 'the AI model running on this computer'
      : `${PROVIDER_NAMES[settings.bridge.provider]}, over the internet, through the bridge on this computer`

  async function testConnection() {
    setCheck('checking')
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8_000)
    try {
      setCheck(await engineFor({ ...settings, consent: true }).check(controller.signal))
    } finally {
      clearTimeout(timer)
    }
  }

  const field = 'mt-1 block w-full border border-slate-300 px-2 py-1 text-sm'
  return (
    <div
      className="h-full overflow-y-auto p-5 text-sm text-slate-800"
      data-testid="ai-settings"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">WorkSim AI settings</h2>
        <button
          type="button"
          onClick={onClose}
          className="border border-slate-300 px-3 py-1 hover:bg-slate-50"
        >
          Done
        </button>
      </div>

      <fieldset className="mt-4">
        <legend className="font-semibold">Who answers</legend>
        <div className="mt-2 space-y-2">
          {ENGINES.map((engine) => (
            <label
              key={engine.id}
              className={`flex cursor-pointer gap-3 border p-3 ${
                settings.engine === engine.id
                  ? 'border-[#1f6fbf] bg-blue-50/50'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="ai-engine"
                className="mt-1"
                checked={settings.engine === engine.id}
                onChange={() => {
                  setCheck(null)
                  // Consent is for one destination: choosing another asks again.
                  onChange({ ...settings, engine: engine.id, consent: false })
                }}
              />
              <span>
                <span className="block font-medium">{engine.name}</span>
                <span className="block text-xs text-slate-600">{engine.detail}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {settings.engine === 'local' && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label>
            Address
            <input
              className={field}
              value={settings.local.url}
              onChange={(e) =>
                isLocalAddress(e.target.value) || e.target.value === ''
                  ? onChange({
                      ...settings,
                      local: { ...settings.local, url: e.target.value },
                    })
                  : undefined
              }
            />
          </label>
          <label>
            Model name
            <input
              className={field}
              placeholder="for example llama3.2"
              value={settings.local.model}
              onChange={(e) =>
                onChange({
                  ...settings,
                  local: { ...settings.local, model: e.target.value },
                })
              }
            />
          </label>
          <p className="text-xs text-slate-500 sm:col-span-2">
            Ollama must allow WorkSim’s address: start it with OLLAMA_ORIGINS set to this
            page’s address (see the handbook).
          </p>
        </div>
      )}

      {settings.engine === 'bridge' && (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label>
            Bridge address
            <input
              className={field}
              value={settings.bridge.url}
              onChange={(e) =>
                isLocalAddress(e.target.value)
                  ? onChange({
                      ...settings,
                      bridge: { ...settings.bridge, url: e.target.value },
                    })
                  : undefined
              }
            />
          </label>
          <label>
            Provider
            <select
              className={field}
              value={settings.bridge.provider}
              onChange={(e) =>
                onChange({
                  ...settings,
                  consent: false,
                  bridge: {
                    ...settings.bridge,
                    provider: e.target.value as AiSettings['bridge']['provider'],
                  },
                })
              }
            >
              {Object.entries(PROVIDER_NAMES).map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Model (optional)
            <input
              className={field}
              placeholder="the bridge’s default"
              value={settings.bridge.model}
              onChange={(e) =>
                onChange({
                  ...settings,
                  bridge: { ...settings.bridge, model: e.target.value },
                })
              }
            />
          </label>
          <p className="text-xs text-slate-500 sm:col-span-3">
            Start the bridge with <code className="font-mono">npm run ai-bridge</code>,
            with your API key in a file called{' '}
            <code className="font-mono">.env.local</code>. The key stays in the bridge:
            WorkSim never sees it.
          </p>
        </div>
      )}

      {model && (
        <div className="mt-4 border border-amber-300 bg-amber-50 p-3">
          <label className="flex gap-2">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={settings.consent}
              onChange={(e) => onChange({ ...settings, consent: e.target.checked })}
            />
            <span>
              I agree that my questions, and the context I leave ticked, are sent to{' '}
              {destination}.
              {settings.engine === 'bridge' &&
                ' The provider’s own terms and charges apply.'}{' '}
              My name is taken out first, and nothing else from my save is sent.
            </span>
          </label>
          {!settings.consent && (
            <p className="mt-2 text-xs text-amber-900">
              Until you agree, the built-in guide answers and nothing is sent.
            </p>
          )}
        </div>
      )}

      {model && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void testConnection()}
            className="border border-slate-300 px-3 py-1 hover:bg-slate-50"
          >
            Check the connection
          </button>
          <span role="status" className="text-xs">
            {check === 'checking'
              ? 'Checking…'
              : check?.ready
                ? 'Ready to answer.'
                : check
                  ? check.reason
                  : ''}
          </span>
        </div>
      )}

      <div className="mt-5">
        <label className="font-semibold" htmlFor="ai-limit">
          Daily limit
        </label>
        <p className="text-xs text-slate-600">
          The most requests sent to a model on this computer each day (the built-in guide
          is unlimited). Used today: {usedToday()}.
        </p>
        <input
          id="ai-limit"
          type="number"
          min={1}
          max={500}
          className="mt-1 w-24 border border-slate-300 px-2 py-1"
          value={settings.dailyLimit}
          onChange={(e) => {
            const value = Math.round(Number(e.target.value))
            if (value >= 1 && value <= 500) onChange({ ...settings, dailyLimit: value })
          }}
        />
      </div>
    </div>
  )
}
