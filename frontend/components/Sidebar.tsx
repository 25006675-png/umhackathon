'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { History, Home, MessageCircle, TrendingUp } from 'lucide-react'

import { ChickenIcon, WheatIcon } from './FarmArt'

const TABS = [
  { href: '/', Icon: Home, label: 'Today' },
  { href: '/trends', Icon: TrendingUp, label: 'Trends' },
  { href: '/history', Icon: History, label: 'History' },
  { href: '/chat', Icon: MessageCircle, label: 'Ask AI' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside
      className="hidden md:flex flex-col w-64 flex-shrink-0 sticky top-0 h-screen"
      style={{ backgroundColor: 'var(--sidebar)' }}
    >
      <div
        className="px-6 py-5 relative overflow-hidden"
        style={{ borderBottom: '1px solid var(--sidebar-border)' }}
      >
        <svg
          className="absolute -right-3 -bottom-3 opacity-10"
          width="90"
          height="70"
          viewBox="0 0 90 70"
          fill="none"
          aria-hidden
        >
          <path d="M15 60 L15 40 L30 28 L45 40 L45 60 Z" stroke="#f8fafc" strokeWidth="1.5" />
          <path d="M15 40 L30 28 L45 40" stroke="#f8fafc" strokeWidth="1.5" />
          <path d="M60 62 Q62 50 70 46 Q75 44 76 40 Q76 36 72 34 Q76 32 76 28 Q76 24 70 24 Q72 20 68 18 Q64 18 64 22 Q60 20 58 26 Q56 34 60 40 Q56 42 56 48 Q56 58 60 62 Z" stroke="#f8fafc" strokeWidth="1.5" fill="none" />
          <circle cx="66" cy="26" r="0.8" fill="#f8fafc" />
        </svg>
        <div className="flex items-center gap-3 relative">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'var(--earth-barn)' }}
            aria-hidden
          >
            <ChickenIcon size={30} />
          </div>
          <div>
            <div className="font-display text-base font-semibold tracking-tight" style={{ color: '#f8fafc' }}>
              TernakAI
            </div>
            <div className="text-[0.6rem] tracking-wide flex items-center gap-1" style={{ color: '#94a3b8' }}>
              <WheatIcon size={10} /> Poultry Early Warning
            </div>
          </div>
        </div>
      </div>

      <nav className="px-3 py-4 space-y-1 flex-shrink-0">
        <div className="text-[0.6rem] tracking-[0.14em] uppercase font-semibold px-3 mb-3" style={{ color: '#475569' }}>
          Navigation
        </div>
        {TABS.map(({ href, Icon, label }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
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
              <span className="text-sm" style={{ fontWeight: active ? 600 : 400 }}>{label}</span>
              {active && <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#ea580c' }} />}
            </Link>
          )
        })}
      </nav>

      <div className="flex-1" />

      <div className="mx-3 mb-3 p-3 rounded-lg flex-shrink-0" style={{ backgroundColor: '#1e293b' }}>
        <div className="text-xs font-medium" style={{ color: '#94a3b8' }}>Active Farm</div>
        <div className="text-sm font-semibold mt-0.5" style={{ color: '#f1f5f9' }}>Farm 001</div>
        <div className="text-xs mt-0.5" style={{ color: '#64748b' }}>Flock 2026 Batch 3</div>
      </div>

      <div className="px-6 py-3 flex-shrink-0" style={{ borderTop: '1px solid var(--sidebar-border)' }}>
        <div className="text-[0.6rem] tracking-[0.12em] uppercase" style={{ color: '#334155' }}>
          UMHack 2026
        </div>
      </div>
    </aside>
  )
}
