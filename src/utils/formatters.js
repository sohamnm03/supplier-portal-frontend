export const maskAccountNumber = (value = '') => value ? `•••• •••• ${value.slice(-4)}` : '—'
export const displayValue = (value) => {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return value || '—'
}

export const formatFileSize = (bytes) => {
  if (!bytes) return '0 KB'
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }
  return `${unitIndex === 0 ? size : size.toFixed(1)} ${units[unitIndex]}`
}
