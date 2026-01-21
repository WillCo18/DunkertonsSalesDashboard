'use client'

import { useState } from 'react'
import { AppShell } from '@/components/layout'
import { KPIDeck } from '@/components/kpi'
import { VolumeTrendChart, BrandDistChart } from '@/components/charts'
import { TopCustomersTable, TopProductsTable, RawDataTable } from '@/components/tables'
import { NewCustomersList, NewCustomersRecentList, AtRiskCustomersList, EnhancedGapAnalysis, CrossProductGapAnalysis } from '@/components/insights'
import { ExportPanel } from '@/components/export'
import { useFilters } from '@/hooks/useFilters'
import { useDashboardData } from '@/hooks/useDashboardData'
import { Table, LayoutGrid } from 'lucide-react'

export default function DashboardPage() {
  const {
    filters,
    setFilter,
    toggleArrayFilter,
    resetFilters,
    hasActiveFilters,
    availableMonths,
    filterOptions,
  } = useFilters()

  const {
    isLoading,
    kpiData,
    newCustomers,
    returningCustomers,
    newCustomersRecent,
    atRiskCustomers,
    topCustomers,
    topProducts,
    trendData,
    brandDistribution,
    brandFamilies,
    formatMix,
    gapFormat,
    gapBrand,
    currentMonth,
    mappingCoverage,
    rawShipments,
    isRawLoading,
  } = useDashboardData(filters)

  const [showRawData, setShowRawData] = useState(false)

  // Scroll handlers for KPI tiles
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <AppShell
      filters={filters}
      setFilter={setFilter}
      toggleArrayFilter={toggleArrayFilter}
      resetFilters={resetFilters}
      hasActiveFilters={hasActiveFilters}
      availableMonths={availableMonths}
      filterOptions={filterOptions}
      currentMonth={currentMonth || undefined}
      mappingCoverage={mappingCoverage}
    >
      <div className="space-y-6">
        {/* Header with Toggle */}
        <div className="flex justify-between items-center bg-surface p-4 rounded-lg border border-border shadow-card">
          <div>
            <h2 className="text-xl font-bold text-foreground">Performance Overview</h2>
            <p className="text-sm text-foreground-muted">Analyze sales trends and customer behavior</p>
          </div>
          <button
            onClick={() => setShowRawData(!showRawData)}
            className="flex items-center gap-2 px-4 py-2 bg-surface-elevated hover:bg-border border border-border rounded-md transition-all text-sm font-medium text-foreground"
          >
            {showRawData ? (
              <>
                <LayoutGrid className="w-4 h-4 text-accent" />
                Back to Dashboard
              </>
            ) : (
              <>
                <Table className="w-4 h-4 text-accent" />
                Show Raw Data
              </>
            )}
          </button>
        </div>

        {showRawData ? (
          <section className="bg-surface rounded-lg border border-border shadow-card p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-foreground">Granular Shipment Records</h3>
              <div className="bg-accent/10 px-3 py-1 rounded text-accent text-xs font-mono">
                {rawShipments.length} Records found
              </div>
            </div>
            <RawDataTable data={rawShipments} loading={isRawLoading} />
          </section>
        ) : (
          <>
            {/* KPI Tiles */}
            <section>
              <KPIDeck
                data={kpiData}
                loading={isLoading}
                formatMix={formatMix}
                onNewCustomersClick={() => scrollToSection('new-customers-section')}
                onAtRiskClick={() => scrollToSection('at-risk-section')}
              />
            </section>

            {/* Charts Row */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <VolumeTrendChart
                  data={trendData}
                  brandFamilies={brandFamilies}
                  loading={isLoading}
                />
              </div>
              <div>
                <BrandDistChart data={brandDistribution} loading={isLoading} />
              </div>
            </section>

            {/* Tables Row */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TopCustomersTable data={topCustomers} loading={isLoading} />
              <TopProductsTable data={topProducts} loading={isLoading} />
            </section>

            {/* Insights Row - Now with 5 widgets */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <div id="new-customers-section">
                <NewCustomersList data={newCustomers} returningData={returningCustomers} loading={isLoading} />
              </div>
              <NewCustomersRecentList data={newCustomersRecent} loading={isLoading} />
              <div id="at-risk-section">
                <AtRiskCustomersList data={atRiskCustomers} loading={isLoading} />
              </div>

              <ExportPanel
                currentMonth={currentMonth || undefined}
                newCustomers={newCustomers}
                atRiskCustomers={atRiskCustomers}
                topCustomers={topCustomers}
                topProducts={topProducts}
                gapFormat={gapFormat}
                gapBrand={gapBrand}
              />
            </section>

            {/* Enhanced Gap Analysis - Full Width */}
            <section>
              <EnhancedGapAnalysis
                availableBrands={filterOptions.brandFamilies}
                availableFormats={filterOptions.packFormats}
                availableSalespeople={filterOptions.salespeople}
                currentMonth={filters.reportMonth}
              />
            </section>

            {/* Cross-Product Gap Analysis - Full Width */}
            <section>
              <CrossProductGapAnalysis
                availableBrands={filterOptions.brandFamilies}
                availableFormats={filterOptions.packFormats}
                availableSalespeople={filterOptions.salespeople}
                currentMonth={filters.reportMonth}
              />
            </section>
          </>
        )}
      </div>
    </AppShell>
  )
}
