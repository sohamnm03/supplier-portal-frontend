import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Inbox,
  LoaderCircle,
  ScanText,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react'
import { getInvoicePreviewUrl } from '../../api/vendorApi'

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

const display = (value) => (value === undefined || value === null || value === '' ? '—' : String(value))
const numberValue = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const parsed = Number(String(value ?? '').replace(/[^0-9.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : null
}
const amount = (value, currency = 'INR') => {
  const parsed = numberValue(value)
  if (parsed === null) return '—'
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(parsed)
}
const dateValue = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const invoiceNumber = (invoice) => pick(invoice, ['invoice_number', 'invoice_no', 'invoice_id'])
const vendorName = (invoice) => pick(invoice, ['vendor_name', 'extracted_vendor_name', 'supplier_name'], 'Vendor invoice')
const vendorGstin = (invoice) => pick(invoice, ['vendor_gstin', 'supplier_gstin', 'gstin'])
const totalValue = (invoice) => {
  const direct = pick(invoice, ['total_amount', 'invoice_total', 'amount'], null)
  if (direct !== null) return direct
  const values = rawItems(invoice).map((item) => numberValue(item?.total_amount ?? item?.taxable_amount ?? item?.amount) || 0)
  return values.length ? values.reduce((sum, value) => sum + value, 0) : null
}

function statusDetails(invoice) {
  const status = String(invoice.extractionStatus ?? invoice.status ?? '').toLowerCase()
  if (status === 'failed' || status === 'rejected') return { label: status === 'rejected' ? 'Rejected' : 'Failed', tone: 'bg-red-50 text-red-700', filter: 'failed' }
  if (['extracting', 'processing', 'pending', 'pending approval'].includes(status)) return { label: 'Processing', tone: 'bg-amber-50 text-amber-700', filter: 'processing' }
  if (invoice.source === 'local' || status === 'ready') return { label: 'Ready', tone: 'bg-blue-50 text-blue-700', filter: 'ready' }
  return { label: 'Extracted', tone: 'bg-emerald-50 text-emerald-700', filter: 'extracted' }
}

export default function InvoiceList({ invoices, onRemove, onExtract, isLoading = false, error = '', uploadedBy = '' }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [preview, setPreview] = useState(null)

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return invoices.filter((invoice) => {
      const matchesStatus = filter === 'all' || statusDetails(invoice).filter === filter
      const text = `${vendorName(invoice)} ${vendorGstin(invoice)} ${invoiceNumber(invoice)} ${pick(invoice, ['sap_doc'])} ${invoice.name}`.toLowerCase()
      return matchesStatus && (!term || text.includes(term))
    })
  }, [filter, invoices, search])

  useEffect(() => setPage(1), [filter, search])
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const openPreview = async (invoice) => {
    setPreview({ invoice, loading: true, url: '', error: '' })
    try {
      const url = invoice.source === 'local' && invoice.url ? invoice.url : await getInvoicePreviewUrl(invoice.blobUrl || invoice.blob_url)
      setPreview({ invoice, loading: false, url, error: '' })
    } catch (previewError) {
      setPreview({ invoice, loading: false, url: '', error: previewError?.message || 'Unable to open this invoice.' })
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
      <section className="overflow-hidden rounded-xl border border-[#dce6f1] bg-white shadow-[0_4px_16px_rgba(40,83,130,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-0 pt-4 sm:px-5">
          <div className="flex items-center gap-2">
            <h2 className="text-[13px] font-extrabold text-[#0b2b52]">Invoice Inbox</h2>
            <span className="grid min-w-5 place-items-center rounded-full bg-[#eef5fd] px-1.5 py-0.5 text-[11px] font-bold text-[#1769e8]">{invoices.length}</span>
          </div>
        </div>

        <div className="mt-2 flex gap-5 overflow-x-auto border-b border-[#dfe7f0] px-4 sm:px-5">
          {filters.map(([value, label]) => (
            <button key={value} type="button" onClick={() => setFilter(value)} className={`shrink-0 border-b-2 px-0.5 py-2.5 text-xs transition ${filter === value ? 'border-[#1769e8] font-bold text-[#1769e8]' : 'border-transparent font-medium text-[#52708f] hover:text-[#1769e8]'}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 border-b border-[#dfe7f0] bg-[#fbfcfe] px-4 py-2.5 sm:px-5">
          <label className="relative block w-full max-w-[340px]">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#6784a2]" />
            <span className="sr-only">Search invoices</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by vendor, invoice no. or id..." className="h-8 w-full rounded-full border border-[#d5e1ed] bg-white pl-9 pr-3 text-xs text-[#29415f] outline-none transition placeholder:text-[#64809e] focus:border-[#1769e8] focus:ring-2 focus:ring-blue-100" />
          </label>
          <div className="flex items-center gap-2">
            <span className="rounded-md border border-[#bfd2e8] bg-white px-2.5 py-1.5 text-[10px] font-bold text-[#29466a]">{filtered.length} total</span>
            <span className="grid size-8 place-items-center rounded-md border border-[#bfd2e8] bg-white text-[#1769e8]" title="Status filters are available above"><SlidersHorizontal size={14} /></span>
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
                    <th className="px-5 py-3">Vendor</th>
                    <th className="px-4 py-3">Uploaded By</th>
                    <th className="px-4 py-3">Invoice No.</th>
                    <th className="px-4 py-3">SAP Doc</th>
                    <th className="px-4 py-3">Invoice Date</th>
                    <th className="px-4 py-3">Due Date</th>
                    <th className="px-4 py-3">Payment Term</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3">Status</th>
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
                          <p className="max-w-64 truncate text-xs font-extrabold text-[#102a4c]">{vendorName(invoice)}</p>
                          <p className="mt-1 text-[9px] font-medium tracking-[0.04em] text-[#1769e8]">GST: {display(vendorGstin(invoice))}</p>
                        </td>
                        <td className="max-w-40 truncate px-4 py-3 text-xs text-[#102a4c]">{pick(invoice, ['uploaded_by', 'uploadedBy'], uploadedBy || '—')}</td>
                        <td className="px-4 py-3 text-xs text-[#102a4c]">{display(invoiceNumber(invoice))}</td>
                        <td className="px-4 py-3 text-xs font-semibold text-[#102a4c]">{display(pick(invoice, ['sap_doc']))}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-[#102a4c]">{dateValue(pick(invoice, ['invoice_date']))}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-[#102a4c]">{dateValue(pick(invoice, ['due_date']))}</td>
                        <td className="px-4 py-3 text-xs text-[#102a4c]">{display(pick(invoice, ['payment_term', 'payment_terms']))}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-xs font-extrabold text-[#102a4c]">{amount(totalValue(invoice), pick(invoice, ['currency'], 'INR'))}</td>
                        <td className="px-4 py-3"><span className={`inline-flex rounded-md px-2.5 py-1 text-[10px] font-bold ${status.tone}`}>•&nbsp; {status.label}</span></td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-center gap-1.5">
                            <ActionButton title={canPreview ? 'View invoice' : 'Preview unavailable'} disabled={!canPreview} onClick={() => openPreview(invoice)}><Eye size={15} /></ActionButton>
                            {invoice.source === 'local' && <ActionButton title="Extract invoice" disabled={invoice.extractionStatus === 'extracting'} onClick={() => onExtract(invoice.id)}>{invoice.extractionStatus === 'extracting' ? <LoaderCircle size={14} className="animate-spin" /> : <ScanText size={14} />}</ActionButton>}
                            {invoice.source === 'local' && <ActionButton title="Remove invoice" danger onClick={() => onRemove(invoice.id)}><Trash2 size={14} /></ActionButton>}
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

      <InvoiceDetailModal preview={preview} onClose={() => setPreview(null)} />
    </>
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
  const previewInvoiceId = preview?.invoice?.id
  useEffect(() => {
    if (!previewInvoiceId) return undefined
    setActiveTab('overview')
    const onKey = (event) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [previewInvoiceId, onClose])

  if (!preview) return null
  const { invoice, loading, url, error } = preview
  const status = statusDetails(invoice)

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-2 sm:p-4" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="flex h-[94vh] w-full max-w-[1500px] flex-col overflow-hidden rounded-xl bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="invoice-detail-title">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b-2 border-[#6aafff] bg-[#eef6ff] px-5 py-3.5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#e6f1ff] text-[#3a73b8]"><FileText size={18} /></span>
            <div className="min-w-0">
              <h2 id="invoice-detail-title" className="text-[17px] font-extrabold text-[#102a4c]">Invoice Detail</h2>
              <div className="mt-1 flex items-center gap-2 text-[11px] text-[#59728f]"><span>{display(invoiceNumber(invoice))}</span><span>•</span><span className={`rounded px-2 py-0.5 font-bold ${status.tone}`}>{status.label}</span></div>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close invoice detail" className="grid size-8 place-items-center rounded-full bg-white/80 text-[#5f7895] transition hover:bg-white hover:text-[#102a4c]"><X size={18} /></button>
        </header>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[58%_42%]">
          <div className="flex min-h-0 flex-col border-b border-[#dce6f1] lg:border-b-0 lg:border-r">
            <div className="flex shrink-0 gap-6 border-b border-[#dce6f1] px-5">
              {[['overview', 'Overview'], ['amounts', 'Amounts & Line Items']].map(([value, label]) => <button key={value} type="button" onClick={() => setActiveTab(value)} className={`border-b-2 py-3 text-xs ${activeTab === value ? 'border-[#1769e8] font-bold text-[#1769e8]' : 'border-transparent text-[#58728e]'}`}>{label}</button>)}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
              {activeTab === 'overview' ? <Overview invoice={invoice} /> : <Amounts invoice={invoice} />}
            </div>
          </div>

          <div className="flex min-h-[420px] flex-col bg-[#fbfcfe]">
            <div className="shrink-0 px-5 pb-3 pt-4">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.06em] text-[#526d89]">Original Document</p>
              <p className="mt-1 text-[11px] text-[#59728f]">File: {invoice.name}</p>
            </div>
            <div className="mx-5 mb-4 min-h-0 flex-1 overflow-hidden rounded-lg border border-[#dce6f1] bg-white">
              {loading ? <PreviewMessage icon={<LoaderCircle className="animate-spin" />} title="Loading preview..." detail="Fetching the original document." />
                : error ? <PreviewMessage icon={<AlertCircle className="text-red-500" />} title="Could not render this PDF" detail={error} />
                  : <iframe src={url} title={`Preview of ${invoice.name}`} className="h-full min-h-[400px] w-full border-0 bg-white" />}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function DetailSection({ title, children }) {
  return <section className="mb-3.5 rounded-lg border border-[#cfdae7] bg-white px-3.5 py-2.5"><div className="mb-3 flex items-center gap-2 border-b border-[#cfdae7] pb-2"><span className="size-1 rounded-full bg-sky-500" /><h3 className="text-[11px] font-extrabold uppercase tracking-[0.055em] text-[#687586]">{title}</h3></div>{children}</section>
}
function Field({ label, value, wide = false }) {
  return <div className={wide ? 'sm:col-span-2' : ''}><p className="text-[10px] font-bold uppercase text-[#607a98]">{label}</p><p className="mt-1.5 break-words text-[12px] font-semibold leading-5 text-[#29415f]">{display(value)}</p></div>
}

function Overview({ invoice }) {
  return (
    <>
      <DetailSection title="Vendor"><div className="grid gap-4 sm:grid-cols-2"><Field label="Vendor Name" value={vendorName(invoice)} /><Field label="GSTIN" value={vendorGstin(invoice)} /><Field wide label="Address" value={pick(invoice, ['vendor_address', 'supplier_address', 'address'])} /></div></DetailSection>
      <DetailSection title="Customer / Billing"><div className="grid gap-4 sm:grid-cols-2"><Field label="Customer Name" value={pick(invoice, ['customer_name', 'billing_name', 'buyer_name'])} /><Field label="GSTIN" value={pick(invoice, ['customer_gstin', 'billing_gstin', 'buyer_gstin'])} /><Field wide label="Address" value={pick(invoice, ['customer_address', 'billing_address', 'buyer_address'])} /></div></DetailSection>
      <DetailSection title="Invoice / Payment"><div className="grid gap-4 sm:grid-cols-2"><Field label="Invoice No." value={invoiceNumber(invoice)} /><Field label="Currency" value={pick(invoice, ['currency'], 'INR')} /><Field label="Invoice Date" value={dateValue(pick(invoice, ['invoice_date']))} /><Field label="Due Date" value={dateValue(pick(invoice, ['due_date']))} /><Field label="Payment Term" value={pick(invoice, ['payment_term', 'payment_terms'])} /></div></DetailSection>
    </>
  )
}

function Amounts({ invoice }) {
  const currency = pick(invoice, ['currency'], 'INR')
  const lineItems = rawItems(invoice)
  const taxes = pick(invoice, ['tax_details', 'taxes'], [])
  const taxRows = Array.isArray(taxes) ? taxes : []
  return (
    <>
      <DetailSection title="Amounts">
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Sub Total" value={amount(pick(invoice, ['sub_total', 'subtotal', 'taxable_amount'], null), currency)} /><Field label="Total Tax" value={amount(pick(invoice, ['total_tax', 'tax_amount'], null), currency)} /><Field label="Total Amount" value={amount(totalValue(invoice), currency)} /></div>
        {taxRows.length > 0 && <MiniTable headers={['Tax', 'Rate', 'Amount']} rows={taxRows.map((tax) => [tax.tax_desc ?? tax.name, tax.rate, amount(tax.amount, currency)])} />}
      </DetailSection>
      <DetailSection title={`Line Items — ${display(invoiceNumber(invoice))}`}><MiniTable headers={['#', 'Description', 'Qty', 'Unit Price', 'Amount']} rows={lineItems.map((item, index) => [index + 1, display(item.description ?? item.item_description), display(item.quantity), amount(item.unit_price, currency), amount(item.total_amount ?? item.taxable_amount ?? item.amount, currency)])} empty="No extracted line items are available." /></DetailSection>
    </>
  )
}

function MiniTable({ headers, rows, empty = '' }) {
  if (!rows.length) return empty ? <p className="py-5 text-center text-xs text-slate-500">{empty}</p> : null
  return <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[500px] border-collapse text-left"><thead><tr>{headers.map((header) => <th key={header} className="border-b border-[#cfdae7] px-2 py-2 text-[9px] font-extrabold text-[#607a98]">{header}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex} className={`border-b border-[#cfdae7] px-2 py-2 text-[11px] text-[#29415f] ${cellIndex > 1 ? 'text-right' : ''}`}>{display(cell)}</td>)}</tr>)}</tbody></table></div>
}

function PreviewMessage({ icon, title, detail }) {
  return <div className="flex h-full min-h-[260px] flex-col items-center justify-center gap-2 px-6 text-center text-[#66809e]">{icon}<p className="text-xs font-bold text-[#29466a]">{title}</p><p className="max-w-xs text-[11px]">{detail}</p></div>
}
