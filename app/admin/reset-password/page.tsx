import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { ResetPasswordForm } from "./reset-password-form";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const user = await getSessionUser();
  if (user) redirect("/admin");
  const { token } = await searchParams;
  return <ResetPasswordForm token={token ?? ""} />;
}
