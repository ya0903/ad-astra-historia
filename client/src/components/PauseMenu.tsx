import { useState } from 'react'
import { useConfigStore } from '../stores/configStore'
import type { AIRole } from '../stores/configStore'
import type { AIConfig } from '@ad-astra/shared/types'

interface PauseMenuProps {
  onResume: () => void
  onSave: () => void
  onSignOut: () => void
}

type SubView = 'main' | 'settings'
type AIProvider = 'anthropic' | 'openai' | 'google' | 'custom'

const MODEL_PRESETS: Record<AIProvider, string[]> = {
  anthropic: ['claude-sonnet-4-6', 'claude-haiku-4-5-20251001', 'claude-opus-4-6'],
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
  google: ['gemini-2.0-flash', 'gemini-1.5-pro'],
  custom: [],
}

const ROLES: { id: AIRole; label: string }[] = [
  { id: 'action', label: 'Action' },
  { id: 'advisor', label: 'Advisor' },
  { id: 'narrator', label: 'Narrator' },
  { id: 'diplomat', label: 'Diplomat' },
]

interface ModelFormProps {
  initial: AIConfig | null
  onSave: (cfg: AIConfig) => void
}

function ModelForm({ initial, onSave }: ModelFormProps) {
  const [provider, setProvider] = useState<AIProvider>((initial?.provider as AIProvider) ?? 'anthropic')
  const [apiKey, setApiKey] = useState(initial?.apiKey ?? '')
  const [model, setModel] = useState(initial?.model ?? MODEL_PRESETS['anthropic'][0])
  const [baseUrl, setBaseUrl] = useState(initial?.baseUrl ?? '')

  const handleProviderChange = (p: AIProvider) => {
    setProvider(p)
    const presets = MODEL_PRESETS[p]
    if (presets.length > 0) setModel(presets[0])
    else setModel('')
  }

  const handleSubmit = () => {
    if (!model.trim()) return
    const cfg: AIConfig = {
      provider,
      apiKey: apiKey.trim(),
      model: model.trim(),
      ...(provider === 'custom' && baseUrl.trim() ? { baseUrl: baseUrl.trim() } : {}),
    }
    onSave(cfg)
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Provider */}
      <div>
        <label className="block text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wider">Provider</label>
        <div className="flex gap-2">
          {(['anthropic', 'openai', 'google', 'custom'] as AIProvider[]).map(p => (
            <button
              key={p}
              onClick={() => handleProviderChange(p)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                provider === p
                  ? 'bg-blue-600/40 border-blue-500/60 text-blue-200'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/20'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* API Key */}
      <div>
        <label className="block text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wider">API Key</label>
        <input
          type="password"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          placeholder="sk-..."
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 transition-colors"
        />
      </div>

      {/* Model */}
      <div>
        <label className="block text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wider">Model</label>
        <input
          type="text"
          value={model}
          onChange={e => setModel(e.target.value)}
          placeholder="model name"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 transition-colors mb-2"
        />
        {MODEL_PRESETS[provider].length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {MODEL_PRESETS[provider].map(m => (
              <button
                key={m}
                onClick={() => setModel(m)}
                className={`px-2.5 py-1 rounded-lg text-[11px] border transition-all ${
                  model === m
                    ? 'bg-blue-600/30 border-blue-500/50 text-blue-300'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Base URL (custom only) */}
      {provider === 'custom' && (
        <div>
          <label className="block text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wider">Base URL</label>
          <input
            type="text"
            value={baseUrl}
            onChange={e => setBaseUrl(e.target.value)}
            placeholder="https://your-endpoint/v1"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 transition-colors"
          />
        </div>
      )}

      {/* Save */}
      <button
        onClick={handleSubmit}
        className="mt-1 w-full py-2 rounded-xl bg-blue-600/80 hover:bg-blue-600 border border-blue-500/50 text-sm text-white font-semibold transition-all shadow-lg"
      >
        Save Configuration
      </button>
    </div>
  )
}

export default function PauseMenu({ onResume, onSave, onSignOut }: PauseMenuProps) {
  const [view, setView] = useState<SubView>('main')
  const [activeRole, setActiveRole] = useState<AIRole>('action')

  const config = useConfigStore(s => s.config)
  const roleConfigs = useConfigStore(s => s.roleConfigs)
  const useSameModel = useConfigStore(s => s.useSameModel)
  const setConfig = useConfigStore(s => s.setConfig)
  const setRoleConfig = useConfigStore(s => s.setRoleConfig)
  const setUseSameModel = useConfigStore(s => s.setUseSameModel)

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xl"
        onClick={onResume}
      />

      {/* Modal panel */}
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-[600px] max-h-[90vh] overflow-y-auto rounded-2xl bg-[#07101f]/95 backdrop-blur-xl border border-white/10 shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
            {view === 'settings' ? (
              <button
                onClick={() => setView('main')}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
            ) : (
              <span className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Ad Astra Historica</span>
            )}
            <h2 className="text-base font-semibold text-white">
              {view === 'main' ? 'Paused' : 'Settings'}
            </h2>
            <button
              onClick={onResume}
              className="text-gray-500 hover:text-white transition-colors text-lg leading-none"
              title="Close"
            >
              &#x2715;
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5">
            {view === 'main' && (
              <div className="flex flex-col gap-3">
                <button
                  onClick={onResume}
                  className="w-full py-3 rounded-xl bg-blue-600/80 hover:bg-blue-600 border border-blue-500/50 text-sm text-white font-semibold transition-all shadow-lg"
                >
                  Resume
                </button>
                <button
                  onClick={() => setView('settings')}
                  className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-sm text-gray-200 font-semibold transition-all"
                >
                  Settings
                </button>
                <button
                  onClick={onSave}
                  className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-sm text-gray-200 font-semibold transition-all"
                >
                  Save Game
                </button>
                <div className="h-px bg-white/8 my-1" />
                <button
                  onClick={onSignOut}
                  className="w-full py-3 rounded-xl bg-red-900/30 hover:bg-red-900/50 border border-red-700/30 hover:border-red-600/50 text-sm text-red-300 font-semibold transition-all"
                >
                  Sign Out
                </button>
              </div>
            )}

            {view === 'settings' && (
              <div className="flex flex-col gap-6">
                {/* AI Configuration section */}
                <div>
                  <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <span className="w-1 h-4 bg-blue-500 rounded-full inline-block" />
                    AI Configuration
                  </h3>

                  {/* Use same model toggle */}
                  <label className="flex items-center justify-between gap-4 p-3 rounded-xl bg-white/5 border border-white/8 cursor-pointer hover:bg-white/8 transition-colors mb-4">
                    <div>
                      <p className="text-sm text-white font-medium">Use same model for all roles</p>
                      <p className="text-xs text-gray-500 mt-0.5">One AI configuration applies everywhere</p>
                    </div>
                    <div className="relative shrink-0">
                      <input
                        type="checkbox"
                        checked={useSameModel}
                        onChange={e => setUseSameModel(e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`w-10 h-6 rounded-full border transition-all ${
                        useSameModel
                          ? 'bg-blue-600 border-blue-500'
                          : 'bg-white/10 border-white/20'
                      }`}>
                        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                          useSameModel ? 'left-[18px]' : 'left-0.5'
                        }`} />
                      </div>
                    </div>
                  </label>

                  {/* Single config form */}
                  {useSameModel && (
                    <ModelForm
                      initial={config}
                      onSave={cfg => setConfig(cfg)}
                    />
                  )}

                  {/* Per-role tabs */}
                  {!useSameModel && (
                    <div>
                      {/* Role tabs */}
                      <div className="flex gap-1 mb-4 p-1 bg-white/5 rounded-xl">
                        {ROLES.map(r => (
                          <button
                            key={r.id}
                            onClick={() => setActiveRole(r.id)}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                              activeRole === r.id
                                ? 'bg-blue-600/60 border border-blue-500/50 text-blue-100'
                                : 'text-gray-400 hover:text-white'
                            }`}
                          >
                            {r.label}
                          </button>
                        ))}
                      </div>

                      {/* Active role form */}
                      <ModelForm
                        key={activeRole}
                        initial={roleConfigs[activeRole] ?? config}
                        onSave={cfg => setRoleConfig(activeRole, cfg)}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
