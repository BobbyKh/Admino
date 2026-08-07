import { requireRole } from "@/lib/auth";
import { OnboardingForm } from "./onboarding-form";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  await requireRole("super_admin");
  return <OnboardingForm />;
}
