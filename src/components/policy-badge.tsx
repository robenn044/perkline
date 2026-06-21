import { CheckCircle2, ShieldAlert, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { PolicyStatus } from "@/lib/types";

const MAP: Record<PolicyStatus, { variant: "success" | "warning" | "destructive"; label: string; icon: React.ReactNode }> = {
  within_policy: { variant: "success", label: "Within policy", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  needs_approval: { variant: "warning", label: "Needs sign-off", icon: <ShieldCheck className="h-3.5 w-3.5" /> },
  blocked: { variant: "destructive", label: "Outside policy", icon: <ShieldAlert className="h-3.5 w-3.5" /> },
};

export function PolicyBadge({ status }: { status: PolicyStatus }) {
  const cfg = MAP[status];
  return (
    <Badge variant={cfg.variant}>
      {cfg.icon}
      {cfg.label}
    </Badge>
  );
}
