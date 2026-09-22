import { Landmark, ShieldAlert } from 'lucide-react'
import Input from '../common/Input'
import FormSection from './FormSection'

export default function BankDetails({ register, errors }) {
  return (
    <FormSection
      icon={Landmark}
      title="Bank details"
      description="Bank information is used only in this session and is never stored in a browser draft."
    >
      <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-blue-200 bg-brand-50 px-3 py-2 text-xs leading-5 text-brand-700">
        <ShieldAlert size={17} className="mt-0.5 shrink-0" />
        <span>For your security, account and routing details are excluded when you save a draft.</span>
      </div>
      <div className="form-grid">
        <Input
          label="Account holder name"
          name="accountHolderName"
          register={register}
          error={errors.accountHolderName}
          autoComplete="off"
          required
        />
        <Input
          label="Bank name"
          name="bankName"
          register={register}
          error={errors.bankName}
          autoComplete="off"
          required
        />
        <Input label="Branch name" name="branchName" register={register} error={errors.branchName} required />
        <Input
          label="Account number"
          name="accountNumber"
          type="password"
          inputMode="numeric"
          register={register}
          error={errors.accountNumber}
          autoComplete="new-password"
          required
        />
        <Input
          label="IFSC code"
          name="ifsc"
          register={register}
          error={errors.ifsc}
          hint="11 characters, e.g. HDFC0001234"
          required
        />
      </div>
    </FormSection>
  )
}
