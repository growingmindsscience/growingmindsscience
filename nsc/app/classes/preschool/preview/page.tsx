import { ClassPreview, previewMetadata } from "@/components/class-preview";

export const dynamic = "force-dynamic";
export async function generateMetadata() { return previewMetadata("preschool"); }
export default function PreschoolPreviewPage() { return <ClassPreview courseSlug="preschool" />; }
