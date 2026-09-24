import { useCallback, useEffect, useState } from 'react'
import { extractInvoice as extractInvoiceApi, getVendorInvoices } from '../api/vendorApi'

const ACCEPTED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg']
const MAX_SIZE = 10 * 1024 * 1024

const isAcceptedFile = (file) => ACCEPTED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext))

function toValidDate(value) {
  const date = value ? new Date(value) : new Date()
  return Number.isNaN(date.getTime()) ? new Date() : date
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

  const addFiles = useCallback((fileList) => {
    const files = Array.from(fileList || [])
    if (!files.length) return

    const accepted = []
    const rejected = []
    files.forEach((file) => {
      if (!isAcceptedFile(file)) { rejected.push(`${file.name} (unsupported file type)`); return }
      if (file.size > MAX_SIZE) { rejected.push(`${file.name} (larger than 10 MB)`); return }
      accepted.push(file)
    })

    if (accepted.length) {
      setInvoices((current) => [
        ...accepted.map((file) => ({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: file.name,
          size: file.size,
          type: file.type,
          uploadedAt: new Date(),
          url: URL.createObjectURL(file),
          file,
          extractionStatus: 'ready',
          extractionError: '',
          source: 'local',
        })),
        ...current,
      ])
    }
    setError(rejected.length ? `Couldn't upload ${rejected.join(', ')}` : '')
  }, [])

  const removeInvoice = useCallback((id) => {
    setInvoices((current) => {
      const target = current.find((invoice) => invoice.id === id)
      if (target?.source === 'local') URL.revokeObjectURL(target.url)
      return current.filter((invoice) => invoice.id !== id)
    })
  }, [])

  const clearError = useCallback(() => setError(''), [])

  const extractInvoice = useCallback(async (id) => {
    const target = invoices.find((invoice) => invoice.id === id)
    if (!target?.file || target.source !== 'local') return
    if (!vendorId) {
      setInvoices((current) => current.map((invoice) => (
        invoice.id === id
          ? { ...invoice, extractionStatus: 'failed', extractionError: 'Vendor ID is missing. Please sign in again.' }
          : invoice
      )))
      return
    }

    setInvoices((current) => current.map((invoice) => (
      invoice.id === id
        ? { ...invoice, extractionStatus: 'extracting', extractionError: '' }
        : invoice
    )))

    try {
      await extractInvoiceApi(vendorId, target.file)
      const records = await getVendorInvoices(vendorId)
      const remoteInvoices = records.map(normalizeInvoice)
      URL.revokeObjectURL(target.url)
      setInvoices((current) => [
        ...current.filter((invoice) => invoice.source === 'local' && invoice.id !== id),
        ...remoteInvoices,
      ])
      setLoadError('')
    } catch (requestError) {
      setInvoices((current) => current.map((invoice) => (
        invoice.id === id
          ? {
              ...invoice,
              extractionStatus: 'failed',
              extractionError: requestError?.message || 'Unable to extract the invoice.',
            }
          : invoice
      )))
    }
  }, [invoices, vendorId])

  return { invoices, addFiles, removeInvoice, extractInvoice, error, clearError, loadError, isLoading }
}
