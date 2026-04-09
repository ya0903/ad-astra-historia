import { useState, useRef, useEffect } from 'react'

/**
 * Shared resizable-panel hook.
 *
 * Matches the DiplomacyPanel / AdvisorPanel resize UX: a top-left drag
 * handle that shrinks/grows the panel by tracking mouse deltas. Returns the
 * current width/height plus props for the handle.
 *
 * Usage:
 *   const { width, height, handleProps } = useResizablePanel({ w: 288, h: 480 })
 *   <div style={{ width, height, ...positionStyle }}>
 *     <div {...handleProps}>...drag glyph...</div>
 *     ...
 *   </div>
 */
export function useResizablePanel(initial: { w: number; h: number; minW?: number; maxW?: number; minH?: number; maxH?: number }) {
  const minW = initial.minW ?? 260
  const maxW = initial.maxW ?? 600
  const minH = initial.minH ?? 200
  const maxH = initial.maxH ?? 700
  const [panelW, setPanelW] = useState(initial.w)
  const [panelH, setPanelH] = useState(initial.h)
  const dragRef = useRef<{ startX: number; startY: number; w: number; h: number } | null>(null)

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return
      setPanelW(Math.max(minW, Math.min(maxW, dragRef.current.w + (dragRef.current.startX - e.clientX))))
      setPanelH(Math.max(minH, Math.min(maxH, dragRef.current.h + (dragRef.current.startY - e.clientY))))
    }
    const onUp = () => { dragRef.current = null }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [minW, maxW, minH, maxH])

  return {
    width: panelW,
    height: typeof window !== 'undefined' ? Math.min(panelH, window.innerHeight - 120) : panelH,
    rawHeight: panelH,
    handleProps: {
      onMouseDown: (e: React.MouseEvent) => {
        e.preventDefault()
        dragRef.current = { startX: e.clientX, startY: e.clientY, w: panelW, h: panelH }
      },
      className: 'absolute top-0 left-0 w-5 h-5 cursor-nw-resize z-10 flex items-center justify-center opacity-30 hover:opacity-80 transition-opacity',
      title: 'Drag to resize',
    },
  }
}

/** The drag glyph SVG content for the handle (reusable component-less). */
export const RESIZE_HANDLE_SVG = (
  'M1 7L7 1M1 4L4 1'
)
