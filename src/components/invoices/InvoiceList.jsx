import { useEffect, useState } from 'react'
import {
  AlertCircle,
  ExternalLink,
  Eye,
  FileText,
  Image as ImageIcon,
  Inbox,
  LoaderCircle,
  ScanText,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { getInvoicePreviewUrl } from '../../api/vendorApi'
import { formatFileSize } from '../../utils/formatters'

const isImage = (invoice) => invoice.type?.startsWith('image/') || /\.(png|jpe?g)$/i.test(invoice.name)
const toItems = (invoice) => {
  if (!invoice.mainLineItemData) return []
  return Array.isArray(invoice.mainLineItemData) ? invoice.mainLineItemData : [invoice.mainLineItemData]
}
const displayValue = (value) => {
  if (value == null || value === '') return '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function statusDetails(invoice) {
  const status = String(invoice.extractionStatus || '').toLowerCase()
  if (status === 'failed') return { label: 'Failed', tone: 'bg-red-50 text-red-700', filter: 'failed' }
  if (['extracting', 'processing', 'pending'].includes(status)) return { label: 'Processing', tone: 'bg-amber-50 text-amber-700', filter: 'processing' }
  if (invoice.source === 'local') return { label: 'Ready', tone: 'bg-blue-50 text-blue-700', filter: 'ready' }
  return { label: 'Extracted', tone: 'bg-emerald-50 text-emerald-700', filter: 'extracted' }
}

function invoiceNumber(invoice) {
  const firstItem = toItems(invoice)[0]
  return invoice.invoice_number ?? invoice.invoice_no ?? firstItem?.invoice_number ?? firstItem?.invoice_id ?? '—'
}

function invoiceVendor(invoice) {
  return invoice.vendor_name ?? invoice.extracted_vendor_name ?? invoice.supplier_name ?? 'Vendor invoice'
}

function invoiceTotal(invoice) {
  const direct = invoice.invoice_total ?? invoice.total_amount ?? invoice.amount
  if (direct != null && direct !== '') return Number(direct)
  const values = toItems(invoice).map((item) => Number(item?.total_amount ?? item?.taxable_amount ?? item?.amount ?? 0))
  return values.some(Boolean) ? values.reduce((total, value) => total + (Number.isFinite(value) ? value : 0), 0) : null
}

function formatAmount(value, currency = 'INR') {
  if (value == null || !Number.isFinite(value)) return '—'
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value)
}

