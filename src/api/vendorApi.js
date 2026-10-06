import { joinPhone } from '../data/countryCodes'
import { aadhaarDigits } from '../utils/formatters'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
// Deployed shared-services API (GSTIN verification, invoice preview links; email and OCR are called by the backend).
const SHARED_SERVICES_URL = (import.meta.env.VITE_SHARED_SERVICES_URL || 'https://fs-quad-shared.azurewebsites.net').replace(/\/+$/, '')
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

  const response = await fetch(`${API_BASE_URL}/vendors/${vendorId}/documents`, { method: 'POST', body: formData })
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(body?.error || 'Unable to upload the supporting documents.')
  return body
}

export async function loginVendor(email, password) {
  const response = await fetch(`${API_BASE_URL}/vendors/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  const body = await response.json().catch(() => null)

  if (response.status !== 200) {
    const error = new Error(
      response.status === 401
        ? 'Invalid email or password.'
        : body?.error || body?.message || 'Unable to sign in. Please try again.',
    )
    error.status = response.status
    throw error
  }

  const session = body?.data ?? body

  if (!session?.vendor_id) {
    const error = new Error('The login response did not include a vendor ID.')
    error.status = 502
    throw error
  }

  return session
}

export async function getVendorProfile(vendorId) {
  const params = new URLSearchParams({ vendor: String(vendorId) })
  const response = await fetch(`${API_BASE_URL}/vendors?${params}`)
  const body = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(body?.error || 'Unable to load vendor details.')
  }

  return Array.isArray(body) ? body[0] : body
}

// Fired after a request is sent so any open Change Requests screen refreshes immediately.
export const UPDATE_REQUESTS_CHANGED_EVENT = 'update-requests-changed'

export async function createUpdateRequest(vendorId, details) {
  const response = await fetch(`${API_BASE_URL}/vendors/update-requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ vendor_id: vendorId, details }),
  })
  const body = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(body?.error || 'Unable to send the update request.')
  }

  window.dispatchEvent(new Event(UPDATE_REQUESTS_CHANGED_EVENT))
  return body
}

export async function getUpdateRequests(vendorId) {
  const params = new URLSearchParams({ vendor_id: String(vendorId) })
  const response = await fetch(`${API_BASE_URL}/vendors/update-requests?${params}`)
  const body = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(body?.error || 'Unable to load update requests.')
  }

  return Array.isArray(body) ? body : []
}

export async function getVendorInvoices(vendorId) {
  const params = new URLSearchParams({ vendor_id: String(vendorId) })
  const response = await fetch(`${API_BASE_URL}/invoices?${params}`)
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

  const response = await fetch(`${API_BASE_URL}/invoices/ocr`, {
    method: 'POST',
    body: formData,
  })
  const body = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(body?.error || body?.message || 'Unable to extract the invoice.')
  }

  return body
}

// Maps the react-hook-form field names (camelCase) to the backend's
// vendor table column names (snake_case).
function toVendorPayload(data) {
  return {
    name: data.vendorLegalName,
    vendor_legal_name: data.vendorLegalName,
    contact_no: joinPhone(data.vendorPhoneCode, data.vendorPhone),
    email: data.vendorEmail,
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

async function checkExists(path, payload, errorMessage) {
  const response = await fetch(`${API_BASE_URL}/vendors/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

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

const jsonPost = (payload) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
})

export function sendEmailVerification(email, recipientName) {
  return emailVerificationRequest('/send', jsonPost({ email: email.trim().toLowerCase(), recipient_name: recipientName || undefined }), 'Unable to send the verification email. Please try again.')
}

export function verifyEmailOtp(verificationId, otp) {
  return emailVerificationRequest('/verify-otp', jsonPost({ verification_id: verificationId, otp }), 'Unable to verify the code. Please try again.')
}

export function getEmailVerificationStatus(verificationId) {
  return emailVerificationRequest(`/${encodeURIComponent(verificationId)}/status`, undefined, 'Unable to check the verification status.')
}

export async function createVendor(formData, verificationId) {
  const response = await fetch(`${API_BASE_URL}/vendors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...toVendorPayload(formData), verification_id: verificationId }),
  })

  const body = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(body?.error || 'Failed to submit vendor request')
  }

  return body
}
