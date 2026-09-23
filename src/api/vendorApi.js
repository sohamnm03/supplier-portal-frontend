const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

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
