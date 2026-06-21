import Link from "next/link";
import { Bell } from "lucide-react";
import { timeAgo } from "@/lib/utils";
import type { Notification } from "@/lib/types";

/** Surfaces a user's most recent notifications inline (server-rendered). */
export function NotificationsStrip({ notifications }: { notifications: Notification[] }) {
  if (notifications.length === 0) return null;
  return (
    <section aria-label="Notifications" className="rounded-2xl border border-primary/25 bg-primary/5 p-4">
      <h2 className="mb-2 inline-flex items-center gap-1.5 text-sm font-semibold">
        <Bell className="h-4 w-4 text-primary" aria-hidden />
        What&apos;s new
      </h2>
      <ul className="space-y-1.5">
        {notifications.map((n) => {
          const inner = (
            <>
              <span className="font-medium text-foreground">{n.title}.</span>{" "}
              <span className="text-muted-foreground">{n.body}</span>{" "}
              <span className="text-xs text-muted-foreground">· {timeAgo(n.createdAt)}</span>
            </>
          );
          return (
            <li key={n.id} className="text-sm leading-snug">
              {n.link ? (
                <Link href={n.link} className="rounded hover:underline">
                  {inner}
                </Link>
              ) : (
                inner
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
