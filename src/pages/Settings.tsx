import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Card, Chip, Spinner } from "@heroui/react";
import PageHeader from "../components/PageHeader";
import BillingCard from "../components/BillingCard";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";

// Telegram bot username without "@" (from @BotFather).
export const TELEGRAM_BOT = "FolioseenBot";

function ExportCard() {
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");

  async function run() {
    setError("");
    setProgress("Starting…");
    try {
      const { buildExport, downloadBlob } = await import("../lib/export");
      const blob = await buildExport(setProgress);
      downloadBlob(blob, `folioseen-export-${new Date().toISOString().slice(0, 10)}.zip`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed.");
    }
    setProgress("");
  }

  return (
    <Card className="mt-6 max-w-2xl">
      <Card.Header>
        <Card.Title>Export your data</Card.Title>
        <Card.Description>
          Download everything — case studies as Markdown with their images, testimonials, links and every visit as CSV,
          plus a full JSON file. Your work stays yours, whatever happens to Folioseen.
        </Card.Description>
      </Card.Header>
      <Card.Content>
        {progress ? (
          <p className="flex items-center gap-2 text-sm text-muted">
            <Spinner size="sm" /> {progress}
          </p>
        ) : null}
        {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
      </Card.Content>
      <Card.Footer>
        <Button variant="secondary" isPending={Boolean(progress)} onPress={run}>
          Download .zip
        </Button>
      </Card.Footer>
    </Card>
  );
}

export default function Settings() {
  const { session } = useAuth();
  const [connected, setConnected] = useState<boolean | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState("");
  const poll = useRef<number | undefined>(undefined);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("telegram_chat_id")
      .eq("user_id", session!.user.id)
      .maybeSingle();
    if (error) {
      setError(error.message);
      return false;
    }
    const isConnected = Boolean(data?.telegram_chat_id);
    setConnected(isConnected);
    return isConnected;
  }, [session]);

  useEffect(() => {
    load();
    return () => window.clearInterval(poll.current);
  }, [load]);

  async function connect() {
    setError("");
    // Open the tab synchronously so popup blockers allow it, then point it at the bot.
    const tab = window.open("", "_blank");
    const { data: code, error } = await supabase.rpc("create_telegram_code");
    if (error || !code) {
      tab?.close();
      return setError(error?.message ?? "Could not create a connect code.");
    }
    const url = `https://t.me/${TELEGRAM_BOT}?start=${code}`;
    if (tab) tab.location.href = url;
    else window.location.href = url;

    setWaiting(true);
    let tries = 0;
    window.clearInterval(poll.current);
    poll.current = window.setInterval(async () => {
      tries += 1;
      if ((await load()) || tries > 60) {
        window.clearInterval(poll.current);
        setWaiting(false);
      }
    }, 3000);
  }

  async function disconnect() {
    const { error } = await supabase.rpc("disconnect_telegram");
    if (error) return setError(error.message);
    load();
  }

  return (
    <>
      <PageHeader title="Settings" />
      <BillingCard />
      <Card className="max-w-2xl">
        <Card.Header>
          <Card.Title className="flex items-center gap-2">
            Telegram alerts
            {connected ? (
              <Chip size="sm" color="success">
                Connected
              </Chip>
            ) : null}
          </Card.Title>
          <Card.Description>Get a message the moment a client opens one of your links.</Card.Description>
        </Card.Header>
        <Card.Content>
          {connected === null && !error ? <Spinner /> : null}
          {!TELEGRAM_BOT ? <p className="text-sm text-warning">The Telegram bot isn’t configured yet.</p> : null}
          {waiting ? (
            <p className="flex items-center gap-2 text-sm text-muted">
              <Spinner size="sm" /> Press <b>Start</b> in Telegram, then come back here.
            </p>
          ) : null}
          {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
        </Card.Content>
        <Card.Footer className="gap-2">
          {connected ? (
            <>
              <Button variant="secondary" onPress={connect} isDisabled={!TELEGRAM_BOT}>
                Reconnect
              </Button>
              <Button variant="danger-soft" onPress={disconnect}>
                Disconnect
              </Button>
            </>
          ) : (
            <Button onPress={connect} isDisabled={!TELEGRAM_BOT || connected === null}>
              Connect Telegram
            </Button>
          )}
        </Card.Footer>
      </Card>
      <ExportCard />
    </>
  );
}
