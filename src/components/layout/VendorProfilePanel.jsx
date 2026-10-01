import { useEffect, useRef, useState } from 'react'
import { Clock, Pencil, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getUpdateRequests, getVendorProfile, UPDATE_REQUESTS_CHANGED_EVENT } from '../../api/vendorApi'
import Button from '../common/Button'
import Loader from '../common/Loader'
import EditDetailsModal from './EditDetailsModal'
import { isRegisteredMsme, sections } from './profileFields'

const POLL_INTERVAL_MS = 10000
const IN_REVIEW = ['update requested', 'sent for approval']
const wideKeys = new Set(['vendor_legal_name', 'street', 'account_holder_name'])

// The vendor's profile, read-only. "Edit details" opens a popup (EditDetailsModal) that shows the
// current details beside an editable copy; the change is then sent for approval rather than applied.
export default function VendorProfilePanel({ open, onClose, profile, onProfileRefresh }) {
  const [editOpen, setEditOpen] = useState(false)
  const [openRequest, setOpenRequest] = useState(null)
  const [sentNotice, setSentNotice] = useState(false)

  const refreshRef = useRef(onProfileRefresh)
  useEffect(() => { refreshRef.current = onProfileRefresh }, [onProfileRefresh])

  useEffect(() => {
    if (!open) return
    setEditOpen(false)
    setSentNotice(false)
  }, [open])

  // While the panel is open, keep it in step with the review without a page reload: check the
  // request on a timer, when the tab regains focus, and right after a request is sent. When a
  // request that was in review is no longer (approved or rejected), reload the vendor's profile so
  // the new details - or the unchanged old ones - show immediately and Edit details comes back.
  const hadOpenRequest = useRef(false)
  useEffect(() => {
    if (!open || !profile?.vendor_id) return undefined
    const vendorId = profile.vendor_id
    let ignore = false

    const check = () => {
      getUpdateRequests(vendorId)
        .then(async (requests) => {
          if (ignore) return
          const inReview = requests.find((item) => IN_REVIEW.includes(item.status)) || null
          setOpenRequest(inReview)
          if (inReview) {
            hadOpenRequest.current = true
            return
          }
          if (hadOpenRequest.current) {
            hadOpenRequest.current = false
            setSentNotice(false)
            const fresh = await getVendorProfile(vendorId)
            if (!ignore && fresh) refreshRef.current?.(fresh)
          }
        })
        .catch(() => {})
    }
    const refresh = () => { if (document.visibilityState === 'visible') check() }

    check()
    const timer = setInterval(refresh, POLL_INTERVAL_MS)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener(UPDATE_REQUESTS_CHANGED_EVENT, refresh)
    return () => {
      ignore = true
      clearInterval(timer)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener(UPDATE_REQUESTS_CHANGED_EVENT, refresh)
    }
  }, [open, profile?.vendor_id])

  if (!open) return null

  const pending = Boolean(openRequest) || sentNotice

  return (
    <>
      {/* The panel steps aside while the edit popup is open, and comes back when it closes. */}
      {!editOpen && <div
        className="fixed inset-0 z-50 flex justify-end bg-navy-950/45 backdrop-blur-[2px]"
        role="presentation"
        onMouseDown={(event) => event.target === event.currentTarget && onClose()}
      >
        <aside className="flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="vendor-profile-title">
          <header className="flex items-start justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
            <div className="min-w-0">
              <p className="eyebrow">Vendor profile</p>
              <h2 id="vendor-profile-title" className="mt-1 truncate text-xl font-extrabold text-navy-950">
                {profile?.vendor_legal_name || profile?.email || 'Vendor details'}
              </h2>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {profile?.status && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold capitalize text-emerald-700">{profile.status}</span>}
              <button type="button" onClick={onClose} className="interactive-icon" aria-label="Close vendor profile"><X size={20} /></button>
            </div>
          </header>

          {!profile ? (
            <div className="flex flex-1 items-center justify-center gap-2 text-sm font-semibold text-slate-600"><Loader /> Loading vendor details...</div>
          ) : (
            <>
              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 text-[13px] sm:px-6">
                {pending && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
                    <Clock size={15} className="mt-0.5 shrink-0" />
                    <p>
                      {sentNotice ? 'Your update request has been sent for review. ' : 'You have an update request awaiting approval. '}
                      Your current details stay active until it is approved. <Link to="/update-requests" onClick={onClose} className="font-bold underline">Track request</Link>
                    </p>
                  </div>
                )}

                {sections.map(({ title, icon: Icon, fields }) => (
                  <section key={title}>
                    <h3 className="flex items-center gap-2 border-b border-slate-100 pb-1.5 text-[13px] font-bold text-navy-900">
                      <Icon size={15} className="text-brand-600" /> {title}
                    </h3>
                    <div className="mt-2.5 grid gap-x-3 gap-y-2.5 sm:grid-cols-2">
                      {fields.filter(([key]) => key !== 'udyam_number' || isRegisteredMsme(profile)).map(([key, label]) => (
                        <div key={key} className={wideKeys.has(key) ? 'sm:col-span-2' : ''}>
                          <p className="block text-[10px] font-semibold uppercase tracking-[0.04em] text-slate-500">{label}</p>
                          <p className="mt-0.5 min-h-5 break-words text-[13px] font-semibold text-navy-900">{profile[key] || '—'}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>

              <footer className="flex justify-end gap-2 border-t border-slate-200 bg-white px-5 py-3 text-[13px] sm:px-6">
                <Button className="min-h-9! px-4! py-1.5!" type="button" onClick={() => setEditOpen(true)} disabled={pending} title={pending ? 'An update request is already awaiting approval' : undefined}>
                  <Pencil size={16} /> Edit details
                </Button>
              </footer>
            </>
          )}
        </aside>
      </div>}

      <EditDetailsModal
        open={editOpen}
        profile={profile}
        onClose={() => setEditOpen(false)}
        onSent={() => {
          setEditOpen(false)
          setSentNotice(true)
        }}
      />
    </>
  )
}
