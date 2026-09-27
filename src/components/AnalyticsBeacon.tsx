/**
 * Optional privacy-friendly analytics. Loads only when:
 * - VITE_PUBLIC_ANALYTICS_ID is set
 * - cookie consent = "all"
 * Never put API secrets in VITE_*.
 */
import { useEffect } from "react";

export function AnalyticsBeacon() {
  useEffect(() => {
    const id = import.meta.env.VITE_PUBLIC_ANALYTICS_ID as string | undefined;
    if (!id) return;
    try {
      if (localStorage.getItem("bond_cookie_consent_v1") !== "all") return;
    } catch {
      return;
    }
    // Plausible-compatible stub — host configures the script URL via env if desired.
    const s = document.createElement("script");
    s.defer = true;
    s.dataset.domain = id;
    s.src = "https://plausible.io/js/script.js";
    document.head.appendChild(s);
  }, []);
  return null;
}
