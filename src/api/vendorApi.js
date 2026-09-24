const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
const GST_API_BASE_URL = import.meta.env.VITE_GST_API_BASE_URL || '/gst-api'
const INVOICE_PREVIEW_API_URL = import.meta.env.VITE_INVOICE_PREVIEW_API_URL || 'http://127.0.0.1:8000/api/invoice/preview-url'

export async function verifyGstin(gstin) {
  const params = new URLSearchParams({ gstin })
  const response = await fetch(`${GST_API_BASE_URL}/api/verify?${params}`)
  const body = await response.json().catch(() => null)

  if (!response.ok || !body?.success || !body?.valid || !body?.data) {
    throw new Error(body?.message || body?.error || 'GSTIN could not be verified.')
  }

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

export async function updateVendorProfile(vendorId, details) {
  const response = await fetch(`${API_BASE_URL}/vendors`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...details, vendor_id: vendorId }),
  })
  const body = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(body?.error || 'Unable to update vendor details.')
  }

  return body
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
    contact_no: data.vendorPhone,
    email: data.vendorEmail,
    vendor_type: data.vendorType,
    vendor_category: data.vendorCategory,
    vendor_subcategory: data.vendorSubcategory,
    year_established: data.yearEstablished || null,
    currency: data.currency,
    registration_number: data.registrationNumber,
    msme_status: data.msmeStatus,
    udyam_number: data.udyamNumber || null,
    gstin: data.gstin || null,
    pan: data.pan,
    aadhaar_no: data.aadhaar || null,
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

export async function createVendor(formData) {
  const response = await fetch(`${API_BASE_URL}/vendors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toVendorPayload(formData)),
  })

  const body = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(body?.error || 'Failed to submit vendor request')
  }

  return body
}
