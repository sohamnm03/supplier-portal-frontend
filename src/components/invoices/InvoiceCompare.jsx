import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { LoaderCircle, Upload } from 'lucide-react'
import { getInvoicePreviewUrl } from '../../api/vendorApi'

const BTN = { fontSize: '0.75rem', lineHeight: '1rem', fontWeight: 600 }

// Hide the built-in thumbnail sidebar and fit the page to the viewer width; toolbar zoom then works from that baseline.
export const pdfSrc = (url) => (url ? `${url.split('#')[0]}#navpanes=0&pagemode=none&view=FitH` : url)

// The invoice's stored file as something an iframe can show: fetched here and re-served as an in-memory PDF, because the storage
// link's "attachment" headers would otherwise make the browser download it. Returns a blob: URL (the caller revokes it) or the
// storage link itself when it cannot be read from here. Throws a readable Error.
export async function loadInvoicePdfUrl(invoice) {
  if (invoice.source === 'local' && invoice.url) return invoice.url
  const sourceUrl = await getInvoicePreviewUrl(invoice.blobUrl || invoice.blob_url)
  let response
  try {
    response = await fetch(sourceUrl)
  } catch {
    // Storage blocks cross-origin reads (CORS): retry through the same-origin proxy.
    try {
      response = await fetch(`/blob-proxy?u=${encodeURIComponent(sourceUrl)}`)
    } catch {
      response = null
    }
  }
  if (!response) return sourceUrl
  if (!response.ok) throw new Error('The invoice file could not be found. It may not have been uploaded properly.')
  const buffer = await response.arrayBuffer()
  const isPdf = new TextDecoder().decode(buffer.slice(0, 1024)).includes('%PDF-')
  if (!buffer.byteLength || !isPdf) throw new Error('This invoice file is empty or is not a valid PDF, so it cannot be previewed.')
  return URL.createObjectURL(new Blob([buffer], { type: 'application/pdf' }))
}

// The invoice being replaced next to the file about to replace it, so the user can check it is the right one before overwriting.
export function CompareOverlay({ currentUrl, loading, file, invoiceNumber, onClose, onOverwrite }) {
  // Created in an effect (not during render) so the cleanup that revokes it cannot kill the URL still on screen, e.g. when React
  // re-runs effects in development.
  const [nextUrl, setNextUrl] = useState('')
  useEffect(() => {
    const url = URL.createObjectURL(file)
    setNextUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])
  const nextIsImage = file.type.startsWith('image/')
  const pane = (title, subtitle, accent, body) => (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className={`border-b border-[#dce6f1] border-t-[3px] px-4 py-2 ${accent}`}>
        <p className="text-[11px] font-bold uppercase tracking-[0.04em] text-[#29466a]">{title}</p>
        <p className="truncate text-[11.5px] text-[#59728f]" title={subtitle}>{subtitle}</p>
      </div>
      <div className="min-h-0 flex-1 bg-[#f4f8fc]">{body}</div>
    </div>
  )
  return createPortal(
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-950/55 p-3 sm:p-5" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="flex h-[94dvh] w-full max-w-[1600px] flex-col overflow-hidden rounded-xl bg-white shadow-2xl" role="dialog" aria-modal="true" aria-label="Compare invoices">
      <header className="flex shrink-0 items-center justify-between border-b-2 border-[#6aafff] bg-[#eef6ff] px-5 py-2.5">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#4a7ab5]">Compare invoices</p>
          <p className="text-sm font-bold text-[#102a4c]">{invoiceNumber}</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button type="button" onClick={onClose} className="inline-flex h-8 items-center rounded-md border border-[#b9d3ef] bg-white px-3.5 text-xs font-semibold text-[#1265c8] transition hover:bg-[#eaf3ff]" style={BTN}>Back</button>
          {onOverwrite && <button type="button" onClick={onOverwrite} className="inline-flex h-8 items-center gap-2 rounded-md bg-[#1265c8] px-3.5 text-xs font-semibold text-white transition hover:bg-[#0f56ab]" style={BTN}><Upload size={14} /> Overwrite invoice</button>}
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {pane('Current invoice', 'Will be replaced', 'border-t-[#9fb3c8]',
          loading ? <div className="grid h-full place-items-center"><LoaderCircle size={24} className="animate-spin text-[#1769e8]" /></div>
            : currentUrl ? <iframe src={pdfSrc(currentUrl)} title="Current invoice" className="h-full min-h-[300px] w-full border-0" />
              : <p className="grid h-full place-items-center px-6 text-center text-xs text-[#59728f]">The current file could not be shown.</p>)}
        <div className="hidden w-px bg-[#dce6f1] lg:block" />
        {pane('New file', file.name, 'border-t-[#1769e8]',
          !nextUrl ? null : nextIsImage ? <img src={nextUrl} alt="New invoice" className="h-full w-full object-contain" /> : <iframe src={pdfSrc(nextUrl)} title="New invoice" className="h-full min-h-[300px] w-full border-0" />)}
      </div>
      </div>
    </div>,
    document.body,
  )
}
