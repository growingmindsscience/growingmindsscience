import { CLASS_BUNDLE_FOUR } from "@/lib/classes";
import { BundleSuccess } from "../../bundle/bundle-success";

export const dynamic = "force-dynamic";
export const metadata = { title: "Welcome to all four classes" };

export default async function AllFourSuccessPage({ searchParams }: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: sessionId } = await searchParams;
  return <BundleSuccess bundle={CLASS_BUNDLE_FOUR} sessionId={sessionId} />;
}
