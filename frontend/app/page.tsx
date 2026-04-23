import Link from 'next/link'
import { ArrowRight, AlertTriangle, TrendingUp, Shield } from 'lucide-react'

export default function HomePage() {
  const stats = [
    { label: 'Risk Level', value: 'HIGH', sub: 'Score: 73/100', color: '#ea580c', bg: '#fff7ed', border: '#fdba74' },
    { label: 'Flock Size', value: '5,000', sub: 'birds monitored', color: '#0f172a', bg: '#f8fafc', border: '#e2e8f0' },
    { label: 'Farm Day', value: '28', sub: 'of grow cycle', color: '#0f172a', bg: '#f8fafc', border: '#e2e8f0' },
    { label: 'Alerts', value: '2', sub: 'active today', color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
  ]

  return (
    <div className="flex flex-col min-h-full">
      {/* Hero */}
      <div
        className="px-6 md:px-10 py-10 md:py-14"
        style={{ backgroundColor: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
      >
        <div
          className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase px-3 py-1.5 rounded-full mb-5"
          style={{ backgroundColor: '#fff7ed', color: '#ea580c', border: '1px solid #fdba74' }}
        >
          <AlertTriangle size={12} />
          <span>Live Monitoring Active</span>
        </div>
        <h1
          className="font-display text-4xl md:text-5xl font-bold leading-[1.1] mb-4"
          style={{ color: 'var(--ink)' }}
        >
          Protect your flock<br />
          <span style={{ color: '#ea580c' }}>before losses mount.</span>
        </h1>
        <p className="text-base leading-relaxed mb-8 max-w-lg" style={{ color: 'var(--ink-2)' }}>
          TernakAI monitors temperature, feed intake, and mortality in real time — delivering AI-powered early warnings before disease spreads.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--ink)', color: '#f8fafc' }}
          >
            View Dashboard <ArrowRight size={14} />
          </Link>
          <Link
            href="/input"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold"
            style={{
              backgroundColor: 'var(--surface)',
              color: 'var(--ink)',
              border: '1px solid var(--border)',
            }}
          >
            Log Today&apos;s Data
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div
        className="px-6 md:px-10 py-6"
        style={{ backgroundColor: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map(({ label, value, sub, color, bg, border }) => (
            <div
              key={label}
              className="rounded-xl p-4"
              style={{ backgroundColor: bg, border: `1px solid ${border}`, boxShadow: 'var(--shadow-sm)' }}
            >
              <div className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--ink-3)' }}>
                {label}
              </div>
              <div className="font-display text-2xl font-bold" style={{ color }}>
                {value}
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--ink-3)' }}>{sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="px-6 md:px-10 py-8">
        <h2 className="text-xs font-semibold tracking-widest uppercase mb-5" style={{ color: 'var(--ink-3)' }}>
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              href: '/dashboard',
              icon: TrendingUp,
              title: 'View Dashboard',
              desc: 'Full risk analysis, AI diagnostics, and trend charts for your active flock.',
              accent: '#ea580c',
            },
            {
              href: '/input',
              icon: Shield,
              title: 'Log Daily Data',
              desc: 'Record temperature, feed intake, and mortality count to update the risk score.',
              accent: '#0f172a',
            },
            {
              href: '/chat',
              icon: AlertTriangle,
              title: 'Ask AI',
              desc: 'Get instant answers about flock health and disease prevention in Malay or English.',
              accent: '#d97706',
            },
          ].map(({ href, icon: Icon, title, desc, accent }) => (
            <Link
              key={href}
              href={href}
              className="group rounded-xl p-5 flex flex-col gap-3 transition-shadow hover:shadow-md"
              style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: accent + '15', border: `1px solid ${accent}30` }}
              >
                <Icon size={18} style={{ color: accent }} />
              </div>
              <div>
                <div className="text-sm font-semibold mb-1" style={{ color: 'var(--ink)' }}>{title}</div>
                <div className="text-xs leading-relaxed" style={{ color: 'var(--ink-3)' }}>{desc}</div>
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold mt-auto" style={{ color: accent }}>
                Open <ArrowRight size={12} />
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-auto px-6 md:px-10 py-4" style={{ borderTop: '1px solid var(--border)' }}>
        <p className="text-xs" style={{ color: 'var(--ink-3)' }}>
          Powered by Z.AI GLM · Built for Malaysian poultry farmers · UMHack 2026
        </p>
      </div>
    </div>
  )
}
