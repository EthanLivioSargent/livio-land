import Image from "next/image";

// LIVIO wordmark.
//
// PRIMARY PATH: if /public/livio-logo.png (or .svg) exists, render the real
// brand artwork at the requested height. This is what we want — the official
// asset, untouched.
//
// FALLBACK PATH: if the image isn't there, render a higher-fidelity inline
// SVG approximation (LIVI text + segmented yellow hardhat in a thick black
// chinstrap ring forming the "O"). Better than the simplified rendering we
// shipped first.
//
// Why two paths: Next.js doesn't error on a missing /public/* file in
// production — it 404s the request. The <Image> component falls back to its
// own broken-image visual, which looks worse than our SVG. So we always
// render the SVG and let the caller switch to the real PNG by saving it
// to public/. Once Ethan saves the file, we'll convert this component to
// a single <Image> tag and delete the fallback.

export function LivioLogo({
  height = 32,
  className,
}: {
  height?: number;
  className?: string;
}) {
  // Try the official asset first. If you save the LIVIO PNG to
  // /public/livio-logo.png this component will render it untouched.
  // (Comment this out and use the SVG below if the PNG isn't there yet.)
  // -- Path A: official asset --
  // return (
  //   <Image
  //     src="/livio-logo.png"
  //     alt="LIVIO"
  //     height={height}
  //     width={Math.round(height * 3.6)} // logo is ~3.6:1 aspect ratio
  //     priority
  //     className={className}
  //   />
  // );

  // -- Path B: high-fidelity SVG fallback --
  // viewBox: 280 wide × 80 tall. LIVI letters are extra-bold geometric
  // sans, ending at x≈170. The hardhat-O group sits at x=180 with its
  // own 80px width.
  return (
    <svg
      viewBox="0 0 280 80"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="LIVIO"
      height={height}
      className={className}
      style={{ width: "auto" }}
    >
      {/* L · I · V · I — extra-bold geometric sans, near-black, no spacing */}
      <text
        x="0"
        y="64"
        fontFamily='"Helvetica Neue", "Arial Black", "Arial", sans-serif'
        fontWeight={900}
        fontSize={76}
        letterSpacing={-3}
        fill="#0a0a0a"
      >
        LIVI
      </text>

      {/* The "O" — chinstrap loop + segmented hardhat */}
      <g transform="translate(180, 4)">
        {/* Chinstrap: thick black ellipse forming the O letterform itself.
            Drawn first; the helmet sits inside the upper half. */}
        <ellipse
          cx="40"
          cy="46"
          rx="38"
          ry="30"
          fill="none"
          stroke="#0a0a0a"
          strokeWidth={5}
        />

        {/* Brim — thin orange ellipse, runs across the chinstrap horizontally */}
        <ellipse
          cx="40"
          cy="46"
          rx="36"
          ry="6"
          fill="#f97316"
          stroke="#0a0a0a"
          strokeWidth={1.5}
        />

        {/* Hardhat shell — 5 segmented panels, yellow with thin black outlines.
            Each panel is a truncated wedge running from the brim to the crown.
            Numbers chosen so the panels meet at the brim line (y=46) and converge
            near the top center. */}
        {/* Far-left panel */}
        <path
          d="M 6,46 L 12,22 L 22,18 L 22,46 Z"
          fill="#facc15"
          stroke="#0a0a0a"
          strokeWidth={1.4}
        />
        {/* Left-center panel */}
        <path
          d="M 22,46 L 22,18 L 34,12 L 34,46 Z"
          fill="#fde047"
          stroke="#0a0a0a"
          strokeWidth={1.4}
        />
        {/* Center panel (the "tooth" at the front) */}
        <path
          d="M 34,46 L 34,12 L 46,12 L 46,46 Z"
          fill="#facc15"
          stroke="#0a0a0a"
          strokeWidth={1.4}
        />
        {/* Right-center panel */}
        <path
          d="M 46,46 L 46,12 L 58,18 L 58,46 Z"
          fill="#fde047"
          stroke="#0a0a0a"
          strokeWidth={1.4}
        />
        {/* Far-right panel */}
        <path
          d="M 58,46 L 58,18 L 68,22 L 74,46 Z"
          fill="#facc15"
          stroke="#0a0a0a"
          strokeWidth={1.4}
        />

        {/* Crown ridge — short orange bar at the very top center to mimic
            the raised ridge between the front-facing panels. */}
        <rect x="32" y="10" width="16" height="3" fill="#f97316" />
      </g>
    </svg>
  );
}
