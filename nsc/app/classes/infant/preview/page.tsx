import type { Metadata } from "next";
import { cache } from "react";
import { freePreviewLesson } from "@/lib/classes.server";
import { CLASS_PREVIEW_CONFIGS } from "@/lib/class-preview-configs";
import { ClassPreviewPage, classPreviewMetadata } from "@/components/class-preview-page";

export const dynamic = "force-dynamic";

const CONFIG = CLASS_PREVIEW_CONFIGS.infant;
// Metadata and the page both need the lesson; read it once per request.
const loadPreview = cache(() => freePreviewLesson(CONFIG.courseSlug));

export async function generateMetadata(): Promise<Metadata> {
  return classPreviewMetadata(CONFIG, await loadPreview());
}

/** The infant class's free lesson; see components/class-preview-page.tsx. */
export default async function InfantPreviewPage() {
  return <ClassPreviewPage config={CONFIG} lesson={await loadPreview()} />;
}
