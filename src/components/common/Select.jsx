export default function Select({ label, name, register, error, options, required, className = '', placeholder = 'Select an option', ...props }) {
  const errorId = error ? `${name}-error` : undefined
  return (
    <div className={className}>
      <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.04em] text-navy-900" htmlFor={name}>
        {label}{required && <span className="ml-1 text-red-600" aria-hidden="true">*</span>}
      </label>
      <select id={name} className="app-field" aria-invalid={Boolean(error)} aria-required={required} aria-describedby={errorId} {...register(name)} {...props}>
        <option value="">{placeholder}</option>
        {options.map((option) => <option value={option} key={option}>{option}</option>)}
      </select>
      {error && <p id={errorId} className="mt-1 text-[11px] font-medium text-red-600">{error.message}</p>}
    </div>
  )
}
