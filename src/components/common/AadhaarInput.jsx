import { maskAadhaarInput } from '../../utils/formatters'

// One field that groups what is typed or pasted into three sets of four digits ("1234 5678 9012").
// The value kept in the form carries the spaces; strip them before sending it anywhere.
export default function AadhaarInput({ label, name, register, error, hint, required, className = '' }) {
  const field = register(name)
  const errorId = error ? `${name}-error` : undefined

  const handleChange = (event) => {
    maskAadhaarInput(event.target)
    field.onChange(event)
  }

  return (
    <div className={className}>
      <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.04em] text-navy-900" htmlFor={name}>
        {label}{required && <span className="ml-1 text-red-600" aria-hidden="true">*</span>}
      </label>
      <input
        id={name}
        className="app-field min-w-0 tracking-wider tabular-nums"
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="XXXX XXXX XXXX"
        maxLength={14}
        aria-invalid={Boolean(error)}
        aria-required={required}
        aria-describedby={errorId}
        {...field}
        onChange={handleChange}
      />
      {hint && !error && <p className="mt-1 text-[11px] leading-4 text-slate-500">{hint}</p>}
      {error && <p id={errorId} className="mt-1 text-[11px] font-medium text-red-600">{error.message}</p>}
    </div>
  )
}
