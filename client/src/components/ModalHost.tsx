// Lightweight modal host matching the game's dark UI.
// Provides confirm(), prompt(), and alert() replacements for the browser
// dialogs so all in-game questions share the same look & feel.

import { create } from 'zustand'
import { useEffect, useState, useRef } from 'react'

// ── Store ─────────────────────────────────────────────────────────────────────

type DialogKind = 'confirm' | 'prompt' | 'alert'

interface DialogState {
  id: number
  kind: DialogKind
  title: string
  body?: string
  defaultValue?: string
  placeholder?: string
  okLabel?: string
  cancelLabel?: string
  tone?: 'default' | 'danger'
  resolve: (value: boolean | string | null) => void
}

interface ModalStoreState {
  queue: DialogState[]
  enqueue: (d: DialogState) => void
  close: (id: number, value: boolean | string | null) => void
}

let nextId = 1
const useModalStore = create<ModalStoreState>()((set) => ({
  queue: [],
  enqueue: (d) => set(s => ({ queue: [...s.queue, d] })),
  close: (id, value) => set(s => {
    const d = s.queue.find(x => x.id === id)
    if (d) d.resolve(value)
    return { queue: s.queue.filter(x => x.id !== id) }
  }),
}))

// ── Public API — drop-in replacements for browser dialogs ────────────────────

export function confirm(opts: {
  title: string
  body?: string
  okLabel?: string
  cancelLabel?: string
  tone?: 'default' | 'danger'
}): Promise<boolean> {
  return new Promise<boolean>((res) => {
    useModalStore.getState().enqueue({
      id: nextId++,
      kind: 'confirm',
      title: opts.title,
      body: opts.body,
      okLabel: opts.okLabel,
      cancelLabel: opts.cancelLabel,
      tone: opts.tone,
      resolve: (v) => res(v === true),
    })
  })
}

export function prompt(opts: {
  title: string
  body?: string
  defaultValue?: string
  placeholder?: string
  okLabel?: string
  cancelLabel?: string
}): Promise<string | null> {
  return new Promise<string | null>((res) => {
    useModalStore.getState().enqueue({
      id: nextId++,
      kind: 'prompt',
      title: opts.title,
      body: opts.body,
      defaultValue: opts.defaultValue ?? '',
      placeholder: opts.placeholder,
      okLabel: opts.okLabel,
      cancelLabel: opts.cancelLabel,
      resolve: (v) => res(typeof v === 'string' ? v : null),
    })
  })
}

export function alert(opts: { title: string; body?: string; okLabel?: string }): Promise<void> {
  return new Promise<void>((res) => {
    useModalStore.getState().enqueue({
      id: nextId++,
      kind: 'alert',
      title: opts.title,
      body: opts.body,
      okLabel: opts.okLabel,
      resolve: () => res(),
    })
  })
}

// ── Three-option variant for "yes / no / secondary" ──────────────────────────
export function choose(opts: {
  title: string
  body?: string
  okLabel: string
  cancelLabel: string
}): Promise<boolean> {
  return confirm(opts)
}

// ── Host component ───────────────────────────────────────────────────────────

export default function ModalHost() {
  const queue = useModalStore(s => s.queue)
  const close = useModalStore(s => s.close)
  const current = queue[0]
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (current?.kind === 'prompt') {
      setInput(current.defaultValue ?? '')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [current?.id, current?.kind, current?.defaultValue])

  useEffect(() => {
    if (!current) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close(current.id, current.kind === 'alert' ? null : false)
      } else if (e.key === 'Enter' && current.kind !== 'prompt') {
        close(current.id, current.kind === 'alert' ? null : true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [current, close])

  if (!current) return null

  const okTone = current.tone === 'danger'
    ? 'bg-red-700 hover:bg-red-600 border-red-500/50'
    : 'bg-blue-700 hover:bg-blue-600 border-blue-500/50'

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={() => close(current.id, current.kind === 'alert' ? null : false)}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-[420px] max-w-[90vw] rounded-2xl bg-[#0a1628] border border-white/15 shadow-2xl p-5"
      >
        <p className="text-sm font-bold text-white mb-1">{current.title}</p>
        {current.body && (
          <p className="text-[11px] text-gray-400 whitespace-pre-line mb-3 leading-snug">{current.body}</p>
        )}

        {current.kind === 'prompt' && (
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                close(current.id, input)
              }
            }}
            placeholder={current.placeholder}
            className="w-full bg-[#050b16] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 mb-3"
          />
        )}

        <div className="flex gap-2 mt-2">
          {current.kind !== 'alert' && (
            <button
              onClick={() => close(current.id, current.kind === 'prompt' ? null : false)}
              className="flex-1 px-3 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 transition-colors"
            >
              {current.cancelLabel ?? 'Cancel'}
            </button>
          )}
          <button
            onClick={() =>
              close(
                current.id,
                current.kind === 'prompt' ? input : current.kind === 'alert' ? null : true,
              )
            }
            className={`flex-1 px-3 py-2 rounded-xl text-xs font-semibold text-white border transition-colors ${okTone}`}
          >
            {current.okLabel ?? 'OK'}
          </button>
        </div>
      </div>
    </div>
  )
}
