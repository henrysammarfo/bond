import { Link } from "@tanstack/react-router";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" aria-label="BOND home" className="group inline-flex items-center gap-3 text-foreground">
      <span className="relative grid size-8 place-items-center" aria-hidden="true">
        <span className="absolute inset-x-0 top-1 h-2 rounded-sm border-2 border-current" />
        <span className="absolute inset-x-0 top-3 h-2 rounded-sm border-2 border-current" />
        <span className="absolute inset-x-0 top-5 h-2 rounded-sm border-2 border-current" />
      </span>
      {!compact && <span className="font-display text-lg font-bold tracking-normal">BOND</span>}
    </Link>
  );
}