// Homepage hero illustration: a launch on the river, a "verified receipt" card and a Naval Police badge
// Pure SVG — no image files needed, works offline
export default function HeroIllustration() {
  return (
    <svg viewBox="0 0 520 420" className="h-auto w-full" role="img" aria-label="A passenger launch on the river with a verified fine receipt">
      <defs>
        <linearGradient id="hi-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1d5a84" stopOpacity=".55" />
          <stop offset="1" stopColor="#0b2f47" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="hi-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a6f9e" />
          <stop offset="1" stopColor="#0f3d5c" />
        </linearGradient>
        <clipPath id="hi-porthole">
          <circle cx="262" cy="214" r="196" />
        </clipPath>
        <linearGradient id="hi-hull" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#dceaf5" />
        </linearGradient>
      </defs>

      {/* round porthole-style frame */}
      <circle cx="262" cy="214" r="204" fill="none" stroke="#5eead4" strokeOpacity=".18" strokeWidth="2" />
      <g clipPath="url(#hi-porthole)">
      <rect x="0" y="0" width="520" height="420" fill="#0b2f47" opacity=".35" />
      {/* sky glow + sun */}
      <circle cx="260" cy="190" r="170" fill="url(#hi-sky)" />
      <circle cx="380" cy="110" r="26" fill="#5eead4" fillOpacity=".18" />
      <circle cx="380" cy="110" r="14" fill="#5eead4" fillOpacity=".45" />

      {/* distant river bank */}
      <path d="M40 262c40-14 70-10 110-16s70-20 120-16 80 18 130 14 60-10 80-8v30H40Z" fill="#154a6e" opacity=".7" />

      {/* launch */}
      <g>
        {/* smoke */}
        <path d="M318 118c8-10 22-10 26-22" fill="none" stroke="#dceaf5" strokeOpacity=".5" strokeWidth="6" strokeLinecap="round" />
        {/* chimney */}
        <rect x="306" y="124" width="18" height="34" rx="3" fill="#f43f5e" />
        <rect x="306" y="132" width="18" height="5" fill="#fff" fillOpacity=".7" />
        {/* upper deck */}
        <rect x="170" y="156" width="190" height="34" rx="6" fill="url(#hi-hull)" />
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <rect key={`u${i}`} x={182 + i * 25} y="165" width="16" height="12" rx="3" fill="#1d5a84" fillOpacity=".75" />
        ))}
        {/* lower deck */}
        <rect x="140" y="190" width="250" height="38" rx="6" fill="#ffffff" />
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <rect key={`l${i}`} x={154 + i * 26} y="200" width="18" height="14" rx="3" fill="#1d5a84" fillOpacity=".85" />
        ))}
        {/* hull */}
        <path d="M112 228h320l-30 40a10 10 0 0 1-8 4H152a10 10 0 0 1-8-4Z" fill="#0f3d5c" />
        <path d="M112 228h320l-6 8H118Z" fill="#5eead4" />
        {/* registration plate */}
        <rect x="236" y="244" width="72" height="16" rx="3" fill="#fff" />
        <text x="272" y="256" textAnchor="middle" fontSize="11" fontWeight="700" fill="#0b2f47" fontFamily="Inter Variable, Inter, sans-serif">
          M-15245
        </text>
      </g>

      {/* river */}
      <path d="M0 262c40 0 60-10 100-10s60 10 100 10 60-10 100-10 60 10 100 10 60-10 100-10 20 5 20 5v164H0Z" fill="url(#hi-water)" />
      <path d="M30 300c20 0 20-6 40-6s20 6 40 6 20-6 40-6 20 6 40 6" fill="none" stroke="#5eead4" strokeOpacity=".5" strokeWidth="3" strokeLinecap="round" />
      <path d="M300 330c20 0 20-6 40-6s20 6 40 6 20-6 40-6 20 6 40 6" fill="none" stroke="#5eead4" strokeOpacity=".35" strokeWidth="3" strokeLinecap="round" />
      <path d="M120 360c20 0 20-6 40-6s20 6 40 6" fill="none" stroke="#dceaf5" strokeOpacity=".25" strokeWidth="3" strokeLinecap="round" />
      {/* launch's reflection on the water */}
      <ellipse cx="272" cy="280" rx="150" ry="8" fill="#071f30" opacity=".35" />
      </g>

      {/* verified receipt card */}
      <g transform="translate(330 300)">
        <rect width="172" height="92" rx="14" fill="#fff" />
        <rect width="172" height="92" rx="14" fill="none" stroke="#0b2f47" strokeOpacity=".08" />
        <circle cx="26" cy="28" r="13" fill="#059669" />
        <path d="m20 28 4.5 4.5L33 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <text x="48" y="25" fontSize="12" fontWeight="700" fill="#0f172a" fontFamily="Inter Variable, Inter, sans-serif">
          Genuine receipt
        </text>
        <text x="48" y="40" fontSize="10" fill="#64748b" fontFamily="Inter Variable, Inter, sans-serif">
          Verified by QR
        </text>
        <rect x="14" y="54" width="144" height="1" fill="#e2e8f0" />
        <text x="14" y="76" fontSize="10" fill="#64748b" fontFamily="Inter Variable, Inter, sans-serif">
          Total paid
        </text>
        <text x="158" y="77" textAnchor="end" fontSize="15" fontWeight="700" fill="#0f172a" fontFamily="Inter Variable, Inter, sans-serif">
          ৳ 20,000
        </text>
      </g>

      {/* Naval Police shield badge */}
      <g transform="translate(40 70)">
        <rect width="118" height="46" rx="23" fill="#fff" fillOpacity=".1" stroke="#fff" strokeOpacity=".2" />
        <path d="M23 12l11 4v8c0 7-4.7 12.6-11 15-6.3-2.4-11-8-11-15v-8Z" fill="#5eead4" />
        <path d="m18 24 3.5 3.5L28 21" fill="none" stroke="#0b2f47" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        <text x="44" y="21" fontSize="10.5" fontWeight="700" fill="#fff" fontFamily="Inter Variable, Inter, sans-serif">
          Naval Police
        </text>
        <text x="44" y="34" fontSize="9.5" fill="#dceaf5" fillOpacity=".75" fontFamily="Inter Variable, Inter, sans-serif">
          e-fine issued
        </text>
      </g>
    </svg>
  )
}
