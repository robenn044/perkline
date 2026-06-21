import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** The employer dashboard moved to /admin. Keep the old path working. */
export default function EmployerRedirect() {
  redirect("/admin");
}
