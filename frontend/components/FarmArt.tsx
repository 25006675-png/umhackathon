import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

export function ChickenIcon({ size = 40, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden
      {...rest}
    >
      {/* comb */}
      <path d="M28 12 q2 -5 5 0 q2 -5 5 0 q2 -5 5 0 l0 6 l-15 0 z" fill="#dc2626" />
      {/* body */}
      <path
        d="M18 52 Q14 42 20 34 Q18 22 30 20 Q44 18 48 28 Q52 32 50 40 Q52 48 46 52 Z"
        fill="#fef3c7"
        stroke="#0f172a"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      {/* wing */}
      <path d="M28 36 Q34 30 40 36 Q36 44 28 42 Z" fill="#fde68a" stroke="#0f172a" strokeWidth="1.2" />
      {/* head */}
      <circle cx="42" cy="22" r="6" fill="#fef3c7" stroke="#0f172a" strokeWidth="1.4" />
      <circle cx="44" cy="20" r="0.9" fill="#0f172a" />
      {/* beak */}
      <path d="M47 22 l4 2 l-4 2 z" fill="#f59e0b" stroke="#0f172a" strokeWidth="1" />
      {/* wattle */}
      <path d="M44 26 q1 3 -1 5 q-2 -1 -1 -5 z" fill="#dc2626" />
      {/* legs */}
      <path d="M28 52 l0 6 M38 52 l0 6" stroke="#f59e0b" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M26 58 l4 0 M36 58 l4 0" stroke="#f59e0b" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function ChickIcon({ size = 32, ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden {...rest}>
      <circle cx="24" cy="28" r="14" fill="#fde68a" stroke="#0f172a" strokeWidth="1.4" />
      <circle cx="24" cy="16" r="8" fill="#fde68a" stroke="#0f172a" strokeWidth="1.4" />
      <circle cx="26" cy="14" r="1" fill="#0f172a" />
      <path d="M30 16 l4 1 l-4 2 z" fill="#f59e0b" stroke="#0f172a" strokeWidth="0.8" />
      <path d="M20 42 l0 3 M28 42 l0 3" stroke="#f59e0b" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

export function EggIcon({ size = 24, ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden {...rest}>
      <path d="M16 3 C10 3 5 12 5 20 C5 26 9 30 16 30 C23 30 27 26 27 20 C27 12 22 3 16 3 Z" fill="#fdf8f1" stroke="#0f172a" strokeWidth="1.4" />
      <path d="M10 14 q3 -2 6 0" stroke="#d4a24c" strokeWidth="1" fill="none" opacity="0.7" />
      <path d="M12 20 q4 -2 8 0" stroke="#d4a24c" strokeWidth="1" fill="none" opacity="0.7" />
    </svg>
  )
}

export function WheatIcon({ size = 32, ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 64" fill="none" aria-hidden {...rest}>
      <path d="M24 60 L24 18" stroke="#8b5a2b" strokeWidth="1.8" strokeLinecap="round" />
      {[0, 1, 2, 3, 4].map((i) => {
        const y = 20 + i * 7
        return (
          <g key={i}>
            <path d={`M24 ${y} q-7 -3 -10 -8 q5 0 10 4 z`} fill="#d4a24c" stroke="#8b5a2b" strokeWidth="1" />
            <path d={`M24 ${y} q7 -3 10 -8 q-5 0 -10 4 z`} fill="#e2b860" stroke="#8b5a2b" strokeWidth="1" />
          </g>
        )
      })}
      <path d="M24 14 q-3 -6 -8 -8 q0 6 8 10 z" fill="#d4a24c" stroke="#8b5a2b" strokeWidth="1" />
      <path d="M24 14 q3 -6 8 -8 q0 6 -8 10 z" fill="#e2b860" stroke="#8b5a2b" strokeWidth="1" />
    </svg>
  )
}

export function BarnIcon({ size = 48, ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 64" fill="none" aria-hidden {...rest}>
      <path d="M8 56 L8 28 L40 8 L72 28 L72 56 Z" fill="#b1442c" stroke="#0f172a" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M8 28 L40 8 L72 28" stroke="#0f172a" strokeWidth="1.6" fill="none" />
      {/* door */}
      <rect x="32" y="36" width="16" height="20" fill="#fdf8f1" stroke="#0f172a" strokeWidth="1.4" />
      <path d="M40 36 L40 56 M32 46 L48 46" stroke="#0f172a" strokeWidth="1.2" />
      {/* windows */}
      <rect x="16" y="34" width="8" height="8" fill="#fde68a" stroke="#0f172a" strokeWidth="1.2" />
      <rect x="56" y="34" width="8" height="8" fill="#fde68a" stroke="#0f172a" strokeWidth="1.2" />
      {/* hay loft window */}
      <path d="M36 18 L44 18 L44 24 L36 24 Z" fill="#fde68a" stroke="#0f172a" strokeWidth="1.2" />
    </svg>
  )
}

export function FeatherIcon({ size = 24, ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden {...rest}>
      <path d="M8 26 L22 10 Q28 6 28 14 Q26 22 16 24 Q10 26 8 26 Z" fill="#fde68a" stroke="#0f172a" strokeWidth="1.2" />
      <path d="M8 26 L22 10" stroke="#0f172a" strokeWidth="1.2" />
    </svg>
  )
}

/** A horizontal pastoral scene: barn + sun + chickens + wheat tufts. Pure SVG, no deps. */
export function FarmSceneHero({
  className,
  style,
  preserveAspectRatio = 'xMidYMid meet',
}: {
  className?: string
  style?: React.CSSProperties
  preserveAspectRatio?: string
}) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 520 220"
      preserveAspectRatio={preserveAspectRatio}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {/* sky gradient */}
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="100%" stopColor="#fdf8f1" />
        </linearGradient>
        <linearGradient id="grass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9dc183" />
          <stop offset="100%" stopColor="#6b8e4e" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="520" height="180" fill="url(#sky)" />
      {/* sun */}
      <circle cx="80" cy="50" r="22" fill="#fbbf24" />
      <circle cx="80" cy="50" r="28" fill="#fbbf24" opacity="0.2" />
      {/* clouds */}
      <g fill="#ffffff" opacity="0.8">
        <ellipse cx="200" cy="40" rx="22" ry="8" />
        <ellipse cx="215" cy="35" rx="14" ry="7" />
        <ellipse cx="360" cy="55" rx="20" ry="7" />
        <ellipse cx="378" cy="52" rx="12" ry="6" />
      </g>
      {/* distant hills */}
      <path d="M0 160 Q110 120 220 150 Q340 180 520 140 L520 180 L0 180 Z" fill="#b7d09d" opacity="0.6" />
      {/* grass */}
      <rect x="0" y="180" width="520" height="40" fill="url(#grass)" />
      {/* fence */}
      <g stroke="#8b5a2b" strokeWidth="2" fill="none">
        <path d="M20 190 L20 210 M60 188 L60 210 M100 190 L100 210" />
        <path d="M10 196 L110 196 M10 204 L110 204" />
      </g>
      {/* barn */}
      <g transform="translate(330,85)">
        <path d="M0 95 L0 35 L55 0 L110 35 L110 95 Z" fill="#b1442c" stroke="#0f172a" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M0 35 L55 0 L110 35" stroke="#0f172a" strokeWidth="1.6" fill="none" />
        {/* plank lines */}
        <path d="M0 55 L110 55 M0 75 L110 75" stroke="#7a2e1c" strokeWidth="1" opacity="0.7" />
        {/* door */}
        <rect x="44" y="55" width="22" height="40" fill="#fdf8f1" stroke="#0f172a" strokeWidth="1.4" />
        <path d="M55 55 L55 95 M44 74 L66 74" stroke="#0f172a" strokeWidth="1" />
        {/* windows */}
        <rect x="14" y="52" width="14" height="14" fill="#fde68a" stroke="#0f172a" strokeWidth="1.2" />
        <rect x="82" y="52" width="14" height="14" fill="#fde68a" stroke="#0f172a" strokeWidth="1.2" />
        <path d="M45 18 L65 18 L65 30 L45 30 Z" fill="#fde68a" stroke="#0f172a" strokeWidth="1.2" />
      </g>
      {/* chickens in foreground */}
      <g transform="translate(140,165) scale(0.7)">
        <ChickenInlineBody />
      </g>
      <g transform="translate(215,170) scale(0.55)">
        <ChickenInlineBody />
      </g>
      <g transform="translate(275,175) scale(0.45)">
        <ChickenInlineBody />
      </g>
      {/* wheat tufts */}
      <g transform="translate(12,160)">
        <WheatInline />
      </g>
      <g transform="translate(480,158)">
        <WheatInline />
      </g>
    </svg>
  )
}

