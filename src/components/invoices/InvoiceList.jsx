import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  FileText,
  Inbox,
  LoaderCircle,
  RotateCcw,
  ScanText,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react'
import { getInvoicePreviewUrl } from '../../api/vendorApi'
import { statusDetails } from '../../utils/invoiceStatus'
import SortableHeaderCell from '../../utils/SortableHeaderCell'
import { nextSortState, sortRows } from '../../utils/tableSort'

const PAGE_SIZE = 5

const rawItems = (invoice) => {
  const value = invoice.mainLineItemData ?? invoice.main_line_item_data ?? invoice.line_items ?? invoice.line_item_data
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

const firstData = (invoice) => rawItems(invoice)[0] || {}
const pick = (invoice, keys, fallback = '') => {
  const detail = firstData(invoice)
  for (const key of keys) {
    const value = invoice?.[key] ?? detail?.[key]
    if (value !== undefined && value !== null && value !== '') return value
  }
  return fallback
}

const display = (value) => (value === undefined || value === null || value === '' ? '' : String(value))
const numberValue = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const parsed = Number(String(value ?? '').replace(/[^0-9.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : null
}
const amount = (value, currency = 'INR') => {
  const parsed = numberValue(value)
  if (parsed === null) return ''
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(parsed)
}
const dateValue = (value) => {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const invoiceNumber = (invoice) => pick(invoice, ['invoice_number', 'invoice_no', 'invoice_id'])
const vendorName = (invoice) => pick(invoice, ['vendor_name', 'extracted_vendor_name', 'supplier_name'], 'Vendor invoice')
const cleanGstin = (value) => (value ? String(value).replace(/^[\s:;.-]+/, '').trim() : value)
const vendorGstin = (invoice) => cleanGstin(pick(invoice, ['vendor_tax_id', 'vendor_gstin', 'supplier_gstin', 'gstin']))
const vendorGstinVerified = (invoice) => Boolean(pick(invoice, ['vendor_gstin_verified']))
const customerGstin = (invoice) => cleanGstin(pick(invoice, ['customer_tax_id', 'customer_gstin', 'billing_gstin', 'buyer_gstin']))
const totalValue = (invoice) => {
  const direct = pick(invoice, ['total_amount', 'invoice_total', 'amount'], null)
  if (direct !== null) return direct
  const values = rawItems(invoice).map((item) => numberValue(item?.total_amount ?? item?.taxable_amount ?? item?.amount) || 0)
  return values.length ? values.reduce((sum, value) => sum + value, 0) : null
}

// Newest uploads first; fall back to the (numeric) id when timestamps are equal or missing.
const byNewestUpload = (a, b) => {
  const timeDiff = (new Date(b.uploadedAt).getTime() || 0) - (new Date(a.uploadedAt).getTime() || 0)
  if (timeDiff) return timeDiff
  return (Number(b.id) || 0) - (Number(a.id) || 0)
}

const uploaderType = (invoice) => (invoice.uploaded_by_type === 'maker' ? 'maker' : 'vendor')

const SOURCE_TABS = [
  ['all', 'All Invoices'],
  ['vendor', 'Uploaded by Me'],
  ['maker', 'Uploaded by Relationship Manager'],
]

const uploadedByLabel = (invoice, uploadedBy) => (uploaderType(invoice) === 'maker' ? 'Relationship Manager' : pick(invoice, ['uploaded_by', 'uploadedBy'], uploadedBy || ''))

const EMPTY_ADVANCED ={ dateFrom: '', dateTo: '', minAmount: '', maxAmount: '' }

const isoDate = (value) => {
  if (!value) return ''
  const text = String(value)
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10)
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10)
}

function matchesAdvanced(invoice, { dateFrom, dateTo, minAmount, maxAmount }) {
  if (dateFrom || dateTo) {
    const date = isoDate(pick(invoice, ['invoice_date']))
    if (!date || (dateFrom && date < dateFrom) || (dateTo && date > dateTo)) return false
  }
  if (minAmount !== '' || maxAmount !== '') {
    const total = numberValue(totalValue(invoice))
    if (total === null || (minAmount !== '' && total < Number(minAmount)) || (maxAmount !== '' && total > Number(maxAmount))) return false
  }
  return true
}

export default function InvoiceList({ invoices, onRemove, onExtract, isLoading = false, error = '', uploadedBy = '', uploadSignal = 0 }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [advanced, setAdvanced] = useState(EMPTY_ADVANCED)
  const [filterOpen, setFilterOpen] = useState(false)
  const filterRef = useRef(null)
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState(null)
  const [preview, setPreview] = useState(null)
  const extractingInvoice = invoices.find((invoice) => invoice.extractionStatus === 'extracting')

  const sourceCounts = useMemo(() => ({
    all: invoices.length,
    vendor: invoices.filter((invoice) => uploaderType(invoice) === 'vendor').length,
    maker: invoices.filter((invoice) => uploaderType(invoice) === 'maker').length,
  }), [invoices])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    const matching = [...invoices].sort(byNewestUpload).filter((invoice) => {
      const matchesSource = sourceFilter === 'all' || uploaderType(invoice) === sourceFilter
      const matchesStatus = filter === 'all' || statusDetails(invoice).filter === filter
      const text = `${vendorName(invoice)} ${vendorGstin(invoice)} ${invoiceNumber(invoice)} ${invoice.name}`.toLowerCase()
      return matchesSource && matchesStatus && matchesAdvanced(invoice, advanced) && (!term || text.includes(term))
    })
    // Sort the full filtered set before pagination; raw values (not the formatted display text) are compared.
    return sortRows(matching, sort, (invoice, key) => {
      switch (key) {
        case 'vendor': return vendorName(invoice)
        case 'uploadedBy': return uploadedByLabel(invoice, uploadedBy)
        case 'invoiceNo': return invoiceNumber(invoice)
        case 'invoiceDate': return isoDate(pick(invoice, ['invoice_date']))
        case 'dueDate': return isoDate(pick(invoice, ['due_date']))
        case 'paymentTerm': return pick(invoice, ['payment_term', 'payment_terms'])
        case 'amount': return numberValue(totalValue(invoice))
        case 'status': return statusDetails(invoice).label
        default: return ''
      }
    })
  }, [advanced, filter, invoices, search, sort, sourceFilter, uploadedBy])

  const activeAdvancedCount = Object.values(advanced).filter((value) => value !== '').length
  // Status/source tabs are views, not filters: they neither enable nor get cleared by Reset.
  const hasCriteria = Boolean(search.trim()) || activeAdvancedCount > 0 || sort !== null
  const resetFilters = () => {
    setSort(null)
    setAdvanced(EMPTY_ADVANCED)
    setSearch('')
    setPage(1)
  }
  const sortHeader = (key, label, className, align) => (
    <SortableHeaderCell label={label} className={className} align={align} active={sort?.key === key} direction={sort?.direction} onSort={() => setSort((current) => nextSortState(current, key))} />
  )

  useEffect(() => setPage(1), [filter, search, sourceFilter, advanced, sort])

  // After an upload, jump to "Uploaded by Me" so the new invoice is visible right away.
  useEffect(() => {
    if (!uploadSignal) return
    setSourceFilter('vendor')
    setFilter('all')
    setSearch('')
    setAdvanced(EMPTY_ADVANCED)
  }, [uploadSignal])

  useEffect(() => {
    if (!filterOpen) return undefined
    const close = (event) => {
      if (event.type === 'keydown' ? event.key === 'Escape' : !filterRef.current?.contains(event.target)) setFilterOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', close)
    }
  }, [filterOpen])
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const closePreview = () => setPreview((current) => {
    if (current?.url?.startsWith('blob:') && current.invoice?.source !== 'local') URL.revokeObjectURL(current.url)
    return null
  })

  const openPreview = async (invoice) => {
    setPreview({ invoice, loading: true, url: '', error: '' })
    try {
      if (invoice.source === 'local' && invoice.url) {
        setPreview({ invoice, loading: false, url: invoice.url, error: '' })
        return
      }
      const sourceUrl = await getInvoicePreviewUrl(invoice.blobUrl || invoice.blob_url)
      // Load the file ourselves and re-serve it as an in-memory PDF; otherwise the storage link's
      // "attachment" headers make the browser download the file instead of showing it in the iframe.
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
      if (!response) {
        setPreview({ invoice, loading: false, url: sourceUrl, error: '' })
        return
      }
      if (!response.ok) throw new Error('The invoice file could not be found. It may not have been uploaded properly.')
      const buffer = await response.arrayBuffer()
      const isPdf = new TextDecoder().decode(buffer.slice(0, 1024)).includes('%PDF-')
      if (!buffer.byteLength || !isPdf) throw new Error('This invoice file is empty or is not a valid PDF, so it cannot be previewed.')
      const url = URL.createObjectURL(new Blob([buffer], { type: 'application/pdf' }))
      setPreview({ invoice, loading: false, url, error: '' })
    } catch (previewError) {
      const message = previewError instanceof TypeError ? 'The invoice document could not be loaded. Please try again later.' : previewError?.message
      setPreview({ invoice, loading: false, url: '', error: message || 'Unable to open this invoice.' })
    }
  }

  const filters = [
    ['all', 'All Status'],
    ['ready', 'Ready'],
    ['processing', 'Processing'],
    ['extracted', 'Extracted'],
    ['failed', 'Failed'],
  ]

  return (
    <>
      <section className={`overflow-hidden rounded-xl border border-[#dce6f1] bg-white shadow-[0_4px_16px_rgba(40,83,130,0.04)] ${filterOpen ? 'min-h-[440px]' : ''}`}>
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-0 pt-4 sm:px-5">
          <div className="flex items-center gap-2">
            <h2 className="text-[13px] font-extrabold text-[#0b2b52]">Invoice Inbox</h2>
            <span className="grid min-w-5 place-items-center rounded-full bg-[#eef5fd] px-1.5 py-0.5 text-[11px] font-bold text-[#1769e8]">{invoices.length}</span>
          </div>
        </div>

        {/* Buttons/inputs get `font: inherit` from index.css, so size is set on the parent and weight on an inner span. */}
        <div className="mt-3 flex gap-2 overflow-x-auto px-4 text-xs sm:px-5" role="tablist" aria-label="Uploaded by">
          {SOURCE_TABS.map(([value, label]) => (
            <button key={value} type="button" role="tab" aria-selected={sourceFilter === value} onClick={() => setSourceFilter(value)} className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 transition ${sourceFilter === value ? 'border-[#1769e8] bg-[#1769e8] text-white' : 'border-[#d5e1ed] bg-white text-[#52708f] hover:border-[#1769e8] hover:text-[#1769e8]'}`}>
              <span className={sourceFilter === value ? 'font-bold' : 'font-medium'}>{label}</span>
              <span className={`rounded-full px-1.5 text-[10px] font-bold ${sourceFilter === value ? 'bg-white/20 text-white' : 'bg-[#eef5fd] text-[#1769e8]'}`}>{sourceCounts[value]}</span>
            </button>
          ))}
        </div>

        <div className="mt-2 flex gap-5 overflow-x-auto border-b border-[#dfe7f0] px-4 text-xs sm:px-5">
          {filters.map(([value, label]) => (
            <button key={value} type="button" onClick={() => setFilter(value)} className={`shrink-0 border-b-2 px-0.5 py-2.5 transition ${filter === value ? 'border-[#1769e8] text-[#1769e8]' : 'border-transparent text-[#52708f] hover:text-[#1769e8]'}`}>
              <span className={filter === value ? 'font-bold' : 'font-medium'}>{label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 border-b border-[#dfe7f0] bg-[#fbfcfe] px-4 py-2.5 sm:px-5">
          <label className="relative block w-full max-w-[340px] text-xs">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#6784a2]" />
            <span className="sr-only">Search invoices</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by vendor, invoice no. or id..." className="h-8 w-full rounded-full border border-[#d5e1ed] bg-white pl-9 pr-3 text-xs text-[#29415f] outline-none transition placeholder:text-[#64809e] focus:border-[#1769e8] focus:ring-2 focus:ring-blue-100" />
          </label>
          <div className="flex h-8 items-center gap-2">
            <span className="rounded-md border border-[#bfd2e8] bg-white px-2.5 py-1.5 text-[10px] font-bold text-[#29466a]">{filtered.length} total</span>
            <div ref={filterRef} className="relative text-xs">
              <button type="button" title="Filter invoices" aria-label="Filter invoices" aria-expanded={filterOpen} onClick={() => setFilterOpen((open) => !open)} className={`relative grid size-8 place-items-center rounded-md border text-[#1769e8] transition ${filterOpen || activeAdvancedCount ? 'border-[#1769e8] bg-blue-50' : 'border-[#bfd2e8] bg-white hover:bg-blue-50'}`}>
                <SlidersHorizontal size={14} />
                {activeAdvancedCount > 0 && <span className="absolute -right-1.5 -top-1.5 grid size-4 place-items-center rounded-full bg-[#1769e8] text-[9px] font-bold text-white">{activeAdvancedCount}</span>}
              </button>
              {filterOpen && (
                <div role="dialog" aria-label="Filter invoices" className="absolute right-0 top-10 z-20 w-72 rounded-xl border border-[#dce6f1] bg-white p-4 shadow-[0_12px_32px_rgba(40,83,130,0.16)]">
                  <FilterGroup title="Invoice date">
                    <FilterInput label="From" type="date" value={advanced.dateFrom} max={advanced.dateTo || undefined} onChange={(value) => setAdvanced((current) => ({ ...current, dateFrom: value }))} />
                    <FilterInput label="To" type="date" value={advanced.dateTo} min={advanced.dateFrom || undefined} onChange={(value) => setAdvanced((current) => ({ ...current, dateTo: value }))} />
                  </FilterGroup>
                  <FilterGroup title="Amount">
                    <FilterInput label="Min" type="number" min="0" placeholder="0" value={advanced.minAmount} onChange={(value) => setAdvanced((current) => ({ ...current, minAmount: value }))} />
                    <FilterInput label="Max" type="number" min="0" placeholder="Any" value={advanced.maxAmount} onChange={(value) => setAdvanced((current) => ({ ...current, maxAmount: value }))} />
                  </FilterGroup>
                  <div className="mt-3 flex items-center justify-between">
                    <button type="button" disabled={!activeAdvancedCount} onClick={() => setAdvanced(EMPTY_ADVANCED)} className="text-[#1769e8] disabled:text-slate-300"><span className="font-bold">Clear all</span></button>
                    <button type="button" onClick={() => setFilterOpen(false)} className="rounded-md bg-[#1769e8] px-3 py-1.5 text-white hover:bg-[#0f56c7]"><span className="font-bold">Done</span></button>
                  </div>
                </div>
              )}
            </div>
            {hasCriteria && (
              <button type="button" onClick={resetFilters} title="Reset search, filters and sorting" className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-[#bfd2e8] bg-white px-2.5 py-[5px] text-[#29466a] transition hover:bg-blue-50">
                <RotateCcw size={12} />
                <span className="text-[11px] font-semibold">Reset</span>
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 px-6 py-16 text-sm font-semibold text-slate-600"><LoaderCircle size={18} className="animate-spin text-brand-600" /> Loading invoices...</div>
        ) : error ? (
          <div role="alert" className="m-5 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-4 text-sm font-semibold text-red-800"><AlertCircle size={18} /> {error}</div>
        ) : invoices.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1280px] border-collapse text-left">
                <thead className="bg-[#f8fbff] text-[9px] font-extrabold uppercase tracking-[0.04em] text-[#617995]">
                  <tr>
                    {sortHeader('vendor', 'Vendor', 'px-5 py-3')}
                    {sortHeader('uploadedBy', 'Uploaded By', 'px-4 py-3')}
                    {sortHeader('invoiceNo', 'Invoice No.', 'px-4 py-3')}
                    {sortHeader('invoiceDate', 'Invoice Date', 'px-4 py-3')}
                    {sortHeader('dueDate', 'Due Date', 'px-4 py-3')}
                    {sortHeader('paymentTerm', 'Payment Term', 'px-4 py-3')}
                    {sortHeader('amount', 'Amount', 'px-4 py-3 text-right', 'right')}
                    {sortHeader('status', 'Status', 'px-4 py-3')}
                    <th className="px-5 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf2f7]">
                  {visible.map((invoice) => {
                    const status = statusDetails(invoice)
                    const canPreview = invoice.source === 'api' || Boolean(invoice.url)
                    return (
                      <tr key={invoice.id} className="transition hover:bg-blue-50/35">
                        <td className="px-5 py-3 align-middle">
                          <p className="max-w-64 truncate text-xs font-bold text-[#3d5a80]">{vendorName(invoice)}</p>
                          {vendorGstin(invoice) && (
                            <p className="mt-1 flex items-center gap-1 text-[9px] font-medium tracking-[0.04em] text-[#4a7ab5]">
                              GST: {vendorGstin(invoice)}
                              {vendorGstinVerified(invoice) && <ShieldCheck size={11} className="text-emerald-600" />}
                            </p>
                          )}
                        </td>
                        <td className="max-w-40 truncate px-4 py-3 text-xs text-[#102a4c]">{uploadedByLabel(invoice, uploadedBy)}</td>
                        <td className="px-4 py-3 text-xs text-[#102a4c]">{display(invoiceNumber(invoice))}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-[#102a4c]">{dateValue(pick(invoice, ['invoice_date']))}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-[#102a4c]">{dateValue(pick(invoice, ['due_date']))}</td>
                        <td className="px-4 py-3 text-xs text-[#102a4c]">{display(pick(invoice, ['payment_term', 'payment_terms']))}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-xs font-extrabold text-[#102a4c]">{amount(totalValue(invoice), pick(invoice, ['currency'], 'INR'))}</td>
                        <td className="px-4 py-3"><span className={`inline-flex rounded-md px-2.5 py-1 text-[10px] font-bold ${status.tone}`}>•&nbsp; {status.label}</span></td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-center gap-1.5">
                            <ActionButton title={canPreview ? 'View invoice' : 'Preview unavailable'} disabled={!canPreview} onClick={() => openPreview(invoice)}><Eye size={15} /></ActionButton>
                            {invoice.source === 'local' && invoice.extractionStatus === 'failed' && <ActionButton title="Retry extraction" onClick={() => onExtract(invoice.id)}><ScanText size={14} /></ActionButton>}
                            {invoice.source === 'local' && <ActionButton title="Remove invoice" danger disabled={['queued', 'extracting'].includes(invoice.extractionStatus)} onClick={() => onRemove(invoice.id)}><Trash2 size={14} /></ActionButton>}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {!filtered.length && <div className="px-6 py-14 text-center text-xs text-slate-500">No invoices match this search or status.</div>}
          </>
        )}

        <div className="flex items-center justify-between border-t border-[#dfe7f0] bg-[#fbfcfe] px-4 py-3 text-[10px] font-semibold text-[#425e7d] sm:px-5">
          <span>Page {currentPage} of {pageCount} — {filtered.length} total</span>
          <div className="flex items-center gap-2">
            <span className="rounded-md border border-[#d5e1ed] bg-white px-3 py-2">{PAGE_SIZE}</span>
            <button type="button" disabled={currentPage <= 1} onClick={() => setPage((value) => value - 1)} className="inline-flex items-center gap-1 rounded-md border border-[#d5e1ed] bg-white px-2.5 py-2 disabled:text-slate-300"><ChevronLeft size={12} /> Prev</button>
            <button type="button" disabled={currentPage >= pageCount} onClick={() => setPage((value) => value + 1)} className="inline-flex items-center gap-1 rounded-md border border-[#d5e1ed] bg-white px-2.5 py-2 disabled:text-slate-300">Next <ChevronRight size={12} /></button>
          </div>
        </div>
      </section>

      <InvoiceDetailModal preview={preview} onClose={closePreview} />
      <ExtractionProgressModal invoice={extractingInvoice} />
    </>
  )
}

function FilterGroup({ title, children }) {
  return (
    <fieldset className="mb-3 last:mb-0">
      <legend className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.04em] text-[#617995]">{title}</legend>
      <div className="grid grid-cols-2 gap-2">{children}</div>
    </fieldset>
  )
}

function FilterInput({ label, onChange, ...props }) {
  return (
    <label className="block text-[11px] font-medium text-[#52708f]">
      {label}
      <input {...props} onChange={(event) => onChange(event.target.value)} className="mt-1 h-8 w-full rounded-md border border-[#d5e1ed] bg-white px-2 text-xs text-[#29415f] outline-none transition focus:border-[#1769e8] focus:ring-2 focus:ring-blue-100" />
    </label>
  )
}

function ExtractionProgressModal({ invoice }) {
  if (!invoice) return null
  const progress = Math.round(invoice.extractionProgress ?? 0)
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[2px]" role="presentation">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 text-center shadow-2xl" role="alertdialog" aria-modal="true" aria-labelledby="extraction-progress-title">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-blue-50 text-[#1769e8]">
          <LoaderCircle size={26} className="animate-spin" />
        </div>
        <h2 id="extraction-progress-title" className="mt-4 text-base font-extrabold text-[#102a4c]">Extracting invoice data…</h2>
        <p className="mt-1 truncate text-xs text-[#59728f]">{invoice.name}</p>
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-blue-100">
          <div className="h-full rounded-full bg-[#1769e8] transition-[width] duration-300 ease-out" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-2 text-sm font-bold tabular-nums text-[#1769e8]">{progress}%</p>
        <p className="mt-3 text-[11px] text-[#7189a4]">This can take up to a minute. Please don&apos;t close this page.</p>
      </div>
    </div>
  )
}

function ActionButton({ children, title, onClick, disabled = false, danger = false }) {
  return <button type="button" title={title} aria-label={title} disabled={disabled} onClick={onClick} className={`grid size-7 place-items-center rounded-md border bg-white transition disabled:cursor-not-allowed disabled:opacity-35 ${danger ? 'border-red-200 text-red-500 hover:bg-red-50' : 'border-[#bfd2e8] text-[#1769e8] hover:bg-blue-50'}`}>{children}</button>
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <span className="grid size-11 place-items-center rounded-full bg-blue-50 text-[#7e9cbb]"><Inbox size={20} /></span>
      <p className="text-sm font-bold text-[#102a4c]">No invoices uploaded yet</p>
      <p className="text-xs text-slate-500">Add PDF invoices above and they will appear here.</p>
    </div>
  )
}

function InvoiceDetailModal({ preview, onClose }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [frameLoaded, setFrameLoaded] = useState(false)
  const previewInvoiceId = preview?.invoice?.id
  useEffect(() => {
    if (!previewInvoiceId) return undefined
    setActiveTab('overview')
    const onKey = (event) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [previewInvoiceId, onClose])

  const previewUrl = preview?.url
  useEffect(() => setFrameLoaded(false), [previewUrl])

  if (!preview) return null
  const { invoice, loading, url, error } = preview
  const status = statusDetails(invoice)

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/50 p-2 sm:p-4" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="flex h-[86dvh] max-h-[calc(100dvh-1rem)] w-full max-w-[1200px] flex-col overflow-hidden rounded-xl bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="invoice-detail-title">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b-2 border-[#6aafff] bg-[#eef6ff] px-5 py-3.5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#e6f1ff] text-[#3a73b8]"><FileText size={18} /></span>
            <div className="min-w-0">
              <h2 id="invoice-detail-title" className="text-[17px] font-bold text-[#102a4c]">Invoice Detail</h2>
              <div className="mt-1 flex items-center gap-2 text-xs text-[#59728f]"><span>{display(invoiceNumber(invoice))}</span><span>•</span><span className={`rounded px-2 py-0.5 font-bold ${status.tone}`}>{status.label}</span></div>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close invoice detail" className="grid size-8 place-items-center rounded-full bg-white/80 text-[#5f7895] transition hover:bg-white hover:text-[#102a4c]"><X size={18} /></button>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[58%_42%] lg:grid-rows-1 lg:overflow-hidden">
          <div className="flex min-h-[420px] flex-col border-b lg:min-h-0 border-[#dce6f1] lg:border-b-0 lg:border-r">
            <div className="flex shrink-0 gap-5 border-b border-[#dce6f1] px-5 text-xs" role="tablist">
              {[['overview', 'Overview'], ['amounts', 'Amounts & Line Items']].map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={activeTab === value} onClick={() => setActiveTab(value)} className={`-mb-px border-b-2 py-3 transition ${activeTab === value ? 'border-[#1769e8] text-[#1769e8]' : 'border-transparent text-[#58728e] hover:text-[#1769e8]'}`}><span className={activeTab === value ? 'font-bold' : 'font-medium'}>{label}</span></button>)}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
              {activeTab === 'overview' ? <Overview invoice={invoice} /> : <Amounts invoice={invoice} />}
            </div>
          </div>

          <div className="flex min-h-[520px] flex-col bg-[#fbfcfe] lg:min-h-0">
            <div className="flex shrink-0 items-start justify-between gap-3 px-5 pb-3 pt-4">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.05em] text-[#526d89]">Original Document</p>
                <p className="mt-1 break-words text-xs text-[#59728f]">File: {invoice.name}</p>
              </div>
              {url && !loading && !error && (
                <a href={url} target="_blank" rel="noopener noreferrer" title="Open in new tab" aria-label="Open in new tab" className="grid size-8 shrink-0 place-items-center rounded-md border border-[#bfd2e8] bg-white text-[#1769e8] transition hover:bg-blue-50">
                  <ExternalLink size={15} />
                </a>
              )}
            </div>
            <div className="relative mx-5 mb-4 min-h-0 flex-1 overflow-hidden rounded-lg border border-[#dce6f1] bg-white">
              {loading ? <PreviewMessage icon={<LoaderCircle size={28} className="animate-spin text-[#1769e8]" />} title="Loading preview..." detail="Fetching the original document." />
                : error ? <PreviewMessage icon={<AlertCircle className="text-red-500" />} title="Preview unavailable" detail={error} />
                  : (
                    <>
                      <iframe src={pdfSrc(url)} title={`Preview of ${invoice.name}`} onLoad={() => setFrameLoaded(true)} className="h-full min-h-[400px] w-full border-0 bg-white" />
                      {!frameLoaded && <div className="absolute inset-0 bg-white"><PreviewMessage icon={<LoaderCircle size={28} className="animate-spin text-[#1769e8]" />} title="Loading preview..." detail="Rendering the document, this may take a moment." /></div>}
                    </>
                  )}
            </div>
          </div>
        </div>
      </section>
    </div>,
    document.body,
  )
}

// Hide the built-in thumbnail sidebar and fit the page to the viewer width; toolbar zoom then works from that baseline.
const pdfSrc = (url) => (url ? `${url.split('#')[0]}#navpanes=0&pagemode=none&view=FitH` : url)

function DetailSection({ title, children }) {
  return <section className="mb-3.5 rounded-lg border border-[#cfdae7] bg-white px-3.5 py-2.5"><div className="mb-3 flex items-center gap-2 border-b border-[#cfdae7] pb-2"><span className="size-1 rounded-full bg-sky-500" /><h3 className="text-[11px] font-bold uppercase tracking-[0.05em] text-[#526d89]">{title}</h3></div>{children}</section>
}
function Field({ label, value, wide = false }) {
  return <div className={wide ? 'sm:col-span-2' : ''}><p className="text-[11px] font-semibold uppercase tracking-[0.03em] text-[#607a98]">{label}</p><p className="mt-1.5 min-h-5 break-words text-[13px] font-medium leading-5 text-[#102a4c]">{display(value)}</p></div>
}

function Overview({ invoice }) {
  return (
    <>
      <DetailSection title="Vendor"><div className="grid gap-4 sm:grid-cols-2"><Field label="Vendor Name" value={vendorName(invoice)} /><Field label="GSTIN" value={vendorGstin(invoice)} /><Field wide label="Address" value={pick(invoice, ['vendor_address', 'supplier_address', 'address'])} /></div></DetailSection>
      <DetailSection title="Customer / Billing"><div className="grid gap-4 sm:grid-cols-2"><Field label="Customer Name" value={pick(invoice, ['customer_name', 'billing_name', 'buyer_name'])} /><Field label="GSTIN" value={customerGstin(invoice)} /><Field wide label="Address" value={pick(invoice, ['customer_address', 'billing_address', 'buyer_address'])} /></div></DetailSection>
      <DetailSection title="Invoice / Payment"><div className="grid gap-4 sm:grid-cols-2"><Field label="Invoice No." value={invoiceNumber(invoice)} /><Field label="System Invoice Ref." value={pick(invoice, ['inv_ref_gen'])} /><Field label="Currency" value={pick(invoice, ['currency'], 'INR')} /><Field label="Invoice Date" value={dateValue(pick(invoice, ['invoice_date']))} /><Field label="Due Date" value={dateValue(pick(invoice, ['due_date']))} /><Field label="Payment Term" value={pick(invoice, ['payment_term', 'payment_terms'])} /></div></DetailSection>
    </>
  )
}

const taxRate = (tax) => {
  const value = tax.rate ?? tax.tax_rate
  if (value === undefined || value === null || value === '') return ''
  return String(value).trim().endsWith('%') ? value : `${value}%`
}

function Amounts({ invoice }) {
  const currency = pick(invoice, ['currency'], 'INR')
  const lineItems = rawItems(invoice)
  const taxes = pick(invoice, ['tax_details', 'taxes'], [])
  const taxRows = Array.isArray(taxes) ? taxes : []
  return (
    <>
      <DetailSection title="Amounts">
        <div className="grid gap-3 sm:grid-cols-3">
          <AmountTile label="Sub Total" value={amount(pick(invoice, ['sub_total', 'subtotal', 'taxable_amount'], null), currency)} />
          <AmountTile label="Total Tax" value={amount(pick(invoice, ['total_tax', 'tax_amount'], null), currency)} />
          <AmountTile label="Total Amount" value={amount(totalValue(invoice), currency)} highlight />
        </div>
        {taxRows.length > 0 && <MiniTable headers={['Tax', 'Rate', 'Amount']} aligns={['center', 'center', 'right']} widths={['40%', '25%', '35%']} rows={taxRows.map((tax) => [tax.tax_desc ?? tax.tax_description ?? tax.name, taxRate(tax), amount(tax.amount ?? tax.tax_amount, currency)])} />}
      </DetailSection>
      <DetailSection title={`Line Items — ${display(invoiceNumber(invoice))}`}><MiniTable headers={['#', 'Description', 'Qty', 'Unit Price', 'Amount']} aligns={['center', 'left', 'center', 'center', 'right']} widths={['3.5rem', null, '5rem', '8rem', '9rem']} rows={lineItems.map((item, index) => [index + 1, display(item.description ?? item.item_description), display(item.quantity), amount(item.unit_price, currency), amount(item.total_amount ?? item.taxable_amount ?? item.amount, currency)])} empty="No extracted line items are available." /></DetailSection>
    </>
  )
}

const CELL_ALIGN = { left: 'text-left', center: 'text-center', right: 'text-right' }

// Headers are always centered; body cells follow `aligns` (only amount columns are right-aligned).
function AmountTile({ label, value, highlight = false }) {
  return (
    <div className={`rounded-lg border px-3.5 py-3 ${highlight ? 'border-[#bcd6fb] bg-[#eef5fd]' : 'border-[#e3ebf4] bg-[#fbfcfe]'}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.03em] text-[#607a98]">{label}</p>
      <p className={`mt-1.5 text-[15px] font-semibold ${highlight ? 'text-[#1769e8]' : 'text-[#102a4c]'}`}>{value}</p>
    </div>
  )
}

function MiniTable({ headers, rows, aligns = [], widths = [], compact = false, empty = '' }) {
  if (!rows.length) return empty ? <p className="py-5 text-center text-xs text-slate-500">{empty}</p> : null
  return (
    <div className="mt-3 overflow-x-auto">
      <table className={`table-fixed border-collapse ${compact ? 'w-full max-w-[24rem]' : 'w-full min-w-[460px]'}`}>
        <colgroup>{headers.map((header, index) => <col key={header} style={widths[index] ? { width: widths[index] } : undefined} />)}</colgroup>
        <thead><tr>{headers.map((header) => <th key={header} className="border-b border-[#cfdae7] px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.03em] text-[#607a98]">{header}</th>)}</tr></thead>
        <tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex} className={`border-b border-[#cfdae7] px-2 py-2 text-[13px] text-[#102a4c] ${CELL_ALIGN[aligns[cellIndex] || 'left']} ${aligns[cellIndex] === 'right' ? 'pr-4' : ''}`}>{display(cell)}</td>)}</tr>)}</tbody>
      </table>
    </div>
  )
}

function PreviewMessage({ icon, title, detail }) {
  return <div className="flex h-full min-h-[260px] flex-col items-center justify-center gap-2 px-6 text-center text-[#66809e]">{icon}<p className="text-xs font-bold text-[#29466a]">{title}</p><p className="max-w-xs text-[11px]">{detail}</p></div>
}
