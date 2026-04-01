import { useState } from 'react'
import type { AIProvider, AIConfig, Era, Difficulty, EraStartConditions } from '@ad-astra/shared/types'
import { useConfigStore, useGameStore } from '../stores'
import { fetchEraConditions, listSaves, loadSave } from '../lib/api'

// ── helpers ──────────────────────────────────────────────────────────────────

const MODEL_HINTS: Record<AIProvider, string> = {
  openai: 'gpt-4o',
  anthropic: 'claude-opus-4-6',
  google: 'gemini-2.0-flash',
  custom: '',
}

const ERAS: { label: string; value: Era }[] = [
  { label: '1945', value: '1945' },
  { label: '1960s', value: '1960s' },
  { label: '1990s', value: '1990s' },
  { label: '2010s', value: '2010s' },
  { label: 'Modern', value: 'modern' },
]

const DIFFICULTIES: { label: string; value: Difficulty; description: string }[] = [
  { label: 'Passive', value: 'passive', description: 'AI plays gently' },
  { label: 'Realistic', value: 'realistic', description: 'Normal challenge' },
  { label: 'Aggressive', value: 'aggressive', description: 'AI plays hard' },
]

// ── sub-components ────────────────────────────────────────────────────────────

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 ${className}`}
    >
      {children}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-semibold text-blue-300 mb-4">{children}</h2>
}

function ErrorMsg({ msg }: { msg: string }) {
  return <p className="text-red-400 text-sm mt-2">{msg}</p>
}

// ── main component ────────────────────────────────────────────────────────────

export default function SetupPage() {
  // ── config store ──
  const savedConfig = useConfigStore((s) => s.config)
  const setStoreConfig = useConfigStore((s) => s.setConfig)

  // ── game store ──
  const initGame = useGameStore((s) => s.initGame)
  const loadGameStore = useGameStore((s) => s.loadGame)

  // ── Step 1: AI config local state ──
  const [provider, setProvider] = useState<AIProvider>(savedConfig?.provider ?? 'openai')
  const [apiKey, setApiKey] = useState(savedConfig?.apiKey ?? '')
  const [baseUrl, setBaseUrl] = useState(savedConfig?.baseUrl ?? '')
  const [model, setModel] = useState(savedConfig?.model ?? MODEL_HINTS['openai'])
  const [configSaved, setConfigSaved] = useState(savedConfig !== null)
  const [configError, setConfigError] = useState('')

  // ── Step 2: era selection ──
  const [selectedEra, setSelectedEra] = useState<Era | null>(null)
  const [eraConditions, setEraConditions] = useState<EraStartConditions | null>(null)
  const [eraLoading, setEraLoading] = useState(false)
  const [eraError, setEraError] = useState('')

  // ── Step 3: country + difficulty ──
  const [countrySearch, setCountrySearch] = useState('')
  const [selectedCountry, setSelectedCountry] = useState('')
  const [difficulty, setDifficulty] = useState<Difficulty>('realistic')

  // ── Step 4: start / load ──
  const [saves, setSaves] = useState<string[]>([])
  const [savesLoading, setSavesLoading] = useState(false)
  const [savesError, setSavesError] = useState('')
  const [savesVisible, setSavesVisible] = useState(false)
  const [startError, setStartError] = useState('')

  // ── handlers ─────────────────────────────────────────────────────────────

  function handleProviderChange(p: AIProvider) {
    setProvider(p)
    setModel(MODEL_HINTS[p])
    setConfigSaved(false)
  }

  function handleSaveConfig() {
    setConfigError('')
    if (!model.trim()) {
      setConfigError('Model name is required.')
      return
    }
    if (provider !== 'custom' && !apiKey.trim()) {
      setConfigError('API key is required for this provider.')
      return
    }
    const cfg: AIConfig = {
      provider,
      apiKey: apiKey.trim(),
      model: model.trim(),
      ...(provider === 'custom' && baseUrl.trim() ? { baseUrl: baseUrl.trim() } : {}),
    }
    setStoreConfig(cfg)
    setConfigSaved(true)
  }

  async function handleEraSelect(era: Era) {
    setSelectedEra(era)
    setEraConditions(null)
    setEraError('')
    setSelectedCountry('')
    setCountrySearch('')
    setEraLoading(true)
    try {
      const conditions = await fetchEraConditions(era)
      setEraConditions(conditions)
    } catch (err) {
      setEraError(err instanceof Error ? err.message : 'Failed to load era conditions.')
    } finally {
      setEraLoading(false)
    }
  }

  function handleStartGame() {
    setStartError('')
    if (!eraConditions) {
      setStartError('Please select an era first.')
      return
    }
    if (!selectedCountry) {
      setStartError('Please select a country.')
      return
    }
    initGame(eraConditions, selectedCountry, difficulty)
  }

  async function handleShowSaves() {
    setSavesError('')
    setSavesLoading(true)
    setSavesVisible(true)
    try {
      const result = await listSaves()
      setSaves(result.saves)
    } catch (err) {
      setSavesError(err instanceof Error ? err.message : 'Failed to list saves.')
    } finally {
      setSavesLoading(false)
    }
  }

  async function handleLoadSave(name: string) {
    setSavesError('')
    try {
      const saved = await loadSave(name)
      loadGameStore(saved)
    } catch (err) {
      setSavesError(err instanceof Error ? err.message : 'Failed to load save.')
    }
  }

  // ── derived ──────────────────────────────────────────────────────────────

  const sortedCountries = eraConditions
    ? Object.values(eraConditions.countries)
        .filter((c) =>
          countrySearch.trim() === '' ||
          c.name.toLowerCase().includes(countrySearch.toLowerCase())
        )
        .sort((a, b) => a.name.localeCompare(b.name))
    : []

  // ── render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0a1628] text-white py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-widest text-white mb-1">AD ASTRA: HISTORIA</h1>
          <p className="text-blue-400 text-sm tracking-wide">New Game Setup</p>
        </div>

        {/* ── Step 1: AI Configuration ── */}
        <Panel>
          <SectionTitle>Step 1 — AI Configuration</SectionTitle>

          {/* Provider */}
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-2">Provider</label>
            <div className="flex flex-wrap gap-2">
              {(['openai', 'anthropic', 'google', 'custom'] as AIProvider[]).map((p) => (
                <button
                  key={p}
                  onClick={() => handleProviderChange(p)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    provider === p
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* API Key */}
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-1">
              API Key{provider === 'custom' ? ' (optional)' : ' *'}
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => { setApiKey(e.target.value); setConfigSaved(false) }}
              placeholder={provider === 'custom' ? 'Optional' : 'sk-...'}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Base URL (custom only) */}
          {provider === 'custom' && (
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-1">Base URL</label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => { setBaseUrl(e.target.value); setConfigSaved(false) }}
                placeholder="http://localhost:11434/v1"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
              />
            </div>
          )}

          {/* Model */}
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-1">Model *</label>
            <input
              type="text"
              value={model}
              onChange={(e) => { setModel(e.target.value); setConfigSaved(false) }}
              placeholder={MODEL_HINTS[provider] || 'model-name'}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
            />
          </div>

          {configError && <ErrorMsg msg={configError} />}

          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={handleSaveConfig}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors"
            >
              Save Config
            </button>
            {configSaved && (
              <span className="text-green-400 text-sm">Config saved ✓</span>
            )}
          </div>
        </Panel>

        {/* ── Step 2: Era Selection ── */}
        <Panel>
          <SectionTitle>Step 2 — Select Era</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {ERAS.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => handleEraSelect(value)}
                className={`px-5 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  selectedEra === value
                    ? 'bg-indigo-600 border-indigo-500 text-white'
                    : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {eraLoading && (
            <p className="text-blue-400 text-sm mt-3 animate-pulse">Loading era conditions…</p>
          )}
          {eraError && <ErrorMsg msg={eraError} />}
          {eraConditions && !eraLoading && (
            <p className="text-gray-500 text-xs mt-3">
              {Object.keys(eraConditions.countries).length} countries loaded · starts {eraConditions.startDate}
            </p>
          )}
        </Panel>

        {/* ── Step 3: Country + Difficulty ── */}
        {eraConditions && (
          <Panel>
            <SectionTitle>Step 3 — Country &amp; Difficulty</SectionTitle>

            {/* Country search */}
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-1">Country</label>
              <input
                type="text"
                value={countrySearch}
                onChange={(e) => setCountrySearch(e.target.value)}
                placeholder="Search countries…"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 mb-2"
              />
              <div className="max-h-48 overflow-y-auto rounded-lg border border-white/10 bg-black/20">
                {sortedCountries.length === 0 ? (
                  <p className="text-gray-500 text-sm px-3 py-2">No countries match.</p>
                ) : (
                  sortedCountries.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCountry(c.id)}
                      className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                        selectedCountry === c.id
                          ? 'bg-indigo-700 text-white'
                          : 'text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      {c.name}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Difficulty */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Difficulty</label>
              <div className="flex flex-wrap gap-2">
                {DIFFICULTIES.map(({ label, value, description }) => (
                  <button
                    key={value}
                    onClick={() => setDifficulty(value)}
                    title={description}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      difficulty === value
                        ? 'bg-amber-600 border-amber-500 text-white'
                        : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-gray-500 text-xs mt-1">
                {DIFFICULTIES.find((d) => d.value === difficulty)?.description}
              </p>
            </div>
          </Panel>
        )}

        {/* ── Step 4: Start / Load ── */}
        {eraConditions && (
          <Panel>
            <SectionTitle>Step 4 — Start or Load</SectionTitle>

            {startError && <ErrorMsg msg={startError} />}

            <div className="flex flex-wrap gap-3 mb-6">
              <button
                onClick={handleStartGame}
                disabled={!selectedCountry}
                className="px-6 py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm font-semibold transition-colors"
              >
                Start New Game
              </button>
              <button
                onClick={handleShowSaves}
                className="px-6 py-2.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-sm font-medium transition-colors"
              >
                Load Save…
              </button>
            </div>

            {savesVisible && (
              <div>
                <h3 className="text-sm text-gray-400 mb-2">Saved Games</h3>
                {savesLoading && (
                  <p className="text-blue-400 text-sm animate-pulse">Loading saves…</p>
                )}
                {savesError && <ErrorMsg msg={savesError} />}
                {!savesLoading && saves.length === 0 && !savesError && (
                  <p className="text-gray-500 text-sm">No saves found.</p>
                )}
                <div className="space-y-1">
                  {saves.map((name) => (
                    <button
                      key={name}
                      onClick={() => handleLoadSave(name)}
                      className="w-full text-left px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-gray-300 transition-colors"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Panel>
        )}

      </div>
    </div>
  )
}
