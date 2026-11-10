// Cloudflare Worker: handles /api/* only; every other path is served from static assets.
// Secrets (Cloudflare dashboard → Worker → Settings → Variables and Secrets):
//   TELEGRAM_BOT_TOKEN   — from @BotFather
//   SUPABASE_SECRET_KEY  — Supabase → Project Settings → API Keys → secret key

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  TELEGRAM_BOT_TOKEN?: string;
  SUPABASE_SECRET_KEY?: string;
}

interface Ctx {
  waitUntil(promise: Promise<unknown>): void;
}

const SUPABASE_URL = "https://gexatrweunrrnwnhmarf.supabase.co";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

async function rpc<T>(env: Env, fn: string, args: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      apikey: env.SUPABASE_SECRET_KEY!,
      Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
  });
  if (!res.ok) throw new Error(`${fn}: HTTP ${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

async function telegram(env: Env, method: string, payload: Record<string, unknown>) {
  const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json() as Promise<{ ok: boolean; description?: string }>;
}

// Telegram sends this in X-Telegram-Bot-Api-Secret-Token; derived from the token so there is one secret less to manage.
async function webhookSecret(env: Env): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`folioseen:${env.TELEGRAM_BOT_TOKEN}`));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 48);
}

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function handleWebhook(request: Request, env: Env): Promise<Response> {
  if (request.headers.get("X-Telegram-Bot-Api-Secret-Token") !== (await webhookSecret(env))) {
    return new Response("forbidden", { status: 403 });
  }
  const update = (await request.json()) as { message?: { chat: { id: number }; text?: string } };
  const message = update.message;
  if (!message?.text) return json({ ok: true });

  const chatId = message.chat.id;
  const code = message.text.match(/^\/start\s+([a-f0-9]{32})$/)?.[1];
  let reply =
    "Hi! This bot sends Folioseen alerts when a client opens your link.\n\nTo connect: open Folioseen → Settings → Connect Telegram.";
  if (code) {
    try {
      const linked = await rpc<boolean>(env, "link_telegram", { p_code: code, p_chat_id: chatId });
      reply = linked
        ? "✅ Connected. You'll get a message here when a client opens one of your links."
        : "This connect link has expired. Open Folioseen → Settings → Connect Telegram again.";
    } catch (err) {
      // Answer anyway and return 200, so Telegram doesn't retry the same update forever.
      console.error(err);
      reply = "Sorry, something went wrong on our side. Please try Connect Telegram again in a few minutes.";
    }
  }
  await telegram(env, "sendMessage", { chat_id: chatId, text: reply });
  return json({ ok: true });
}

async function handleVisitAlert(request: Request, env: Env, ctx: Ctx, origin: string): Promise<Response> {
  const { visit_id } = (await request.json().catch(() => ({}))) as { visit_id?: string };
  if (!visit_id || !/^[0-9a-f-]{36}$/.test(visit_id)) return json({ ok: false }, 400);

  ctx.waitUntil(
    (async () => {
      const rows = await rpc<
        { chat_id: number; link_id: string; client_name: string; visit_number: number; user_agent: string | null }[]
      >(env, "claim_visit_alert", { p_visit_id: visit_id });
      for (const r of rows) {
        const deviceName = r.user_agent && /Mobi|Android|iPhone/i.test(r.user_agent) ? "mobile" : "desktop";
        const nth = r.visit_number > 1 ? ` (visit #${r.visit_number})` : " for the first time";
        await telegram(env, "sendMessage", {
          chat_id: r.chat_id,
          parse_mode: "HTML",
          text: `👀 <b>${escapeHtml(r.client_name)}</b> opened your link${nth}, on ${deviceName}.\n\n<a href="${origin}/app/links/${r.link_id}">See what they read</a>`,
          link_preview_options: { is_disabled: true },
        });
      }
    })().catch((err) => console.error(err)),
  );
  return json({ ok: true });
}

// Open once after deploy (or after changing the token): points the bot's webhook at this Worker.
async function handleSetup(env: Env, origin: string): Promise<Response> {
  const result = await telegram(env, "setWebhook", {
    url: `${origin}/api/telegram`,
    secret_token: await webhookSecret(env),
    allowed_updates: ["message"],
  });
  return json(result, result.ok ? 200 : 500);
}

// Diagnostics without secrets: is the webhook healthy, and does the Supabase key work?
async function handleStatus(env: Env, origin: string): Promise<Response> {
  const info = (await (await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getWebhookInfo`)).json()) as {
    ok: boolean;
    result?: { url: string; pending_update_count: number; last_error_date?: number; last_error_message?: string };
    description?: string;
  };
  let supabase = "ok";
  try {
    await rpc(env, "claim_visit_alert", { p_visit_id: "00000000-0000-0000-0000-000000000000" });
  } catch (err) {
    supabase = String(err).replace(/sb_secret_\w+/g, "sb_secret_***").slice(0, 300);
  }
  return json({
    telegram_token_ok: info.ok,
    webhook_url_matches: info.result?.url === `${origin}/api/telegram`,
    webhook_url: info.result?.url,
    pending_updates: info.result?.pending_update_count,
    last_error: info.result?.last_error_message ?? null,
    last_error_at: info.result?.last_error_date ? new Date(info.result.last_error_date * 1000).toISOString() : null,
    telegram_error: info.ok ? null : info.description,
    supabase,
  });
}

export default {
  async fetch(request: Request, env: Env, ctx: Ctx): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);

    if (!env.TELEGRAM_BOT_TOKEN || !env.SUPABASE_SECRET_KEY) {
      return json({ ok: false, error: "TELEGRAM_BOT_TOKEN or SUPABASE_SECRET_KEY is not set" }, 503);
    }
    try {
      if (url.pathname === "/api/telegram" && request.method === "POST") return await handleWebhook(request, env);
      if (url.pathname === "/api/visit-alert" && request.method === "POST")
        return await handleVisitAlert(request, env, ctx, url.origin);
      if (url.pathname === "/api/telegram/setup" && request.method === "GET") return await handleSetup(env, url.origin);
      if (url.pathname === "/api/status" && request.method === "GET") return await handleStatus(env, url.origin);
    } catch (err) {
      console.error(err);
      return json({ ok: false }, 500);
    }
    return json({ ok: false, error: "not found" }, 404);
  },
};
