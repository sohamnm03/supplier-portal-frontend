import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, BadgeCheck, Building2, Check, Clock3, Eye, EyeOff, Landmark, ShieldCheck } from 'lucide-react'
import AppLogo from '../components/common/AppLogo'
import Loader from '../components/common/Loader'
import useAuth from '../hooks/useAuth'
import { getVendorProfile, loginVendor } from '../api/vendorApi'

const applicationSteps = [
  ['1', 'Tell us about your business', 'Company, tax and contact information'],
  ['2', 'Add your payment details', 'Registered address and bank details'],
  ['3', 'Review and submit', 'Check your information before sending'],
]

const readyItems = [
  { icon: Building2, label: 'Company details' },
  { icon: BadgeCheck, label: 'PAN & GSTIN' },
  { icon: Landmark, label: 'Bank details' },
]

export default function LoginPage() {
  const { login, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const goToDestination = () => navigate(location.state?.from?.pathname || '/invoices', { replace: true })

  const handleSubmit = async (event) => {
    event.preventDefault()
    const normalizedEmail = email.trim()
    if (!normalizedEmail || !password) {
      setError('Enter your email and password to continue.')
      return
    }

    setError('')
    setSubmitting(true)
    try {
      const session = await loginVendor(normalizedEmail, password)
      const profile = await getVendorProfile(session.vendor_id)
      login(session.email || normalizedEmail, 'user', session.vendor_id, profile)
      goToDestination()
    } catch (requestError) {
      logout()
      setError(requestError?.status === 401
        ? 'Invalid email or password.'
        : requestError?.message || 'Unable to connect to the server. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreateVendor = () => {
    login('guest', 'guest')
    navigate('/request-vendor')
  }

  return (
    <main className="vendor-login">
      <section className="vendor-login__welcome">
        <AppLogo light />

        <div className="vendor-login__welcome-body">
          <span className="vendor-login__kicker">Vendor self-onboarding</span>
          <h1>Become a vendor.<br />Start here.</h1>
          <p>
            Send us the information we need to create your vendor account. The guided application is
            simple, secure, and you can save your progress along the way.
          </p>

          <ol className="vendor-login__steps">
            {applicationSteps.map(([number, title, detail]) => (
              <li key={number}>
                <span>{number}</span>
                <div><strong>{title}</strong><small>{detail}</small></div>
              </li>
            ))}
          </ol>
        </div>

        <div className="vendor-login__privacy">
          <ShieldCheck size={18} />
          <span><strong>Your information stays protected.</strong> Details are securely shared with our onboarding team.</span>
        </div>
      </section>

      <section className="vendor-login__panel">
        <form className="vendor-login__card" onSubmit={handleSubmit} noValidate>
          <div className="vendor-login__start">
            <span className="vendor-login__start-icon"><BadgeCheck size={24} /></span>
            <span className="vendor-login__kicker">New vendor</span>
            <h2>Start your application</h2>
            <p>Have these details ready. Most vendors finish in about 10–15 minutes.</p>

            <div className="vendor-login__ready-list">
              {readyItems.map(({ icon: Icon, label }) => (
                <span key={label}><Icon size={15} /> {label}</span>
              ))}
            </div>

            <button type="button" className="vendor-login__primary" onClick={handleCreateVendor}>
              Start vendor application <ArrowRight size={18} />
            </button>
            <p className="vendor-login__save-note"><Clock3 size={14} /> You can save a draft and return later.</p>
          </div>

          <div className="vendor-login__divider"><span>Already an approved vendor?</span></div>

          <div className="vendor-login__signin">
            <div className="vendor-login__signin-heading">
              <div><h3>Sign in to your account</h3><p>Access invoices and your vendor profile.</p></div>
              <Check size={17} aria-hidden="true" />
            </div>

            <div className="vendor-login__field">
              <label htmlFor="login-email">Email address</label>
              <input id="login-email" type="email" autoComplete="email" placeholder="you@company.com"
                value={email} onChange={(event) => setEmail(event.target.value)} aria-invalid={Boolean(error)} required />
            </div>

            <div className="vendor-login__field">
              <label htmlFor="login-password">Password</label>
              <div className="vendor-login__password">
                <input id="login-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password"
                  placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)}
                  aria-invalid={Boolean(error)} required />
                <button type="button" onClick={() => setShowPassword((show) => !show)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && <div className="vendor-login__error" role="alert">{error}</div>}

            <button type="submit" className="vendor-login__secondary" disabled={submitting}>
              {submitting ? <><Loader /> Signing in…</> : <>Sign in <ArrowRight size={17} /></>}
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}
