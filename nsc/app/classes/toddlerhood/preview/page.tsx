import { ClassPreview, previewMetadata } from "@/components/class-preview";

export const dynamic = "force-dynamic";
export async function generateMetadata() { return previewMetadata("toddlerhood"); }
export default function ToddlerPreviewPage() { return <ClassPreview courseSlug="toddlerhood" />; }
