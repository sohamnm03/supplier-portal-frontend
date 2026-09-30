import { useState } from 'react'
import AppShell from '../components/layout/AppShell'
import PageContainer from '../components/layout/PageContainer'
import InvoiceUploader from '../components/invoices/InvoiceUploader'
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
