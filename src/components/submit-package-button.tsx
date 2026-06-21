"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { toast } from "@/components/toaster";
import type { Package } from "@/lib/types";

/** Submits a package for employer approval, then routes to its live timeline. */
export function SubmitPackageButton({
  pkg,
  origin = "offer",
  disabled,
  label = "Submit for approval",
  variant = "default",
  size = "lg",
  className,
}: {
  pkg: Package;
  origin?: "concierge" | "route" | "offer";
  disabled?: boolean;
  label?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  async function submit() {
    setLoading(true);
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ package: pkg, origin }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast("Couldn't submit", { kind: "error", description: data.error });
        setLoading(false);
        return;
      }
      toast("Sent to AlbaTech HR", {
        kind: "success",
        description: "Funds will route directly to providers once approved.",
      });
      router.push(`/employee/requests/${data.request.id}`);
    } catch {
      toast("Network error", { kind: "error" });
      setLoading(false);
    }
  }

  return (
    <Button onClick={submit} disabled={disabled || loading} variant={variant} size={size} className={className}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      {label}
    </Button>
  );
}
