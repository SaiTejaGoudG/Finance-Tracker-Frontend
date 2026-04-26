/**
 * Central API configuration.
 *
 * To change the backend URL, update NEXT_PUBLIC_API_URL in .env.local
 * (or .env.development.local / .env.production.local).
 *
 * The variable MUST be prefixed with NEXT_PUBLIC_ so Next.js exposes
 * it to the browser bundle.
 */
export const BASE_URL =
  // process.env.NEXT_PUBLIC_API_URL ||
  // "https://finance-tracker-backend-kuh4.onrender.com/api";
  "http://localhost:9000/api";

/**
 * Build a full API URL from a relative path.
 *
 * @example
 *   apiUrl("dashboard")                 → "https://.../api/dashboard"
 *   apiUrl("transaction/listing", params) → "https://.../api/transaction/listing?month=4&year=2025"
 *
 * @param path    Endpoint path WITHOUT leading slash (e.g. "dashboard")
 * @param params  Optional URLSearchParams or plain object to append as query string
 */
export function apiUrl(
  path: string,
  params?: URLSearchParams | Record<string, string | number | undefined>
): string {
  const base = BASE_URL.replace(/\/$/, ""); // strip trailing slash
  const cleanPath = path.replace(/^\//, ""); // strip leading slash
  const url = `${base}/${cleanPath}`;

  if (!params) return url;

  const searchParams =
    params instanceof URLSearchParams
      ? params
      : new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined && v !== null && v !== "")
            .map(([k, v]) => [k, String(v)])
        );

  const qs = searchParams.toString();
  return qs ? `${url}?${qs}` : url;
}
