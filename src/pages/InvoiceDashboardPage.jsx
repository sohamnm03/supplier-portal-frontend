import { useState } from 'react'
import AppShell from '../components/layout/AppShell'
import PageContainer from '../components/layout/PageContainer'
import InvoiceUploader from '../components/invoices/InvoiceUploader'
import InvoiceKpis from '../components/invoices/InvoiceKpis'
import InvoiceList from '../components/invoices/InvoiceList'
import useInvoiceUploads from '../hooks/useInvoiceUploads'
import useAuth from '../hooks/useAuth'

export default function InvoiceDashboardPage() {
  const { user } = useAuth()
  const [uploadSignal, setUploadSignal] = useState(0)
  const { invoices, addFiles, removeInvoice, extractInvoice, error, clearError, loadError, isLoading } = useInvoiceUploads(user?.vendor_id)

  return (
    <AppShell breadcrumb="Invoices">
      <PageContainer wide className="vendor-workspace h-full">
        <div className="mx-auto flex h-full max-w-[1820px] min-h-0 flex-col gap-4 overflow-y-auto px-1 pb-4 sm:px-2">
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
          />
        </div>
      </PageContainer>
    </AppShell>
  )
}
