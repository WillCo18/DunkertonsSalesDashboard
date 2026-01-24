'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, Map, Settings, Menu, X } from 'lucide-react'

interface AppShellProps {
  children: React.ReactNode
  sidebar?: React.ReactNode
}

export function AppShell({ children, sidebar }: AppShellProps) {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/' },
    { name: 'Accounts', icon: Users, href: '/accounts' },
    { name: 'Map', icon: Map, href: '/map' }, // Future
  ]

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Primary Navigation Rail (Left) */}
      <nav className={`
        fixed lg:static inset-y-0 left-0 z-50 w-16 bg-surface-elevated border-r border-border flex flex-col items-center py-4 transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Brand Icon */}
        <div className="mb-8 w-10 h-10 rounded-xl bg-accent flex items-center justify-center shrink-0 shadow-lg shadow-accent/20">
          <span className="text-xl font-bold text-background">D</span>
        </div>

        {/* Nav Items */}
        <div className="flex-1 w-full flex flex-col items-center gap-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  p-3 rounded-xl transition-all duration-200 group relative
                  ${isActive
                    ? 'bg-accent/10 text-accent'
                    : 'text-foreground-muted hover:text-foreground hover:bg-surface'
                  }
                `}
                title={item.name}
              >
                <item.icon className="w-6 h-6" />

                {/* Tooltip (Desktop only) */}
                <div className="absolute left-full ml-3 px-2 py-1 bg-surface-elevated border border-border text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 hidden lg:block shadow-xl transition-opacity">
                  {item.name}
                </div>
              </Link>
            )
          })}
        </div>

        {/* Bottom Actions */}
        <div className="mt-auto flex flex-col gap-4">
          <button className="p-3 text-foreground-muted hover:text-foreground transition-colors rounded-xl hover:bg-surface">
            <Settings className="w-6 h-6" />
          </button>
        </div>
      </nav>

      {/* Secondary Sidebar (Filters) - Conditionally rendered based on prop */}
      {sidebar && (
        <div className="hidden lg:block w-64 border-r border-border bg-surface h-full">
          {sidebar}
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        {/* Mobile Header */}
        <div className="lg:hidden h-16 border-b border-border flex items-center px-4 justify-between bg-surface">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 -ml-2 text-foreground hover:bg-surface-elevated rounded-lg"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <span className="font-semibold text-foreground">Dunkertons</span>
          </div>
        </div>

        {/* Content Scroll Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {children}
        </div>
      </main>
    </div>
  )
}
