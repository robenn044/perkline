import Link from "next/link";
import { ArrowLeft, Check, Globe, Languages } from "lucide-react";
import { Logo } from "@/components/logo";
import { CategoryChip } from "@/components/category-chip";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CATEGORY_LABELS } from "@/lib/catalog";
import { formatMoney } from "@/lib/money";
import { getMarkets } from "@/lib/store";
import type { Category, LocaleCode } from "@/lib/types";

export const dynamic = "force-dynamic";

const LOCALE_NAMES: Record<LocaleCode, string> = {
  "en-AL": "English (Albania)",
  "sq-AL": "Shqip (Albania)",
  "it-IT": "Italiano (Italia)",
  "es-ES": "Español (España)",
};

export default function MarketPage() {
  const markets = getMarkets();
  const active = markets[0];
  const sampleCategories: Category[] = ["wellness", "food", "learning"];
  const localesToShow: LocaleCode[] = ["en-AL", "sq-AL", "it-IT"];

  return (
    <main id="main-content" className="container max-w-4xl space-y-6 py-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Logo />
        </Link>
        <Link href="/employee" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to app
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Market & localization</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Perkline is architected for any country — every monetary value carries a currency code, every
          category label is localizable, and providers are scoped per market. The live demo runs the
          Albania market; here's the configuration that makes it work, and the switch that opens Milan
          tomorrow without a rewrite.
        </p>
      </div>

      {/* Active market */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between bg-primary p-4 text-white">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            <CardTitle className="text-white">Active market · {active.city}, {active.countryCode}</CardTitle>
          </div>
          <Badge className="bg-white/20 text-white ring-white/30">Live</Badge>
        </div>
        <CardContent className="grid gap-4 pt-4 sm:grid-cols-3">
          <Field label="Default currency" value={`${active.defaultCurrency} · ${formatMoney(20000, active.defaultCurrency)}`} />
          <Field label="Default locale" value={LOCALE_NAMES[active.defaultLocale]} />
          <Field label="Categories" value={`${active.categories.length} localized`} />
          <div className="sm:col-span-3">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Supported locales</p>
            <div className="flex flex-wrap gap-1.5">
              {active.supportedLocales.map((l) => (
                <Badge key={l} variant="outline">
                  <Languages className="h-3.5 w-3.5" /> {LOCALE_NAMES[l]}
                </Badge>
              ))}
            </div>
          </div>
          <div className="sm:col-span-3">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Supported currencies</p>
            <div className="flex flex-wrap gap-1.5">
              {active.supportedCurrencies.map((c) => (
                <Badge key={c} variant="outline">{c} · {formatMoney(1500, c)}</Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Localization proof table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Category labels per locale</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Category</th>
                  {localesToShow.map((l) => (
                    <th key={l} className="pb-2 pr-4 font-medium">{l}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sampleCategories.map((c) => (
                  <tr key={c} className="border-b last:border-0">
                    <td className="py-2 pr-4">
                      <CategoryChip category={c} />
                    </td>
                    {localesToShow.map((l) => (
                      <td key={l} className="py-2 pr-4 font-medium">{CATEGORY_LABELS[c][l]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Expansion markets */}
      <div>
        <h2 className="mb-3 text-lg font-bold tracking-tight">Ready for the world</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {markets.map((m) => (
            <Card key={m.id} className={m.id === active.id ? "border-primary/40 ring-1 ring-primary/20" : "opacity-90"}>
              <CardContent className="flex items-center gap-4 py-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-lg font-bold">
                  {m.countryCode}
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{m.city}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.defaultCurrency} · {LOCALE_NAMES[m.defaultLocale]}
                  </p>
                </div>
                {m.id === active.id ? (
                  <Badge variant="success"><Check className="h-3.5 w-3.5" /> Live</Badge>
                ) : (
                  <Badge variant="outline">Config-ready</Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-secondary/40 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold">{value}</p>
    </div>
  );
}
