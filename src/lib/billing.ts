import { supabase } from "./supabase";

export const PRICES = { month: "$7 / month", year: "$49 / year" } as const;

// Calls the Worker (same origin) with the user's access token and sends the browser to Dodo.
async function go(path: string, body?: unknown): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Please sign in again.");
  const res = await fetch(path, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const result = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !result.url) throw new Error(result.error ?? "Payments are unavailable right now. Please try again.");
  window.location.href = result.url;
}

export const startCheckout = (interval: "month" | "year") => go("/api/billing/checkout", { interval });
export const openBillingPortal = () => go("/api/billing/portal");
