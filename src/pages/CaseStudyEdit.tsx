import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router";
import { Button, Checkbox, Description, Input, Label, Spinner, TextArea, TextField } from "@heroui/react";
import PageHeader from "../components/PageHeader";
import { supabase } from "../lib/supabase";

export default function CaseStudyEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState(!id);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [isNda, setIsNda] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    supabase
      .from("case_studies")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (error) return setError(error.message);
        setTitle(data.title);
        setSummary(data.summary);
        setBody(data.body);
        setIsNda(data.is_nda);
        setLoaded(true);
      });
  }, [id]);

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const row = { title: title.trim(), summary: summary.trim(), body, is_nda: isNda, updated_at: new Date().toISOString() };
    const { error } = id
      ? await supabase.from("case_studies").update(row).eq("id", id)
      : await supabase.from("case_studies").insert(row);
    setBusy(false);
    if (error) return setError(error.message);
    navigate("/app/case-studies");
  }

  async function remove() {
    if (!id || !window.confirm("Delete this case study? Links that include it will stop showing it.")) return;
    const { error } = await supabase.from("case_studies").delete().eq("id", id);
    if (error) return setError(error.message);
    navigate("/app/case-studies");
  }

  if (!loaded) return error ? <p className="text-danger">{error}</p> : <Spinner />;

  return (
    <>
      <PageHeader title={id ? "Edit case study" : "New case study"} />
      <form className="flex max-w-2xl flex-col gap-5" onSubmit={save}>
        <TextField isRequired name="title" value={title} onChange={setTitle} maxLength={200}>
          <Label>Title</Label>
          <Input placeholder="Checkout redesign for an online store" />
        </TextField>
        <TextField name="summary" value={summary} onChange={setSummary} maxLength={500}>
          <Label>Summary</Label>
          <Input placeholder="One line: the result, in numbers if you have them" />
          <Description>Shown on the overview your client sees first.</Description>
        </TextField>
        <TextField name="body" value={body} onChange={setBody} maxLength={50000}>
          <Label>Story</Label>
          <TextArea rows={12} placeholder={"The problem\n\nWhat I did\n\nThe result"} />
          <Description>Plain text. Line breaks are kept.</Description>
        </TextField>
        <Checkbox isSelected={isNda} onChange={setIsNda}>
          <Checkbox.Content>
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            Under NDA
          </Checkbox.Content>
          <Description>Only visible through your private links, marked confidential, never indexed.</Description>
        </Checkbox>
        {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" isPending={busy}>
            Save
          </Button>
          <Button variant="secondary" onPress={() => navigate("/app/case-studies")}>
            Cancel
          </Button>
          {id ? (
            <Button variant="danger-soft" className="ml-auto" onPress={remove}>
              Delete
            </Button>
          ) : null}
        </div>
      </form>
    </>
  );
}
