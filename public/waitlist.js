// Waitlist form. Saves emails to Supabase when SUPABASE_URL and SUPABASE_ANON_KEY are set.
// The anon key is safe to expose ONLY with the insert-only RLS policy from supabase/schema.sql.
const SUPABASE_URL = "https://gexatrweunrrnwnhmarf.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_C95Oh2V_ZV2V9GVl0UH8gA_hwr1Uq1i"; // publishable (public) key

const form = document.getElementById("waitlist");
const input = document.getElementById("email");
const errorEl = document.getElementById("waitlist-error");
const okEl = document.getElementById("waitlist-ok");
const button = form.querySelector("button");

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

function showError(text) {
  errorEl.textContent = text;
  errorEl.hidden = false;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.hidden = true;
  const email = input.value.trim().toLowerCase();
  if (!isEmail(email)) return showError("Please enter a valid email address.");

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn("Waitlist is not connected to Supabase yet — email was not saved.");
    form.hidden = true;
    okEl.hidden = false;
    return;
  }

  button.disabled = true;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/waitlist`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ email, source: document.referrer || "direct" }),
    });
    // 409 = already on the list; treat as success.
    if (!res.ok && res.status !== 409) throw new Error(`HTTP ${res.status}`);
    form.hidden = true;
    okEl.hidden = false;
  } catch (err) {
    console.error(err);
    showError("Something went wrong. Please try again.");
  } finally {
    button.disabled = false;
  }
});
