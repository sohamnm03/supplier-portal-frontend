import { useEffect, useRef, useState } from 'react'

// Debounces an async "does this value already exist" check and reports the
// result back into react-hook-form as a manual error, plus a plain boolean
// for callers (like a wizard's "Continue" button) that need to block on it
// synchronously rather than re-reading form errors.
export default function useDuplicateCheck({ value, isValid, checkFn, message, fieldName, setError, clearErrors, onTakenChange }) {
  const [checking, setChecking] = useState(false)
  const token = useRef(0)

  useEffect(() => {
    onTakenChange?.(false)
    if (!value || !isValid) {
      setChecking(false)
      return undefined
    }

    const current = ++token.current
    setChecking(true)
    const timer = setTimeout(async () => {
      try {
        const exists = await checkFn(value)
        if (current !== token.current) return
        if (exists) {
          setError(fieldName, { type: 'manual', message })
          onTakenChange?.(true)
        } else {
          clearErrors(fieldName)
        }
      } catch {
        // An availability check that fails to reach the server shouldn't block the user from continuing.
      } finally {
        if (current === token.current) setChecking(false)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [value, isValid, checkFn, message, fieldName, setError, clearErrors, onTakenChange])

  return checking
}
