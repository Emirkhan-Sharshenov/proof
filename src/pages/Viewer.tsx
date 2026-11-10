import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router";
import { Button, Card, Chip, Spinner } from "@heroui/react";
import { supabase, SUPABASE_KEY, SUPABASE_URL } from "../lib/supabase";
import NotFound from "./NotFound";

type Shared = {
  client_name: string;
  is_owner: boolean | null;
  case_studies: { id: string; title: string; summary: string; body: string; is_nda: boolean }[];
};

const FLUSH_EVERY = 15; // seconds

function visitorId(): string {
  const fresh = () => crypto.randomUUID();
  try {
    let id = localStorage.getItem("fs_vid");
    if (!id) {
      id = fresh();
      localStorage.setItem("fs_vid", id);
    }
    return id;
  } catch {
    return fresh();
  }
}

// keepalive lets the last chunk of reading time arrive even when the tab is closing.
function sendView(visitId: string, caseStudyId: string, seconds: number) {
  fetch(`${SUPABASE_URL}/rest/v1/rpc/track_view`, {
    method: "POST",
    keepalive: true,
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_visit_id: visitId, p_case_study_id: caseStudyId, p_seconds: seconds }),
  }).catch(() => {});
}

export default function Viewer() {
  const { slug } = useParams();
  const [data, setData] = useState<Shared | null | undefined>(undefined);
  const [openId, setOpenId] = useState<string | null>(null);
  const visitRef = useRef<string | null>(null);
  const pendingRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc("get_shared_link", { p_slug: slug });
      if (cancelled) return;
      if (error || !data) return setData(null);
      setData(data as Shared);
      if ((data as Shared).is_owner) return;
      const { data: visit } = await supabase.rpc("start_visit", {
        p_slug: slug,
        p_visitor_id: visitorId(),
        p_user_agent: navigator.userAgent,
        p_referrer: document.referrer || null,
      });
      if (cancelled) return;
      visitRef.current = (visit as string | null) ?? null;
      // Ask the server to send the owner's Telegram alert (it fires once per visit; failures are ignored).
      if (visitRef.current) {
        fetch("/api/visit-alert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visit_id: visitRef.current }),
        }).catch(() => {});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const flush = useCallback((caseStudyId: string) => {
    const seconds = pendingRef.current;
    pendingRef.current = 0;
    if (visitRef.current && seconds > 0) sendView(visitRef.current, caseStudyId, seconds);
  }, []);

  // Count seconds while a case study is open and the tab is visible.
  useEffect(() => {
    if (!openId) return;
    pendingRef.current = 0;
    const markOpen = window.setTimeout(() => visitRef.current && sendView(visitRef.current, openId, 0), 0);
    const tick = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      pendingRef.current += 1;
      if (pendingRef.current >= FLUSH_EVERY) flush(openId);
    }, 1000);
    const onHide = () => document.visibilityState === "hidden" && flush(openId);
    const onPageHide = () => flush(openId);
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.clearTimeout(markOpen);
      window.clearInterval(tick);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onPageHide);
      flush(openId);
    };
  }, [openId, flush]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [openId]);

  if (data === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (data === null) return <NotFound message="This link is no longer active." />;

  const open = data.case_studies.find((c) => c.id === openId);

  return (
    <div className="min-h-screen">
      {data.is_owner ? (
        <div className="bg-warning-soft px-4 py-2 text-center text-sm">Preview — you’re signed in as the owner, this visit isn’t tracked.</div>
      ) : null}
      <main className="mx-auto max-w-3xl px-4 py-10">
        {open ? (
          <article>
            <Button variant="ghost" size="sm" className="-ml-3 mb-6" onPress={() => setOpenId(null)}>
              ← All case studies
            </Button>
            {open.is_nda ? (
              <div className="mb-6 rounded-2xl bg-warning-soft px-4 py-3 text-sm">
                Confidential: shared privately with you under NDA. Please don’t forward.
              </div>
            ) : null}
            <h1 className="font-display text-4xl font-bold tracking-tight">{open.title}</h1>
            {open.summary ? <p className="mt-3 text-lg text-muted">{open.summary}</p> : null}
            <div className="mt-8 whitespace-pre-wrap text-base leading-7">{open.body}</div>
          </article>
        ) : (
          <>
            <p className="text-sm font-medium text-muted">Prepared for {data.client_name}</p>
            <h1 className="mt-1 font-display text-4xl font-bold tracking-tight">Selected work</h1>
            <div className="mt-8 flex flex-col gap-4">
              {data.case_studies.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setOpenId(c.id)}
                  className="block rounded-3xl text-left focus-visible:outline-2"
                >
                  <Card className="transition-shadow hover:shadow-md">
                    <Card.Header>
                      <div className="flex items-start justify-between gap-2">
                        <Card.Title className="text-lg">{c.title}</Card.Title>
                        {c.is_nda ? (
                          <Chip size="sm" color="warning">
                            Confidential
                          </Chip>
                        ) : null}
                      </div>
                      {c.summary ? <Card.Description>{c.summary}</Card.Description> : null}
                    </Card.Header>
                    <Card.Footer>
                      <span className="text-sm font-medium text-accent">Read case study →</span>
                    </Card.Footer>
                  </Card>
                </button>
              ))}
            </div>
          </>
        )}
      </main>
      <footer className="pb-10 text-center text-sm text-muted">
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