function ChickenInlineBody() {
  return (
    <g>
      <path d="M20 8 q2 -6 5 0 q2 -6 5 0 q2 -6 5 0 l0 5 l-15 0 z" fill="#dc2626" />
      <path
        d="M8 38 Q4 28 12 22 Q10 12 24 10 Q38 8 42 18 Q46 22 44 30 Q46 38 40 42 Z"
        fill="#fef3c7"
        stroke="#0f172a"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M18 26 Q24 20 32 26 Q28 32 18 30 Z" fill="#fde68a" stroke="#0f172a" strokeWidth="1.2" />
      <circle cx="36" cy="16" r="6" fill="#fef3c7" stroke="#0f172a" strokeWidth="1.4" />
      <circle cx="38" cy="14" r="0.9" fill="#0f172a" />
      <path d="M41 16 l4 2 l-4 2 z" fill="#f59e0b" stroke="#0f172a" strokeWidth="1" />
      <path d="M18 42 l0 6 M28 42 l0 6" stroke="#f59e0b" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M16 48 l4 0 M26 48 l4 0" stroke="#f59e0b" strokeWidth="1.6" strokeLinecap="round" />
    </g>
  )
}

function WheatInline() {
  return (
    <g>
      <path d="M8 28 L8 0" stroke="#8b5a2b" strokeWidth="1.4" strokeLinecap="round" />
      {[0, 1, 2].map((i) => {
        const y = 4 + i * 6
        return (
          <g key={i}>
            <path d={`M8 ${y} q-5 -2 -7 -6 q4 0 7 3 z`} fill="#d4a24c" stroke="#8b5a2b" strokeWidth="0.8" />
            <path d={`M8 ${y} q5 -2 7 -6 q-4 0 -7 3 z`} fill="#e2b860" stroke="#8b5a2b" strokeWidth="0.8" />
          </g>
        )
      })}
    </g>
  )
}
