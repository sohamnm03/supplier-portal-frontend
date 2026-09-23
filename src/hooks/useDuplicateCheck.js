import { useEffect, useRef, useState } from 'react'

// Debounces an async "does this value already exist" check and reports the
// result back into react-hook-form as a manual error, plus a plain boolean
// for callers (like a wizard's "Continue" button) that need to block on it
// synchronously rather than re-reading form errors.
export default function useDuplicateCheck({ value, isValid, checkFn, message, fieldName, setError, clearErrors, onTakenChange, onCheckingChange }) {
  const [checking, setChecking] = useState(false)
  const token = useRef(0)

  useEffect(() => {
    onCheckingChange?.(checking)
  }, [checking, onCheckingChange])

  useEffect(() => {
    const current = ++token.current
    onTakenChange?.(false)
    if (!value || !isValid) {
      setChecking(false)
      return undefined
    }

    clearErrors(fieldName)
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
        if (current !== token.current) return
        setError(fieldName, { type: 'manual', message: 'Could not verify availability. Please try again.' })
        onTakenChange?.(true)
      } finally {
        if (current === token.current) setChecking(false)
      }
    }, 500)

    return () => {
      clearTimeout(timer)
      if (token.current === current) token.current += 1
    }
  }, [value, isValid, checkFn, message, fieldName, setError, clearErrors, onTakenChange])

  return checking
}
