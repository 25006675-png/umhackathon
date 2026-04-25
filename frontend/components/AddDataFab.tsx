'use client'

import Link from 'next/link'
import { Plus } from 'lucide-react'

export default function AddDataFab() {
  return (
    <Link
      href="/input"
      aria-label="Log today's data"
      className="fixed z-40 bottom-24 md:bottom-6 right-4 md:right-6 flex items-center gap-2 px-4 py-3 rounded-full font-semibold text-sm transition-transform hover:scale-[1.03] active:scale-95"
      style={{
        backgroundColor: 'var(--ink)',
        color: '#f8fafc',
        boxShadow: '0 10px 24px rgba(15,23,42,0.25)',
      }}
    >
      <Plus size={18} strokeWidth={2.5} />
      <span>Add Data</span>
    </Link>
  )
}
