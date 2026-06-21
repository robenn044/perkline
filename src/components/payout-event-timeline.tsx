import { Check, CircleDashed, ShieldCheck } from "lucide-react";
import { timeAgo } from "@/lib/utils";
import type { PayoutEvent } from "@/lib/types";

/** Renders the immutable, signed payout event trail. */
export function PayoutEventTimeline({ events }: { events: PayoutEvent[] }) {
  if (events.length === 0) return <p className="text-sm text-muted-foreground">No events yet.</p>;
  return (
    <ol className="space-y-0">
      {events.map((e, i) => {
        const last = i === events.length - 1;
        const failed = e.type === "failed";
        return (
          <li key={e.id} className="relative flex gap-3 pb-4 last:pb-0">
            {!last && <span className="absolute left-[11px] top-6 h-[calc(100%-1rem)] w-0.5 bg-border" />}
            <span
              className={`relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                failed ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"
              }`}
            >
              {failed ? <CircleDashed className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium">{e.message}</p>
              <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                {e.actorName} · {timeAgo(e.createdAt)}
                <span className="inline-flex items-center gap-1 font-mono" title={`HMAC ${e.signature}`}>
                  <ShieldCheck className="h-3 w-3 text-success" /> {e.signature.slice(0, 10)}…
                </span>
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
