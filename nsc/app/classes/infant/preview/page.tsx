import { ClassPreview, previewMetadata } from "@/components/class-preview";

export const dynamic = "force-dynamic";
export async function generateMetadata() { return previewMetadata("infant"); }
export default function InfantPreviewPage() { return <ClassPreview courseSlug="infant" />; }
