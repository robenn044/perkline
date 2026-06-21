import { Badge } from "@/components/ui/badge";
import type { RequestStatus } from "@/lib/types";

const MAP: Record<RequestStatus, { variant: "default" | "primary" | "warning" | "success" | "destructive"; label: string }> = {
  draft: { variant: "default", label: "Draft" },
  pending: { variant: "warning", label: "Pending approval" },
  approved: { variant: "primary", label: "Approved" },
  processing: { variant: "primary", label: "Processing" },
  paid: { variant: "primary", label: "Paid" },
  voucher_ready: { variant: "success", label: "Voucher ready" },
  rejected: { variant: "destructive", label: "Rejected" },
};

export function StatusBadge({ status }: { status: RequestStatus }) {
  const cfg = MAP[status];
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}
