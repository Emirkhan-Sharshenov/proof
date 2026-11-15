// Pro subscriptions via Freemius (merchant of record), SaaS product.
//
// Secrets (Cloudflare dashboard → Worker → Settings → Variables and Secrets):
//   FREEMIUS_SECRET_KEY  — Freemius → product Settings → API & Keys → Secret Key (sk_…). Signs webhooks.
//   FREEMIUS_API_TOKEN   — Freemius → product Settings → API & Keys → API Bearer Authorization Token
// Plain vars (wrangler.jsonc → vars):
//   FREEMIUS_PRODUCT_ID, FREEMIUS_PLAN_ID, FREEMIUS_PUBLIC_KEY (pk_…), FREEMIUS_SANDBOX ("true" | "false")

import { md5 } from "./md5";

export interface BillingEnv {
  SUPABASE_SECRET_KEY?: string;
  FREEMIUS_SECRET_KEY?: string;
  FREEMIUS_API_TOKEN?: string;
  FREEMIUS_PRODUCT_ID?: string;
  FREEMIUS_PLAN_ID?: string;
  FREEMIUS_PUBLIC_KEY?: string;
  FREEMIUS_SANDBOX?: string;
}

const SUPABASE_URL = "https://gexatrweunrrnwnhmarf.supabase.co";
const FS_API = "https://api.freemius.com/v1";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

async function freemius<T>(env: BillingEnv, method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${FS_API}/products/${env.FREEMIUS_PRODUCT_ID}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.FREEMIUS_API_TOKEN}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Freemius ${method} ${path}: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
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

type Profile = { fs_license_id: string | null; subscription_status: string | null; current_period_end: string | null };

async function profile(env: BillingEnv, userId: string): Promise<Profile | null> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userId}&select=fs_license_id,subscription_status,current_period_end`,
    { headers: supabaseHeaders(env) },
  );
  if (!res.ok) throw new Error(`profiles: HTTP ${res.status}`);
  return ((await res.json()) as Profile[])[0] ?? null;
}

const missingConfig = (env: BillingEnv) =>
  !env.SUPABASE_SECRET_KEY ||
  !env.FREEMIUS_SECRET_KEY ||
  !env.FREEMIUS_API_TOKEN ||
  !env.FREEMIUS_PRODUCT_ID ||
  !env.FREEMIUS_PLAN_ID ||
  !env.FREEMIUS_PUBLIC_KEY;

// Sandbox token: md5(ctx + product_id + secret_key + public_key + "checkout"), per Freemius docs.
export function sandboxParams(env: BillingEnv, ctx = String(Math.floor(Date.now() / 1000))) {
  const token = md5(`${ctx}${env.FREEMIUS_PRODUCT_ID}${env.FREEMIUS_SECRET_KEY}${env.FREEMIUS_PUBLIC_KEY}checkout`);
  return { token, ctx };
}

// POST /api/billing/checkout  { interval: "month" | "year" }  →  { url }
export async function handleCheckout(request: Request, env: BillingEnv, origin: string): Promise<Response> {
  if (missingConfig(env)) return json({ ok: false, error: "Payments are not configured yet." }, 503);
  const user = await currentUser(request, env);
  if (!user) return json({ ok: false, error: "Please sign in again." }, 401);

  const current = await profile(env, user.id);
  if (current?.subscription_status === "active") {
    return json({ ok: false, error: "You already have Pro. Use Manage subscription." }, 409);
  }

  const { interval } = (await request.json().catch(() => ({}))) as { interval?: string };
  const params = new URLSearchParams({
    user_email: user.email,
    readonly_user: "true",
    billing_cycle: interval === "year" ? "annual" : "monthly",
    cancel_url: `${origin}/app/settings?billing=cancelled`,
  });
  if (env.FREEMIUS_SANDBOX === "true") {
    const sandbox = sandboxParams(env);
    params.set("sandbox", sandbox.token);
    params.set("s_ctx_ts", sandbox.ctx);
  }
  const url = `https://checkout.freemius.com/product/${env.FREEMIUS_PRODUCT_ID}/plan/${env.FREEMIUS_PLAN_ID}/?${params}`;
  return json({ ok: true, url });
}

