import { useCallback, useState } from 'react'

const ACCEPTED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg']
const MAX_SIZE = 10 * 1024 * 1024

const isAcceptedFile = (file) => ACCEPTED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext))

export default function useInvoiceUploads() {
  const [invoices, setInvoices] = useState([])
  const [error, setError] = useState('')

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
        })),
        ...current,
      ])
    }
    setError(rejected.length ? `Couldn't upload ${rejected.join(', ')}` : '')
  }, [])

  const removeInvoice = useCallback((id) => {
    setInvoices((current) => {
      const target = current.find((invoice) => invoice.id === id)
      if (target) URL.revokeObjectURL(target.url)
      return current.filter((invoice) => invoice.id !== id)
    })
  }, [])

  const clearError = useCallback(() => setError(''), [])

  return { invoices, addFiles, removeInvoice, error, clearError }
}
