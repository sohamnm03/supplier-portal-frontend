export const maskAccountNumber = (value = '') => value ? `•••• •••• ${value.slice(-4)}` : '—'
export const displayValue = (value) => {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return value || '—'
}
