import { joinPhone, splitPhone } from '../data/countryCodes'
import { aadhaarDigits, formatAadhaar } from '../utils/formatters'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
// Deployed shared-services API (GSTIN verification, invoice preview links; email and OCR are called by the backend).
const SHARED_SERVICES_URL = (import.meta.env.VITE_SHARED_SERVICES_URL || 'https://fs-quad-shared.azurewebsites.net').replace(/\/+$/, '')

const AUTH_KEY = 'vendor-onboarding-auth'
// Fired when the server says the session is no longer valid, so the app can sign the vendor out.
export const AUTH_EXPIRED_EVENT = 'vendor-auth-expired'

function sessionToken() {
  try { return JSON.parse(localStorage.getItem(AUTH_KEY))?.token || '' } catch { return '' }
}

// fetch() against our backend with the vendor's session token attached.
async function authFetch(path, options = {}) {
  const token = sessionToken()
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { ...options.headers, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  })
  if (response.status === 401 && token) window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT))
  return response
}

const jsonRequest = (method, payload) => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
})

const GST_VERIFY_API_URL = `${SHARED_SERVICES_URL}/api/verify`
const INVOICE_PREVIEW_API_URL = `${SHARED_SERVICES_URL}/api/invoice/preview-url`

export async function verifyGstin(gstin) {
  const params = new URLSearchParams({ gstin })
  const response = await fetch(`${GST_VERIFY_API_URL}?${params}`)
  const body = await response.json().catch(() => null)

  if (!response.ok || !body?.success || !body?.valid || !body?.data) {
    throw new Error(body?.message || body?.error || 'GSTIN could not be verified.')
  }

  return body
}

// Public India Post directory. Only the 6-digit PIN code is sent. A PIN code resolves to one district, which
// is used for both City and District / County (the directory has no separate city), and both stay editable.
const PINCODE_API_URL = 'https://api.postalpincode.in/pincode'
const pincodeCache = new Map()

// Resolves to { city, district }, or null when the PIN code is not in the directory. Throws if the lookup
// itself fails (offline, timeout), so the caller can tell "unknown PIN" from "could not check".
export async function lookupPincode(pincode) {
  if (pincodeCache.has(pincode)) return pincodeCache.get(pincode)

  const response = await fetch(`${PINCODE_API_URL}/${pincode}`, { signal: AbortSignal.timeout(8000) })
  if (!response.ok) throw new Error('PIN code lookup failed.')
  const body = await response.json().catch(() => null)
  const entry = Array.isArray(body) ? body[0] : null
  if (!entry) throw new Error('PIN code lookup failed.')

  const district = entry.Status === 'Success' ? String(entry.PostOffice?.find((office) => office?.District)?.District || '').trim() : ''
  const result = district ? { city: district, district } : null
  pincodeCache.set(pincode, result)
  return result
}

// documents is { [typeKey]: File[] }; each type goes up under its own form field name.
export async function uploadVendorDocuments(vendorId, documents) {
  const formData = new FormData()
  Object.entries(documents).forEach(([type, files]) => files.forEach((file) => formData.append(type, file)))

  const response = await authFetch(`/vendors/${vendorId}/documents`, { method: 'POST', body: formData })
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(body?.error || 'Unable to upload the supporting documents.')
  return body
}

// What is already on file for the application, grouped by document type: { pan: [{ original_name, size }], ... }.
export async function getMyDocuments() {
  const response = await authFetch('/vendors/me/documents')
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(body?.error || 'Unable to load your documents.')
  const grouped = {}
  for (const document of body?.documents || []) {
    if (document.type) (grouped[document.type] ||= []).push(document)
  }
  return grouped
}

export async function loginVendor(email, password) {
  const response = await fetch(`${API_BASE_URL}/vendors/login`, jsonRequest('POST', { email, password }))

  const body = await response.json().catch(() => null)

  if (response.status !== 200) {
    const error = new Error(
      response.status === 401
        ? 'Invalid email or password.'
        : response.status === 429
          ? 'Too many failed attempts. Please wait a few minutes and try again.'
          : body?.error || body?.message || 'Unable to sign in. Please try again.',
    )
    error.status = response.status
    error.code = body?.code
    error.body = body
    throw error
  }

  const session = body?.data ?? body

  if (!session?.vendor_id || !session?.token) {
    const error = new Error('The login response did not include a session.')
    error.status = 502
    throw error
  }

  return session
}

// The signed-in vendor's own record, with their lifecycle `stage` and, if the application was returned, the
// open `rejection` (reasons and flagged fields).
export async function getVendorProfile() {
  const response = await authFetch('/vendors/me')
  const body = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(body?.error || 'Unable to load vendor details.')
  }

  return body
}

