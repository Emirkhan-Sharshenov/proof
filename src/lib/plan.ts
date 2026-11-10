import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./auth";

export type Plan = "free" | "pro";

// Images per case study. Keep in sync with image_limit() in supabase/images.sql (the database enforces it).
export const IMAGE_LIMIT: Record<Plan, number> = { free: 0, pro: 20 };

export function usePlan(): Plan | null {
  const { session } = useAuth();
  const [plan, setPlan] = useState<Plan | null>(null);
  useEffect(() => {
    if (!session) return;
    supabase
      .from("profiles")
      .select("plan")
      .eq("user_id", session.user.id)
      .maybeSingle()
      .then(({ data }) => setPlan((data?.plan as Plan | undefined) ?? "free"));
  }, [session]);
  return plan;
}
