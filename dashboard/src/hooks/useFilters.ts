'use client'

import { useState, useCallback, useMemo } from 'react'
import useSWR from 'swr'
import { getAvailableMonths, getFilterOptions } from '@/lib/queries'
import type { FilterState } from '@/types'

const defaultFilters: FilterState = {
  reportMonth: [], // Changed from null to [] for multi-month support
  brandFamily: [],
  packFormat: [],
  salesperson: [],
  customer: null,
}

export function useFilters() {
  const [filters, setFilters] = useState<FilterState>(defaultFilters)

  // Fetch available months
  const { data: availableMonths = [] } = useSWR(
    'available-months',
    getAvailableMonths,
    { revalidateOnFocus: false }
  )

  // Fetch filter options (brand families, formats, salespeople)
  const { data: filterOptions } = useSWR(
    'filter-options',
    getFilterOptions,
    { revalidateOnFocus: false }
  )

  // Don't auto-select a month - let user choose or see all months
  // This allows aggregate views across all time periods

  // Update a single filter
  const setFilter = useCallback(
    <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }))
    },
    []
  )

  // Toggle a value in an array filter
  const toggleArrayFilter = useCallback(
    (key: 'brandFamily' | 'packFormat' | 'salesperson', value: string) => {
      setFilters((prev) => {
        const current = prev[key]
        const newValue = current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value]
        return { ...prev, [key]: newValue }
      })
    },
    []
  )

  // Reset all filters
  const resetFilters = useCallback(() => {
    setFilters(defaultFilters) // Use defaultFilters which has reportMonth as []
  }, [])

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      filters.brandFamily.length > 0 ||
      filters.packFormat.length > 0 ||
      filters.salesperson.length > 0 ||
      filters.customer !== null
    )
  }, [filters])

  return {
    filters,
    setFilter,
    toggleArrayFilter,
    resetFilters,
    hasActiveFilters,
    availableMonths,
    filterOptions: filterOptions || {
      brandFamilies: [],
      packFormats: [],
      salespeople: [],
    },
  }
}
