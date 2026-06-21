import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getCuratedPackages, getEmployee, getOffers } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Employee feed payload: budget, fresh offers, Friday drops, curated packages. */
export async function GET() {
  const session = await getSession();
  if (!session?.employeeId) {
    return NextResponse.json({ ok: false, error: "Not authorized." }, { status: 401 });
  }
  const employee = getEmployee(session.employeeId);
  if (!employee) {
    return NextResponse.json({ ok: false, error: "Unknown employee." }, { status: 404 });
  }
  const offers = getOffers();
  return NextResponse.json({
    ok: true,
    employee: {
      id: employee.id,
      name: employee.name,
      budgetRemaining: employee.budgetRemaining,
      monthlyBudget: employee.monthlyBudget,
      streakWeeks: employee.streakWeeks,
      points: employee.points,
    },
    fresh: offers.filter((o) => o.isFresh),
    fridayDrops: offers.filter((o) => o.isFridayDrop),
    packages: getCuratedPackages(),
  });
}
