import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getQuestionnaire, saveQuestionnaire } from "@/lib/store";
import { questionnaireSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session?.employeeId) return NextResponse.json({ ok: false, error: "Not authorized." }, { status: 401 });
  return NextResponse.json({ ok: true, questionnaire: getQuestionnaire(session.employeeId) ?? null });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "employee" || !session.employeeId) {
    return NextResponse.json({ ok: false, error: "Not authorized." }, { status: 401 });
  }
  const parsed = questionnaireSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Please complete all questions." }, { status: 400 });
  }
  const saved = saveQuestionnaire(session.employeeId, parsed.data, {
    userId: session.sub,
    name: session.name,
    role: "employee",
  });
  return NextResponse.json({ ok: true, questionnaire: saved });
}
