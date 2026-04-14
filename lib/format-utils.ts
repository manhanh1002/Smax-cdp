// Shared formatting helpers for analytics components
// These are safe to import from both server and client components

export const formatVND = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
    .format(value)
    .replace('₫', 'đ')

export const formatVNDShort = (value: number) => {
  if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(1) + 'B'
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(0) + 'M'
  if (value >= 1_000) return (value / 1_000).toFixed(0) + 'K'
  return value.toLocaleString('vi-VN')
}
