import { SellerInvitationForm } from "./seller-invitation-form";

export const dynamic = "force-dynamic";

export default async function AcceptSellerInvitationPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return <SellerInvitationForm token={token} />;
}
