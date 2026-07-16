import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ActivityRow } from "@/lib/activity-types";

export interface ActivityFilters {
  band?: { min: number; max: number };
  domain?: string;
  theme?: string;
  maxMess?: number;
  maxDuration?: number;
  setting?: string;
}

/**
 * Published activities, filtered. Public read (RLS allows published rows for
 * everyone). Tolerant of the table not existing yet — an empty library
 * renders its empty state rather than a crash.
 */
export async function listActivities(
  filters: ActivityFilters,
): Promise<ActivityRow[]> {
  const supabase = await createClient();
  let q = supabase
    .from("activities")
    .select("*")
    .eq("status", "published")
    .order("months_min", { ascending: true })
    .order("title", { ascending: true });

  if (filters.band) {
    // Overlap: activity range intersects the band's range.
    q = q.lt("months_min", filters.band.max).gt("months_max", filters.band.min);
  }
  if (filters.domain) q = q.contains("domains", [filters.domain]);
  if (filters.theme) q = q.contains("themes", [filters.theme]);
  if (filters.maxMess) q = q.lte("mess_level", filters.maxMess);
  if (filters.maxDuration) q = q.lte("duration_min", filters.maxDuration);
  if (filters.setting) q = q.contains("setting", [filters.setting]);

  const { data, error } = await q;
  if (error) return [];
  return (data ?? []) as unknown as ActivityRow[];
}

export async function getActivity(slug: string): Promise<ActivityRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) return null;
  return (data as unknown as ActivityRow) ?? null;
}
