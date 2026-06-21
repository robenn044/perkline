import { Check, Clock, CreditCard, Send, Ticket, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/utils";
import type { BenefitRequest } from "@/lib/types";

interface Step {
  key: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  done: boolean;
  at?: string;
}

export function RequestTimeline({ request }: { request: BenefitRequest }) {
  const rejected = request.status === "rejected";
  const approved = ["approved", "processing", "paid", "voucher_ready"].includes(request.status);
  const paid = request.paymentSplits.length > 0;
  const ready = request.status === "voucher_ready" && request.vouchers.length > 0;
  const redeemed = request.vouchers.length > 0 && request.vouchers.every((v) => v.status === "redeemed");

  const steps: Step[] = rejected
    ? [
        { key: "submitted", label: "Submitted to HR", icon: <Send className="h-4 w-4" />, done: true, at: request.submittedAt },
        { key: "rejected", label: "Not approved", hint: request.decisionReason, icon: <XCircle className="h-4 w-4" />, done: true, at: request.decidedAt },
      ]
    : [
        { key: "submitted", label: "Submitted to AlbaTech HR", icon: <Send className="h-4 w-4" />, done: true, at: request.submittedAt },
        { key: "approved", label: "Approved by HR", icon: <Check className="h-4 w-4" />, done: approved, at: approved ? request.decidedAt : undefined },
        { key: "paid", label: `Payment routed to ${request.paymentSplits.length || ""} provider${request.paymentSplits.length === 1 ? "" : "s"}`.trim(), icon: <CreditCard className="h-4 w-4" />, done: paid, at: paid ? request.decidedAt : undefined },
        { key: "ready", label: "Vouchers issued — ready to enjoy", icon: <Ticket className="h-4 w-4" />, done: ready, at: ready ? request.decidedAt : undefined },
      ];

  if (redeemed) {
    steps.push({ key: "redeemed", label: "All experiences redeemed", icon: <Check className="h-4 w-4" />, done: true });
  }

  return (
    <ol className="relative space-y-0">
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        return (
          <li key={step.key} className="relative flex gap-3 pb-5 last:pb-0">
            {!isLast && (
              <span
                className={cn(
                  "absolute left-[15px] top-8 h-[calc(100%-1rem)] w-0.5",
                  step.done ? "bg-primary" : "bg-border",
                )}
              />
            )}
            <span
              className={cn(
                "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ring-card",
                step.key === "rejected"
                  ? "bg-destructive text-destructive-foreground"
                  : step.done
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground",
              )}
            >
              {step.done ? step.icon : <Clock className="h-4 w-4" />}
            </span>
            <div className="pt-1">
              <p className={cn("text-sm font-semibold", !step.done && "text-muted-foreground")}>{step.label}</p>
              {step.hint && <p className="text-xs text-muted-foreground">{step.hint}</p>}
              {step.at && <p className="text-xs text-muted-foreground">{timeAgo(step.at)}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
