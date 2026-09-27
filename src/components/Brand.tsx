import { Link } from "@tanstack/react-router";
import logoOrbit from "@/assets/bond-logo-orbit.png";
import logoSeal from "@/assets/bond-logo-seal.png";

export function BrandMark({
  variant = "orbit",
  className = "",
}: {
  variant?: "orbit" | "seal";
  className?: string;
}) {
  const src = variant === "seal" ? logoSeal : logoOrbit;
  return (
    <img
      src={src}
      alt=""
      width={32}
      height={32}
      className={`size-8 object-contain ${className}`}
      aria-hidden="true"
    />
  );
}

export function Brand({
  compact = false,
  inverted = false,
}: {
  compact?: boolean;
  inverted?: boolean;
}) {
  return (
    <Link
      to="/"
      aria-label="BOND — home"
      className={`group inline-flex items-center gap-3 no-underline ${inverted ? "text-hero-foreground" : "text-current"}`}
    >
      <BrandMark />
      {!compact && <span className="font-display text-lg font-bold tracking-tight">BOND</span>}
    </Link>
  );
}

/** SVG wordmark for merch — single-color reproducible mark. */
export function BondSymbolSvg({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="2" />
      <ellipse
        cx="24"
        cy="24"
        rx="22"
        ry="8"
        stroke="currentColor"
        strokeWidth="1.5"
        transform="rotate(-28 24 24)"
      />
      <circle cx="24" cy="24" r="9" fill="currentColor" />
    </svg>
  );
}
