/**
 * SpookyScene — full-viewport backdrop (Task 10.1)
 *
 * Renders:
 *   - night sky gradient + stars (pure CSS via .scene)
 *   - full moon with glow (CSS)
 *   - fence silhouette + bare trees (inline SVG, left and right edges)
 *   - drifting fog layers (CSS)
 *   - ground band (CSS)
 *
 * All motion animations are gated behind `prefers-reduced-motion: no-preference`
 * in theme.css (FR-8.3). This component has no interactive elements and is
 * aria-hidden so screen readers skip it entirely.
 */
export function SpookyScene() {
  return (
    <div className="scene" aria-hidden="true">
      {/* Moon */}
      <div className="scene__moon" />

      {/* Left-edge silhouette: fence + bare tree */}
      <svg
        className="scene__silhouette scene__silhouette--left"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 220 300"
        preserveAspectRatio="xMinYMax meet"
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: 'clamp(140px, 18vw, 260px)',
          height: 'auto',
          fill: 'var(--color-silhouette)',
        }}
      >
        {/* Bare tree — left */}
        <g>
          {/* Trunk */}
          <rect x="38" y="80" width="12" height="180" rx="4" />
          {/* Main branches */}
          <line x1="44" y1="130" x2="10"  y2="90"  stroke="var(--color-silhouette)" strokeWidth="7" strokeLinecap="round" />
          <line x1="44" y1="110" x2="80"  y2="68"  stroke="var(--color-silhouette)" strokeWidth="6" strokeLinecap="round" />
          <line x1="44" y1="150" x2="6"   y2="128" stroke="var(--color-silhouette)" strokeWidth="5" strokeLinecap="round" />
          <line x1="44" y1="145" x2="82"  y2="118" stroke="var(--color-silhouette)" strokeWidth="5" strokeLinecap="round" />
          {/* Sub-branches left */}
          <line x1="10"  y1="90"  x2="-4"  y2="72"  stroke="var(--color-silhouette)" strokeWidth="4" strokeLinecap="round" />
          <line x1="10"  y1="90"  x2="22"  y2="72"  stroke="var(--color-silhouette)" strokeWidth="4" strokeLinecap="round" />
          {/* Sub-branches right */}
          <line x1="80"  y1="68"  x2="68"  y2="48"  stroke="var(--color-silhouette)" strokeWidth="4" strokeLinecap="round" />
          <line x1="80"  y1="68"  x2="96"  y2="52"  stroke="var(--color-silhouette)" strokeWidth="3" strokeLinecap="round" />
          <line x1="80"  y1="68"  x2="88"  y2="80"  stroke="var(--color-silhouette)" strokeWidth="3" strokeLinecap="round" />
        </g>

        {/* Fence — left side */}
        <g>
          {/* Top rail */}
          <rect x="0" y="222" width="220" height="8" rx="2" />
          {/* Bottom rail */}
          <rect x="0" y="246" width="220" height="6" rx="2" />
          {/* Pickets */}
          {[0, 24, 48, 72, 96, 120, 144, 168, 192].map((x) => (
            <g key={x}>
              <rect x={x + 6} y="210" width="12" height="52" rx="2" />
              {/* Pointed top */}
              <polygon points={`${x + 6},210 ${x + 12},198 ${x + 18},210`} />
            </g>
          ))}
        </g>
      </svg>

      {/* Right-edge silhouette: fence + bare tree */}
      <svg
        className="scene__silhouette scene__silhouette--right"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 220 300"
        preserveAspectRatio="xMaxYMax meet"
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: 'clamp(140px, 18vw, 260px)',
          height: 'auto',
          fill: 'var(--color-silhouette)',
          transform: 'scaleX(-1)', /* mirror to make it a right-side tree */
        }}
      >
        {/* Bare tree — mirrored */}
        <g>
          <rect x="38" y="80" width="12" height="180" rx="4" />
          <line x1="44" y1="120" x2="8"   y2="80"  stroke="var(--color-silhouette)" strokeWidth="7" strokeLinecap="round" />
          <line x1="44" y1="105" x2="84"  y2="62"  stroke="var(--color-silhouette)" strokeWidth="6" strokeLinecap="round" />
          <line x1="44" y1="145" x2="4"   y2="122" stroke="var(--color-silhouette)" strokeWidth="5" strokeLinecap="round" />
          <line x1="44" y1="140" x2="86"  y2="115" stroke="var(--color-silhouette)" strokeWidth="5" strokeLinecap="round" />
          <line x1="8"  y1="80"  x2="-6"  y2="62"  stroke="var(--color-silhouette)" strokeWidth="4" strokeLinecap="round" />
          <line x1="8"  y1="80"  x2="20"  y2="62"  stroke="var(--color-silhouette)" strokeWidth="4" strokeLinecap="round" />
          <line x1="84" y1="62"  x2="72"  y2="42"  stroke="var(--color-silhouette)" strokeWidth="4" strokeLinecap="round" />
          <line x1="84" y1="62"  x2="100" y2="46"  stroke="var(--color-silhouette)" strokeWidth="3" strokeLinecap="round" />
          <line x1="84" y1="62"  x2="94"  y2="76"  stroke="var(--color-silhouette)" strokeWidth="3" strokeLinecap="round" />
        </g>

        {/* Fence */}
        <g>
          <rect x="0" y="222" width="220" height="8" rx="2" />
          <rect x="0" y="246" width="220" height="6" rx="2" />
          {[0, 24, 48, 72, 96, 120, 144, 168, 192].map((x) => (
            <g key={x}>
              <rect x={x + 6} y="210" width="12" height="52" rx="2" />
              <polygon points={`${x + 6},210 ${x + 12},198 ${x + 18},210`} />
            </g>
          ))}
        </g>
      </svg>

      {/* Fog layers */}
      <div className="scene__fog" aria-hidden="true">
        <div className="scene__fog-layer scene__fog-layer--1" />
        <div className="scene__fog-layer scene__fog-layer--2" />
        <div className="scene__fog-layer scene__fog-layer--3" />
      </div>

      {/* Ground darkening band */}
      <div className="scene__ground" />
    </div>
  );
}