// Signup: a verified email and a phone number. The backend emails the login credentials.
export async function signupVendor({ email, phone, verificationId }) {
  const response = await fetch(`${API_BASE_URL}/vendors/signup`, jsonRequest('POST', {
    email: email.trim().toLowerCase(),
    contact_no: phone,
    verification_id: verificationId,
  }))
  const body = await response.json().catch(() => null)

  if (!response.ok) {
    const error = new Error(body?.error || 'Unable to create your account. Please try again.')
    error.status = response.status
    error.code = body?.code
    throw error
  }
  return body
}

// Saves the onboarding form as it stands (partial is fine). Resolves to the vendor's refreshed record.
export async function saveOnboardingDraft(formData) {
  const response = await authFetch('/vendors/me/draft', jsonRequest('PUT', toVendorPayload(formData)))
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(body?.error || 'Unable to save your progress.')
  return body
}

// Submits (or resubmits) the application for review. `confirmedFields` are flagged fields the vendor checked
// and kept as they were.
export async function submitOnboarding(formData, confirmedFields = []) {
  const response = await authFetch('/vendors/me/submit', jsonRequest('POST', {
    details: toVendorPayload(formData),
    confirmed_fields: confirmedFields,
  }))
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(body?.error || 'Failed to submit your application. Please try again.')
  return body
}

// Fired after a request is sent so any open Change Requests screen refreshes immediately.
export const UPDATE_REQUESTS_CHANGED_EVENT = 'update-requests-changed'

export async function createUpdateRequest(vendorId, details) {
  const response = await authFetch('/vendors/update-requests', jsonRequest('POST', { vendor_id: vendorId, details }))
  const body = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(body?.error || 'Unable to send the update request.')
  }

  window.dispatchEvent(new Event(UPDATE_REQUESTS_CHANGED_EVENT))
  return body
}

export async function getUpdateRequests(vendorId) {
  const params = new URLSearchParams({ vendor_id: String(vendorId) })
  const response = await authFetch(`/vendors/update-requests?${params}`)
  const body = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(body?.error || 'Unable to load update requests.')
  }

  return Array.isArray(body) ? body : []
}

export async function getVendorInvoices(vendorId) {
  const params = new URLSearchParams({ vendor_id: String(vendorId) })
  const response = await authFetch(`/invoices?${params}`)
  const body = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(body?.error || body?.message || 'Unable to load uploaded invoices.')
  }

  const invoices = Array.isArray(body) ? body : body?.invoices ?? body?.data
  return Array.isArray(invoices) ? invoices : []
}

export async function getInvoicePreviewUrl(blobUrl) {
  if (!blobUrl) throw new Error('This invoice does not include a blob URL.')

  const params = new URLSearchParams({ blob_name: blobUrl })
  const response = await fetch(`${INVOICE_PREVIEW_API_URL}?${params}`)
  const rawBody = await response.text()
  let body = null
  try { body = rawBody ? JSON.parse(rawBody) : null } catch { body = rawBody }

  if (!response.ok) {
    throw new Error(body?.error || body?.message || 'Unable to generate the invoice preview.')
  }

  const previewUrl = typeof body === 'string'
    ? body
    : body?.preview_url || body?.previewUrl || body?.url || body?.sas_url
      || body?.data?.preview_url || body?.data?.previewUrl || body?.data?.url || body?.data?.sas_url

  if (!previewUrl) throw new Error('The preview service did not return a document URL.')
  return previewUrl
}

export async function extractInvoice(vendorId, file) {
  const formData = new FormData()
  formData.append('vendor_id', String(vendorId))
  formData.append('invoices', file)

  const response = await authFetch('/invoices/ocr', {
    method: 'POST',
    body: formData,
  })
  const body = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(body?.error || body?.message || 'Unable to extract the invoice.')
  }

  return body
}

// Why a returned invoice needs correcting (or why a rejected one was rejected); null when there is nothing to show.
export async function getInvoiceReturnReasons(invoiceId) {
  const response = await authFetch(`/invoices/${invoiceId}/return-reasons`)
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(body?.error || body?.message || 'Unable to load the correction details.')
  return body
}

// Uploads the corrected file for a returned invoice; the same invoice is overwritten and goes back for approval.
export async function replaceInvoice(invoiceId, file) {
  const formData = new FormData()
  formData.append('invoices', file)
  const response = await authFetch(`/invoices/${invoiceId}/replace`, { method: 'POST', body: formData })
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(body?.error || body?.message || 'Unable to replace the invoice.')
  return body
}

