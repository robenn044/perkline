"use client";

import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main-content" className="container flex min-h-dvh flex-col items-center justify-center gap-4 text-center">
      <AlertTriangle className="h-10 w-10 text-amber-500" />
      <div>
        <h1 className="text-2xl font-bold">Something glitched</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Try again, or reset the demo to a clean state.
        </p>
      </div>
      <div className="flex gap-2">
        <Button onClick={reset}>
          <RotateCcw className="h-4 w-4" /> Try again
        </Button>
        <Button variant="outline" asChild>
          <Link href="/">Back to start</Link>
        </Button>
      </div>
    </main>
  );
}
