import { startAllFourCheckout } from "../../bundle/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Enroll in all four classes" };

/** Where the four-class bundle's "Enroll" link lands after sign-in or sign-up: straight to Stripe Checkout. */
export default async function AllFourEnrollPage() {
  await startAllFourCheckout();
  return null;
}
