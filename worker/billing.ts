// Pro subscriptions via Dodo Payments (merchant of record).
//
// Secrets (Cloudflare dashboard → Worker → Settings → Variables and Secrets):
//   DODO_API_KEY         — Dodo → Developer → API Keys (dodo_test_… in test mode, dodo_live_… in live mode)
//   DODO_WEBHOOK_SECRET  — Dodo → Developer → Webhooks → signing secret (whsec_…)
// Plain vars (wrangler.jsonc → vars):
//   DODO_MODE            — "test" or "live"
//   DODO_PRODUCT_MONTHLY, DODO_PRODUCT_YEARLY — product ids (pdt_…)

export interface BillingEnv {
  SUPABASE_SECRET_KEY?: string;
  DODO_API_KEY?: string;
  DODO_WEBHOOK_SECRET?: string;
  DODO_MODE?: string;
  DODO_PRODUCT_MONTHLY?: string;
  DODO_PRODUCT_YEARLY?: string;
}

const SUPABASE_URL = "https://gexatrweunrrnwnhmarf.supabase.co";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const dodoBase = (env: BillingEnv) =>
  env.DODO_MODE === "live" ? "https://live.dodopayments.com" : "https://test.dodopayments.com";

async function dodo<T>(env: BillingEnv, method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${dodoBase(env)}${path}`, {
    method,
    headers: { Authorization: `Bearer ${env.DODO_API_KEY}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Dodo ${method} ${path}: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
  return res.json() as Promise<T>;
}

const supabaseHeaders = (env: BillingEnv) => ({
  apikey: env.SUPABASE_SECRET_KEY!,
  Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`,
  "Content-Type": "application/json",
});

// Who is calling: validates the Supabase access token sent by the app.
async function currentUser(request: Request, env: BillingEnv): Promise<{ id: string; email: string } | null> {
  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: env.SUPABASE_SECRET_KEY!, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const user = (await res.json()) as { id?: string; email?: string };
  return user.id && user.email ? { id: user.id, email: user.email } : null;
}

type Profile = { dodo_customer_id: string | null; subscription_status: string | null; plan: string };

async function profile(env: BillingEnv, userId: string): Promise<Profile | null> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userId}&select=dodo_customer_id,subscription_status,plan`,
    { headers: supabaseHeaders(env) },
  );
  if (!res.ok) throw new Error(`profiles: HTTP ${res.status}`);
  const rows = (await res.json()) as Profile[];
  return rows[0] ?? null;
}

const missingConfig = (env: BillingEnv) =>
  !env.SUPABASE_SECRET_KEY || !env.DODO_API_KEY || !env.DODO_PRODUCT_MONTHLY || !env.DODO_PRODUCT_YEARLY;

// POST /api/billing/checkout  { interval: "month" | "year" }  →  { url }
export async function handleCheckout(request: Request, env: BillingEnv, origin: string): Promise<Response> {
  if (missingConfig(env)) return json({ ok: false, error: "Payments are not configured yet." }, 503);
  const user = await currentUser(request, env);
  if (!user) return json({ ok: false, error: "Please sign in again." }, 401);

  const current = await profile(env, user.id);
  if (current?.subscription_status && ["active", "past_due"].includes(current.subscription_status)) {
    return json({ ok: false, error: "You already have an active subscription. Use Manage subscription." }, 409);
  }

  const { interval } = (await request.json().catch(() => ({}))) as { interval?: string };
  const productId = interval === "year" ? env.DODO_PRODUCT_YEARLY! : env.DODO_PRODUCT_MONTHLY!;

  const session = await dodo<{ checkout_url: string | null }>(env, "POST", "/checkouts", {
    product_cart: [{ product_id: productId, quantity: 1 }],
    customer: { email: user.email },
    metadata: { user_id: user.id },
    return_url: `${origin}/app/settings?billing=success`,
    cancel_url: `${origin}/app/settings?billing=cancelled`,
  });
  if (!session.checkout_url) throw new Error("Dodo returned no checkout_url");
  return json({ ok: true, url: session.checkout_url });
}

