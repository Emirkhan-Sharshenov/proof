import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { Button, Card, Chip, Spinner } from "@heroui/react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { openBillingPortal, PRICES, startCheckout } from "../lib/billing";

type Billing = {
  plan: "free" | "pro";
  subscription_status: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
};

const PRO_FEATURES = ["Images in case studies, up to 20 each", "Client-verified testimonials"];

export default function BillingCard() {
  const { session } = useAuth();
  const [params, setParams] = useSearchParams();
  const [billing, setBilling] = useState<Billing | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [waiting, setWaiting] = useState(params.get("billing") === "success");
  const poll = useRef<number | undefined>(undefined);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("profiles")
      .select("plan, subscription_status, current_period_end, cancel_at_period_end")
      .eq("user_id", session!.user.id)
      .maybeSingle();
    const next = (data as Billing | null) ?? {
      plan: "free",
      subscription_status: null,
      current_period_end: null,
      cancel_at_period_end: false,
    };
    setBilling(next);
    return next;
  }, [session]);

  useEffect(() => {
    load();
    return () => window.clearInterval(poll.current);
  }, [load]);

  // Back from checkout: the webhook may take a few seconds to switch the plan.
  useEffect(() => {
    if (params.get("billing") !== "success") return;
    let tries = 0;
    poll.current = window.setInterval(async () => {
      tries += 1;
      const next = await load();
      if (next.plan === "pro" || tries > 20) {
        window.clearInterval(poll.current);
        setWaiting(false);
        params.delete("billing");
        setParams(params, { replace: true });
      }
    }, 3000);
    return () => window.clearInterval(poll.current);
  }, [params, setParams, load]);

  async function run(key: string, action: () => Promise<void>) {
    setError("");
    setBusy(key);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(null);
    }
  }

  const isPro = billing?.plan === "pro";
  const hasSubscription = Boolean(billing?.subscription_status);
  const periodEnd = billing?.current_period_end
    ? new Date(billing.current_period_end).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <Card id="billing" className="mb-6 max-w-2xl">
      <Card.Header>
        <Card.Title className="flex items-center gap-2">
          Plan
          {billing ? (
            <Chip size="sm" color={isPro ? "accent" : "default"}>
              {isPro ? "Pro" : "Free"}
            </Chip>
          ) : null}
          {billing?.subscription_status === "past_due" ? (
            <Chip size="sm" color="warning">
              Payment failed
            </Chip>
          ) : null}
        </Card.Title>
        <Card.Description>
          {isPro
            ? hasSubscription
              ? billing?.cancel_at_period_end && periodEnd
                ? `Your subscription is cancelled. Pro stays active until ${periodEnd}.`
                : periodEnd
                  ? `Renews on ${periodEnd}.`
                  : "Your Pro subscription is active."
              : "Pro is active on your account."
            : "Pro adds what makes a portfolio convincing:"}
        </Card.Description>
      </Card.Header>
      <Card.Content className="flex flex-col gap-3">
        {!billing ? <Spinner size="sm" /> : null}
        {billing && !isPro ? (
          <ul className="m-0 flex list-none flex-col gap-1 p-0 text-sm">
            {PRO_FEATURES.map((f) => (
              <li key={f}>✓ {f}</li>
            ))}
          </ul>
        ) : null}
        {waiting ? (
          <p className="flex items-center gap-2 text-sm text-muted">
            <Spinner size="sm" /> Payment received — activating Pro…
          </p>
        ) : null}
        {params.get("billing") === "cancelled" ? <p className="text-sm text-muted">Checkout cancelled. No charge was made.</p> : null}
        {billing?.subscription_status === "past_due" ? (
          <p className="text-sm text-warning">Your last payment didn’t go through. Update your card to keep Pro.</p>
        ) : null}
        {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
      </Card.Content>
      <Card.Footer className="flex flex-wrap gap-2">
        {billing && !isPro ? (
          <>
            <Button isPending={busy === "month"} isDisabled={Boolean(busy)} onPress={() => run("month", () => startCheckout("month"))}>
              Upgrade — {PRICES.month}
            </Button>
            <Button
              variant="secondary"
              isPending={busy === "year"}
              isDisabled={Boolean(busy)}
              onPress={() => run("year", () => startCheckout("year"))}
            >
              {PRICES.year} · save 42%
            </Button>
          </>
        ) : null}
        {hasSubscription ? (
          <Button variant="secondary" isPending={busy === "portal"} onPress={() => run("portal", openBillingPortal)}>
            Manage subscription
          </Button>
        ) : null}
      </Card.Footer>
      {billing && !isPro ? (
        <p className="px-4 pb-4 text-xs text-muted">
          Payments are processed by Dodo Payments, our reseller and merchant of record. Cancel anytime.{" "}
          <a className="underline" href="/refund">
            Refund policy
          </a>
        </p>
      ) : null}
    </Card>
  );
}
