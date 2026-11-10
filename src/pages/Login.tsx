import { useEffect, useState, type FormEvent } from "react";
import { Navigate } from "react-router";
import { Button, Card, Input, Label, Separator, TextField } from "@heroui/react";
import { useAuth } from "../lib/auth";
import { supabase, SUPABASE_KEY, SUPABASE_URL } from "../lib/supabase";

type Provider = "github" | "google";
const PROVIDERS: { id: Provider; label: string }[] = [
  { id: "google", label: "Continue with Google" },
  { id: "github", label: "Continue with GitHub" },
];

// Only show buttons for providers that are switched on in Supabase.
function useEnabledProviders(): Provider[] {
  const [enabled, setEnabled] = useState<Provider[]>([]);
  useEffect(() => {
    fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_KEY } })
      .then((r) => r.json())
      .then((s: { external?: Record<string, boolean> }) =>
        setEnabled(PROVIDERS.map((p) => p.id).filter((id) => s.external?.[id])),
      )
      .catch(() => {});
  }, []);
  return enabled;
}

export default function Login() {
  const providers = useEnabledProviders();
  const { session } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  if (session) return <Navigate to="/app" replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setBusy(true);
    const creds = { email: email.trim(), password };
    const { data, error } =
      mode === "signin" ? await supabase.auth.signInWithPassword(creds) : await supabase.auth.signUp(creds);
    setBusy(false);
    if (error) return setError(error.message);
    if (mode === "signup" && !data.session) setInfo("Check your inbox to confirm your email, then sign in.");
  }

  async function oauth(provider: Provider) {
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/app` },
    });
    if (error) setError(error.message);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <Card.Header>
          <span className="font-display text-2xl font-bold tracking-tight">Folioseen</span>
          <Card.Title>{mode === "signin" ? "Sign in" : "Create your account"}</Card.Title>
          <Card.Description>Know who read your portfolio.</Card.Description>
        </Card.Header>
        <Card.Content>
          {providers.length > 0 ? (
            <>
              <div className="flex flex-col gap-2">
                {PROVIDERS.filter((p) => providers.includes(p.id)).map((p) => (
                  <Button key={p.id} variant="secondary" fullWidth onPress={() => oauth(p.id)}>
                    {p.label}
                  </Button>
                ))}
              </div>
              <div className="my-4 flex items-center gap-3 text-xs text-muted">
                <Separator className="flex-1" />
                or with email
                <Separator className="flex-1" />
              </div>
            </>
          ) : null}
          <form className="flex flex-col gap-4" onSubmit={submit}>
            <TextField isRequired name="email" type="email" value={email} onChange={setEmail}>
              <Label>Email</Label>
              <Input placeholder="you@studio.com" autoComplete="email" />
            </TextField>
            <TextField isRequired name="password" type="password" value={password} onChange={setPassword}>
              <Label>Password</Label>
              <Input
                placeholder="At least 8 characters"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                minLength={8}
              />
            </TextField>
            {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
            {info ? <p role="status" className="text-sm text-success">{info}</p> : null}
            <Button type="submit" fullWidth isPending={busy}>
              {mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>
        </Card.Content>
        <Card.Footer>
          <Button
            variant="ghost"
            size="sm"
            onPress={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError("");
              setInfo("");
            }}
          >
            {mode === "signin" ? "No account? Create one" : "Have an account? Sign in"}
          </Button>
        </Card.Footer>
      </Card>
    </div>
  );
}
