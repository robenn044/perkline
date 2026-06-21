import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { updateEmployeeProfile } from "@/lib/store";
import { profileSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "employee" || !session.employeeId) {
    return NextResponse.json({ ok: false, error: "Not authorized." }, { status: 401 });
  }
  const parsed = profileSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid profile fields." }, { status: 400 });
  }
  const employee = updateEmployeeProfile(session.employeeId, parsed.data);
  if (!employee) return NextResponse.json({ ok: false, error: "Employee not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
