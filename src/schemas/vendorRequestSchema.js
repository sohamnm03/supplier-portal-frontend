import { z } from 'zod'
import { phoneRuleFor } from '../data/countryCodes'

const required = (label) => z.string().trim().min(1, `${label} is required`)
export const vendorRequestSchema = z.object({
  vendorLegalName: required('Vendor legal name'), vendorPhoneCode: required('Country code'), vendorPhone: required('Phone number'),vendorEmail: required('Email address').email('Enter a valid email address'), vendorType: required('Vendor type'), yearEstablished: z.string().optional().refine((v) => !v || (/^\d{4}$/.test(v) && +v <= new Date().getFullYear()), 'Enter a valid year'), currency: required('Currency'), registrationNumber: required('Registration number'), msmeStatus: required('MSME status'), assignedRm: z.string().optional(), udyamNumber: z.string().optional(),
  registeredAddress1: required('Address'), registeredDistrict: required('District'), registeredCity: required('City'), registeredState: required('State'), registeredPostalCode: required('Postal code'),
  pan: required('Tax identification number'), gstin: z.string().optional(), aadhaar: z.string().optional(), cin: z.string().optional(),
  accountHolderName: required('Account holder name'), bankName: required('Bank name'), branchName: required('Branch name'), accountNumber: required('Account number').regex(/^\d{6,34}$/, 'Enter a valid 6–34 digit account number'), ifsc: required('IFSC code'),
  accurateDeclaration: z.boolean(), termsDeclaration: z.boolean(),
}).superRefine((data, ctx) => {
  const add = (path, message) => ctx.addIssue({ code: 'custom', path: [path], message })
  if (data.msmeStatus === 'Registered' && !data.udyamNumber?.trim()) add('udyamNumber', 'Udyam registration number is required')
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(data.pan)) add('pan', 'Enter a valid PAN, e.g. ABCDE1234F')
  if (!/^\d{6}$/.test(data.registeredPostalCode)) add('registeredPostalCode', 'Enter a valid 6-digit PIN code')
  if (data.gstin?.trim() && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(data.gstin)) add('gstin', 'Enter a valid 15-character GSTIN')
  if (data.aadhaar?.trim() && !/^[2-9]\d{11}$/.test(data.aadhaar.replace(/\s/g, ''))) add('aadhaar', 'Enter a valid 12-digit Aadhaar number')
  const phoneRule = phoneRuleFor(data.vendorPhoneCode)
  if (data.vendorPhone?.trim() && !phoneRule.pattern.test(data.vendorPhone.replace(/\s/g, ''))) add('vendorPhone', phoneRule.message)
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(data.ifsc || '')) add('ifsc', 'Enter a valid IFSC, e.g. HDFC0001234')
})
