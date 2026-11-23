import React from 'react';

export function DriftclearTitleLockup() {
  return (
    <svg
      viewBox="0 0 468 160"
      className="w-[336px] sm:w-[436px] lg:w-[468px] h-auto select-none overflow-visible"
      role="img"
      aria-label="DRIFTCLEAR — Alpine Snow-Plowing"
    >
      <defs>
        <linearGradient id="dc-ice-letter" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="52%" stopColor="#e8f3ff" />
          <stop offset="100%" stopColor="#9cc3e8" />
        </linearGradient>
        <linearGradient id="dc-amber-blade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="65%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <linearGradient id="dc-snow-cap" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#d7ebff" />
        </linearGradient>
        <filter id="dc-title-shadow" x="-8%" y="-10%" width="118%" height="135%">
          <feDropShadow dx="0" dy="8" stdDeviation="5" floodColor="#070d17" floodOpacity="0.72" />
        </filter>
      </defs>

      {/* Alpine Peak Crown & Plow Chevron Crest above Wordmark */}
      <g filter="url(#dc-title-shadow)">
        <path
          d="M14 44 L42 10 L62 32 L80 14 L106 44 Z"
          fill="#1b2c42"
          stroke="#f5c156"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        <path d="M42 10 L52 22 L44 25 L37 20 Z" fill="#ffffff" />
        <path d="M80 14 L89 25 L80 27 L74 22 Z" fill="#ffffff" />

        {/* Hazard Plow-Steel Accent Bar */}
        <path
          d="M114 31 H438 L428 44 H114 Z"
          fill="url(#dc-amber-blade)"
          stroke="#0f172a"
          strokeWidth="2"
        />
        <path
          d="M130 31 L122 44 M148 31 L140 44 M166 31 L158 44 M184 31 L176 44"
          stroke="#182230"
          strokeWidth="4.5"
        />
        <text
          x="204"
          y="41"
          fill="#111827"
          fontFamily="'Bricolage Grotesque', system-ui, sans-serif"
          fontWeight="800"
          fontSize="11.5"
          letterSpacing="2.4"
        >
          ALPINE PLOW DIVISION
        </text>
      </g>

      {/* Heavy 3D Extruded Cast-Iron Wordmark Base (exact 424px width lock for snow-cap alignment) */}
      <g filter="url(#dc-title-shadow)">
        {/* Cast-iron extrusion offset */}
        <text
          x="14"
          y="115"
          textLength="424"
          lengthAdjust="spacingAndGlyphs"
          fill="#0b1320"
          stroke="#0b1320"
          strokeWidth="12"
          strokeLinejoin="round"
          paintOrder="stroke fill"
          fontFamily="'Bricolage Grotesque', system-ui, sans-serif"
          fontWeight="800"
          fontSize="74"
        >
          DRIFTCLEAR
        </text>
        {/* Main Ice-Steel Lettering */}
        <text
          x="12"
          y="108"
          textLength="424"
          lengthAdjust="spacingAndGlyphs"
          fill="url(#dc-ice-letter)"
          stroke="#132236"
          strokeWidth="9"
          strokeLinejoin="round"
          paintOrder="stroke fill"
          fontFamily="'Bricolage Grotesque', system-ui, sans-serif"
          fontWeight="800"
          fontSize="74"
        >
          DRIFTCLEAR
        </text>

        {/* Sculpted Snow-Drift Caps Resting Pixel-Aligned Across Tops of DRIFTCLEAR */}
        <path
          d="M16 55 C32 47 56 48 72 54 C86 49 108 50 120 56 C126 60 114 65 98 63 C78 61 58 65 40 63 C22 61 10 60 16 55 Z"
          fill="url(#dc-snow-cap)"
          stroke="#132236"
          strokeWidth="2.2"
        />
        <path
          d="M188 55 C206 47 230 48 248 55 C262 49 286 49 300 56 C306 60 292 65 274 63 C252 61 228 64 208 62 C192 61 182 59 188 55 Z"
          fill="url(#dc-snow-cap)"
          stroke="#132236"
          strokeWidth="2.2"
        />
        <path
          d="M352 55 C370 48 394 48 412 54 C424 51 434 53 438 58 C440 62 426 65 410 63 C392 61 372 64 358 62 C348 61 345 58 352 55 Z"
          fill="url(#dc-snow-cap)"
          stroke="#132236"
          strokeWidth="2.2"
        />
      </g>

      {/* Bottom Angled Plow-Steel Underline & Tagline */}
      <g>
        <path
          d="M14 126 H438 L426 134 H14 Z"
          fill="#d64531"
          stroke="#0f172a"
          strokeWidth="2"
        />
        <path d="M14 126 H142 L136 134 H14 Z" fill="#fbbf24" />
        <text
          x="15"
          y="153"
          fill="#e6f0fa"
          stroke="#0b1320"
          strokeWidth="4.5"
          paintOrder="stroke fill"
          fontFamily="'Plus Jakarta Sans', system-ui, sans-serif"
          fontWeight="700"
          fontSize="12.5"
          letterSpacing="1.8"
        >
          CARVE ROADS · RESCUE CITIZENS · MASTER THE STORM
        </text>
      </g>
    </svg>
  );
}