// Maps the react-hook-form field names (camelCase) to the backend's
// vendor table column names (snake_case). The email is fixed at signup, so it is not sent.
function toVendorPayload(data) {
  return {
    vendor_legal_name: data.vendorLegalName,
    contact_no: joinPhone(data.vendorPhoneCode, data.vendorPhone),
    vendor_type: data.vendorType,
    year_established: data.yearEstablished || null,
    currency: data.currency,
    registration_number: data.registrationNumber,
    msme_status: data.msmeStatus,
    udyam_number: data.udyamNumber || null,
    assigned_rm: data.assignedRm || null,
    gstin: data.gstin || null,
    pan: data.pan,
    aadhaar_no: aadhaarDigits(data.aadhaar) || null,
    cin: data.cin || null,
    street: data.registeredAddress1,
    city: data.registeredCity,
    district: data.registeredDistrict,
    region: data.registeredState,
    postal_code: data.registeredPostalCode,
    account_holder_name: data.accountHolderName,
    bank_name: data.bankName,
    branch_name: data.branchName,
    bank_account_no: data.accountNumber,
    ifsc_code: data.ifsc,
  }
}

// The inverse of toVendorPayload: the vendor's stored record as the form's (camelCase) values.
export function toFormValues(vendor) {
  const { code, number } = splitPhone(vendor.contact_no)
  const text = (value) => (value == null ? '' : String(value))
  return {
    vendorEmail: text(vendor.email),
    vendorPhoneCode: code,
    vendorPhone: number,
    vendorLegalName: text(vendor.vendor_legal_name),
    vendorType: text(vendor.vendor_type),
    yearEstablished: text(vendor.year_established),
    currency: text(vendor.currency) || 'INR',
    registrationNumber: text(vendor.registration_number),
    msmeStatus: text(vendor.msme_status) || 'Not registered',
    udyamNumber: text(vendor.udyam_number),
    assignedRm: text(vendor.assigned_rm),
    gstin: text(vendor.gstin),
    pan: text(vendor.pan),
    aadhaar: formatAadhaar(text(vendor.aadhaar_no)),
    cin: text(vendor.cin),
    registeredAddress1: text(vendor.street),
    registeredCity: text(vendor.city),
    registeredDistrict: text(vendor.district),
    registeredState: text(vendor.region),
    registeredPostalCode: text(vendor.postal_code),
    accountHolderName: text(vendor.account_holder_name),
    bankName: text(vendor.bank_name),
    branchName: text(vendor.branch_name),
    accountNumber: text(vendor.bank_account_no),
    ifsc: text(vendor.ifsc_code),
  }
}

async function checkExists(path, payload, errorMessage) {
  const response = await authFetch(`/vendors/${path}`, jsonRequest('POST', payload))

  if (!response.ok) {
    throw new Error(errorMessage)
  }

  const body = await response.json().catch(() => null)
  return Boolean(body?.exists)
}

export async function checkEmailExists(email) {
  return checkExists('check-email', { email: email.trim().toLowerCase() }, 'Failed to verify email address')
}

export async function checkPanExists(pan) {
  return checkExists('check-pan', { pan: pan.trim().toUpperCase() }, 'Failed to verify PAN')
}

// Email verification goes through our backend, which relays to the shared service. Failures carry
// `status`, `body` (the service's JSON) and, for a 429, `retryAfter` seconds.
async function emailVerificationRequest(path, options, fallbackMessage) {
  let response
  try {
    response = await fetch(`${API_BASE_URL}/vendors/email-verification${path}`, options)
  } catch {
    throw new Error(fallbackMessage)
  }

  const body = await response.json().catch(() => null)
  if (!response.ok) {
    const error = new Error(body?.message || body?.error || fallbackMessage)
    error.status = response.status
    error.body = body
    error.retryAfter = Number(body?.retry_after ?? response.headers.get('Retry-After')) || 0
    throw error
  }
  return body
}

const jsonPost = (payload) => jsonRequest('POST', payload)

export function sendEmailVerification(email, recipientName) {
  return emailVerificationRequest('/send', jsonPost({ email: email.trim().toLowerCase(), recipient_name: recipientName || undefined }), 'Unable to send the verification email. Please try again.')
}

export function verifyEmailOtp(verificationId, otp) {
  return emailVerificationRequest('/verify-otp', jsonPost({ verification_id: verificationId, otp }), 'Unable to verify the code. Please try again.')
}

export function getEmailVerificationStatus(verificationId) {
  return emailVerificationRequest(`/${encodeURIComponent(verificationId)}/status`, undefined, 'Unable to check the verification status.')
}
