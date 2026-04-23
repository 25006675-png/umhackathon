'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ClipboardList, MessageCircle, Activity } from 'lucide-react'

const TABS = [
  { href: '/dashboard', Icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/input',     Icon: ClipboardList,   label: 'Input Data' },
  { href: '/chat',      Icon: MessageCircle,   label: 'Ask AI' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside
      className="hidden md:flex flex-col w-64 flex-shrink-0 sticky top-0 h-screen"
      style={{ backgroundColor: 'var(--sidebar)' }}
    >
      {/* Logo */}
      <div className="px-6 py-5" style={{ borderBottom: '1px solid var(--sidebar-border)' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'var(--risk-high)' }}
          >
            <Activity size={16} color="white" strokeWidth={2.5} />
          </div>
          <div>
            <div
              className="font-display text-base font-semibold tracking-tight"
              style={{ color: '#f8fafc' }}
            >
              TernakAI
            </div>
            <div className="text-[0.6rem] tracking-wide" style={{ color: '#475569' }}>
              Early Warning System
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <div
          className="text-[0.6rem] tracking-[0.14em] uppercase font-semibold px-3 mb-3"
          style={{ color: '#475569' }}
        >
          Navigation
        </div>
        {TABS.map(({ href, Icon, label }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors"
              style={{
                backgroundColor: active ? 'var(--sidebar-active)' : 'transparent',
                color: active ? '#f8fafc' : '#64748b',
              }}
            >
              <Icon size={16} strokeWidth={active ? 2 : 1.5} />
              <span
                className="text-sm"
                style={{ fontWeight: active ? 600 : 400 }}
              >
                {label}
              </span>
              {active && (
                <span
                  className="ml-auto w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: 'var(--risk-high)' }}
                />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Farm info */}
      <div
        className="mx-3 mb-3 p-3 rounded-lg"
        style={{ backgroundColor: '#1e293b' }}
      >
        <div className="text-xs font-medium" style={{ color: '#94a3b8' }}>Active Farm</div>
        <div className="text-sm font-semibold mt-0.5" style={{ color: '#f1f5f9' }}>Farm 001</div>
        <div className="text-xs mt-0.5" style={{ color: '#64748b' }}>Flock 2026 Batch 3</div>
      </div>

      {/* Footer */}
      <div
        className="px-6 py-3"
        style={{ borderTop: '1px solid var(--sidebar-border)' }}
      >
        <div className="text-[0.6rem] tracking-[0.12em] uppercase" style={{ color: '#334155' }}>
          UMHack 2026
        </div>
      </div>
    </aside>
  )
}
