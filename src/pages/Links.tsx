import { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router";
import { buttonVariants, Card, Chip, Spinner, Table } from "@heroui/react";
import PageHeader from "../components/PageHeader";
import { supabase } from "../lib/supabase";
import { formatDuration, timeAgo } from "../lib/format";
import type { LinkRow, Visit } from "../lib/types";

type Row = LinkRow & { visits: Pick<Visit, "id" | "last_seen_at" | "case_study_views">[] };

export default function Links() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase
      .from("links")
      .select("*, visits(id, last_seen_at, case_study_views(case_study_id, seconds, opened_at))")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => (error ? setError(error.message) : setRows(data as Row[])));
  }, []);

  return (
    <>
      <PageHeader
        title="Links"
        description="One link per client. See when they open it and what they read."
        actions={
          <RouterLink className={buttonVariants()} to="/app/links/new">
            New link
          </RouterLink>
        }
      />
      {error ? <p className="text-danger">{error}</p> : null}
      {!rows && !error ? <Spinner /> : null}
      {rows?.length === 0 ? (
        <Card>
          <Card.Header>
            <Card.Title>No links yet</Card.Title>
            <Card.Description>
              Add a case study, then create a link for the client you are pitching and send it instead of your usual portfolio URL.
            </Card.Description>
          </Card.Header>
          <Card.Footer className="gap-2">
            <RouterLink className={buttonVariants({ variant: "secondary" })} to="/app/case-studies/new">
              Add a case study
            </RouterLink>
          </Card.Footer>
        </Card>
      ) : null}
      {rows && rows.length > 0 ? (
        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label="Client links" className="min-w-[560px]">
              <Table.Header>
                <Table.Column isRowHeader>Client</Table.Column>
                <Table.Column>Visits</Table.Column>
                <Table.Column>Reading time</Table.Column>
                <Table.Column>Last opened</Table.Column>
              </Table.Header>
              <Table.Body>
                {rows.map((l) => {
                  const seconds = l.visits.flatMap((v) => v.case_study_views).reduce((s, v) => s + v.seconds, 0);
                  const last = l.visits.map((v) => v.last_seen_at).sort().at(-1);
                  return (
                    <Table.Row key={l.id}>
                      <Table.Cell>
                        <RouterLink className="font-medium hover:underline" to={`/app/links/${l.id}`}>
                          {l.client_name}
                        </RouterLink>
                        {!l.is_active ? (
                          <Chip size="sm" className="ml-2">
                            Off
                          </Chip>
                        ) : null}
                      </Table.Cell>
                      <Table.Cell>{l.visits.length}</Table.Cell>
                      <Table.Cell>{seconds ? formatDuration(seconds) : "—"}</Table.Cell>
                      <Table.Cell>{last ? timeAgo(last) : <span className="text-muted">Not opened yet</span>}</Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      ) : null}
    </>
  );
}
