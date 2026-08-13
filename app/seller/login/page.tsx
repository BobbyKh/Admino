import { redirect } from "next/navigation";
import { getSellerContext } from "@/lib/seller-auth";
import { SellerLoginForm } from "./seller-login-form";

export const dynamic = "force-dynamic";

export default async function SellerLoginPage() {
  if (await getSellerContext()) redirect("/seller");
  return <SellerLoginForm />;
}
