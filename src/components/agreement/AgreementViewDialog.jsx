import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import AgreementPdfViewer from './AgreementPdfViewer'

// A large in-page dialog showing one agreement PDF.
export default function AgreementViewDialog({ agreement, onClose }) {
  useEffect(() => {
    if (!agreement) return undefined
    const onKey = (event) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [agreement, onClose])

  if (!agreement) return null
  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center bg-navy-950/55 p-3 backdrop-blur-[2px] sm:p-6" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="agreement-view-title">
        <header className="flex items-center justify-between gap-3 border-b border-blue-200 bg-[#eef7ff] px-5 py-3">
          <div className="min-w-0">
            <p className="eyebrow">Vendor agreement</p>
            <h2 id="agreement-view-title" className="mt-0.5 truncate text-base font-extrabold text-navy-950">{agreement.agreement_no}{agreement.version ? ` · Version ${agreement.version}` : ''}</h2>
          </div>
          <button type="button" onClick={onClose} className="interactive-icon" aria-label="Close agreement"><X size={20} /></button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <AgreementPdfViewer agreementId={agreement.agreement_id} agreementNo={agreement.agreement_no} className="h-[72vh] min-h-[360px]" />
        </div>
      </div>
    </div>,
    document.body,
  )
}
