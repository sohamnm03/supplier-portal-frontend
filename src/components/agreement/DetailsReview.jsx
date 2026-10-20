import { displayProfileValue, isRegisteredMsme, sections } from '../layout/profileFields'
import { isCompanyType } from '../../data/vendorTypes'

const wideKeys = new Set(['vendor_legal_name', 'street', 'account_holder_name'])

// Profile field -> the key it has in the agreement's details snapshot. Every address part maps to the one address.
const SNAPSHOT_KEY = {
  vendor_legal_name: 'legal_name', email: 'email', contact_no: 'phone', vendor_type: 'vendor_type', registration_number: 'registration_number',
  msme_status: 'msme_status', gstin: 'gstin', pan: 'pan', street: 'address', city: 'address', district: 'address', region: 'address',
  postal_code: 'address', account_holder_name: 'bank_holder', bank_name: 'bank_name', branch_name: 'bank_branch', ifsc_code: 'bank_ifsc',
  bank_account_no: 'bank_account_masked',
}

// The vendor's registered details, read-only, (the confirmation sits in the page footer).
export default function DetailsReview({ profile, updateInfo = null }) {
  // On a re-issued agreement, the fields that changed since the previous version are flagged for a second look.
  const changedKeys = new Set(updateInfo?.changed_keys || [])
  const oldValue = (key) => (updateInfo?.changes || []).find((change) => change.key === key)?.from
  return (
    <div className="space-y-2.5">
      {sections.map(({ title, icon: Icon, fields }) => (
        <section key={title} className="overflow-hidden rounded-lg border border-[#dce6f1] bg-white">
          <h3 className="flex items-center gap-1.5 border-b border-[#dce6f1] bg-[#eef7ff] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.04em] text-[#29466a]">
            <Icon size={13} className="text-brand-600" /> {title}
          </h3>
          <div className="grid grid-cols-1 gap-x-4 gap-y-1.5 px-3 py-2 sm:grid-cols-2 lg:grid-cols-4">
            {fields.filter(([key]) => (key !== 'udyam_number' || isRegisteredMsme(profile)) && (key !== 'cin' || isCompanyType(profile?.vendor_type) || String(profile?.cin ?? '').trim() !== '')).map(([key, label]) => (
              <div key={key} className={`min-w-0 ${wideKeys.has(key) ? 'sm:col-span-2 lg:col-span-4' : ''}`}>
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase leading-4 tracking-[0.03em] text-slate-500">
                  {label}
                  {changedKeys.has(SNAPSHOT_KEY[key]) && <span className="rounded-full bg-brand-50 px-1.5 py-px text-[10px] font-bold normal-case tracking-normal text-brand-700">Updated</span>}
                </p>
                <p className="break-words text-[13px] font-semibold leading-5 text-navy-900">{displayProfileValue(key, profile?.[key]) || '—'}</p>
                {changedKeys.has(SNAPSHOT_KEY[key]) && (key !== 'city' && key !== 'district' && key !== 'region' && key !== 'postal_code') && <p className="break-words text-[11px] text-slate-400">Was: {oldValue(SNAPSHOT_KEY[key]) || '—'}</p>}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
