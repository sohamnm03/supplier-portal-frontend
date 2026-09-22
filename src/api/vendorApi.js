const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

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

export async function checkEmailExists(email) {
  const response = await fetch(`${API_BASE_URL}/vendors/check-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })

  if (!response.ok) {
    throw new Error('Failed to verify email address')
  }

  const body = await response.json().catch(() => null)
  return Boolean(body?.exists)
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
