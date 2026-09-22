import { FileStack, Receipt } from 'lucide-react'
import AppShell from '../components/layout/AppShell'
import PageContainer from '../components/layout/PageContainer'
import InvoiceUploader from '../components/invoices/InvoiceUploader'
import InvoiceList from '../components/invoices/InvoiceList'
import useInvoiceUploads from '../hooks/useInvoiceUploads'

const navItems = [
  { label: 'Invoices', icon: Receipt, active: true },
]

export default function InvoiceDashboardPage() {
  const { invoices, addFiles, removeInvoice, error, clearError } = useInvoiceUploads()

  return (
    <AppShell breadcrumb="Invoices">
      <PageContainer wide className="vendor-workspace h-full">
        <section className="vendor-workspace__card grid h-full min-h-0 overflow-hidden rounded-xl border border-blue-200/80 bg-white shadow-[0_12px_36px_rgba(40,83,130,0.08)] lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="hidden min-h-0 flex-col overflow-hidden border-r border-blue-100 bg-[#eef7ff] p-5 lg:flex xl:p-6">
            <div>
              <p className="eyebrow">Workspace</p>
              <h1 className="mt-3 text-2xl font-extrabold leading-[1.12] tracking-[-0.035em] text-navy-950">
                Invoice management
              </h1>
              <p className="mt-3 text-xs leading-5 text-slate-600">
                Upload supplier invoices and keep track of everything submitted from this browser.
              </p>
            </div>

            <nav className="mt-5 space-y-1.5" aria-label="Dashboard">
              {navItems.map(({ label, icon: Icon, active }) => (
                <span
                  key={label}
                  className={`flex min-h-10 items-center gap-2.5 rounded-lg px-3 text-sm font-bold ${active ? 'bg-brand-600 text-white shadow-[0_8px_20px_rgba(23,105,232,0.18)]' : 'text-navy-900 hover:bg-white/70'}`}
                >
                  <Icon size={17} /> {label}
                </span>
              ))}
            </nav>

            <div className="mt-auto pt-5">
              <div className="flex items-center gap-2 rounded-lg border border-blue-200/80 bg-white/75 px-3 py-2.5 text-[11px] font-bold text-navy-900">
                <FileStack size={15} className="shrink-0 text-brand-600" />
                Invoices are stored in this browser tab only.
              </div>
            </div>
          </aside>

          <div className="flex min-h-0 min-w-0 flex-col overflow-y-auto px-4 py-3 sm:px-6 xl:px-7">
            <header className="mb-3 flex flex-col gap-2 border-b border-slate-100 pb-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="eyebrow">Invoices</p>
                <h2 className="mt-1 text-xl font-extrabold tracking-[-0.03em] text-navy-950 sm:text-2xl">Upload &amp; track invoices</h2>
                <p className="mt-1 text-xs leading-5 text-slate-600">Upload supplier invoices below — they’ll show up in the list for this session.</p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700">
                <span className="size-1.5 rounded-full bg-emerald-500" /> {invoices.length} uploaded
              </span>
            </header>

            <div className="space-y-5 pb-4">
              <section className="section-card p-4">
                <h3 className="text-sm font-extrabold text-navy-900">Upload an invoice</h3>
                <div className="mt-3">
                  <InvoiceUploader onFiles={addFiles} error={error} onDismissError={clearError} />
                </div>
              </section>

              <section>
                <h3 className="mb-2 text-sm font-extrabold text-navy-900">Uploaded invoices</h3>
                <InvoiceList invoices={invoices} onRemove={removeInvoice} />
              </section>
            </div>
          </div>
        </section>
      </PageContainer>
    </AppShell>
  )
}
