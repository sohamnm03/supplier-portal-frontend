import { useEffect, useRef } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import Button from './Button'

export default function Modal({ open, onClose, onConfirm }) {
  const cancelRef = useRef(null)
  const dialogRef = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    cancelRef.current?.focus()
    const handleKey = (event) => {
      if (event.key === 'Escape') onClose()
      if (event.key !== 'Tab') return
      const focusable = dialogRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      if (!focusable?.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-navy-950/55 p-4 backdrop-blur-[2px]"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-title"
        aria-describedby="cancel-description"
      >
        <div className="flex items-start justify-between">
          <div className="grid size-11 place-items-center rounded-full bg-red-50 text-red-600">
            <AlertTriangle size={21} />
          </div>
          <button onClick={onClose} aria-label="Close dialog" className="interactive-icon">
            <X size={20} />
          </button>
        </div>
        <h2 id="cancel-title" className="mt-4 text-xl font-bold text-navy-900">Discard this request?</h2>
        <p id="cancel-description" className="mt-2 text-sm leading-6 text-slate-600">
          All entered information and any saved draft on this device will be cleared. This cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button ref={cancelRef} variant="secondary" onClick={onClose}>Keep editing</Button>
          <Button variant="danger" onClick={onConfirm}>Discard request</Button>
        </div>
      </div>
    </div>
  )
}
