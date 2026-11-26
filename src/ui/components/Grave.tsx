/**
 * Grave — Task 13.1
 *
 * Each settled grave is a <button> (click handler added in Task 13.2).
 * Every verdict has a distinct inline SVG silhouette (~96px tall) so the
 * verdict is never conveyed by color alone (FR-8.2).
 *
 * Shapes:
 *   DEAD    — tombstone with RIP inscription
 *   DYING   — floating ghost
 *   ALIVE   — leafy tree
 *   UNKNOWN — low mound with fog wisps
 *   pending — shovel stuck in a dirt mound
 */

import type { DependencyInput, PackageReport } from '../../types';

export interface GraveProps {
  input: DependencyInput;
  report: PackageReport | null;
}

/* ------------------------------------------------------------------
   SVG silhouettes
   All drawn on a 72×96 viewBox, filled with the verdict accent colour
   via currentColor so they respond to the tile's CSS color.
------------------------------------------------------------------ */

/** DEAD — classic arch tombstone with "RIP" */
function TombstoneSVG() {
  return (
    <svg
      width="72"
      height="96"
      viewBox="0 0 72 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      {/* Stone body: rounded top arch */}
      <path
        d="M12 40 Q12 8 36 8 Q60 8 60 40 L60 84 Q60 88 56 88 L16 88 Q12 88 12 84 Z"
        fill="currentColor"
        opacity="0.85"
      />
      {/* Cross on top */}
      <rect x="33" y="14" width="6" height="22" rx="1" fill="rgba(7,7,26,0.55)" />
      <rect x="24" y="21" width="24" height="6" rx="1" fill="rgba(7,7,26,0.55)" />
      {/* RIP text band */}
      <rect x="20" y="50" width="32" height="18" rx="2" fill="rgba(7,7,26,0.3)" />
      <text
        x="36"
        y="63"
        textAnchor="middle"
        fontSize="11"
        fontWeight="bold"
        fontFamily="Georgia, serif"
        fill="rgba(7,7,26,0.75)"
        letterSpacing="1"
      >
        RIP
      </text>
      {/* Ground line */}
      <rect x="6" y="88" width="60" height="6" rx="2" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

/** DYING — classic sheet ghost with hollow eyes, floating upward */
function GhostSVG() {
  return (
    <svg
      width="72"
      height="96"
      viewBox="0 0 72 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      className="grave__ghost"
    >
      {/* Body: rounded top, wavy bottom hem */}
      <path
        d="
          M20 52
          Q20 18 36 18
          Q52 18 52 52
          L52 78
          Q47 72 42 78
          Q38 72 36 78
          Q34 72 30 78
          Q25 72 20 78
          Z
        "
        fill="currentColor"
        opacity="0.85"
      />
      {/* Left eye */}
      <ellipse cx="29" cy="52" rx="4" ry="5" fill="rgba(7,7,26,0.75)" />
      {/* Right eye */}
      <ellipse cx="43" cy="52" rx="4" ry="5" fill="rgba(7,7,26,0.75)" />
      {/* Mouth — jagged grimace */}
      <path
        d="M28 63 Q31 67 34 63 Q36 67 38 63 Q41 67 44 63"
        stroke="rgba(7,7,26,0.75)"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      {/* Faint shadow below */}
      <ellipse cx="36" cy="90" rx="14" ry="4" fill="currentColor" opacity="0.25" />
    </svg>
  );
}

/** ALIVE — leafy tree with roots */
function TreeSVG() {
  return (
    <svg
      width="72"
      height="96"
      viewBox="0 0 72 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      {/* Trunk */}
      <rect x="31" y="60" width="10" height="28" rx="3" fill="currentColor" opacity="0.8" />
      {/* Roots */}
      <path d="M31 84 Q22 90 16 92" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.7" fill="none" />
      <path d="M41 84 Q50 90 56 92" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.7" fill="none" />
      {/* Bottom foliage tier */}
      <ellipse cx="36" cy="58" rx="22" ry="16" fill="currentColor" opacity="0.75" />
      {/* Middle foliage tier */}
      <ellipse cx="36" cy="42" rx="17" ry="14" fill="currentColor" opacity="0.85" />
      {/* Top foliage tier */}
      <ellipse cx="36" cy="26" rx="12" ry="12" fill="currentColor" opacity="0.9" />
      {/* Highlight dots */}
      <circle cx="30" cy="30" r="2" fill="rgba(255,255,255,0.18)" />
      <circle cx="42" cy="46" r="2.5" fill="rgba(255,255,255,0.14)" />
    </svg>
  );
}

/** UNKNOWN — low burial mound with three fog wisps */
function MoundSVG() {
  return (
    <svg
      width="72"
      height="96"
      viewBox="0 0 72 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      {/* Fog wisps (top) */}
      <path
        d="M18 44 Q22 38 28 44 Q34 38 40 44 Q46 38 54 44"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        opacity="0.45"
      />
      <path
        d="M12 54 Q18 46 26 54 Q34 46 42 54 Q50 46 60 54"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        opacity="0.3"
      />
      {/* Mound body */}
      <path
        d="M6 88 Q10 64 36 62 Q62 64 66 88 Z"
        fill="currentColor"
        opacity="0.8"
      />
      {/* Ground line */}
      <rect x="4" y="87" width="64" height="6" rx="2" fill="currentColor" opacity="0.5" />
      {/* Question mark — eroded, barely visible */}
      <text
        x="36"
        y="84"
        textAnchor="middle"
        fontSize="13"
        fontWeight="bold"
        fontFamily="Georgia, serif"
        fill="rgba(7,7,26,0.5)"
      >
        ?
      </text>
    </svg>
  );
}

/** Pending — shovel stuck in a dirt mound ("digging...") */
function ShovelSVG() {
  return (
    <svg
      width="72"
      height="96"
      viewBox="0 0 72 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      {/* Dirt mound */}
      <path
        d="M6 90 Q12 72 36 70 Q60 72 66 90 Z"
        fill="rgba(245,240,216,0.15)"
      />
      <rect x="4" y="89" width="64" height="5" rx="2" fill="rgba(245,240,216,0.12)" />
      {/* Shovel handle */}
      <line x1="44" y1="20" x2="34" y2="72" stroke="rgba(245,240,216,0.55)" strokeWidth="4" strokeLinecap="round" />
      {/* Shovel blade */}
      <path
        d="M28 65 Q22 72 24 80 Q28 86 34 83 Q42 78 44 70 Z"
        fill="rgba(245,240,216,0.45)"
      />
      {/* Handle grip */}
      <rect x="40" y="17" width="10" height="5" rx="2" fill="rgba(245,240,216,0.45)" transform="rotate(-30 44 20)" />
    </svg>
  );
}

/* ------------------------------------------------------------------
   Grave component
------------------------------------------------------------------ */

export function Grave({ input, report }: GraveProps) {
  const name = input.name;

  // Pending slot: not a button yet, no report
  if (report === null) {
    return (
      <div className="grave grave--pending" aria-label={`${name}: digging`}>
        <span className="grave__shape" aria-hidden="true">
          <ShovelSVG />
        </span>
        <span className="grave__name" title={name}>
          {name}
        </span>
        <span className="grave__verdict grave__verdict--pending">digging...</span>
      </div>
    );
  }

  const verdict = report.verdict.toLowerCase() as 'dead' | 'dying' | 'alive' | 'unknown';

  const shapeMap: Record<typeof verdict, React.ReactNode> = {
    dead:    <TombstoneSVG />,
    dying:   <GhostSVG />,
    alive:   <TreeSVG />,
    unknown: <MoundSVG />,
  };

  return (
    <button
      type="button"
      className={`grave grave--${verdict}`}
      aria-label={`${name}: ${verdict}`}
    >
      <span className="grave__shape" aria-hidden="true">
        {shapeMap[verdict]}
      </span>
      <span className="grave__name" title={name}>
        {name}
      </span>
      <span className={`grave__verdict verdict-${verdict}`}>{verdict}</span>
    </button>
  );
}
