import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router";
import { Button, Card, Checkbox, Description, Input, Label, Spinner, TextArea, TextField } from "@heroui/react";
import { supabase } from "../lib/supabase";
import NotFound from "./NotFound";

type Request = {
  client_name: string;
  case_study_title: string;
  freelancer_name: string | null;
  status: "pending" | "submitted";
};

export default function Testimonial() {
  const { token } = useParams();
  const [req, setReq] = useState<Request | null | undefined>(undefined);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [body, setBody] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase
      .rpc("get_testimonial_request", { p_token: token })
      .then(({ data, error }) => setReq(error || !data ? null : (data as Request)));
  }, [token]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (body.trim().length < 10) return setError("Please write at least a sentence.");
    if (!consent) return setError("Please confirm the checkbox to publish your testimonial.");
    setBusy(true);
    const { data, error } = await supabase.rpc("submit_testimonial", {
      p_token: token,
      p_author_name: name,
      p_author_role: role,
      p_body: body,
      p_consent: consent,
    });
    setBusy(false);
    if (error || !data) return setError("Something went wrong. The link may have already been used.");
    setDone(true);
    // Lets the freelancer know in Telegram (fires once; failures are ignored).
    fetch("/api/testimonial-alert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    }).catch(() => {});
  }

  if (req === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (req === null) return <NotFound message="This testimonial link doesn't exist or was removed." />;

  const who = req.freelancer_name ?? "Your freelancer";

  return (
    <div className="flex min-h-screen flex-col items-center px-4 py-12">
      <Card className="w-full max-w-xl">
        {done || req.status === "submitted" ? (
          <Card.Header>
            <Card.Title className="text-xl">Thank you!</Card.Title>
            <Card.Description>
              {done
                ? `Your testimonial has been sent to ${who}. It will appear on their case study exactly as you wrote it.`
                : "A testimonial has already been submitted with this link."}
            </Card.Description>
          </Card.Header>
        ) : (
          <>
            <Card.Header>
              <p className="text-sm text-muted">Hi {req.client_name},</p>
              <Card.Title className="text-xl">
                {who} asked for a short testimonial about “{req.case_study_title}”
              </Card.Title>
              <Card.Description>
                A few honest sentences help a lot: what the problem was, what it was like to work together, and what
                changed. Your words are published exactly as written — {who} can hide them, but can’t edit them.
              </Card.Description>
            </Card.Header>
            <Card.Content>
              <form className="flex flex-col gap-5" onSubmit={submit}>
                <TextField isRequired name="body" value={body} onChange={setBody} maxLength={1200}>
                  <Label>Your testimonial</Label>
                  <TextArea rows={6} placeholder="Working with them was…" />
                  <Description>{body.length} / 1200</Description>
                </TextField>
                <TextField isRequired name="name" value={name} onChange={setName} maxLength={120}>
                  <Label>Your name</Label>
                  <Input autoComplete="name" />
                </TextField>
                <TextField name="role" value={role} onChange={setRole} maxLength={160}>
                  <Label>Role and company</Label>
                  <Input placeholder="Head of Product, Acme" autoComplete="organization-title" />
                </TextField>
                <Checkbox isSelected={consent} onChange={setConsent}>
                  <Checkbox.Content>
                    <Checkbox.Control>
                      <Checkbox.Indicator />
                    </Checkbox.Control>
                    This is my honest feedback, and I agree it can be shown publicly with my name and role.
                  </Checkbox.Content>
                </Checkbox>
                {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
                <Button type="submit" isPending={busy}>
                  Send testimonial
                </Button>
              </form>
            </Card.Content>
          </>
        )}
      </Card>
      <footer className="mt-8 text-center text-sm text-muted">
        <a href="/" className="hover:underline">
          Made with Folioseen
        </a>
        {" · "}
        <a href="/privacy" className="hover:underline">
          Privacy
        </a>
      </footer>
    </div>
  );
}
