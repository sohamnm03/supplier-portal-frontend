import { useRef, useState } from 'react'
import { AlertCircle, FileText, Paperclip, UploadCloud, X } from 'lucide-react'
import { formatFileSize } from '../../utils/formatters'

const MAX_SIZE = 10 * 1024 * 1024

export default function InvoiceUploader({ onFiles, error, onDismissError }) {
  const inputRef = useRef(null)
  const [queue, setQueue] = useState([])
  const [dragActive, setDragActive] = useState(false)
  const [validationError, setValidationError] = useState('')

  const addToQueue = (fileList) => {
    const files = Array.from(fileList || [])
    const valid = files.filter((file) => (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) && file.size <= MAX_SIZE)
    if (valid.length) {
      setQueue((current) => [
        ...current,
        ...valid.map((file) => ({ id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`, file })),
      ])
    }
    setValidationError(valid.length !== files.length ? 'Some files were skipped. Only PDF files up to 10MB are accepted.' : '')
  }

  const handleUpload = () => {
    if (!queue.length) return
    onFiles(queue.map((item) => item.file))
    setQueue([])
  }

  return (
    <section className="rounded-xl border border-[#dce6f1] bg-white px-5 py-4 shadow-[0_4px_16px_rgba(40,83,130,0.04)] sm:px-6">
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="size-1 rounded-full bg-sky-500" />
          <h1 className="text-[12px] font-extrabold uppercase tracking-[0.055em] text-[#5d6f86]">Invoice Upload</h1>
          <span className="grid min-w-5 place-items-center rounded-full bg-[#eef5fd] px-1.5 py-0.5 text-[11px] font-bold text-[#1769e8]">{queue.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleUpload}
            disabled={!queue.length}
            className="inline-flex h-8 items-center gap-2 rounded-lg bg-[#1769e8] px-3.5 text-xs font-bold text-white transition hover:bg-[#0f56c7] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          >
            <UploadCloud size={14} /> Upload All {queue.length}
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex h-8 items-center gap-2 rounded-lg border border-[#80aff2] bg-white px-3.5 text-xs font-bold text-[#1769e8] transition hover:bg-blue-50"
          >
            <Paperclip size={14} /> Add Invoices
          </button>
        </div>
      </div>

      <input ref={inputRef} type="file" accept="application/pdf,.pdf" multiple className="hidden" onChange={(event) => { addToQueue(event.target.files); event.target.value = '' }} />

      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click() }}
        onDragOver={(event) => { event.preventDefault(); setDragActive(true) }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(event) => { event.preventDefault(); setDragActive(false); addToQueue(event.dataTransfer.files) }}
        className={`flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-center transition ${dragActive ? 'border-brand-500 bg-blue-50' : 'border-[#dce6f1] bg-[#fbfcfe] hover:border-blue-300 hover:bg-blue-50/40'}`}
      >
        <UploadCloud size={22} className="text-[#91a8c3]" />
        <p className="text-[13px] font-bold text-[#29466a]">Click or drag PDF files here</p>
        <p className="text-[11px] text-[#6c819c]">PDF only — max 10MB per file</p>
      </div>

      {queue.length > 0 && (
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {queue.map((item) => (
            <div key={item.id} className="flex items-center gap-3 rounded-lg border border-[#dce6f1] bg-white px-3 py-2.5 shadow-[0_1px_3px_rgba(40,83,130,0.06)]">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-red-50 text-red-500"><FileText size={18} /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold text-[#102a4c]">{item.file.name}</p>
                <p className="mt-0.5 text-[11px] font-medium text-[#7189a4]">{formatFileSize(item.file.size)}</p>
              </div>
              <button type="button" onClick={() => setQueue((current) => current.filter((file) => file.id !== item.id))} aria-label={`Remove ${item.file.name}`} className="grid size-7 shrink-0 place-items-center rounded-md text-red-500 transition hover:bg-red-50"><X size={15} /></button>
            </div>
          ))}
        </div>
      )}

      {(error || validationError) && (
        <div role="alert" className="mt-3 flex items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          <span className="flex items-center gap-2"><AlertCircle size={14} /> {error || validationError}</span>
          <button type="button" onClick={() => { setValidationError(''); onDismissError?.() }} className="font-bold">Dismiss</button>
        </div>
      )}
    </section>
  )
}
