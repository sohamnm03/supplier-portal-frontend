import { useRef, useState } from 'react'
import { AlertCircle, UploadCloud } from 'lucide-react'
import Button from '../common/Button'

export default function InvoiceUploader({ onFiles, error, onDismissError }) {
  const inputRef = useRef(null)
  const [dragActive, setDragActive] = useState(false)

  const handleDrop = (event) => {
    event.preventDefault()
    setDragActive(false)
    if (event.dataTransfer.files?.length) onFiles(event.dataTransfer.files)
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click() }}
        onDragOver={(event) => { event.preventDefault(); setDragActive(true) }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition ${dragActive ? 'border-brand-500 bg-brand-50' : 'border-slate-300 bg-slate-50/60 hover:border-brand-400 hover:bg-brand-50/60'}`}
      >
        <span className="grid size-11 place-items-center rounded-full bg-brand-50 text-brand-600">
          <UploadCloud size={22} />
        </span>
        <p className="text-sm font-bold text-navy-900">Drag and drop invoices here, or click to browse</p>
        <p className="text-xs text-slate-500">PDF, PNG or JPG · Up to 10 MB per file · Multiple files supported</p>
        <Button type="button" variant="secondary" className="mt-1" onClick={(event) => { event.stopPropagation(); inputRef.current?.click() }}>
          Browse files
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          multiple
          className="hidden"
          onChange={(event) => { if (event.target.files?.length) onFiles(event.target.files); event.target.value = '' }}
        />
      </div>

      {error && (
        <div role="alert" className="mt-3 flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <span className="flex items-start gap-2"><AlertCircle size={16} className="mt-0.5 shrink-0" /> {error}</span>
          <button type="button" onClick={onDismissError} className="shrink-0 text-xs font-bold text-red-700 hover:text-red-900">Dismiss</button>
        </div>
      )}
    </div>
  )
}
