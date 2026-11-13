import { CLASS_BUNDLE } from "@/lib/classes";
import { BundleSuccess } from "../bundle-success";

export const dynamic = "force-dynamic";
export const metadata = { title: "Welcome to the three age classes" };

export default async function BundleSuccessPage({ searchParams }: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: sessionId } = await searchParams;
  return <BundleSuccess bundle={CLASS_BUNDLE} sessionId={sessionId} />;
}
