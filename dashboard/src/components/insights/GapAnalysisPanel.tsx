'use client'

import { useState } from 'react'
import { formatNumber, truncate } from '@/lib/utils'
import type { GapAnalysisFormat, GapAnalysisBrand, CustomGapOpportunity } from '@/types'
import { Lightbulb, Download, ArrowRight, Settings2 } from 'lucide-react'
import { getCustomGapAnalysis } from '@/lib/queries'
import useSWR from 'swr'

interface GapAnalysisPanelProps {
  formatData: GapAnalysisFormat[]
  brandData: GapAnalysisBrand[]
  loading?: boolean
  onExport?: (type: 'format' | 'brand') => void
}

export function GapAnalysisPanel({
  formatData,
  brandData,
  loading = false,
  onExport,
}: GapAnalysisPanelProps) {
  const [activeTab, setActiveTab] = useState<'format' | 'brand'>('format')
  const [useCustom, setUseCustom] = useState(false)

  // Custom gap state
  const [baseValue, setBaseValue] = useState('Keg')
  const [targetValue, setTargetValue] = useState('Bottle')

  const { data: customData = [], isLoading: customLoading } = useSWR(
    useCustom ? ['custom-gap', activeTab, baseValue, targetValue] : null,
    () => getCustomGapAnalysis(baseValue, targetValue, activeTab)
  )

  const presets = activeTab === 'format' ? [
    { label: 'Keg but not Bottle', base: 'Keg', target: 'Bottle' },
    { label: 'BIB but not Keg', base: 'BIB', target: 'Keg' },
    { label: 'Bottle but not Keg', base: 'Bottle', target: 'Keg' },
  ] : [
    { label: 'Black Fox but not Craft', base: 'Black Fox', target: 'Craft' },
    { label: 'Premium but not Vintage', base: 'Premium', target: 'Vintage' },
  ]

  if (loading) {
    return (
      <div className="card">
        <h3 className="card-header">Gap Opportunities</h3>
        <div className="animate-pulse space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-surface-elevated rounded" />
          ))}
        </div>
      </div>
    )
  }

  const currentData = activeTab === 'format' ? formatData : brandData

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-info" />
          <h3 className="text-sm font-semibold text-foreground-secondary uppercase tracking-wider">
            Gap Opportunities
          </h3>
        </div>
        {onExport && currentData.length > 0 && (
          <button
            onClick={() => onExport(activeTab)}
            className="text-foreground-muted hover:text-foreground transition-colors"
            title="Export to CSV"
          >
            <Download className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Tabs & Settings toggle */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 flex gap-1 bg-surface-elevated rounded-lg p-1">
          <button
            onClick={() => setActiveTab('format')}
            className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'format'
                ? 'bg-accent text-background'
                : 'text-foreground-secondary hover:text-foreground'
              }`}
          >
            Formats
          </button>
          <button
            onClick={() => setActiveTab('brand')}
            className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'brand'
                ? 'bg-accent text-background'
                : 'text-foreground-secondary hover:text-foreground'
              }`}
          >
            Brands
          </button>
        </div>
        <button
          onClick={() => setUseCustom(!useCustom)}
          className={`p-2 rounded-lg border transition-colors ${useCustom ? 'bg-accent/20 border-accent text-accent' : 'border-border text-foreground-secondary hover:bg-surface-elevated'
            }`}
          title="Custom Pivot Logic"
        >
          <Settings2 className="w-4 h-4" />
        </button>
      </div>

      {/* Custom Pivot UI */}
      {useCustom && (
        <div className="bg-surface-elevated/50 p-3 rounded-lg border border-border mb-4 space-y-3">
          <div className="flex items-center gap-2 text-xs text-foreground-secondary">
            <span className="flex-1">STOCKS</span>
            <span className="w-4"></span>
            <span className="flex-1">MISSING</span>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={baseValue}
              onChange={(e) => setBaseValue(e.target.value)}
              className="flex-1 bg-surface border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:border-accent"
            >
              {presets.map(p => <option key={p.base} value={p.base}>{p.base}</option>)}
              <option value="Keg">Keg</option>
              <option value="Bottle">Bottle</option>
              <option value="BIB">BIB</option>
              <option value="Can">Can</option>
              <option value="Black Fox">Black Fox</option>
              <option value="Craft">Craft</option>
              <option value="Premium">Premium</option>
              <option value="Vintage">Vintage</option>
            </select>
            <ArrowRight className="w-3 h-3 text-foreground-muted shrink-0" />
            <select
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              className="flex-1 bg-surface border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:border-accent"
            >
              <option value="Bottle">Bottle</option>
              <option value="Keg">Keg</option>
              <option value="BIB">BIB</option>
              <option value="Can">Can</option>
              <option value="Craft">Craft</option>
              <option value="Vintage">Vintage</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {presets.map(p => (
              <button
                key={p.label}
                onClick={() => { setBaseValue(p.base); setTargetValue(p.target); }}
                className="text-[10px] px-2 py-0.5 bg-surface rounded border border-border hover:border-accent/50 text-foreground-muted"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
        {loading || (useCustom && customLoading) ? (
          <div className="animate-pulse space-y-2">
            {[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-surface-elevated rounded-lg" />)}
          </div>
        ) : (useCustom ? customData : currentData).length === 0 ? (
          <div className="text-center text-foreground-muted py-8 px-4 flex flex-col items-center gap-2">
            <span className="text-sm italic">No gap opportunities found</span>
            {useCustom && <span className="text-[10px]">All customers stocking {baseValue} also stock {targetValue}</span>}
          </div>
        ) : useCustom ? (
          (customData as CustomGapOpportunity[]).map((item) => (
            <div
              key={item.del_account}
              className="py-2.5 px-3 bg-surface-elevated rounded-lg border border-transparent hover:border-accent/30 transition-all group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-foreground text-sm group-hover:text-accent transition-colors">
                  {truncate(item.customer_name, 25)}
                </span>
                <span className="font-mono text-xs text-accent">
                  {formatNumber(item.total_units)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px]">
                <span className="px-1.5 py-0.5 bg-green-500/10 text-green-400 rounded">Stocks {item.has_type}</span>
                <ArrowRight className="w-2 h-2 text-foreground-muted" />
                <span className="px-1.5 py-0.5 bg-red-500/10 text-red-400 rounded whitespace-nowrap">Missing {item.missing_type}</span>
              </div>
            </div>
          ))
        ) : activeTab === 'format' ? (
          formatData.map((item) => (
            <div
              key={item.del_account}
              className="py-2.5 px-3 bg-surface-elevated rounded-lg group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-foreground text-sm">
                  {truncate(item.customer_name, 25)}
                </span>
                <span className="font-mono text-xs text-accent">
                  {formatNumber(item.total_units)}
                </span>
              </div>
              <div className="text-[10px] text-foreground-muted flex justify-between">
                <span>Buys: {item.formats_bought}</span>
                {item.formats_missing && <span className="text-info">Missing: {item.formats_missing.split(',')[0]}...</span>}
              </div>
            </div>
          ))
        ) : (
          brandData.map((item) => (
            <div
              key={item.del_account}
              className="py-2.5 px-3 bg-surface-elevated rounded-lg group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-foreground text-sm">
                  {truncate(item.customer_name, 25)}
                </span>
                <span className="font-mono text-xs text-accent">
                  {formatNumber(item.total_units)}
                </span>
              </div>
              <div className="text-[10px] text-foreground-muted flex justify-between">
                <span>Buys: {item.brands_bought}</span>
                {item.brands_missing && <span className="text-info">Missing: {item.brands_missing.split(',')[0]}...</span>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