export function CoinIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" fill="#f5b638" stroke="#1b2636" strokeWidth="2" />
      <circle cx="12" cy="12" r="6.5" fill="#ffd978" stroke="#b45309" strokeWidth="1.2" />
      <path d="M12 7.5 V16.5 M8.5 10 L15.5 14 M15.5 10 L8.5 14" stroke="#92400e" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function SnowflakeIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M12 3 V21 M4.2 7.5 L19.8 16.5 M19.8 7.5 L4.2 16.5"
        stroke="#bae6fd"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="2.5" fill="#f0f9ff" stroke="#1b2636" strokeWidth="1.2" />
    </svg>
  );
}

export function BladeIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M3 16 L7 8 C11 10 15 10 19 8 L21 16 C16 18 8 18 3 16 Z"
        fill="#efb026"
        stroke="#182230"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M5 14.5 C10 16 14 16 19 14.5" stroke="#fef3c7" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function EngineIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="4" y="8" width="14" height="10" rx="2.5" fill="#d64531" stroke="#182230" strokeWidth="1.8" />
      <path d="M8 5 H14 M11 5 V8 M18 11 H21 V15 H18" stroke="#f4ead8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="11" cy="13" r="2.3" fill="#f5c156" />
    </svg>
  );
}

export function FlameCoilIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M12.5 3 C12.5 3 18 7.5 18 13 C18 16.6 15.3 19.5 12 19.5 C8.7 19.5 6 16.6 6 13 C6 10.4 7.6 8.2 8.7 7.1 C8.7 9.4 10 10.6 10.6 10.6 C10.4 8 11.4 5 12.5 3 Z"
        fill="#fb923c"
        stroke="#182230"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M12 12 C13.6 13.5 14 15.8 12 17 C10.2 15.8 10.6 13.5 12 12 Z" fill="#fef08a" />
    </svg>
  );
}

export function ChimeIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M12 4 C8.7 4 6.5 6.5 6.5 10 V14.5 L4.5 17 H19.5 L17.5 14.5 V10 C17.5 6.5 15.3 4 12 4 Z"
        fill="#38bdf8"
        stroke="#182230"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="19.2" r="2.1" fill="#fde047" stroke="#182230" strokeWidth="1.4" />
    </svg>
  );
}

export function SnowBlowerIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="10.5" cy="13.5" r="5.5" fill="#93c5fd" stroke="#182230" strokeWidth="1.8" />
      <circle cx="10.5" cy="13.5" r="2.2" fill="#e0f2fe" stroke="#182230" strokeWidth="1.4" />
      <path
        d="M13 8.5 L17.5 4.5 L20.5 7.5 L16 11.5"
        fill="#d64531"
        stroke="#182230"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M18.5 4 L21.5 3.5 M20.5 9.5 L22.5 10.5" stroke="#e0f2fe" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function NitroTankIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="6.5" y="6" width="11" height="14" rx="4" fill="#f59e0b" stroke="#182230" strokeWidth="1.8" />
      <path d="M9.5 6 V3.5 H14.5 V6" fill="#dce4ee" stroke="#182230" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M13 9 L9.8 13.5 H12.4 L11 17.2 L14.6 12.6 H12 Z" fill="#fef9c3" />
    </svg>
  );
}

export function WrenchIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M14.7 6.3a4.5 4.5 0 0 0-5.8 5.8L4 17l3 3 4.9-4.9a4.5 4.5 0 0 0 5.8-5.8l-2.6 2.6-2.5-.5-.5-2.5 2.6-2.6Z"
        fill="#f5c156"
        stroke="#182230"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SoundIcon({ muted, className = 'w-5 h-5' }: { muted: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M4 9.5 H8 L13 5.5 V18.5 L8 14.5 H4 Z" fill="#f4ead8" stroke="#182230" strokeWidth="1.6" strokeLinejoin="round" />
      {muted ? (
        <path d="M16.5 9.5 L21 14 M21 9.5 L16.5 14" stroke="#f87171" strokeWidth="2.2" strokeLinecap="round" />
      ) : (
        <path d="M16.2 9.2 C17.6 10.6 17.6 13.4 16.2 14.8 M18.8 7 C21.2 9.6 21.2 14.4 18.8 17" stroke="#93c5fd" strokeWidth="2" strokeLinecap="round" fill="none" />
      )}
    </svg>
  );
}

export function PauseIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="6" y="5" width="4.5" height="14" rx="1.2" fill="#f4ead8" stroke="#182230" strokeWidth="1.4" />
      <rect x="13.5" y="5" width="4.5" height="14" rx="1.2" fill="#f4ead8" stroke="#182230" strokeWidth="1.4" />
    </svg>
  );
}

export function RestartIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M19 12a7 7 0 1 1-2.2-5.1L19 9 M19 4.5 V9 H14.5"
        fill="none"
        stroke="#f4ead8"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
