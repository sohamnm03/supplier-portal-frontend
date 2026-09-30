import { useCallback, useEffect, useState } from 'react'
import { extractInvoice as extractInvoiceApi, getVendorInvoices } from '../api/vendorApi'

const ACCEPTED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg']
const MAX_SIZE = 10 * 1024 * 1024

const isAcceptedFile = (file) => ACCEPTED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext))

function toValidDate(value) {
  const date = value ? new Date(value) : new Date()
  return Number.isNaN(date.getTime()) ? new Date() : date
}

function resolveBlobUrl(invoice) {
  return invoice.blob_url
    ?? invoice.blobUrl
    ?? invoice.document?.blob_url
    ?? invoice.file?.blob_url
    ?? invoice.storage?.blob_url
    ?? invoice.metadata?.blob_url
    ?? invoice.invoice?.blob_url
    ?? invoice.invoice_file?.blob_url
    ?? ''
}

function normalizeInvoice(invoice, index) {
  const id = invoice.invoice_id ?? invoice.id ?? `invoice-${index}`
  return {
    ...invoice,
    id,
    name: invoice.original_file_name ?? invoice.file_name ?? invoice.filename ?? invoice.invoice_number ?? invoice.name ?? `Invoice ${id}`,
    size: Number(invoice.file_size_bytes ?? invoice.file_size ?? invoice.size) || 0,
    type: invoice.mime_type ?? invoice.content_type ?? invoice.type ?? '',
    uploadedAt: toValidDate(invoice.uploaded_at ?? invoice.created_at ?? invoice.invoice_date),
    url: invoice.file_url ?? invoice.document_url ?? invoice.url ?? '',
    blobUrl: resolveBlobUrl(invoice),
    mainLineItemData: invoice.main_line_item_data ?? invoice.mainLineItemData ?? invoice.line_item_data ?? invoice.line_items ?? null,
    extractionStatus: invoice.status ?? 'completed',
    source: 'api',
  }
}

export default function useInvoiceUploads(vendorId) {
  const [invoices, setInvoices] = useState([])
  const [error, setError] = useState('')
  const [loadError, setLoadError] = useState('')
  const [isLoading, setIsLoading] = useState(Boolean(vendorId))

  useEffect(() => {
    let ignore = false

    if (!vendorId) {
      setInvoices([])
      setLoadError('Vendor ID is missing. Please sign in again.')
      setIsLoading(false)
      return () => { ignore = true }
    }

    setIsLoading(true)
    setLoadError('')

    getVendorInvoices(vendorId)
      .then((records) => {
        if (ignore) return
        const remoteInvoices = records.map(normalizeInvoice)
        setInvoices((current) => [...current.filter((invoice) => invoice.source !== 'api'), ...remoteInvoices])
      })
      .catch((requestError) => {
        if (!ignore) setLoadError(requestError?.message || 'Unable to load uploaded invoices.')
      })
      .finally(() => {
        if (!ignore) setIsLoading(false)
      })

    return () => { ignore = true }
  }, [vendorId])

  const patchInvoice = useCallback((id, changes) => {
    setInvoices((current) => current.map((invoice) => (invoice.id === id ? { ...invoice, ...changes } : invoice)))
  }, [])

  const extractItem = useCallback(async (item) => {
    if (!vendorId) {
      patchInvoice(item.id, { extractionStatus: 'failed', extractionError: 'Vendor ID is missing. Please sign in again.' })
      return
    }

    patchInvoice(item.id, { extractionStatus: 'extracting', extractionError: '', extractionProgress: 0 })

    const progressTimer = setInterval(() => {
      setInvoices((current) => current.map((invoice) => (
        invoice.id === item.id && invoice.extractionStatus === 'extracting'
          ? { ...invoice, extractionProgress: Math.min(95, (invoice.extractionProgress ?? 0) + Math.max(1, (95 - (invoice.extractionProgress ?? 0)) * 0.12)) }
          : invoice
      )))
    }, 400)

    try {
      await extractInvoiceApi(vendorId, item.file)
      const records = await getVendorInvoices(vendorId)
      const remoteInvoices = records.map(normalizeInvoice)
      URL.revokeObjectURL(item.url)
      setInvoices((current) => [
        ...current.filter((invoice) => invoice.source === 'local' && invoice.id !== item.id),
        ...remoteInvoices,
      ])
      setLoadError('')
    } catch (requestError) {
      patchInvoice(item.id, { extractionStatus: 'failed', extractionError: requestError?.message || 'Unable to extract the invoice.' })
    } finally {
      clearInterval(progressTimer)
    }
  }, [patchInvoice, vendorId])

  // Uploaded files are extracted straight away, one after another; there is no manual extract step.
  const addFiles = useCallback((fileList) => {
    const files = Array.from(fileList || [])
    if (!files.length) return false

    const accepted = []
    const rejected = []
    files.forEach((file) => {
      if (!isAcceptedFile(file)) { rejected.push(`${file.name} (unsupported file type)`); return }
      if (file.size > MAX_SIZE) { rejected.push(`${file.name} (larger than 10 MB)`); return }
      accepted.push(file)
    })

    const items = accepted.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: file.name,
      size: file.size,
      type: file.type,
      uploadedAt: new Date(),
      url: URL.createObjectURL(file),
      file,
      extractionStatus: 'queued',
      extractionError: '',
      source: 'local',
    }))

    if (items.length) {
      setInvoices((current) => [...items, ...current])
      ;(async () => { for (const item of items) await extractItem(item) })()
    }
    setError(rejected.length ? `Couldn't upload ${rejected.join(', ')}` : '')
    return items.length > 0
  }, [extractItem])

  const removeInvoice = useCallback((id) => {
    setInvoices((current) => {
      const target = current.find((invoice) => invoice.id === id)
      if (target?.source === 'local') URL.revokeObjectURL(target.url)
      return current.filter((invoice) => invoice.id !== id)
    })
  }, [])

  const clearError = useCallback(() => setError(''), [])

  // Retry for an upload whose extraction failed.
  const extractInvoice = useCallback((id) => {
    const target = invoices.find((invoice) => invoice.id === id)
    if (target?.file && target.source === 'local') extractItem(target)
  }, [extractItem, invoices])

  return { invoices, addFiles, removeInvoice, extractInvoice, error, clearError, loadError, isLoading }
}
