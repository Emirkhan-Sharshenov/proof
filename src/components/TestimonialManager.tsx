import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Button, Card, Chip, Input, Label, Spinner, TextField } from "@heroui/react";
import { supabase } from "../lib/supabase";
import { usePlan } from "../lib/plan";
import { formatDate } from "../lib/format";

type Testimonial = {
  id: string;
  token: string;
  client_name: string;
  status: "pending" | "submitted";
  author_name: string | null;
  author_role: string | null;
  body: string | null;
  is_visible: boolean;
  submitted_at: string | null;
  created_at: string;
};

const requestUrl = (token: string) => `${window.location.origin}/t/${token}`;

export default function TestimonialManager({ caseStudyId }: { caseStudyId?: string }) {
  const plan = usePlan();
  const [items, setItems] = useState<Testimonial[] | null>(null);
  const [clientName, setClientName] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    if (!caseStudyId) return;
    supabase
      .from("testimonials")
      .select("id, token, client_name, status, author_name, author_role, body, is_visible, submitted_at, created_at")
      .eq("case_study_id", caseStudyId)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => (error ? setError(error.message) : setItems(data as Testimonial[])));
  }, [caseStudyId]);

  useEffect(load, [load]);

  async function request(e: FormEvent) {
    e.preventDefault();
    if (!caseStudyId) return;
    setBusy(true);
    setError("");
    const { data, error } = await supabase
      .from("testimonials")
      .insert({ case_study_id: caseStudyId, client_name: clientName.trim() })
      .select("token")
      .single();
    setBusy(false);
    if (error) return setError(error.message);
    setClientName("");
    load();
    copy(data.token);
  }

  async function copy(token: string) {
    try {
      await navigator.clipboard.writeText(requestUrl(token));
      setCopied(token);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      window.prompt("Copy this link and send it to your client:", requestUrl(token));
    }
  }

  async function toggle(t: Testimonial) {
    const { error } = await supabase.from("testimonials").update({ is_visible: !t.is_visible }).eq("id", t.id);
    if (error) return setError(error.message);
    load();
  }

  async function remove(t: Testimonial) {
    const what = t.status === "pending" ? "this request" : `${t.author_name}’s testimonial`;
    if (!window.confirm(`Delete ${what}? This can't be undone.`)) return;
    const { error } = await supabase.from("testimonials").delete().eq("id", t.id);
    if (error) return setError(error.message);
    load();
  }

  return (
    <Card>
      <Card.Header>
        <Card.Title className="flex items-center gap-2">
          Client testimonials
          <Chip size="sm" color="accent">
            Pro
          </Chip>
        </Card.Title>
        <Card.Description>
          Send your client a private link. They write the testimonial themselves — you can show or hide it, but not edit it,
          so readers know it’s real.
        </Card.Description>
      </Card.Header>
      <Card.Content className="flex flex-col gap-5">
        {!caseStudyId ? (
          <p className="text-sm text-muted">Save the case study first, then request testimonials.</p>
        ) : plan === null ? (
          <Spinner size="sm" />
        ) : plan !== "pro" ? (
          <p className="text-sm text-muted">
            Client-verified testimonials are part of Folioseen Pro. Pro isn’t on sale yet — early users will get it first.
          </p>
        ) : (
          <>
            <form className="flex flex-wrap items-end gap-3" onSubmit={request}>
              <TextField
                isRequired
                name="client"
                value={clientName}
                onChange={setClientName}
                maxLength={120}
                className="min-w-0 flex-1 basis-56"
              >
                <Label>Who is it from?</Label>
                <Input placeholder="Sarah at Acme (example)" />
              </TextField>
              <Button type="submit" isPending={busy}>
                Create request link
              </Button>
            </form>

            {items?.map((t) => (
              <div key={t.id} className="flex flex-col gap-2 rounded-2xl border border-border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{t.status === "submitted" ? t.author_name : t.client_name}</span>
                  {t.status === "pending" ? (
                    <Chip size="sm">Waiting for client</Chip>
                  ) : t.is_visible ? (
                    <Chip size="sm" color="success">
                      Shown
                    </Chip>
                  ) : (
                    <Chip size="sm">Hidden</Chip>
                  )}
                  <span className="ml-auto text-xs text-muted">
                    {t.submitted_at ? `Received ${formatDate(t.submitted_at)}` : `Requested ${formatDate(t.created_at)}`}
                  </span>
                </div>
                {t.status === "submitted" ? (
                  <>
                    {t.author_role ? <p className="text-sm text-muted">{t.author_role}</p> : null}
                    <p className="whitespace-pre-wrap text-sm">“{t.body}”</p>
                  </>
                ) : (
                  <code className="truncate rounded-lg bg-default px-3 py-2 text-xs">{requestUrl(t.token)}</code>
                )}
                <div className="flex flex-wrap gap-2">
                  {t.status === "pending" ? (
                    <Button size="sm" variant="secondary" onPress={() => copy(t.token)}>
                      {copied === t.token ? "Copied" : "Copy link"}
                    </Button>
                  ) : (
                    <Button size="sm" variant="secondary" onPress={() => toggle(t)}>
                      {t.is_visible ? "Hide" : "Show"}
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onPress={() => remove(t)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </>
        )}
        {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
      </Card.Content>
    </Card>
  );
}
