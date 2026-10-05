import { useRef, useState } from 'react'
import { AlertCircle, FileText, Paperclip, UploadCloud, X } from 'lucide-react'
import FormSection from './FormSection'
import { DOCUMENT_ACCEPT, documentProblem, documentTypes } from '../../data/documentTypes'
import { formatFileSize } from '../../utils/formatters'

function DocumentSlot({ type, files, onChange }) {
  const inputRef = useRef(null)
  const [dragActive, setDragActive] = useState(false)
  const [problem, setProblem] = useState('')
  const full = files.length >= type.max

  const addFiles = (fileList) => {
    const incoming = Array.from(fileList || [])
    if (incoming.length === 0) return
    const bad = incoming.map(documentProblem).find(Boolean)
    if (bad) {
      setProblem(bad)
      return
    }
    // A single-file slot swaps its file for the new one; a multi-file slot adds until it is full.
    const next = type.max === 1 ? incoming.slice(0, 1) : [...files, ...incoming]
    if (next.length > type.max) {
      setProblem(`You can attach up to ${type.max} files here.`)
      return
    }
    setProblem('')
    onChange(type.key, next)
  }

  const remove = (index) => {
    setProblem('')
    onChange(type.key, files.filter((_, position) => position !== index))
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="mb-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.04em] text-navy-900">{type.label}</p>
        {type.hint && <p className="text-[11px] leading-4 text-slate-500">{type.hint}</p>}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={DOCUMENT_ACCEPT}
        multiple={type.max > 1}
        className="hidden"
        tabIndex={-1}
        onChange={(event) => { addFiles(event.target.files); event.target.value = '' }}
      />

      {files.length > 0 && (
        <ul className="mb-2 grid gap-1.5">
          {files.map((file, index) => (
            <li key={`${file.name}-${file.size}-${file.lastModified}`} className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/60 px-2.5 py-1.5">
              <FileText size={16} className="shrink-0 text-emerald-700" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-xs font-bold text-navy-900" title={file.name}>{file.name}</span>
              <span className="shrink-0 text-[11px] font-medium text-slate-500">{formatFileSize(file.size)}</span>
              <button
                type="button"
                onClick={() => remove(index)}
                aria-label={`Remove ${file.name}`}
                className="grid size-6 shrink-0 place-items-center rounded-md text-red-500 transition hover:bg-red-50"
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {(!full || type.max === 1) && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => { event.preventDefault(); setDragActive(true) }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(event) => { event.preventDefault(); setDragActive(false); addFiles(event.dataTransfer.files) }}
          aria-label={`${files.length === 0 ? 'Upload' : type.max === 1 ? 'Replace' : 'Add another file to'} ${type.label}`}
          className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-dashed px-3 text-xs font-bold transition ${dragActive ? 'border-brand-500 bg-blue-50 text-brand-700' : 'border-[#c6d5e6] bg-[#fbfcfe] text-brand-600 hover:border-blue-300 hover:bg-blue-50/40'}`}
        >
          <UploadCloud size={16} aria-hidden="true" />
          {files.length === 0 ? 'Click or drag a file' : type.max === 1 ? 'Replace file' : 'Add another file'}
        </button>
      )}

      {problem && (
        <p role="alert" className="mt-1.5 flex items-start gap-1.5 text-[11px] font-medium leading-4 text-red-600">
          <AlertCircle size={13} className="mt-px shrink-0" aria-hidden="true" /> {problem}
        </p>
      )}
    </div>
  )
}

// Optional supporting documents for the onboarding request: PAN, Aadhaar, GST certificate, bank proof, CIN, and others.
// `documents` is { [typeKey]: File[] } and lives in the page, so it survives moving between steps.
export default function SupportingDocuments({ documents, onChange }) {
  return (
    <FormSection
      icon={Paperclip}
      title="Upload supporting documents"
      description="Attach documents that support the details above. All are optional. PDF, JPG or PNG, up to 5 MB each."
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {documentTypes.map((type) => (
          <DocumentSlot key={type.key} type={type} files={documents[type.key] || []} onChange={onChange} />
        ))}
      </div>
    </FormSection>
  )
}
