'use client'

interface Props {
  enabled: boolean
  onToggle: (val: boolean) => void
}

export default function GLMToggle({ enabled, onToggle }: Props) {
  return (
    <div
      className="rounded-xl px-4 py-3.5 flex items-center justify-between"
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div>
        <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
          AI Analysis (GLM)
        </div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--ink-3)' }}>
          {enabled ? 'Active — diagnostics & recommendations shown' : 'Off — numbers only'}
        </div>
      </div>
      <button
        onClick={() => onToggle(!enabled)}
        className="relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ml-4"
        style={{ backgroundColor: enabled ? '#16a34a' : '#cbd5e1' }}
        aria-label={enabled ? 'Disable AI analysis' : 'Enable AI analysis'}
      >
        <span
          className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200"
          style={{ left: '2px', transform: enabled ? 'translateX(20px)' : 'translateX(0)' }}
        />
      </button>
    </div>
  )
}
