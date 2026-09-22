import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff, ShieldCheck, UserPlus } from 'lucide-react'
import AppLogo from '../components/common/AppLogo'
import GoogleIcon from '../components/common/GoogleIcon'
import Loader from '../components/common/Loader'
import useAuth from '../hooks/useAuth'

const benefits = [
  ['Guided', 'Save & Resume'],
  ['Visible', 'Track Every Stage'],
  ['Controlled', 'Verified Before Activation'],
]

const workflow = [
  ['01', 'Apply', 'Capture Vendor Details'],
  ['02', 'Verify', 'Review Required Documents'],
  ['03', 'Activate', 'Complete Account Setup'],
  ['04', 'Transact', 'Manage Invoices & Payments'],
]

const capabilities = [
  ['Onboarding', ['Progress Checklists', 'Saved Applications']],
  ['Verification', ['PAN & GSTIN Checks', 'Clear Review Stages']],
  ['Payments', ['Bank Validation', 'Secure Account Details']],
]

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [googleSubmitting, setGoogleSubmitting] = useState(false)

  const goToDestination = () => navigate(location.state?.from?.pathname || '/invoices', { replace: true })

  const handleGoogleSignIn = () => {
    setError('')
    setGoogleSubmitting(true)
    setTimeout(() => {
      login('google.user@gmail.com')
      goToDestination()
    }, 450)
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!email.trim() || !password.trim()) {
      setError('Enter your email and password to continue.')
      return
    }
    setError('')
    setSubmitting(true)
    setTimeout(() => {
      login(email.trim())
      goToDestination()
    }, 450)
  }

  const handleCreateVendor = () => {
    login('guest', 'guest')
    navigate('/request-vendor')
  }

  return (
    <main className="vendor-login">
      <section className="vendor-login__pitch">
        <div className="vendor-login__brand">
          <AppLogo light />
        </div>

        <div className="vendor-login__pitch-body">
          <span className="vendor-login__kicker">Connected Vendor Onboarding</span>
          <h1>Simpler Onboarding.<br />Stronger Partnerships.</h1>
          <p>
            Guide every vendor from application to activation. Bring document reviews, verification,
            account setup, and payment readiness into one connected workspace.
          </p>

          <div className="vendor-login__benefits">
            {benefits.map(([title, detail]) => (
              <div key={title}>
                <strong>{title}</strong>
                <small>{detail}</small>
              </div>
            ))}
          </div>

          <div className="vendor-login__flow">
            <p>From Application To Vendor Activation</p>
            <ol>
              {workflow.map(([number, title, detail]) => (
                <li key={number}>
                  <i aria-hidden="true" />
                  <span>{number}</span>
                  <strong>{title}</strong>
                  <small>{detail}</small>
                </li>
              ))}
            </ol>
          </div>

          <div className="vendor-login__capabilities">
            {capabilities.map(([group, items]) => (
              <div key={group}>
                <strong>{group}</strong>
                <span>
                  {items.map((item) => <small key={item}>{item}</small>)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <footer className="vendor-login__footer">
          Vendor Central <span>Supplier Onboarding &amp; Account Operations</span>
        </footer>
      </section>

      <section className="vendor-login__panel">
        <form className="vendor-login__card" onSubmit={handleSubmit} noValidate>
          <h2>Welcome Back</h2>
          <p>Sign In To Continue To Vendor Central.</p>
          <span className="vendor-login__rule" aria-hidden="true" />

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleSubmitting || submitting}
            className="mb-4 inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white text-sm font-bold text-navy-950 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {googleSubmitting ? <Loader /> : <GoogleIcon size={18} />}
            {googleSubmitting ? 'Signing in…' : 'Sign in with Google'}
          </button>

          <div className="mb-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <span className="h-px flex-1 bg-slate-200" /> or continue with email <span className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="vendor-login__field">
            <label htmlFor="login-email">Email address <span aria-hidden="true">*</span></label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={Boolean(error)}
              required
            />
          </div>

          <div className="vendor-login__field">
            <label htmlFor="login-password">Password <span aria-hidden="true">*</span></label>
            <div className="vendor-login__password">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-invalid={Boolean(error)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((show) => !show)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && <div className="vendor-login__error" role="alert">{error}</div>}

          <button type="submit" className="vendor-login__submit" disabled={submitting}>
            {submitting ? <><Loader /> Signing in…</> : <>Sign In <ArrowRight size={18} /></>}
          </button>

          <div className="vendor-login__new-vendor">
            <strong>New vendor?</strong>
            <p>Create an account to submit your company, tax, address, and bank details.</p>
            <button type="button" onClick={handleCreateVendor}>
              <UserPlus size={15} /> Request Vendor Account
            </button>
          </div>

          <div className="vendor-login__note">
            <ShieldCheck size={15} /> Secure vendor onboarding workspace
          </div>
        </form>
      </section>
    </main>
  )
}
