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
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white px-6 pb-6 pt-5 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-title"
        aria-describedby="cancel-description"
      >
        <div className="flex items-center justify-between">
          <div className="grid size-10 place-items-center rounded-full bg-red-50 text-red-600">
            <AlertTriangle size={20} />
          </div>
          <button onClick={onClose} aria-label="Close dialog" className="interactive-icon -mr-2 !min-h-9 !min-w-9">
            <X size={18} />
          </button>
        </div>
        <h2 id="cancel-title" className="mt-4 text-lg font-bold leading-6 text-navy-900">Discard this request?</h2>
        <p id="cancel-description" className="mt-2 text-[13px] leading-5 text-slate-600">
          Everything you have entered will be lost, because your progress is not saved anywhere. This cannot be undone.
        </p>
        {/* Buttons take their text size from this wrapper (the global button reset ignores a size set on the button itself). */}
        <div className="mt-6 flex flex-col-reverse gap-2.5 text-[13px] sm:flex-row sm:justify-end">
          <Button ref={cancelRef} variant="secondary" className="min-h-10! px-4! py-2!" onClick={onClose}>Keep editing</Button>
          <Button variant="danger" className="min-h-10! px-4! py-2!" onClick={onConfirm}>Discard request</Button>
        </div>
      </div>
    </div>
  )
}
