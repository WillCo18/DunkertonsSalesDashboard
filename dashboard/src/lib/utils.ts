import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format large numbers with K/M suffixes
export function formatNumber(value: number, decimals = 0): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`
  }
  return value.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

// Format percentage
export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}

// Format date for display
export function formatMonth(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
}

// Format full date
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// Calculate percentage change
export function calculateDelta(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

// Brand family colors for charts
export const BRAND_COLORS: Record<string, string> = {
  'Black Fox': '#8B5CF6',    // Purple
  Craft: '#3B82F6',          // Blue
  Premium: '#10B981',        // Emerald
  Vintage: '#F59E0B',        // Amber
  Perry: '#EC4899',          // Pink
  Mulled: '#EF4444',         // Red
  Unknown: '#6B7280',        // Gray
}

// Get color for brand family
export function getBrandColor(brandFamily: string): string {
  return BRAND_COLORS[brandFamily] || BRAND_COLORS.Unknown
}

// Generate CSV from data
export function generateCSV<T extends any>(
  data: T[],
  columns: { key: keyof T; label: string }[]
): string {
  const header = columns.map((col) => col.label).join(',')
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const value = row[col.key]
        // Escape commas and quotes in values
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value ?? ''
      })
      .join(',')
  )
  return [header, ...rows].join('\n')
}

// Download CSV file
export function downloadCSV(csvContent: string, filename: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// Truncate text with ellipsis
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}
