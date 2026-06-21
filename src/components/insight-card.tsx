import { Lightbulb, Sparkles, TrendingUp } from "lucide-react";
import { CategoryChip } from "@/components/category-chip";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";
import type { EmployerInsight } from "@/lib/types";

export function InsightCard({ insight }: { insight: EmployerInsight }) {
  return (
    <Card id="insights" className="overflow-hidden">
      <div className="bg-primary p-4 text-white">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          <CardTitle className="text-white">AI insight for HR</CardTitle>
          <Badge className="ml-auto bg-white/20 text-white ring-white/30">
            {Math.round(insight.confidence * 100)}% confident
          </Badge>
        </div>
        <p className="mt-2 text-sm text-white/90">{insight.summary}</p>
      </div>
      <CardContent className="space-y-4 pt-4">
        <div className="grid grid-cols-3 gap-2">
          <Metric label="Approved" value={`${insight.totalApproved}`} />
          <Metric label="Routed to providers" value={formatMoney(insight.totalRoutedToProviders)} />
          <Metric label="Budget unused" value={`${Math.round(insight.unusedBudgetRate * 100)}%`} />
        </div>

        {insight.topCategories.length > 0 && (
          <div>
            <p className="mb-2 inline-flex items-center gap-1.5 text-sm font-semibold">
              <TrendingUp className="h-4 w-4 text-success" /> What people value
            </p>
            <div className="space-y-1.5">
              {insight.topCategories.map((tc) => (
                <div key={tc.category} className="flex items-center gap-2">
                  <CategoryChip category={tc.category} />
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(8, tc.share)}%` }} />
                  </div>
                  <span className="tabular w-9 text-right text-xs font-medium text-muted-foreground">{tc.share}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="mb-2 inline-flex items-center gap-1.5 text-sm font-semibold">
            <Lightbulb className="h-4 w-4 text-amber-500" /> Recommended next
          </p>
          <ul className="space-y-1.5">
            {insight.recommendedActions.map((a, i) => (
              <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                <span className="text-primary">→</span>
                {a}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-secondary/40 p-2.5 text-center">
      <p className="tabular text-base font-bold leading-tight">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
