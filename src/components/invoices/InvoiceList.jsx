import { ExternalLink, FileText, Image as ImageIcon, Inbox, Trash2 } from 'lucide-react'
import { formatFileSize } from '../../utils/formatters'

const isImage = (invoice) => invoice.type.startsWith('image/') || /\.(png|jpe?g)$/i.test(invoice.name)

export default function InvoiceList({ invoices, onRemove }) {
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
              {formatFileSize(invoice.size)} · Uploaded {invoice.uploadedAt.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
            </p>
          </div>
          <span className="hidden shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 sm:inline-block">Ready</span>
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
          <button
            type="button"
            onClick={() => onRemove(invoice.id)}
            aria-label={`Remove ${invoice.name}`}
            title="Remove"
            className="interactive-icon shrink-0 hover:bg-red-50! hover:text-red-600!"
          >
            <Trash2 size={17} />
          </button>
        </li>
      ))}
    </ul>
  )
}