// POST /api/billing/portal  →  { url }   (Freemius customer portal: card, cancel, invoices)
export async function handlePortal(request: Request, env: BillingEnv): Promise<Response> {
  if (missingConfig(env)) return json({ ok: false, error: "Payments are not configured yet." }, 503);
  const user = await currentUser(request, env);
  if (!user) return json({ ok: false, error: "Please sign in again." }, 401);
  const current = await profile(env, user.id);
  if (!current?.fs_license_id) return json({ ok: false, error: "No subscription found for this account." }, 404);

  const portal = await freemius<{ link: string }>(env, "POST", "/portal/login.json", { email: user.email });
  return json({ ok: true, url: portal.link });
}

// POST /api/billing/sync → { plan }
// Pulls the signed-in user's licenses straight from Freemius (matched by their locked checkout email).
// Used right after checkout and as a self-heal when a webhook is late or lost.
export async function handleSync(request: Request, env: BillingEnv): Promise<Response> {
  if (missingConfig(env)) return json({ ok: false, error: "Payments are not configured yet." }, 503);
  const user = await currentUser(request, env);
  if (!user) return json({ ok: false, error: "Please sign in again." }, 401);

  const { users } = await freemius<{ users: { id: string; email: string }[] }>(
    env,
    "GET",
    `/users.json?email=${encodeURIComponent(user.email)}&count=5`,
  );
  const fsUser = users.find((u) => u.email.toLowerCase() === user.email.toLowerCase());
  if (!fsUser) return json({ ok: true, synced: 0 });

  const { licenses } = await freemius<{ licenses: License[] }>(env, "GET", `/users/${fsUser.id}/licenses.json?count=20`);
  const ours = licenses.filter((l) => String(l.plan_id) === String(env.FREEMIUS_PLAN_ID));
  // Apply inactive ones first, active last, so the final state reflects an active license if there is one.
  const isActive = (l: License) => !l.is_cancelled && (!l.expiration || new Date(toIso(l.expiration)!) > new Date());
  for (const l of [...ours].sort((a, b) => Number(isActive(a)) - Number(isActive(b)))) {
    await applyLicense(env, {
      p_email: user.email,
      p_fs_user_id: String(fsUser.id),
      p_license_id: String(l.id),
      p_expiration: toIso(l.expiration),
      p_cancelled: Boolean(l.is_cancelled),
      p_deleted: false,
    });
  }
  return json({ ok: true, synced: ours.length, active: ours.some(isActive) });
}

