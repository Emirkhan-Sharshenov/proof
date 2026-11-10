export type CaseStudy = {
  id: string;
  title: string;
  summary: string;
  body: string;
  is_nda: boolean;
  created_at: string;
  updated_at: string;
};

export type View = { case_study_id: string; seconds: number; opened_at: string };

export type Visit = {
  id: string;
  created_at: string;
  last_seen_at: string;
  user_agent: string | null;
  referrer: string | null;
  case_study_views: View[];
};

export type LinkRow = {
  id: string;
  slug: string;
  client_name: string;
  note: string;
  is_active: boolean;
  created_at: string;
};
