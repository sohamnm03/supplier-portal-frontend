import { useRef, useState } from 'react'
import { AlertCircle, FileText, Paperclip, UploadCloud, X } from 'lucide-react'
import FormSection from './FormSection'
import FlagNote from '../common/FlagNote'
import { DOCUMENT_ACCEPT, documentProblem, documentTypes } from '../../data/documentTypes'
import { formatFileSize } from '../../utils/formatters'

function DocumentSlot({ type, files, onChange, existing = [], flag, onConfirm, onUnconfirm }) {
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
    <div id={`doc-${type.key}`} className={`flex h-full flex-col rounded-lg border bg-white p-3 ${flag?.status === 'open' ? 'border-red-300 bg-red-50/40' : 'border-slate-200'}`}>
      <div className="mb-2 min-h-9">
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

      {files.length === 0 && existing.length > 0 && (
        <ul className="mb-2 grid gap-1.5">
          {existing.map((file) => (
            <li key={file.original_name} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5">
              <FileText size={16} className="shrink-0 text-slate-500" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-xs font-bold text-navy-900" title={file.original_name}>{file.original_name}</span>
              <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">On file</span>
            </li>
          ))}
        </ul>
      )}

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
          className={`mt-auto flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-dashed px-3 text-xs font-bold transition ${dragActive ? 'border-brand-500 bg-blue-50 text-brand-700' : 'border-[#c6d5e6] bg-[#fbfcfe] text-brand-600 hover:border-blue-300 hover:bg-blue-50/40'}`}
        >
          <UploadCloud size={16} aria-hidden="true" />
          {files.length === 0 && existing.length === 0 ? 'Click or drag a file' : type.max === 1 ? 'Replace file' : files.length === 0 ? 'Replace files' : 'Add another file'}
        </button>
      )}

      {problem && (
        <p role="alert" className="mt-1.5 flex items-start gap-1.5 text-[11px] font-medium leading-4 text-red-600">
          <AlertCircle size={13} className="mt-px shrink-0" aria-hidden="true" /> {problem}
        </p>
      )}
      <FlagNote flag={flag} onConfirm={onConfirm} onUnconfirm={onUnconfirm} />
    </div>
  )
}

// Optional supporting documents for the onboarding request: PAN, Aadhaar, GST certificate, bank proof, CIN, and others.
// `documents` is { [typeKey]: File[] } and lives in the page, so it survives moving between steps. `existing` is what is
// already on file ({ [typeKey]: [{ original_name }] }); a new file replaces it. `flags` are the documents a returned
// application was flagged for, each with its status.
export default function SupportingDocuments({ documents, onChange, existing = {}, flags = {}, onConfirm, onUnconfirm }) {
  return (
    <FormSection
      icon={Paperclip}
      title="Upload supporting documents"
      description="Attach documents that support the details above. PDF, JPG or PNG, up to 5 MB each. A new file replaces the one on file."
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {documentTypes.map((type) => (
          <DocumentSlot
            key={type.key}
            type={type}
            files={documents[type.key] || []}
            onChange={onChange}
            existing={existing[type.key] || []}
            flag={flags[type.key]}
            onConfirm={() => onConfirm?.(type.key)}
            onUnconfirm={() => onUnconfirm?.(type.key)}
          />
        ))}
      </div>
    </FormSection>
  )
}
