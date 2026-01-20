'use client'

import { ReactNode } from 'react'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import type { FilterState } from '@/types'

interface AppShellProps {
  children: ReactNode
  filters: FilterState
  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void
  toggleArrayFilter: (
    key: 'brandFamily' | 'packFormat' | 'salesperson',
    value: string
  ) => void
  resetFilters: () => void
  hasActiveFilters: boolean
  availableMonths: string[]
  filterOptions: {
    brandFamilies: string[]
    packFormats: string[]
    salespeople: string[]
  }
  currentMonth?: string
  mappingCoverage?: number
}

export function AppShell({
  children,
  filters,
  setFilter,
  toggleArrayFilter,
  resetFilters,
  hasActiveFilters,
  availableMonths,
  filterOptions,
  currentMonth,
  mappingCoverage,
}: AppShellProps) {
  return (
    <div className="h-screen flex flex-col bg-background">
      <Header currentMonth={currentMonth} mappingCoverage={mappingCoverage} />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          filters={filters}
          setFilter={setFilter}
          toggleArrayFilter={toggleArrayFilter}
          resetFilters={resetFilters}
          hasActiveFilters={hasActiveFilters}
          availableMonths={availableMonths}
          filterOptions={filterOptions}
        />

        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
