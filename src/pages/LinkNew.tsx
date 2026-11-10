import { useEffect, useState, type FormEvent } from "react";
import { Link as RouterLink, useNavigate } from "react-router";
import { Button, Checkbox, Description, Input, Label, Spinner, TextField } from "@heroui/react";
import PageHeader from "../components/PageHeader";
import { supabase } from "../lib/supabase";
import type { CaseStudy } from "../lib/types";

export default function LinkNew() {
  const navigate = useNavigate();
  const [caseStudies, setCaseStudies] = useState<CaseStudy[] | null>(null);
  const [clientName, setClientName] = useState("");
  const [note, setNote] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase
      .from("case_studies")
      .select("*")
      .order("updated_at", { ascending: false })
      .then(({ data, error }) => (error ? setError(error.message) : setCaseStudies(data)));
  }, []);

  const toggle = (id: string, on: boolean) =>
    setSelected((s) => (on ? [...s, id] : s.filter((x) => x !== id)));

  async function create(e: FormEvent) {
    e.preventDefault();
    if (selected.length === 0) return setError("Pick at least one case study.");
    setBusy(true);
    setError("");
    const { data: link, error } = await supabase
      .from("links")
      .insert({ client_name: clientName.trim(), note: note.trim() })
      .select("id")
      .single();
    if (error) {
      setBusy(false);
      return setError(error.message);
    }
    const { error: itemsError } = await supabase
      .from("link_case_studies")
      .insert(selected.map((case_study_id, position) => ({ link_id: link.id, case_study_id, position })));
    setBusy(false);
    if (itemsError) return setError(itemsError.message);
    navigate(`/app/links/${link.id}`);
  }

  return (
    <>
      <PageHeader title="New link" description="Create a separate link for each client so you know exactly who read what." />
      <form className="flex max-w-2xl flex-col gap-5" onSubmit={create}>
        <TextField isRequired name="client" value={clientName} onChange={setClientName} maxLength={120}>
          <Label>Client</Label>
          <Input placeholder="Acme Inc. — Sarah (example)" />
          <Description>Only you see this. The client sees it as a greeting at the top of the page.</Description>
        </TextField>
        <TextField name="note" value={note} onChange={setNote} maxLength={1000}>
          <Label>Private note</Label>
          <Input placeholder="Upwork proposal, sent Nov 10" />
        </TextField>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-2 text-sm font-medium">Case studies to show (in this order)</legend>
          {!caseStudies && !error ? <Spinner /> : null}
          {caseStudies?.length === 0 ? (
            <p className="text-muted">
              You have no case studies yet.{" "}
              <RouterLink className="text-accent underline" to="/app/case-studies/new">
                Add one first
              </RouterLink>
              .
            </p>
          ) : null}
          {caseStudies?.map((c) => {
            const index = selected.indexOf(c.id);
            return (
              <Checkbox key={c.id} isSelected={index >= 0} onChange={(on) => toggle(c.id, on)}>
                <Checkbox.Content>
                  <Checkbox.Control>
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                  {index >= 0 ? `${index + 1}. ` : ""}
                  {c.title}
                  {c.is_nda ? " (NDA)" : ""}
                </Checkbox.Content>
              </Checkbox>
            );
          })}
        </fieldset>

        {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
        <div className="flex gap-2">
          <Button type="submit" isPending={busy}>
            Create link
          </Button>
          <Button variant="secondary" onPress={() => navigate("/app")}>
            Cancel
          </Button>
        </div>
      </form>
    </>
  );
}
