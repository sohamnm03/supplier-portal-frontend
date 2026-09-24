import { useEffect, useState } from 'react'
import { BadgeCheck, Building2, Check, Landmark, MapPin, Pencil, X } from 'lucide-react'
import { updateVendorProfile } from '../../api/vendorApi'
import Button from '../common/Button'
import Loader from '../common/Loader'

const sections = [
  {
    title: 'Company details',
    icon: Building2,
    fields: [
      ['vendor_legal_name', 'Vendor legal name'],
      ['email', 'Email address', 'email'],
      ['contact_no', 'Phone number', 'tel'],
      ['vendor_type', 'Vendor type'],
      ['vendor_category', 'Category'],
      ['vendor_subcategory', 'Subcategory'],
      ['year_established', 'Year established'],
      ['currency', 'Transaction currency'],
      ['registration_number', 'Registration number'],
      ['msme_status', 'MSME status'],
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
      ['region', 'State'],
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
  'vendor_legal_name', 'email', 'contact_no', 'pan',
  'street', 'city', 'district', 'region', 'postal_code',
  'account_holder_name', 'bank_name', 'branch_name', 'bank_account_no', 'ifsc_code',
])
const wideKeys = new Set(['vendor_legal_name', 'street', 'account_holder_name'])

function toDraft(profile) {
  return Object.fromEntries(editableKeys.map((key) => [key, profile?.[key] ?? '']))
}

export default function VendorProfilePanel({ open, onClose, profile, onSaved }) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [draft, setDraft] = useState(() => toDraft(profile))

  useEffect(() => {
    if (!open) return
    setDraft(toDraft(profile))
    setEditing(false)
    setError('')
  }, [open, profile])

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
      const updated = await updateVendorProfile(profile.vendor_id, draft)
      onSaved(updated)
      setEditing(false)
    } catch (saveError) {
      setError(saveError?.message || 'Unable to update vendor details.')
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
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>Vendor ID: {profile?.vendor_id ?? '—'}</span>
              {profile?.status && <span className="rounded-full bg-emerald-50 px-2 py-1 font-bold capitalize text-emerald-700">{profile.status}</span>}
            </div>
          </div>
          <button type="button" onClick={close} className="interactive-icon shrink-0" aria-label="Close vendor profile"><X size={20} /></button>
        </header>

        {!profile ? (
          <div className="flex flex-1 items-center justify-center gap-2 text-sm font-semibold text-slate-600"><Loader /> Loading vendor details...</div>
        ) : (
          <form className="flex min-h-0 flex-1 flex-col" onSubmit={save}>
            <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-6">
              {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}

              {sections.map(({ title, icon: Icon, fields }) => (
                <section key={title}>
                  <h3 className="flex items-center gap-2 border-b border-slate-100 pb-2 text-sm font-extrabold text-navy-900">
                    <Icon size={16} className="text-brand-600" /> {title}
                  </h3>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {fields.map(([key, label, type = 'text']) => (
                      <div key={key} className={wideKeys.has(key) ? 'sm:col-span-2' : ''}>
                        <label htmlFor={`profile-${key}`} className="block text-[11px] font-bold uppercase tracking-[0.04em] text-slate-500">{label}</label>
                        {editing ? (
                          <input
                            id={`profile-${key}`}
                            type={type}
                            className="app-field mt-1"
                            value={draft[key]}
                            onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))}
                            required={requiredKeys.has(key)}
                          />
                        ) : (
                          <p className="mt-1 break-words text-sm font-semibold text-navy-900">{profile[key] || '—'}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <footer className="flex justify-end gap-2 border-t border-slate-200 bg-white px-5 py-4 sm:px-6">
              {editing ? (
                <>
                  <Button type="button" variant="secondary" onClick={cancelEdit} disabled={saving}>Cancel</Button>
                  <Button type="submit" disabled={saving}>{saving ? <><Loader /> Saving...</> : <><Check size={17} /> Save changes</>}</Button>
                </>
              ) : (
                <Button type="button" onClick={() => setEditing(true)}><Pencil size={16} /> Edit details</Button>
              )}
            </footer>
          </form>
        )}
      </aside>
    </div>
  )
}
