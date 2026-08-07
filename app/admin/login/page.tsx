import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ reset?: string }> }) {
  const user = await getSessionUser();
  if (user) redirect("/admin");
  const { reset } = await searchParams;
  return <LoginForm resetSuccess={reset === "success"} />;
}
