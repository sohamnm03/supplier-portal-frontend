import { useMemo } from 'react'
import { statusDetails } from '../../utils/invoiceStatus'

const DOT = { Extracted: 'bg-emerald-600', Processing: 'bg-amber-600', Ready: 'bg-blue-600', Failed: 'bg-red-500', Rejected: 'bg-red-500' }

// Total plus a count per status that actually has invoices, biggest first.
export default function InvoiceKpis({ invoices }) {
  const summary = useMemo(() => {
    const counts = new Map()
    invoices.forEach((invoice) => {
      const { label } = statusDetails(invoice)
      counts.set(label, (counts.get(label) ?? 0) + 1)
    })
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [invoices])

  if (!invoices.length) return null
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-[#52708f]" aria-label="Invoice summary">
      <span><b className="font-bold text-[#0b2b52]">{invoices.length}</b> Total Invoices</span>
      {summary.map(([label, count]) => (
        <span key={label} className="inline-flex items-center gap-1.5">
          <i className={`size-1.5 rounded-full ${DOT[label] || 'bg-slate-400'}`} />
          <span><b className="font-bold text-[#0b2b52]">{count}</b> {label}</span>
        </span>
      ))}
    </div>
  )
}