// Diagnostics for /api/status: does the API token work, which licenses exist, which events Freemius produced.
// No emails or names are returned.
export async function billingDiagnostics(env: BillingEnv) {
  if (missingConfig(env)) return { configured: false };
  const out: Record<string, unknown> = { configured: true, sandbox: env.FREEMIUS_SANDBOX === "true", plan_id: env.FREEMIUS_PLAN_ID };
  try {
    const { licenses } = await freemius<{ licenses: Record<string, unknown>[] }>(env, "GET", "/licenses.json?count=5");
    out.licenses = licenses.map((l) => ({
      id: l.id,
      plan_id: l.plan_id,
      has_user: Boolean(l.user_id),
      expiration: l.expiration,
      is_cancelled: l.is_cancelled,
      environment: l.environment,
    }));
  } catch (err) {
    out.licenses_error = String(err).slice(0, 200);
  }
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?fs_license_id=not.is.null&select=fs_license_id,subscription_status,plan,billing_updated_at`,
      { headers: supabaseHeaders(env) },
    );
    out.linked_accounts = res.ok ? await res.json() : `HTTP ${res.status}`;
  } catch (err) {
    out.linked_accounts_error = String(err).slice(0, 200);
  }
  try {
    const { events } = await freemius<{ events: Record<string, unknown>[] }>(env, "GET", "/events.json?count=10");
    out.events = events.map((e) => ({ type: e.type, state: e.state, created: e.created }));
  } catch (err) {
    out.events_error = String(err).slice(0, 200);
  }
  return out;
}

// ---------- Webhook: x-signature = hex HMAC-SHA256(raw body, product secret key) ----------

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyWebhook(secret: string, signature: string | null, body: string): Promise<boolean> {
  if (!signature) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return constantTimeEqual(hex, signature.trim().toLowerCase());
}

type License = { id: string; user_id: string | null; plan_id: string; expiration: string | null; is_cancelled: boolean };

// Freemius returns "YYYY-MM-DD HH:MM:SS" in UTC.
const toIso = (d: string | null) => (d ? new Date(d.replace(" ", "T") + (d.endsWith("Z") ? "" : "Z")).toISOString() : null);

async function applyLicense(env: BillingEnv, args: Record<string, unknown>) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/apply_license`, {
    method: "POST",
    headers: supabaseHeaders(env),
    body: JSON.stringify(args),
  });
  if (!res.ok) throw new Error(`apply_license: HTTP ${res.status} ${await res.text()}`);
  return res.json();
}

const LICENSE_EVENTS = [
  "license.created",
  "license.extended",
  "license.shortened",
  "license.updated",
  "license.cancelled",
  "license.expired",
  "license.plan.changed",
];

// POST /api/freemius/webhook
export async function handleWebhook(request: Request, env: BillingEnv): Promise<Response> {
  if (missingConfig(env)) return json({ ok: false, error: "not configured" }, 503);
  const body = await request.text();
  if (!(await verifyWebhook(env.FREEMIUS_SECRET_KEY!, request.headers.get("x-signature"), body))) {
    return new Response("invalid signature", { status: 401 });
  }

  const event = JSON.parse(body) as {
    type?: string;
    data?: { license_id?: string | number };
    objects?: { license?: { id?: string | number }; user?: { id?: string | number; email?: string } };
  };

  if (event.type === "license.deleted") {
    const licenseId = String(event.data?.license_id ?? event.objects?.license?.id ?? "");
    if (!licenseId) return json({ ok: true, ignored: "no license id" });
    const matched = await applyLicense(env, {
      p_email: event.objects?.user?.email ?? null,
      p_fs_user_id: event.objects?.user?.id ? String(event.objects.user.id) : null,
      p_license_id: licenseId,
      p_expiration: null,
      p_cancelled: true,
      p_deleted: true,
    });
    return json({ ok: true, type: event.type, matched: Boolean(matched) });
  }

  if (!event.type || !LICENSE_EVENTS.includes(event.type)) return json({ ok: true, ignored: event.type ?? null });
  const licenseId = event.objects?.license?.id;
  if (!licenseId) return json({ ok: true, ignored: "no license id" });

  // Re-read the license (source of truth) and its owner from the Freemius API.
  const license = await freemius<License>(env, "GET", `/licenses/${licenseId}.json`);
  if (String(license.plan_id) !== String(env.FREEMIUS_PLAN_ID)) return json({ ok: true, ignored: "other plan" });
  const fsUser = license.user_id
    ? await freemius<{ id: string; email: string }>(env, "GET", `/users/${license.user_id}.json`)
    : null;

  const matched = await applyLicense(env, {
    p_email: fsUser?.email ?? event.objects?.user?.email ?? null,
    p_fs_user_id: license.user_id ? String(license.user_id) : null,
    p_license_id: String(license.id),
    p_expiration: toIso(license.expiration),
    p_cancelled: Boolean(license.is_cancelled),
    p_deleted: false,
  });
  if (!matched) console.error(`Freemius license ${license.id} matched no account`);
  return json({ ok: true, type: event.type, matched: Boolean(matched) });
}
