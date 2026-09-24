import { AlertCircle, ExternalLink, FileText, Image as ImageIcon, Inbox, LoaderCircle, ScanText, Trash2 } from 'lucide-react'
import { formatFileSize } from '../../utils/formatters'

const isImage = (invoice) => invoice.type?.startsWith('image/') || /\.(png|jpe?g)$/i.test(invoice.name)

function displayValue(value) {
  if (value == null || value === '') return '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function LineItemData({ data }) {
  if (!data) return null
  const items = Array.isArray(data) ? data : [data]

  return (
    <div className="mt-2 space-y-2">
      {items.map((item, index) => {
        if (!item || typeof item !== 'object') return <p key={index} className="text-xs text-slate-600">{displayValue(item)}</p>
        return (
          <dl key={item.id ?? item.line_item_id ?? index} className="grid gap-x-4 gap-y-1 rounded-lg bg-slate-50 px-3 py-2 sm:grid-cols-2 xl:grid-cols-3">
            {Object.entries(item).map(([key, value]) => (
              <div key={key} className="min-w-0 text-xs">
                <dt className="truncate font-semibold capitalize text-slate-500">{key.replaceAll('_', ' ')}</dt>
                <dd className="break-words font-bold text-navy-900">{displayValue(value)}</dd>
              </div>
            ))}
          </dl>
        )
      })}
    </div>
  )
}

export default function InvoiceList({ invoices, onRemove, onExtract, isLoading = false, error = '' }) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-12 text-sm font-semibold text-slate-600">
        <LoaderCircle size={18} className="animate-spin text-brand-600" /> Loading invoices...
      </div>
    )
  }

  if (error) {
    return (
      <div role="alert" className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm font-semibold text-red-800">
        <AlertCircle size={18} /> {error}
      </div>
    )
  }

  if (!invoices.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-14 text-center">
        <span className="grid size-11 place-items-center rounded-full bg-white text-slate-400 shadow-sm"><Inbox size={20} /></span>
        <p className="text-sm font-bold text-navy-900">No invoices uploaded yet</p>
        <p className="max-w-xs text-xs text-slate-500">Uploaded invoices will appear here for this session.</p>
      </div>
    )
  }

  return (
    <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
      {invoices.map((invoice) => (
        <li key={invoice.id} className="flex items-center gap-3 px-4 py-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
            {isImage(invoice) ? <ImageIcon size={18} /> : <FileText size={18} />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-navy-900">{invoice.name}</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {invoice.size > 0 && <>{formatFileSize(invoice.size)} · </>}Uploaded {invoice.uploadedAt.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
            </p>
            <LineItemData data={invoice.mainLineItemData} />
            {invoice.extractionError && (
              <p role="alert" className="mt-1.5 text-xs font-semibold text-red-600">{invoice.extractionError}</p>
            )}
          </div>
          <span className={`hidden shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold sm:inline-block ${invoice.extractionStatus === 'failed' ? 'bg-red-50 text-red-700' : invoice.extractionStatus === 'extracting' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>
            {invoice.extractionStatus === 'failed' ? 'Failed' : invoice.extractionStatus === 'extracting' ? 'Extracting...' : invoice.source === 'local' ? 'Ready' : 'Extracted'}
          </span>
          {invoice.source === 'local' && (
            <button
              type="button"
              onClick={() => onExtract(invoice.id)}
              disabled={invoice.extractionStatus === 'extracting'}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {invoice.extractionStatus === 'extracting' ? <LoaderCircle size={15} className="animate-spin" /> : <ScanText size={15} />}
              {invoice.extractionStatus === 'extracting' ? 'Extracting' : 'Extract'}
            </button>
          )}
          {invoice.url && (
            <a
              href={invoice.url}
              target="_blank"
              rel="noreferrer"
              aria-label={`Open ${invoice.name}`}
              title="Open"
              className="interactive-icon shrink-0"
            >
              <ExternalLink size={17} />
            </a>
          )}
          {invoice.source === 'local' && (
            <button
              type="button"
              onClick={() => onRemove(invoice.id)}
              aria-label={`Remove ${invoice.name}`}
              title="Remove"
              className="interactive-icon shrink-0 hover:bg-red-50! hover:text-red-600!"
            >
              <Trash2 size={17} />
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}
