import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";

export default function NotFound() {
  return (
    <main id="main-content" className="container flex min-h-dvh flex-col items-center justify-center gap-4 text-center">
      <Logo />
      <Compass className="h-10 w-10 text-primary" />
      <div>
        <h1 className="text-2xl font-bold">This route doesn't exist</h1>
        <p className="mt-1 text-sm text-muted-foreground">The page you're looking for moved or was never here.</p>
      </div>
      <Button asChild>
        <Link href="/">Back to start</Link>
      </Button>
    </main>
  );
}
