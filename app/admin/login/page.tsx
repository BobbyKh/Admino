import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const user = await getSessionUser();
  if (user) redirect("/admin");
  return <LoginForm />;
}
