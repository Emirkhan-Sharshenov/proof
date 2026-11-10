import { useState, type FormEvent } from "react";
import { Navigate } from "react-router";
import { Button, Card, Input, Label, TextField } from "@heroui/react";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";

export default function Login() {
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

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <Card.Header>
          <span className="font-display text-2xl font-bold tracking-tight">Folioseen</span>
          <Card.Title>{mode === "signin" ? "Sign in" : "Create your account"}</Card.Title>
          <Card.Description>Know who read your portfolio.</Card.Description>
        </Card.Header>
        <Card.Content>
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
