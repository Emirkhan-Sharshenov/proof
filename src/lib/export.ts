import { supabase } from "./supabase";
import { imageUrl } from "./images";
import { device, shareUrl } from "./format";

// Builds a .zip of everything the signed-in user owns, entirely in the browser:
//   README.txt, data.json, links.csv, visits.csv,
//   case-studies/<nn-title>/case-study.md + images/<n>.webp

type Row = Record<string, unknown>;

const enc = new TextEncoder();

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "untitled"
  );
}

function csv(rows: (string | number | boolean | null | undefined)[][]): string {
  const cell = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  // BOM so Excel opens UTF-8 correctly.
  return "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}

async function all<T = Row>(table: string, columns = "*"): Promise<T[]> {
  const { data, error } = await supabase.from(table).select(columns);
  if (error) throw new Error(`${table}: ${error.message}`);
  return (data ?? []) as T[];
}

export async function buildExport(onProgress?: (text: string) => void): Promise<Blob> {
  const { zipSync } = await import("fflate");
  onProgress?.("Reading your data…");

  const [caseStudies, links, items, visits, views, images, testimonials, profiles] = await Promise.all([
    all<Row & { id: string; title: string; summary: string; body: string; is_nda: boolean; created_at: string }>("case_studies"),
    all<Row & { id: string; slug: string; client_name: string; note: string; is_active: boolean; created_at: string }>("links"),
    all<Row & { link_id: string; case_study_id: string; position: number }>("link_case_studies"),
    all<Row & { id: string; link_id: string; created_at: string; last_seen_at: string; user_agent: string | null; referrer: string | null }>(
      "visits",
      "id, link_id, created_at, last_seen_at, user_agent, referrer",
    ),
    all<Row & { visit_id: string; case_study_id: string; seconds: number; opened_at: string }>("case_study_views"),
    all<Row & { id: string; case_study_id: string; path: string; width: number; height: number; position: number }>(
      "case_study_images",
      "id, case_study_id, path, width, height, position, created_at",
    ).catch(() => []),
    all<Row & { case_study_id: string; status: string; author_name: string; author_role: string | null; body: string; is_visible: boolean; submitted_at: string }>(
      "testimonials",
      "case_study_id, client_name, status, author_name, author_role, body, is_visible, submitted_at, created_at",
    ).catch(() => []),
    all("profiles", "plan, telegram_chat_id").catch(() => []),
  ]);

  const files: Record<string, Uint8Array | [Uint8Array, { level: 0 }]> = {};
  const caseTitle = new Map(caseStudies.map((c) => [c.id, c.title]));

  // Case studies as Markdown, with their images.
  const sorted = [...caseStudies].sort((a, b) => a.created_at.localeCompare(b.created_at));
  for (const [index, c] of sorted.entries()) {
    const folder = `case-studies/${String(index + 1).padStart(2, "0")}-${slugify(c.title)}`;
    const own = images.filter((i) => i.case_study_id === c.id).sort((a, b) => a.position - b.position);
    const imageNames: string[] = [];
    for (const [n, img] of own.entries()) {
      onProgress?.(`Downloading images: ${c.title} (${n + 1}/${own.length})`);
      const res = await fetch(imageUrl(img.path));
      if (!res.ok) continue;
      const name = `images/${String(n + 1).padStart(2, "0")}.webp`;
      files[`${folder}/${name}`] = [new Uint8Array(await res.arrayBuffer()), { level: 0 }];
      imageNames.push(name);
    }
    const quotes = testimonials
      .filter((t) => t.case_study_id === c.id && t.status === "submitted")
      .map((t) => `> ${t.body.replace(/\n/g, "\n> ")}\n>\n> — ${t.author_name}${t.author_role ? `, ${t.author_role}` : ""} (${t.submitted_at.slice(0, 10)}${t.is_visible ? "" : ", hidden"})`);
    const md = [
      `# ${c.title}`,
      c.is_nda ? "\n**Under NDA**" : "",
      c.summary ? `\n${c.summary}` : "",
      ...imageNames.map((n) => `\n![](${n})`),
      c.body ? `\n${c.body}` : "",
      quotes.length ? `\n## Client testimonials\n\n${quotes.join("\n\n")}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    files[`${folder}/case-study.md`] = enc.encode(md + "\n");
  }

  // Links overview.
  const secondsByVisit = new Map<string, number>();
  for (const v of views) secondsByVisit.set(v.visit_id, (secondsByVisit.get(v.visit_id) ?? 0) + v.seconds);
  files["links.csv"] = enc.encode(
    csv([
      ["client", "url", "active", "created", "case studies", "visits", "total reading seconds", "last opened", "note"],
      ...links.map((l) => {
        const lv = visits.filter((v) => v.link_id === l.id);
        const shown = items
          .filter((i) => i.link_id === l.id)
          .sort((a, b) => a.position - b.position)
          .map((i) => caseTitle.get(i.case_study_id) ?? "")
          .join("; ");
        return [
          l.client_name,
          shareUrl(l.slug),
          l.is_active,
          l.created_at,
          shown,
          lv.length,
          lv.reduce((s, v) => s + (secondsByVisit.get(v.id) ?? 0), 0),
          lv.map((v) => v.last_seen_at).sort().at(-1) ?? "",
          l.note,
        ];
      }),
    ]),
  );

  // One row per case study read in each visit (or one row if nothing was opened).
  const linkName = new Map(links.map((l) => [l.id, l.client_name]));
  const visitRows: (string | number)[][] = [];
  for (const v of [...visits].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    const base = [linkName.get(v.link_id) ?? "", v.created_at, v.last_seen_at, device(v.user_agent), v.referrer ?? ""];
    const vv = views.filter((x) => x.visit_id === v.id);
    if (vv.length === 0) visitRows.push([...base, "", 0]);
    for (const x of vv) visitRows.push([...base, caseTitle.get(x.case_study_id) ?? "", x.seconds]);
  }
  files["visits.csv"] = enc.encode(
    csv([["client", "visit started", "last activity", "device", "referrer", "case study", "seconds"], ...visitRows]),
  );

  // Everything, machine-readable.
  files["data.json"] = enc.encode(
    JSON.stringify(
      {
        exported_at: new Date().toISOString(),
        profile: profiles[0] ?? null,
        case_studies: caseStudies,
        case_study_images: images,
        testimonials,
        links,
        link_case_studies: items,
        visits,
        case_study_views: views,
      },
      null,
      2,
    ),
  );

  files["README.txt"] = enc.encode(
    [
      "Folioseen export",
      `Created: ${new Date().toISOString()}`,
      "",
      "case-studies/   One folder per case study: case-study.md (Markdown) and its images.",
      "links.csv       Your client links with visit totals.",
      "visits.csv      Every visit and how long each case study was read.",
      "data.json       Everything above in one machine-readable file.",
      "",
      "CSV files open in Excel, Google Sheets or Numbers.",
    ].join("\r\n"),
  );

  onProgress?.("Packing the archive…");
  const zipped = zipSync(files, { level: 6 });
  return new Blob([zipped as BlobPart], { type: "application/zip" });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
