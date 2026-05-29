import Image from "next/image";

type Props = {
  className?: string;
  /**
   * Optional image override. Drop a polished plank illustration into
   * `plank-pro/public/` (e.g. `public/plank-hero.png`) and pass the public
   * path here ("/plank-hero.png") — the component will render the image
   * instead of the SVG fallback below. No other code changes needed.
   */
  imageSrc?: string;
  /**
   * Render variant:
   *  - "viewfinder": dashed camera frame, used inside the /record intro card
   *  - "hero": no frame, larger composition with gradient floor, used on /
   */
  variant?: "viewfinder" | "hero";
};

export default function PlankIllustration({
  className,
  imageSrc,
  variant = "viewfinder",
}: Props) {
  if (imageSrc) {
    return (
      <Image
        src={imageSrc}
        alt="Side-on view of a plank pose"
        width={variant === "hero" ? 960 : 480}
        height={variant === "hero" ? 560 : 240}
        className={className}
        priority={variant === "hero"}
      />
    );
  }
  return <AnimatedPlankSvg className={className} variant={variant} />;
}

function AnimatedPlankSvg({
  className,
  variant,
}: {
  className?: string;
  variant: "viewfinder" | "hero";
}) {
  const isHero = variant === "hero";
  const viewBoxH = isHero ? 280 : 240;
  // Vertical offsets shift the figure down a touch in the hero variant so
  // there's more headroom for the gradient floor.
  const bodyY = isHero ? 18 : 0;

  return (
    <svg
      viewBox={`0 0 480 ${viewBoxH}`}
      role="img"
      aria-label="Side profile of a plank with shoulder, hip and ankle keypoints highlighted"
      className={className}
    >
      <defs>
        <linearGradient id="plank-body-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="rgb(186 230 253)" />
          <stop offset="0.5" stopColor="rgb(56 189 248)" />
          <stop offset="1" stopColor="rgb(2 132 199)" />
        </linearGradient>
        <linearGradient id="plank-floor-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="rgb(24 24 27)" stopOpacity="0" />
          <stop offset="1" stopColor="rgb(24 24 27)" stopOpacity="0.9" />
        </linearGradient>
        <linearGradient id="plank-scan-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="rgb(56 189 248)" stopOpacity="0" />
          <stop offset="0.5" stopColor="rgb(125 211 252)" stopOpacity="0.55" />
          <stop offset="1" stopColor="rgb(56 189 248)" stopOpacity="0" />
        </linearGradient>
        <filter id="plank-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Frame (viewfinder variant only) */}
      {!isHero && (
        <rect
          x="6"
          y="6"
          width="468"
          height={viewBoxH - 12}
          rx="16"
          fill="none"
          stroke="rgb(63 63 70)"
          strokeWidth="2"
          strokeDasharray="6 4"
        />
      )}
      {/* Hero variant frame + floor fade */}
      {isHero && (
        <>
          <rect
            x="6"
            y="6"
            width="468"
            height={viewBoxH - 12}
            rx="20"
            fill="rgb(9 9 11)"
            stroke="rgb(39 39 42)"
            strokeWidth="1.5"
          />
          <rect
            x="6"
            y={viewBoxH - 100}
            width="468"
            height="94"
            rx="20"
            fill="url(#plank-floor-fade)"
          />
        </>
      )}

      {/* Floor + shadow */}
      <ellipse
        cx="245"
        cy={viewBoxH - 18 + bodyY}
        rx="195"
        ry="3.5"
        fill="rgb(0 0 0)"
        opacity="0.4"
      />
      <line
        x1="30"
        y1={viewBoxH - 20 + bodyY}
        x2="450"
        y2={viewBoxH - 20 + bodyY}
        stroke="rgb(82 82 91)"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Camera scan-line sweep (subtle, top-to-bottom motion across body) */}
      <g
        className="animate-scan-sweep"
        style={{ transformOrigin: "center", transformBox: "view-box" }}
      >
        <rect
          x="-20"
          y={70 + bodyY}
          width="80"
          height={isHero ? 100 : 80}
          fill="url(#plank-scan-grad)"
        />
      </g>

      {/* Person silhouette — wrapped in a group that breathes */}
      <g
        className="animate-breathe"
        style={{ transformOrigin: "center", transformBox: "view-box" }}
        filter="url(#plank-glow)"
      >
        <g
          stroke="url(#plank-body-grad)"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle
            cx="84"
            cy={100 + bodyY}
            r={isHero ? 24 : 22}
            fill="url(#plank-body-grad)"
            stroke="none"
          />
          <line
            x1="110"
            y1={116 + bodyY}
            x2="368"
            y2={130 + bodyY}
            strokeWidth={isHero ? 40 : 36}
          />
          <line
            x1="124"
            y1={128 + bodyY}
            x2="128"
            y2={196 + bodyY}
            strokeWidth={isHero ? 24 : 22}
          />
          <line
            x1="122"
            y1={206 + bodyY}
            x2="188"
            y2={215 + bodyY}
            strokeWidth={isHero ? 22 : 20}
          />
          <line
            x1="370"
            y1={134 + bodyY}
            x2="424"
            y2={212 + bodyY}
            strokeWidth={isHero ? 24 : 22}
          />
        </g>
      </g>

      {/* Keypoint markers — pulse ring + filled dot per joint, staggered. */}
      <g fontFamily="ui-sans-serif, system-ui, sans-serif">
        <Keypoint
          cx={112}
          cy={116 + bodyY}
          label="shoulder"
          labelY={50}
          delay="0ms"
          isHero={isHero}
        />
        <Keypoint
          cx={238}
          cy={123 + bodyY}
          label="hip"
          labelY={50}
          delay="500ms"
          isHero={isHero}
        />
        <Keypoint
          cx={365}
          cy={131 + bodyY}
          label="ankle"
          labelY={50}
          delay="1000ms"
          isHero={isHero}
        />
      </g>
    </svg>
  );
}

function Keypoint({
  cx,
  cy,
  label,
  labelY,
  delay,
  isHero,
}: {
  cx: number;
  cy: number;
  label: string;
  labelY: number;
  delay: string;
  isHero: boolean;
}) {
  return (
    <g>
      <line
        x1={cx}
        y1={labelY + 8}
        x2={cx}
        y2={cy - 10}
        stroke="rgb(250 204 21)"
        strokeWidth="1.5"
        strokeDasharray="2 3"
      />
      <text
        x={cx}
        y={labelY}
        textAnchor="middle"
        fontSize={isHero ? 14 : 13}
        fontWeight="700"
        fill="rgb(250 204 21)"
      >
        {label}
      </text>
      {/* Outer pulsing ring */}
      <circle
        className="animate-pulse-ring"
        style={{ animationDelay: delay }}
        cx={cx}
        cy={cy}
        r="8"
        fill="rgb(250 204 21)"
        opacity="0.6"
      />
      {/* Inner solid dot */}
      <circle
        className="animate-pulse-keypoint"
        style={{ animationDelay: delay }}
        cx={cx}
        cy={cy}
        r={isHero ? 8 : 7}
        fill="rgb(250 204 21)"
        stroke="rgb(9 9 11)"
        strokeWidth="2.5"
      />
    </g>
  );
}
