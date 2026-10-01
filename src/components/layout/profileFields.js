import { BadgeCheck, Building2, Landmark, MapPin } from 'lucide-react'
import { currencies, indianStates } from '../../data/mockData'

// The vendor profile's fields, shared by the read-only profile panel and the Edit details popup.
// Each field is [key, label, input type, options (for selects)].

export const VENDOR_TYPES = ['Individual', 'Proprietorship', 'Partnership', 'Private limited company', 'Public limited company', 'Government entity', 'Other']
export const MSME_STATUSES = ['Registered', 'Not registered', 'Not applicable']

export const sections = [
  {
    title: 'Company details',
    icon: Building2,
    fields: [
      ['vendor_legal_name', 'Vendor legal name'],
      ['email', 'Email address', 'email'],
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

export const editableKeys = sections.flatMap((section) => section.fields.map(([key]) => key))

export const requiredKeys = new Set([
  'vendor_legal_name', 'email', 'contact_no', 'gstin', 'pan', 'vendor_type', 'currency', 'registration_number', 'msme_status',
  'street', 'city', 'district', 'region', 'postal_code',
  'account_holder_name', 'bank_name', 'branch_name', 'bank_account_no', 'ifsc_code',
])

// Filled in from the GSTIN / PAN registration (and email, the login name), so they can't be edited.
// A detail that was never captured stays editable, otherwise it could never be completed.
export const LOCKED_KEYS = new Set(['gstin', 'pan', 'vendor_legal_name', 'street', 'region', 'postal_code', 'email'])

export const isRegisteredMsme = (data) => data?.msme_status === 'Registered'

export const toDraft = (profile) => Object.fromEntries(editableKeys.map((key) => [key, profile?.[key] ?? '']))

export const sameValue = (a, b) => String(a ?? '').trim() === String(b ?? '').trim()
