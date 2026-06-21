import { Badge } from "@/components/ui/badge";
import type { PayoutStatus, PayoutMethodStatus } from "@/lib/types";

const PAYOUT: Record<PayoutStatus, { variant: "default" | "primary" | "warning" | "success" | "destructive"; label: string }> = {
  draft: { variant: "default", label: "Draft" },
  pending_review: { variant: "warning", label: "Pending review" },
  approved: { variant: "primary", label: "Approved" },
  processing: { variant: "primary", label: "Processing" },
  paid: { variant: "primary", label: "Paid" },
  confirmed: { variant: "success", label: "Confirmed" },
  failed: { variant: "destructive", label: "Failed" },
};

export function PayoutStatusBadge({ status }: { status: PayoutStatus }) {
  const c = PAYOUT[status];
  return <Badge variant={c.variant}>{c.label}</Badge>;
}

const METHOD: Record<PayoutMethodStatus, { variant: "default" | "warning" | "success" | "destructive"; label: string }> = {
  pending: { variant: "warning", label: "Pending verification" },
  verified: { variant: "success", label: "Verified" },
  failed: { variant: "destructive", label: "Verification failed" },
  disabled: { variant: "default", label: "Disabled" },
};

export function MethodStatusBadge({ status }: { status: PayoutMethodStatus }) {
  const c = METHOD[status];
  return <Badge variant={c.variant}>{c.label}</Badge>;
}