// POST /api/billing/portal  →  { url }   (manage card, cancel, invoices)
export async function handlePortal(request: Request, env: BillingEnv, origin: string): Promise<Response> {
  if (missingConfig(env)) return json({ ok: false, error: "Payments are not configured yet." }, 503);
  const user = await currentUser(request, env);
  if (!user) return json({ ok: false, error: "Please sign in again." }, 401);
  const current = await profile(env, user.id);
  if (!current?.dodo_customer_id) return json({ ok: false, error: "No subscription found for this account." }, 404);

  const returnUrl = encodeURIComponent(`${origin}/app/settings`);
  const portal = await dodo<{ link: string }>(
    env,
    "POST",
    `/customers/${encodeURIComponent(current.dodo_customer_id)}/customer-portal/session?return_url=${returnUrl}`,
  );
  return json({ ok: true, url: portal.link });
}

// ---------- Webhook (Standard Webhooks signature) ----------

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const bytes = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function bytesToBase64(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyWebhook(secret: string, headers: Headers, body: string): Promise<boolean> {
  const id = headers.get("webhook-id");
  const timestamp = headers.get("webhook-timestamp");
  const signatures = headers.get("webhook-signature");
  if (!id || !timestamp || !signatures) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    base64ToBytes(secret.replace(/^whsec_/, "")),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const expected = bytesToBase64(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${timestamp}.${body}`)),
  );
  return signatures
    .split(" ")
    .map((s) => s.split(",")[1] ?? "")
    .some((sig) => constantTimeEqual(sig, expected));
}

type DodoSubscription = {
  subscription_id: string;
  status: string;
  next_billing_date?: string | null;
  cancel_at_next_billing_date?: boolean;
  metadata?: Record<string, unknown>;
  customer?: { customer_id?: string; email?: string };
};

// POST /api/dodo/webhook
export async function handleWebhook(request: Request, env: BillingEnv): Promise<Response> {
  if (!env.DODO_WEBHOOK_SECRET || !env.DODO_API_KEY || !env.SUPABASE_SECRET_KEY) {
    return json({ ok: false, error: "not configured" }, 503);
  }
  const body = await request.text();
  if (!(await verifyWebhook(env.DODO_WEBHOOK_SECRET, request.headers, body))) {
    return new Response("invalid signature", { status: 401 });
  }

  const event = JSON.parse(body) as { type?: string; data?: { payload_type?: string; subscription_id?: string } };
  const subscriptionId = event.data?.subscription_id;
  if (!subscriptionId || !(event.type?.startsWith("subscription.") || event.data?.payload_type === "Subscription")) {
    return json({ ok: true, ignored: event.type ?? null });
  }

  // Ask Dodo for the current state instead of trusting event order.
  const sub = await dodo<DodoSubscription>(env, "GET", `/subscriptions/${encodeURIComponent(subscriptionId)}`);
  const payloadMeta = (event.data as { metadata?: Record<string, unknown> }).metadata;
  const userId = String(sub.metadata?.user_id ?? payloadMeta?.user_id ?? "");

  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/apply_subscription`, {
    method: "POST",
    headers: supabaseHeaders(env),
    body: JSON.stringify({
      p_user_id: userId,
      p_email: sub.customer?.email ?? null,
      p_customer_id: sub.customer?.customer_id ?? null,
      p_subscription_id: sub.subscription_id,
      p_status: sub.status,
      p_next_billing: sub.next_billing_date ?? null,
      p_cancel_at_period_end: sub.cancel_at_next_billing_date ?? false,
    }),
  });
  if (!res.ok) throw new Error(`apply_subscription: HTTP ${res.status} ${await res.text()}`);
  const matched = await res.json();
  if (!matched) console.error(`Dodo subscription ${sub.subscription_id} matched no account`);
  return json({ ok: true, type: event.type, status: sub.status, matched: Boolean(matched) });
}
