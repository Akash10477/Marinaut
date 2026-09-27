// MARINAUT logo: a vessel with waves inside a shield (compliance / verification)
// <LogoMark size={36} />  -> icon only
// <Logo />                -> icon + "MARINAUT" wordmark + tagline

import { BRAND, TAGLINE } from '../brand'

export function LogoMark({ size = 36, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} role="img" aria-label={`${BRAND} logo`}>
      <defs>
        <linearGradient id="marinaut-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1d5a84" />
          <stop offset="1" stopColor="#071f30" />
        </linearGradient>
      </defs>
      {/* shield */}
      <path d="M24 3 41 9v13c0 11-7.3 19.6-17 23C14.3 41.6 7 33 7 22V9l17-6Z" fill="url(#marinaut-bg)" />
      <path d="M24 3 41 9v13c0 11-7.3 19.6-17 23C14.3 41.6 7 33 7 22V9l17-6Z" fill="none" stroke="#5eead4" strokeOpacity=".75" strokeWidth="1.6" />
      {/* mast + flag */}
      <path d="M22 12v11" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      <path d="M22.5 12.5 29 16l-6.5 3.2Z" fill="#5eead4" />
      {/* hull */}
      <path d="M13.5 24h21l-3.2 5.2a2 2 0 0 1-1.7.9H18.4a2 2 0 0 1-1.7-.9L13.5 24Z" fill="#fff" />
      {/* waves */}
      <path d="M12 33.5c2 0 2-1.3 4-1.3s2 1.3 4 1.3 2-1.3 4-1.3 2 1.3 4 1.3 2-1.3 4-1.3 2 1.3 4 1.3" fill="none" stroke="#5eead4" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M15 37.5c1.8 0 1.8-1.1 3.6-1.1s1.8 1.1 3.6 1.1 1.8-1.1 3.6-1.1 1.8 1.1 3.6 1.1 1.8-1.1 3.6-1.1" fill="none" stroke="#5eead4" strokeOpacity=".55" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

// tone="light" -> for dark backgrounds (white text), tone="dark" -> for light backgrounds
export default function Logo({ size = 36, tone = 'dark', subtitle = true }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={size} />
      <span className="leading-tight">
        <span className={`block text-[15px] font-extrabold tracking-[0.12em] ${tone === 'light' ? 'text-white' : 'text-navy-950'}`}>
          {BRAND}
        </span>
        {subtitle && (
          <span className={`block text-[11px] ${tone === 'light' ? 'text-navy-200/70' : 'text-slate-500'}`}>{TAGLINE}</span>
        )}
      </span>
    </span>
  )
}
