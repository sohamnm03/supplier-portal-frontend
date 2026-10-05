export function statusDetails(invoice) {
  const status = String(invoice.extractionStatus ?? invoice.status ?? '').toLowerCase()
  if (status === 'failed' || status === 'rejected') return { label: status === 'rejected' ? 'Rejected' : 'Failed', tone: 'bg-red-50 text-red-700', filter: 'failed' }
  if (['queued', 'extracting', 'processing', 'pending', 'pending approval'].includes(status)) return { label: 'Processing', tone: 'bg-amber-50 text-amber-700', filter: 'processing' }
  if (invoice.source === 'local' || status === 'ready') return { label: 'Ready', tone: 'bg-blue-50 text-blue-700', filter: 'ready' }
  return { label: 'Extracted', tone: 'bg-emerald-50 text-emerald-700', filter: 'extracted' }
}
