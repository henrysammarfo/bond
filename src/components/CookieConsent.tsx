import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";

const KEY = "bond_cookie_consent_v1";

/**
 * Minimal cookie consent — essential session cookie always on;
 * optional analytics only if accepted and VITE_PUBLIC_ANALYTICS_ID is set.
 */
export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);
  if (!visible) return null;
  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 p-4 shadow-lg backdrop-blur md:p-5"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <p className="text-sm leading-6 text-muted-foreground">
          We use an essential httpOnly session cookie to keep you signed in. Optional analytics stay
          off until you accept. See our{" "}
          <Link to="/privacy" className="text-primary underline">
            Privacy policy
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            className="h-10 rounded-md border border-border px-4 text-sm font-medium"
            onClick={() => {
              localStorage.setItem(KEY, "essential");
              setVisible(false);
            }}
          >
            Essential only
          </button>
          <button
            type="button"
            className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground"
            onClick={() => {
              localStorage.setItem(KEY, "all");
              setVisible(false);
            }}
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
