export const FORM_STEPS = [
  { id: 1, title: 'Vendor', longTitle: 'Vendor Information' },
  { id: 2, title: 'Address & tax', longTitle: 'Address and Tax Details' },
  { id: 3, title: 'Bank', longTitle: 'Bank Details' },
  { id: 4, title: 'Review', longTitle: 'Review and Submit' },
]

export const STEP_FIELDS = [
  ['gstin', 'vendorLegalName', 'pan', 'aadhaar', 'vendorPhone', 'vendorEmail', 'vendorType', 'yearEstablished', 'currency', 'registrationNumber', 'msmeStatus', 'assignedRm', 'udyamNumber'],
  ['registeredAddress1', 'registeredCity', 'registeredDistrict', 'registeredState', 'registeredPostalCode', 'cin'],
  ['accountHolderName', 'bankName', 'branchName', 'accountNumber', 'ifsc'],
]
