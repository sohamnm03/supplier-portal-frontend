import { useEffect, useState } from 'react'
import { BadgeCheck, Building2, Clock, Landmark, MapPin, Pencil, Send, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { createUpdateRequest, getUpdateRequests } from '../../api/vendorApi'
import Button from '../common/Button'
import Loader from '../common/Loader'
import { currencies, indianStates } from '../../data/mockData'

const VENDOR_TYPES = ['Individual', 'Proprietorship', 'Partnership', 'Private limited company', 'Public limited company', 'Government entity', 'Other']
const MSME_STATUSES = ['Registered', 'Not registered', 'Not applicable']

const sections = [
  {
    title: 'Company details',
    icon: Building2,
    fields: [
      ['vendor_legal_name', 'Vendor legal name'],
      ['email', 'Email address', 'email', null, true],
      ['contact_no', 'Phone number', 'tel'],
      ['vendor_type', 'Vendor type', 'select', VENDOR_TYPES],
      ['year_established', 'Year established'],
      ['currency', 'Transaction currency', 'select', currencies],
      ['registration_number', 'Company registration number'],
      ['msme_status', 'MSME status', 'select', MSME_STATUSES],
      ['udyam_number', 'MSME / Udyam number'],
    ],
  },
  {
    title: 'Tax & compliance',
    icon: BadgeCheck,
    fields: [
      ['gstin', 'GSTIN'],
      ['pan', 'PAN'],
      ['aadhaar_no', 'Aadhaar number'],
      ['cin', 'CIN'],
    ],
  },
  {
    title: 'Registered address',
    icon: MapPin,
    fields: [
      ['street', 'Address line 1'],
      ['city', 'City'],
      ['district', 'District / County'],
      ['region', 'State', 'select', indianStates],
      ['postal_code', 'Postal / PIN code'],
    ],
  },
  {
    title: 'Bank details',
    icon: Landmark,
    fields: [
      ['account_holder_name', 'Account holder name'],
      ['bank_name', 'Bank name'],
      ['branch_name', 'Branch name'],
      ['bank_account_no', 'Account number'],
      ['ifsc_code', 'IFSC code'],
    ],
  },
]

const editableKeys = sections.flatMap((section) => section.fields.map(([key]) => key))
const requiredKeys = new Set([
  'vendor_legal_name', 'email', 'contact_no', 'pan', 'vendor_type', 'currency', 'registration_number', 'msme_status',
  'street', 'city', 'district', 'region', 'postal_code',
  'account_holder_name', 'bank_name', 'branch_name', 'bank_account_no', 'ifsc_code',
])
const isRegisteredMsme = (data) => data?.msme_status === 'Registered'
const wideKeys = new Set(['vendor_legal_name', 'street', 'account_holder_name'])

function toDraft(profile) {
  return Object.fromEntries(editableKeys.map((key) => [key, profile?.[key] ?? '']))
}

export default function VendorProfilePanel({ open, onClose, profile }) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [draft, setDraft] = useState(() => toDraft(profile))
  const [openRequest, setOpenRequest] = useState(null)
  const [sentNotice, setSentNotice] = useState(false)

  useEffect(() => {
    if (!open) return
    setDraft(toDraft(profile))
    setEditing(false)
    setError('')
    setSentNotice(false)
  }, [open, profile])

  useEffect(() => {
    if (!open || !profile?.vendor_id) return undefined
    let ignore = false
    getUpdateRequests(profile.vendor_id)
      .then((requests) => { if (!ignore) setOpenRequest(requests.find((item) => ['update requested', 'sent for approval'].includes(item.status)) || null) })
      .catch(() => {})
    return () => { ignore = true }
  }, [open, profile?.vendor_id, sentNotice])

  if (!open) return null

  const close = () => {
    if (!saving) onClose()
  }

  const cancelEdit = () => {
    setDraft(toDraft(profile))
    setEditing(false)
    setError('')
  }

  const save = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = isRegisteredMsme(draft) ? draft : { ...draft, udyam_number: '' }
      await createUpdateRequest(profile.vendor_id, payload)
      setEditing(false)
      setSentNotice(true)
    } catch (saveError) {
      setError(saveError?.message || 'Unable to send the update request.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-navy-950/45 backdrop-blur-[2px]"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && close()}
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
            <button type="button" onClick={close} className="interactive-icon" aria-label="Close vendor profile"><X size={20} /></button>
          </div>
        </header>

        {!profile ? (
          <div className="flex flex-1 items-center justify-center gap-2 text-sm font-semibold text-slate-600"><Loader /> Loading vendor details...</div>
        ) : (
          <form className="flex min-h-0 flex-1 flex-col" onSubmit={save}>
            <div className="flex-1 space-y-4 overflow-y-auto text-[13px] px-5 py-4 sm:px-6">
              {(openRequest || sentNotice) && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
                  <Clock size={15} className="mt-0.5 shrink-0" />
                  <p>
                    {sentNotice ? 'Your update request has been sent for review. ' : 'You have an update request awaiting approval. '}
                    Your current details stay active until it is approved. <Link to="/update-requests" onClick={onClose} className="font-bold underline">Track request</Link>
                  </p>
                </div>
              )}
              {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}

              {editing && <p className="text-xs text-slate-500">Fields marked with <span className="text-red-600">*</span> are required.</p>}

              {sections.map(({ title, icon: Icon, fields }) => (
                <section key={title}>
                  <h3 className="flex items-center gap-2 border-b border-slate-100 pb-1.5 text-[13px] font-bold text-navy-900">
                    <Icon size={15} className="text-brand-600" /> {title}
                  </h3>
                  <div className="mt-2.5 grid gap-x-3 gap-y-2.5 sm:grid-cols-2">
                    {fields.filter(([key]) => key !== 'udyam_number' || isRegisteredMsme(editing ? draft : profile)).map(([key, label, type = 'text', options, readOnly = false]) => (
                      <div key={key} className={wideKeys.has(key) ? 'sm:col-span-2' : ''}>
                        <label htmlFor={`profile-${key}`} className="block text-[10px] font-semibold uppercase tracking-[0.04em] text-slate-500">{label}{editing && !readOnly && (requiredKeys.has(key) || key === 'udyam_number') && <span className="ml-1 text-red-600" aria-hidden="true">*</span>}</label>
                        {editing && !readOnly && type === 'select' ? (
                          <select
                            id={`profile-${key}`}
                            className="app-field mt-1 min-h-8 rounded-md px-2.5 py-1 leading-5"
                            value={draft[key]}
                            onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))}
                            required={requiredKeys.has(key)}
                          >
                            <option value="">Select an option</option>
                            {(draft[key] && !options.includes(draft[key]) ? [draft[key], ...options] : options).map((option) => <option key={option} value={option}>{option}</option>)}
                          </select>
                        ) : editing && !readOnly ? (
                          <input
                            id={`profile-${key}`}
                            type={type}
                            className="app-field mt-1 min-h-8 rounded-md px-2.5 py-1 leading-5"
                            value={draft[key]}
                            onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))}
                            required={requiredKeys.has(key) || key === 'udyam_number'}
                          />
                        ) : (
                          <p className="mt-0.5 min-h-5 break-words text-[13px] font-semibold text-navy-900">{profile[key] || '—'}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <footer className="flex justify-end gap-2 border-t border-slate-200 bg-white text-[13px] px-5 py-3 sm:px-6">
              {editing ? (
                <>
                  <Button className="min-h-9! px-4! py-1.5!" type="button" variant="secondary" onClick={cancelEdit} disabled={saving}>Cancel</Button>
                  <Button className="min-h-9! px-4! py-1.5!" type="submit" disabled={saving}>{saving ? <><Loader /> Sending...</> : <><Send size={16} /> Send request</>}</Button>
                </>
              ) : (
                <Button className="min-h-9! px-4! py-1.5!" type="button" onClick={() => setEditing(true)} disabled={Boolean(openRequest) || sentNotice} title={openRequest || sentNotice ? 'An update request is already awaiting approval' : undefined}><Pencil size={16} /> Edit details</Button>
              )}
            </footer>
          </form>
        )}
      </aside>
    </div>
  )
}
