import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { vendorRequestSchema } from '../schemas/vendorRequestSchema'
import { loadDraft } from '../utils/storage'

const defaults = {
  vendorLegalName: '', vendorPhone: '', vendorEmail: '', vendorType: '', vendorCategory: '', vendorSubcategory: '', yearEstablished: '', currency: 'INR', registrationNumber: '', msmeStatus: 'Not registered', udyamNumber: '',
  registeredAddress1: '', registeredCity: '', registeredDistrict: '', registeredState: '', registeredPostalCode: '',
  pan: '', gstin: '', aadhaar: '', cin: '',
  accountHolderName: '', bankName: '', branchName: '', accountNumber: '', ifsc: '',
  accurateDeclaration: false, reviewedDeclaration: false, termsDeclaration: false, consentDeclaration: false,
}

export default function useVendorRequest() {
  const draft = loadDraft()
  return useForm({ resolver: zodResolver(vendorRequestSchema), defaultValues: { ...defaults, ...draft }, mode: 'onTouched', shouldUnregister: false })
}
