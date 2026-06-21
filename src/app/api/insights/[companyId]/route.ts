import { NextResponse } from "next/server";
import { buildInsight } from "@/lib/insights";
import { getCompany, getEmployees, getRequestsByCompany } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { companyId: string } }) {
  const company = getCompany(params.companyId);
  if (!company) {
    return NextResponse.json({ ok: false, error: "Company not found." }, { status: 404 });
  }
  const employees = getEmployees().filter((e) => e.companyId === company.id);
  const insight = buildInsight(company.name, employees, getRequestsByCompany(company.id));
  return NextResponse.json({ ok: true, insight });
}
