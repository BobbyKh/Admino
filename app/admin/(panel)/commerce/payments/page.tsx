import { PaymentManager } from "@/components/admin/payment-manager";
import { getPaymentSecretStatus, listPaymentConfigurations } from "@/lib/actions/index";
import { requireRole } from "@/lib/auth";
export const dynamic = "force-dynamic";
export default async function PaymentsPage() { await requireRole("admin"); const [configurations, secretStatus] = await Promise.all([listPaymentConfigurations(), getPaymentSecretStatus()]); return <PaymentManager configurations={configurations} secretStatus={secretStatus} />; }
