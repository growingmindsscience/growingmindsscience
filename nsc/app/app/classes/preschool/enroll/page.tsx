import { startPreschoolClassCheckout } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Enroll in Preschool years" };

/**
 * Where an "Enroll now" link lands after sign-in or sign-up: it goes
 * straight to Stripe Checkout, so the parent does not have to find and
 * press Enroll a second time. Always redirects (checkout, the classroom
 * for an owner, or the classroom with the reason enrollment is closed).
 */
export default async function PreschoolEnrollPage() {
  await startPreschoolClassCheckout();
  return null;
}
