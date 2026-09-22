import { Edit3 } from 'lucide-react'
import Checkbox from '../common/Checkbox'
import { displayValue, maskAccountNumber } from '../../utils/formatters'

const sections = [
  {
    title: 'Vendor information',
    step: 1,
    wide: true,
    fields: [
      ['GSTIN', 'gstin'], ['Legal name', 'vendorLegalName'], ['PAN / Tax ID', 'pan'], ['Aadhaar number', 'aadhaar'],
      ['Phone number', 'vendorPhone'], ['Email address', 'vendorEmail'], ['Vendor type', 'vendorType'],
      ['Category', 'vendorCategory'], ['Subcategory', 'vendorSubcategory'], ['Currency', 'currency'],
      ['Registration no.', 'registrationNumber'], ['MSME status', 'msmeStatus'], ['Udyam no.', 'udyamNumber'],
    ],
  },
  {
    title: 'Address details',
    step: 2,
    fields: [
      ['Registered address', 'registeredAddress1'], ['City', 'registeredCity'], ['District', 'registeredDistrict'],
      ['State', 'registeredState'], ['Postal code', 'registeredPostalCode'], ['CIN', 'cin'],
    ],
  },
  {
    title: 'Bank details',
    step: 3,
    fields: [
      ['Account holder', 'accountHolderName'], ['Bank', 'bankName'], ['Branch', 'branchName'],
      ['Account number', 'accountNumber', true], ['IFSC', 'ifsc'],
    ],
  },
]

export default function ReviewRequest({ values, register, errors, onEdit }) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 xl:grid-cols-2">
        {sections.map((section) => (
          <section key={section.title} className={`section-card overflow-hidden ${section.wide ? 'xl:col-span-2' : ''}`}>
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-4 py-2.5">
              <h3 className="text-sm font-extrabold text-navy-900">{section.title}</h3>
              <button
                type="button"
                onClick={() => onEdit(section.step)}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold text-brand-600 transition hover:bg-brand-50 hover:text-brand-700"
              >
                <Edit3 size={14} /> Edit
              </button>
            </div>
            <dl className={`grid grid-cols-1 gap-x-5 gap-y-3 p-4 sm:grid-cols-2 ${section.wide ? 'xl:grid-cols-4' : ''}`}>
              {section.fields.map(([label, key, masked]) => (
                <div key={key} className={key.includes('Address') ? 'sm:col-span-2' : ''}>
                  <dt className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">{label}</dt>
                  <dd className="mt-0.5 break-words text-xs font-semibold text-slate-800">
                    {masked ? maskAccountNumber(values[key]) : displayValue(values[key])}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>

      <section className="section-card p-4">
        <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
          <h3 className="text-base font-extrabold text-navy-900">Confirm declarations</h3>
          <p className="text-xs text-slate-500">All confirmations are required to submit this request.</p>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2 2xl:grid-cols-4">
          <Checkbox label="The provided information is accurate." name="accurateDeclaration" register={register} error={errors.accurateDeclaration} />
          <Checkbox label="The vendor information has been reviewed." name="reviewedDeclaration" register={register} error={errors.reviewedDeclaration} />
          <Checkbox label="I agree to the applicable terms and policies." name="termsDeclaration" register={register} error={errors.termsDeclaration} />
          <Checkbox label="I consent to processing the submitted information." name="consentDeclaration" register={register} error={errors.consentDeclaration} />
        </div>
      </section>
    </div>
  )
}
