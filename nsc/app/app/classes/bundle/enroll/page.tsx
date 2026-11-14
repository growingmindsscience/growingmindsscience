import { startBundleCheckout } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Enroll in the three age classes" };

/** Where the three-class bundle's "Enroll" link lands after sign-in or sign-up: straight to Stripe Checkout. */
export default async function BundleEnrollPage() {
  await startBundleCheckout();
  return null;
}