export default function InvoiceList({ invoices, onRemove, onExtract, isLoading = false, error = '' }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [preview, setPreview] = useState(null)

  const openPreview = async (invoice) => {
    setPreview({ invoice, loading: true, url: '', error: '' })
    try {
      const url = invoice.source === 'local' && invoice.url
        ? invoice.url
        : await getInvoicePreviewUrl(invoice.blobUrl || invoice.blob_url)
      setPreview({ invoice, loading: false, url, error: '' })
    } catch (previewError) {
      setPreview({ invoice, loading: false, url: '', error: previewError?.message || 'Unable to open this invoice.' })
    }
  }

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
        <p className="max-w-xs text-xs text-slate-500">Uploaded invoices will appear here.</p>
      </div>
    )
  }

  const normalizedSearch = search.trim().toLowerCase()
  const visibleInvoices = invoices.filter((invoice) => {
    const matchesFilter = filter === 'all' || statusDetails(invoice).filter === filter
    const searchText = `${invoice.name} ${invoiceNumber(invoice)} ${invoiceVendor(invoice)}`.toLowerCase()
    return matchesFilter && (!normalizedSearch || searchText.includes(normalizedSearch))
  })
  const filters = [
    ['all', 'All'],
    ['extracted', 'Extracted'],
    ['processing', 'Processing'],
    ['failed', 'Failed'],
  ]

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-blue-200/80 bg-white shadow-[0_8px_24px_rgba(40,83,130,0.06)]">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {filters.map(([value, label]) => {
              const count = value === 'all' ? invoices.length : invoices.filter((invoice) => statusDetails(invoice).filter === value).length
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={`inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 text-[11px] font-bold transition ${filter === value ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 bg-white text-slate-500 hover:border-blue-200 hover:text-navy-900'}`}
                >
                  {label} <span className="grid min-w-4 place-items-center rounded-full bg-blue-100 px-1 text-[9px] text-brand-700">{count}</span>
                </button>
              )
            })}
          </div>
          <label className="relative block w-full lg:w-72">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <span className="sr-only">Search invoices</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search invoice number or file..."
              className="app-field min-h-9 pl-9 text-xs"
            />
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-left">
            <thead className="bg-[#eef6fd] text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#6794bc]">
              <tr>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Extracted details</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-center">Actions</th>
                <th className="px-4 py-3">Uploaded</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleInvoices.map((invoice) => {
                const status = statusDetails(invoice)
                const lineItems = toItems(invoice)
                const canPreview = invoice.source === 'api' || Boolean(invoice.url)
                return (
                  <tr key={invoice.id} className="transition hover:bg-blue-50/35">
                    <td className="px-4 py-3.5 align-middle">
                      <div className="flex items-center gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
                          {isImage(invoice) ? <ImageIcon size={17} /> : <FileText size={17} />}
                        </span>
                        <div className="min-w-0">
                          <p className="max-w-64 truncate text-xs font-extrabold text-navy-900">{invoice.name}</p>
                          <p className="mt-1 text-[10px] text-slate-500">{invoice.size > 0 ? formatFileSize(invoice.size) : 'Document'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 align-middle">
                      <p className="text-xs font-bold text-navy-900">Invoice #{invoiceNumber(invoice)}</p>
                      <p className="mt-1 text-[10px] text-slate-500">{lineItems.length} line item{lineItems.length === 1 ? '' : 's'} extracted</p>
                    </td>
                    <td className="px-4 py-3.5 align-middle text-xs font-extrabold text-emerald-700">
                      {formatAmount(invoiceTotal(invoice), invoice.currency || 'INR')}
                    </td>
                    <td className="px-4 py-3.5 align-middle">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold ${status.tone}`}>{status.label}</span>
                      {invoice.extractionError && <p className="mt-1 max-w-44 text-[10px] font-semibold text-red-600">{invoice.extractionError}</p>}
                    </td>
                    <td className="px-4 py-3.5 align-middle">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => openPreview(invoice)}
                          disabled={!canPreview}
                          aria-label={`View ${invoice.name}`}
                          title={canPreview ? 'View invoice' : 'Preview unavailable'}
                          className="interactive-icon shrink-0 border border-blue-200 text-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Eye size={17} />
                        </button>
                        {invoice.source === 'local' && (
                          <button
                            type="button"
                            onClick={() => onExtract(invoice.id)}
                            disabled={invoice.extractionStatus === 'extracting'}
                            aria-label={`Extract ${invoice.name}`}
                            title="Extract invoice"
                            className="interactive-icon shrink-0 border border-blue-200 text-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {invoice.extractionStatus === 'extracting' ? <LoaderCircle size={16} className="animate-spin" /> : <ScanText size={16} />}
                          </button>
                        )}
                        {invoice.source === 'local' && (
                          <button
                            type="button"
                            onClick={() => onRemove(invoice.id)}
                            aria-label={`Remove ${invoice.name}`}
                            title="Remove"
                            className="interactive-icon shrink-0 border border-slate-200 hover:border-red-200 hover:bg-red-50! hover:text-red-600!"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 align-middle">
                      <p className="text-xs font-bold text-navy-900">{invoice.uploadedAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      <p className="mt-1 text-[10px] text-slate-500">{invoice.uploadedAt.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</p>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {!visibleInvoices.length && (
          <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
            <Search size={20} className="text-slate-400" />
            <p className="text-sm font-bold text-navy-900">No matching invoices</p>
            <p className="text-xs text-slate-500">Try a different search or status filter.</p>
          </div>
        )}

        <div className="flex justify-end border-t border-slate-100 px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.06em] text-slate-500">
          {visibleInvoices.length} of {invoices.length} invoices
        </div>
      </div>

      <InvoicePreviewModal preview={preview} onClose={() => setPreview(null)} />
    </>
  )
}

function InvoicePreviewModal({ preview, onClose }) {
  useEffect(() => {
    if (!preview) return undefined
    const handleKey = (event) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [preview, onClose])

  if (!preview) return null
  const { invoice, loading, url, error } = preview
  const items = toItems(invoice)

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-navy-950/65 p-2 backdrop-blur-[3px] sm:p-4" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="flex h-[94vh] w-full max-w-[1500px] flex-col overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="invoice-preview-title">
        <header className="flex items-center justify-between gap-4 border-b border-slate-200 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="eyebrow">Invoice preview</p>
            <h2 id="invoice-preview-title" className="mt-0.5 truncate text-base font-extrabold text-navy-950">{invoice.name}</h2>
          </div>
          <div className="flex items-center gap-1.5">
            {url && (
              <a href={url} target="_blank" rel="noreferrer" className="interactive-icon" aria-label="Open invoice in a new tab" title="Open in new tab">
                <ExternalLink size={18} />
              </a>
            )}
            <button type="button" onClick={onClose} className="interactive-icon" aria-label="Close invoice preview"><X size={20} /></button>
          </div>
        </header>

        {loading ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-sm font-semibold text-slate-600">
            <LoaderCircle size={28} className="animate-spin text-brand-600" /> Preparing secure preview...
          </div>
        ) : error ? (
          <div className="m-auto max-w-md rounded-xl border border-red-200 bg-red-50 p-5 text-center text-sm text-red-800">
            <AlertCircle size={24} className="mx-auto mb-2" />
            <p className="font-bold">Preview unavailable</p>
            <p className="mt-1 leading-6">{error}</p>
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 lg:grid-cols-[38%_62%]">
            <div className="min-h-0 overflow-y-auto border-b border-slate-200 bg-[#f5faff] p-4 lg:border-b-0 lg:border-r sm:p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <DetailCard label="Invoice number" value={invoiceNumber(invoice)} />
                <DetailCard label="Status" value={statusDetails(invoice).label} />
                <DetailCard label="Uploaded" value={invoice.uploadedAt.toLocaleString('en-IN')} />
                <DetailCard label="Invoice total" value={formatAmount(invoiceTotal(invoice), invoice.currency || 'INR')} />
              </div>

              <section className="mt-4 overflow-hidden rounded-xl border border-blue-200 bg-white">
                <div className="border-b border-blue-100 bg-blue-50/70 px-4 py-3">
                  <h3 className="text-xs font-extrabold uppercase tracking-[0.08em] text-brand-700">Extracted line items</h3>
                </div>
                {items.length ? (
                  <div className="divide-y divide-slate-100">
                    {items.map((item, index) => (
                      <div key={item?.id ?? item?.line_item_id ?? index} className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.07em] text-slate-400">Line {item?.line_number ?? index + 1}</p>
                            <p className="mt-1 text-xs font-bold leading-5 text-navy-900">{displayValue(item?.description ?? item?.item_description)}</p>
                          </div>
                          <p className="shrink-0 text-xs font-extrabold text-emerald-700">{formatAmount(Number(item?.total_amount ?? item?.taxable_amount ?? item?.amount), invoice.currency || 'INR')}</p>
                        </div>
                        <dl className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-2.5">
                          <SmallDetail label="Product code" value={item?.product_code ?? item?.hsn_code} />
                          <SmallDetail label="Quantity" value={item?.quantity} />
                          <SmallDetail label="Unit price" value={item?.unit_price} />
                        </dl>
                      </div>
                    ))}
                  </div>
                ) : <p className="px-4 py-8 text-center text-xs text-slate-500">No extracted line-item data is available.</p>}
              </section>
            </div>

            <div className="min-h-[420px] bg-[#303030] p-2 sm:p-3">
              <iframe src={url} title={`Preview of ${invoice.name}`} className="h-full min-h-[400px] w-full border-0 bg-white" />
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

function DetailCard({ label, value }) {
  return (
    <div className="rounded-xl border border-blue-200 bg-white p-3">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#6c99bf]">{label}</p>
      <p className="mt-1 break-words text-xs font-bold text-navy-900">{displayValue(value)}</p>
    </div>
  )
}

function SmallDetail({ label, value }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-[9px] font-bold uppercase tracking-[0.05em] text-slate-400">{label}</dt>
      <dd className="mt-0.5 truncate text-[11px] font-bold text-navy-900">{displayValue(value)}</dd>
    </div>
  )
}
