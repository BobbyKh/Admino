import { getSessionCustomer } from "@/lib/customer-auth";
import { AccountSidebar } from "@/components/account/account-sidebar";

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const customer = await getSessionCustomer();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">My Account</h1>
      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <AccountSidebar isLoggedIn={!!customer} />
        <main>{children}</main>
      </div>
    </div>
  );
}
