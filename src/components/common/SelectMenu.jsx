import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'

const LIST_MAX_HEIGHT = 240

// A form dropdown with a themed option list instead of the browser's native one. Same look and behaviour as the
// country-code picker: the list is drawn in a portal (never clipped by a scrolling form), opens upwards when
// there is no room below, and works from the keyboard. The first row is the placeholder, so a choice can be cleared.
// Plugs into react-hook-form the way Select does (`register`), plus `watch` and `setValue` to read and set the value.
export default function SelectMenu({ label, name, register, watch, setValue, error, options, required, placeholder = 'Select an option', className = '' }) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [placement, setPlacement] = useState(null)
  const triggerRef = useRef(null)
  const listRef = useRef(null)
  const listId = useId()
  const errorId = error ? `${name}-error` : undefined

  const value = watch(name) || ''
  const rows = [{ value: '', label: placeholder }, ...options.map((option) => ({ value: option, label: option }))]

  const openList = () => {
    const rect = triggerRef.current.getBoundingClientRect()
    const below = window.innerHeight - rect.bottom - 12
    const above = rect.top - 12
    const flip = below < Math.min(LIST_MAX_HEIGHT, rows.length * 40 + 8) && above > below
    setPlacement({
      left: rect.left,
      width: rect.width,
      ...(flip ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }),
      maxHeight: Math.max(120, Math.min(LIST_MAX_HEIGHT, flip ? above : below)),
    })
    setActive(Math.max(0, rows.findIndex((row) => row.value === value)))
    setOpen(true)
  }

  const close = (returnFocus = false) => {
    setOpen(false)
    if (returnFocus) triggerRef.current?.focus()
  }

  const choose = (row) => {
    setValue(name, row.value, { shouldDirty: true, shouldTouch: true, shouldValidate: true })
    close(true)
  }

  useEffect(() => {
    if (!open) return undefined
    listRef.current?.focus()
    const onPointerDown = (event) => {
      if (!listRef.current?.contains(event.target) && !triggerRef.current?.contains(event.target)) close()
    }
    const onScroll = (event) => { if (!listRef.current?.contains(event.target)) close() }
    document.addEventListener('mousedown', onPointerDown)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', close)
    }
  }, [open])

  useEffect(() => {
    if (open) listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [open, active])

  const onTriggerKeyDown = (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) openList()
    }
  }

  const onListKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((index) => Math.min(index + 1, rows.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((index) => Math.max(index - 1, 0))
    } else if (event.key === 'Home') {
      event.preventDefault()
      setActive(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      setActive(rows.length - 1)
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      choose(rows[active])
    } else if (event.key === 'Escape') {
      // Keep Escape for this list; an enclosing popup would otherwise close as well.
      event.preventDefault()
      event.stopPropagation()
      close(true)
    } else if (event.key === 'Tab') {
      close()
    }
  }

  return (
    <div className={className}>
      <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.04em] text-navy-900" htmlFor={name}>
        {label}{required && <span className="ml-1 text-red-600" aria-hidden="true">*</span>}
      </label>
      <input type="hidden" {...register(name)} />
      <button
        ref={triggerRef}
        type="button"
        id={name}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-invalid={Boolean(error)}
        aria-required={required}
        aria-describedby={errorId}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onTriggerKeyDown}
        className="app-field flex items-center justify-between gap-2 text-left"
      >
        <span className={`truncate ${value ? '' : 'text-[#91a3ba]'}`}>{value || placeholder}</span>
        <ChevronDown size={16} className={`shrink-0 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {open && placement && createPortal(
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          tabIndex={-1}
          aria-label={label}
          aria-activedescendant={`${listId}-${active}`}
          onKeyDown={onListKeyDown}
          style={{ position: 'fixed', zIndex: 100, left: placement.left, width: placement.width, top: placement.top, bottom: placement.bottom, maxHeight: placement.maxHeight }}
          className="overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-[0_12px_32px_rgba(16,42,76,0.18)] outline-none"
        >
          {rows.map((row, index) => {
            const isPlaceholder = row.value === ''
            // The placeholder row only clears the choice; it is never shown as the selected one.
            const isSelected = !isPlaceholder && row.value === value
            return (
              <li
                key={row.value || 'none'}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={isPlaceholder ? !value : isSelected}
                data-index={index}
                onMouseEnter={() => setActive(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(row)}
                className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-[13px] ${index === active ? 'bg-brand-50' : ''} ${isSelected ? 'font-bold text-brand-700' : isPlaceholder ? 'text-slate-400' : 'text-navy-900'}`}
              >
                <span className="min-w-0 flex-1 truncate">{row.label}</span>
                <Check size={14} className={`shrink-0 text-brand-600 ${isSelected ? '' : 'invisible'}`} aria-hidden="true" />
              </li>
            )
          })}
        </ul>,
        document.body,
      )}
      {error && <p id={errorId} className="mt-1 text-[11px] font-medium text-red-600">{error.message}</p>}
    </div>
  )
}
