import { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router";
import { buttonVariants, Card, Chip, Spinner } from "@heroui/react";
import PageHeader from "../components/PageHeader";
import { supabase } from "../lib/supabase";
import type { CaseStudy } from "../lib/types";

export default function CaseStudies() {
  const [items, setItems] = useState<CaseStudy[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase
      .from("case_studies")
      .select("*")
      .order("updated_at", { ascending: false })
      .then(({ data, error }) => (error ? setError(error.message) : setItems(data)));
  }, []);

  return (
    <>
      <PageHeader
        title="Case studies"
        description="Your work. Pick which ones each client sees when you create a link."
        actions={
          <RouterLink className={buttonVariants()} to="/app/case-studies/new">
            New case study
          </RouterLink>
        }
      />
      {error ? <p className="text-danger">{error}</p> : null}
      {!items && !error ? <Spinner /> : null}
      {items?.length === 0 ? (
        <Card>
          <Card.Header>
            <Card.Title>No case studies yet</Card.Title>
            <Card.Description>Add your first project: what the client needed, what you did, and the result.</Card.Description>
          </Card.Header>
        </Card>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        {items?.map((c) => (
          <RouterLink key={c.id} to={`/app/case-studies/${c.id}`} className="block rounded-3xl focus-visible:outline-2">
            <Card className="h-full transition-shadow hover:shadow-md">
              <Card.Header>
                <div className="flex items-start justify-between gap-2">
                  <Card.Title>{c.title}</Card.Title>
                  {c.is_nda ? (
                    <Chip size="sm" color="warning">
                      NDA
                    </Chip>
                  ) : null}
                </div>
                <Card.Description>{c.summary || "No summary"}</Card.Description>
              </Card.Header>
            </Card>
          </RouterLink>
        ))}
      </div>
    </>
  );
}
