export default function Input({ label, name, register, error, hint, required, className = '', ...props }) {
  const errorId = error ? `${name}-error` : undefined
  return (
    <div className={className}>
      <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.04em] text-navy-900" htmlFor={name}>
        {label}{required && <span className="ml-1 text-red-600" aria-hidden="true">*</span>}
      </label>
      <input id={name} className="app-field" aria-invalid={Boolean(error)} aria-required={required} aria-describedby={errorId} {...register(name)} {...props} />
      {hint && !error && <p className="mt-1 text-[11px] leading-4 text-slate-500">{hint}</p>}
      {error && <p id={errorId} className="mt-1 text-[11px] font-medium text-red-600">{error.message}</p>}
    </div>
  )
}
