import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { Button, Card, Chip, Spinner } from "@heroui/react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { IMAGE_LIMIT, usePlan } from "../lib/plan";
import { deleteCaseImage, imageUrl, uploadCaseImage, type CaseImage } from "../lib/images";

export default function ImageManager({ caseStudyId }: { caseStudyId?: string }) {
  const { session } = useAuth();
  const plan = usePlan();
  const [images, setImages] = useState<CaseImage[] | null>(null);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!caseStudyId) return;
    supabase
      .from("case_study_images")
      .select("id, path, width, height")
      .eq("case_study_id", caseStudyId)
      .order("position")
      .order("created_at")
      .then(({ data, error }) => (error ? setError(error.message) : setImages(data)));
  }, [caseStudyId]);

  const limit = plan ? IMAGE_LIMIT[plan] : 0;

  async function onFiles(files: FileList | null) {
    if (!files || !caseStudyId || !session) return;
    setError("");
    const room = limit - (images?.length ?? 0);
    const picked = [...files].filter((f) => f.type.startsWith("image/")).slice(0, Math.max(0, room));
    if (picked.length < files.length) setError(`You can add up to ${limit} images per case study.`);
    setUploading(picked.length);
    let position = images?.length ?? 0;
    for (const file of picked) {
      try {
        const added = await uploadCaseImage(session.user.id, caseStudyId, file, position++);
        setImages((list) => [...(list ?? []), added]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed.");
      }
      setUploading((n) => n - 1);
    }
    if (input.current) input.current.value = "";
  }

  async function remove(image: CaseImage) {
    try {
      await deleteCaseImage(image);
      setImages((list) => list?.filter((i) => i.id !== image.id) ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete.");
    }
  }

  return (
    <Card>
      <Card.Header>
        <Card.Title className="flex items-center gap-2">
          Images
          <Chip size="sm" color="accent">
            Pro
          </Chip>
        </Card.Title>
        <Card.Description>
          Screenshots and visuals, shown at the top of the case study. Images are compressed automatically.
        </Card.Description>
      </Card.Header>
      <Card.Content className="flex flex-col gap-4">
        {!caseStudyId ? (
          <p className="text-sm text-muted">Save the case study first, then add images.</p>
        ) : plan === null ? (
          <Spinner size="sm" />
        ) : limit === 0 ? (
          <p className="text-sm text-muted">
            Images are part of Folioseen Pro.{" "}
            <Link className="font-medium text-accent underline" to="/app/settings#billing">
              Upgrade to Pro
            </Link>
          </p>
        ) : (
          <>
            {images && images.length > 0 ? (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {images.map((img) => (
                  <li key={img.id} className="group relative overflow-hidden rounded-xl bg-default">
                    <img src={imageUrl(img.path)} alt="" className="aspect-[4/3] w-full object-cover" loading="lazy" />
                    <Button
                      size="sm"
                      variant="danger"
                      className="absolute right-2 top-2"
                      onPress={() => remove(img)}
                      aria-label="Delete image"
                    >
                      Delete
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={input}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                hidden
                onChange={(e) => onFiles(e.target.files)}
              />
              <Button
                variant="secondary"
                isPending={uploading > 0}
                isDisabled={(images?.length ?? 0) >= limit}
                onPress={() => input.current?.click()}
              >
                {uploading > 0 ? `Uploading ${uploading}…` : "Add images"}
              </Button>
              <span className="text-sm text-muted">
                {images?.length ?? 0} / {limit}
              </span>
            </div>
          </>
        )}
        {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
      </Card.Content>
    </Card>
  );
}
