'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ClipboardList, MessageCircle } from 'lucide-react'

const TABS = [
  { href: '/dashboard', Icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/input',     Icon: ClipboardList,   label: 'Input' },
  { href: '/chat',      Icon: MessageCircle,   label: 'Ask AI' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex justify-center">
      <div
        className="w-full max-w-lg flex"
        style={{
          backgroundColor: 'var(--ink)',
          borderTop: '1px solid #1e293b',
        }}
      >
        {TABS.map(({ href, Icon, label }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-opacity"
              style={{ opacity: active ? 1 : 0.35 }}
            >
              <Icon size={20} strokeWidth={active ? 2 : 1.5} color="var(--surface)" />
              <span
                className="text-[0.68rem]"
                style={{ color: 'var(--surface)', fontWeight: active ? 600 : 400 }}
              >
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
