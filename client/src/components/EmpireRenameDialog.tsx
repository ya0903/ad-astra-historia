import { useState } from 'react'

interface Props {
  currentName: string
  nextEraName: string
  onConfirm: (newName: string | undefined) => void
  onCancel: () => void
}

export default function EmpireRenameDialog({ currentName, nextEraName, onConfirm, onCancel }: Props) {
  const [name, setName] = useState(currentName)

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center" onClick={onCancel}>
      <div className="bg-[#0a1628] border border-purple-500/40 rounded-2xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-white mb-2">Entering {nextEraName}</h3>
        <p className="text-xs text-gray-400 mb-4">A new age dawns. Will you keep your name, or proclaim a new empire?</p>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onConfirm(name.trim() || undefined) }}
          className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white mb-4 focus:outline-none focus:border-purple-500"
          placeholder="Empire name"
        />
        <div className="flex gap-2">
          <button onClick={onCancel} className="px-3 py-1.5 rounded-lg text-xs bg-white/5 hover:bg-white/10 text-gray-300">
            Cancel
          </button>
          <button onClick={() => onConfirm(undefined)} className="px-3 py-1.5 rounded-lg text-xs bg-white/5 hover:bg-white/10 text-gray-300">
            Keep Name
          </button>
          <button onClick={() => onConfirm(name.trim() || undefined)} className="flex-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-700 hover:bg-purple-600 text-white">
            Confirm →
          </button>
        </div>
      </div>
    </div>
  )
}
