import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FilePenLine } from 'lucide-react'
import { getMyAgreements } from '../api/vendorApi'
import AppShell from '../components/layout/AppShell'
import PageContainer from '../components/layout/PageContainer'
import InvoiceUploader from '../components/invoices/InvoiceUploader'
import InvoiceKpis from '../components/invoices/InvoiceKpis'
import InvoiceList from '../components/invoices/InvoiceList'
import ReadFailureModal from '../components/invoices/ReadFailureModal'
import useInvoiceUploads from '../hooks/useInvoiceUploads'
import useAuth from '../hooks/useAuth'

export default function InvoiceDashboardPage() {
  const { user } = useAuth()
  const [renewalReady, setRenewalReady] = useState(false)
  const [uploadSignal, setUploadSignal] = useState(0)
  const { invoices, addFiles, removeInvoice, extractInvoice, error, clearError, loadError, isLoading, reload, readFailures, dismissReadFailures } = useInvoiceUploads(user?.vendor_id)

  // A renewed agreement waiting for the vendor's signature gets a thin banner; failing to check just hides it.
  useEffect(() => {
    let ignore = false
    getMyAgreements().then((list) => { if (!ignore) setRenewalReady(list.some((item) => item.can_sign && item.status === 'sent')) }).catch(() => {})
    return () => { ignore = true }
  }, [])

  return (
    <AppShell breadcrumb="Invoices">
      <PageContainer wide className="vendor-workspace h-full">
        <div className="mx-auto flex h-full max-w-[1820px] min-h-0 flex-col gap-4 overflow-y-auto px-1 pb-4 sm:px-2">
          {renewalReady && (
            <Link to="/agreements" className="flex shrink-0 items-center gap-2 rounded-lg border border-blue-200 bg-[#eef7ff] px-3 py-2 text-xs font-semibold text-[#1265c8] transition hover:bg-blue-100/60">
              <FilePenLine size={15} className="shrink-0" />
              <span>A renewed agreement is waiting for your signature. <span className="font-bold underline">Review and sign</span></span>
            </Link>
          )}
          <div className="shrink-0 px-1">
            <h1 className="text-lg font-extrabold text-[#0b2b52]">Invoices</h1>
            <p className="mt-1 text-xs text-[#59728f]">Upload your invoices and track their extraction status, amounts and dates. Invoices uploaded on your behalf by your Relationship Manager also appear here.</p>
            {!isLoading && !loadError && invoices.length > 0 && <div className="mt-3"><InvoiceKpis invoices={invoices} /></div>}
          </div>
          <InvoiceUploader onFiles={(files) => { if (addFiles(files)) setUploadSignal((count) => count + 1) }} error={error} onDismissError={clearError} />
          <InvoiceList
            invoices={invoices}
            onRemove={removeInvoice}
            onExtract={extractInvoice}
            isLoading={isLoading}
            error={loadError}
            uploadedBy={user?.email}
            uploadSignal={uploadSignal}
            onReplaced={reload}
          />
        </div>
        <ReadFailureModal failures={readFailures} onClose={dismissReadFailures} onRetry={(files) => { dismissReadFailures(); if (addFiles(files)) setUploadSignal((count) => count + 1) }} />
      </PageContainer>
    </AppShell>
  )
}
