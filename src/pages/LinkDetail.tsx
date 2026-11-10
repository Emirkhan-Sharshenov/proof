import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Button, Card, Chip, Spinner, Table } from "@heroui/react";
import PageHeader from "../components/PageHeader";
import { supabase } from "../lib/supabase";
import { device, formatDate, formatDuration, shareUrl, timeAgo } from "../lib/format";
import type { LinkRow, Visit } from "../lib/types";

type Detail = LinkRow & {
  link_case_studies: { position: number; case_studies: { id: string; title: string } | null }[];
  visits: Visit[];
};

export default function LinkDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [link, setLink] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const load = useCallback(() => {
    supabase
      .from("links")
      .select(
        "*, link_case_studies(position, case_studies(id, title)), visits(id, created_at, last_seen_at, user_agent, referrer, case_study_views(case_study_id, seconds, opened_at))",
      )
      .eq("id", id!)
      .single()
      .then(({ data, error }) => (error ? setError(error.message) : setLink(data as Detail)));
  }, [id]);

  useEffect(load, [load]);

  if (!link) return error ? <p className="text-danger">{error}</p> : <Spinner />;

  const url = shareUrl(link.slug);
  const items = [...link.link_case_studies]
    .sort((a, b) => a.position - b.position)
    .flatMap((i) => (i.case_studies ? [i.case_studies] : []));
  const visits = [...link.visits].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const totals = new Map<string, { seconds: number; opens: number }>();
  for (const v of visits) {
    for (const cv of v.case_study_views) {
      const t = totals.get(cv.case_study_id) ?? { seconds: 0, opens: 0 };
      totals.set(cv.case_study_id, { seconds: t.seconds + cv.seconds, opens: t.opens + 1 });
    }
  }
  const titleOf = (csId: string) => items.find((c) => c.id === csId)?.title ?? "Removed case study";

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link:", url);
    }
  }

  async function toggleActive() {
    const { error } = await supabase.from("links").update({ is_active: !link!.is_active }).eq("id", link!.id);
    if (error) return setError(error.message);
    load();
  }

  async function remove() {
    if (!window.confirm("Delete this link and all its visit history? This can't be undone.")) return;
    const { error } = await supabase.from("links").delete().eq("id", link!.id);
    if (error) return setError(error.message);
    navigate("/app");
  }

  return (
    <>
      <PageHeader
        title={link.client_name}
        description={link.note || undefined}
        actions={
          <>
            <Button variant="secondary" onPress={toggleActive}>
              {link.is_active ? "Turn off" : "Turn on"}
            </Button>
            <Button variant="danger-soft" onPress={remove}>
              Delete
            </Button>
          </>
        }
      />
      {error ? <p className="mb-4 text-danger">{error}</p> : null}

      <Card className="mb-8">
        <Card.Header>
          <Card.Title className="flex items-center gap-2">
            Link to send
            {link.is_active ? (
              <Chip size="sm" color="success">
                Live
              </Chip>
            ) : (
              <Chip size="sm">Off — shows “not found”</Chip>
            )}
          </Card.Title>
        </Card.Header>
        <Card.Content className="flex flex-wrap items-center gap-3">
          <code className="min-w-0 flex-1 truncate rounded-lg bg-default px-3 py-2 text-sm">{url}</code>
          <Button onPress={copy}>{copied ? "Copied" : "Copy"}</Button>
          <a className="text-sm text-accent underline" href={url} target="_blank" rel="noreferrer">
            Preview
          </a>
        </Card.Content>
        <Card.Footer>
          <p className="text-sm text-muted">Your own visits while signed in are not counted.</p>
        </Card.Footer>
      </Card>

      <h2 className="mb-3 font-display text-xl font-semibold">What they read</h2>
      <Table className="mb-8">
        <Table.ScrollContainer>
          <Table.Content aria-label="Reading time per case study" className="min-w-[480px]">
            <Table.Header>
              <Table.Column isRowHeader>Case study</Table.Column>
              <Table.Column>Opened</Table.Column>
              <Table.Column>Reading time</Table.Column>
            </Table.Header>
            <Table.Body>
              {items.map((c) => {
                const t = totals.get(c.id);
                return (
                  <Table.Row key={c.id}>
                    <Table.Cell>{c.title}</Table.Cell>
                    <Table.Cell>{t ? `${t.opens}×` : <span className="text-muted">Not yet</span>}</Table.Cell>
                    <Table.Cell>{t ? formatDuration(t.seconds) : "—"}</Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>

      <h2 className="mb-3 font-display text-xl font-semibold">Visits ({visits.length})</h2>
      {visits.length === 0 ? (
        <p className="text-muted">No visits yet. Send the link and check back here.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {visits.map((v) => (
            <Card key={v.id}>
              <Card.Header>
                <Card.Title className="text-base">
                  {formatDate(v.created_at)} <span className="font-normal text-muted">· {timeAgo(v.last_seen_at)} · {device(v.user_agent)}</span>
                </Card.Title>
              </Card.Header>
              <Card.Content>
                {v.case_study_views.length === 0 ? (
                  <p className="text-sm text-muted">Opened the page, didn’t open a case study.</p>
                ) : (
                  <ul className="flex flex-col gap-1 text-sm">
                    {v.case_study_views.map((cv) => (
                      <li key={cv.case_study_id} className="flex justify-between gap-4">
                        <span>{titleOf(cv.case_study_id)}</span>
                        <span className="tabular-nums text-muted">{formatDuration(cv.seconds)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card.Content>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
