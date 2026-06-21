"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Banknote, Bitcoin, Loader2, Plus, Power, ShieldAlert, ShieldCheck, Star, Trash2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MethodStatusBadge } from "@/components/payout-status-badge";
import { toast } from "@/components/toaster";
import type { BankAccountType, CryptoNetwork, CurrencyCode, PayoutMethod, PayoutMethodType } from "@/lib/types";
import type { RailStatus } from "@/lib/finance-config";

const NETWORKS: { value: CryptoNetwork; label: string; assets: string[] }[] = [
  { value: "ETH-Sepolia", label: "Ethereum (Sepolia testnet)", assets: ["ETH", "USDC"] },
  { value: "MATIC-Amoy", label: "Polygon (Amoy testnet)", assets: ["MATIC", "USDC"] },
  { value: "BTC-Testnet", label: "Bitcoin (testnet)", assets: ["tBTC"] },
];

const ICON: Record<PayoutMethodType, React.ReactNode> = {
  bank: <Banknote className="h-4 w-4" />,
  paypal: <Wallet className="h-4 w-4" />,
  crypto: <Bitcoin className="h-4 w-4" />,
};

function EnvBadge({ env }: { env: PayoutMethod["environment"] }) {
  return env === "live" ? <Badge variant="success">Live</Badge> : <Badge variant="outline">Sandbox</Badge>;
}

export function PayoutMethodsManager({
  initial,
  railStatuses,
}: {
  initial: PayoutMethod[];
  railStatuses: RailStatus[];
}) {
  const router = useRouter();
  const [adding, setAdding] = React.useState<PayoutMethodType | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);

  const railByType = Object.fromEntries(railStatuses.map((r) => [r.rail, r])) as Record<PayoutMethodType, RailStatus>;

  async function call(url: string, method: string, body?: object) {
    return fetch(url, {
      method,
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    }).then((r) => r.json());
  }

  async function act(id: string, run: () => Promise<{ ok: boolean; error?: string }>, okMsg?: string) {
    setBusy(id);
    const res = await run();
    if (!res.ok) toast("Action failed", { kind: "error", description: res.error });
    else if (okMsg) toast(okMsg, { kind: "success" });
    router.refresh();
    setBusy(null);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>
          Validation is real (ISO&nbsp;7064 IBAN, ISO&nbsp;9362 BIC, chain-aware crypto checksums). We store a
          tokenized reference + masked details only — never your full IBAN, PayPal password, private key
          or seed phrase. Unconfigured rails run a labelled <strong>sandbox simulator</strong>; live money
          moves only once a licensed provider is configured and compliance is cleared.
        </span>
      </div>

      {/* Rail status / setup */}
      <div className="grid gap-2 sm:grid-cols-3">
        {railStatuses.map((r) => (
          <div key={r.rail} className="rounded-xl border border-border/70 bg-card p-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold capitalize">{r.rail}</span>
              {r.mode === "live" ? (
                <Badge variant="success">Live</Badge>
              ) : r.mode === "sandbox" ? (
                <Badge variant="primary">Sandbox</Badge>
              ) : (
                <Badge variant="warning">Setup required</Badge>
              )}
            </div>
            <p className="mt-1 text-muted-foreground">{r.provider}</p>
            {r.mode === "unconfigured" && (
              <p className="mt-1 text-muted-foreground">Set {r.missing.join(", ")} to enable. Sandbox simulator active.</p>
            )}
          </div>
        ))}
      </div>

      {initial.length === 0 && !adding && (
        <p className="text-sm text-muted-foreground">No payout destinations yet — add one to receive Perkline Bonuses.</p>
      )}

      {initial.map((m) => (
        <div key={m.id} className={`flex flex-wrap items-center gap-3 rounded-xl border border-border/70 bg-card p-3 shadow-soft ${m.disabled ? "opacity-60" : ""}`}>
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-primary">{ICON[m.type]}</span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
              {m.label}
              {m.isDefault && !m.disabled && <Badge variant="primary">Default</Badge>}
              {m.disabled ? <Badge variant="default">Disabled</Badge> : <MethodStatusBadge status={m.status} />}
              <EnvBadge env={m.environment} />
            </div>
            <p className="font-mono text-xs text-muted-foreground">
              {m.type.toUpperCase()} · {m.mask}
              {m.bic ? ` · ${m.bic}` : ""}
              {m.bankName ? ` · ${m.bankName}` : ""}
              {m.network ? ` · ${m.network}${m.asset ? ` · ${m.asset}` : ""}` : ` · ${m.currency}`}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {m.status === "pending" && !m.disabled && (
              <Button variant="outline" size="sm" onClick={() => act(m.id, () => call(`/api/payout-methods/${m.id}/verify`, "POST"), "Method verified")} disabled={busy !== null}>
                {busy === m.id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ShieldCheck className="h-4 w-4" aria-hidden />}
                Verify
              </Button>
            )}
            {m.status === "verified" && !m.isDefault && !m.disabled && (
              <Button variant="ghost" size="sm" onClick={() => act(m.id, () => call(`/api/payout-methods/${m.id}`, "PATCH", { action: "default" }))} title="Make default" aria-label={`Make ${m.label} the default`} disabled={busy !== null}>
                <Star className="h-4 w-4" aria-hidden />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => act(m.id, () => call(`/api/payout-methods/${m.id}`, "PATCH", { action: m.disabled ? "enable" : "disable" }))}
              title={m.disabled ? "Enable" : "Disable"}
              aria-label={`${m.disabled ? "Enable" : "Disable"} ${m.label}`}
              disabled={busy !== null}
            >
              <Power className={`h-4 w-4 ${m.disabled ? "text-success" : "text-muted-foreground"}`} aria-hidden />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => act(m.id, () => call(`/api/payout-methods/${m.id}`, "DELETE"))} title="Remove" aria-label={`Remove ${m.label}`} disabled={busy !== null}>
              <Trash2 className="h-4 w-4 text-destructive" aria-hidden />
            </Button>
          </div>
        </div>
      ))}

      {adding ? (
        <AddForm type={adding} rail={railByType[adding]} onCancel={() => setAdding(null)} onDone={() => { setAdding(null); router.refresh(); }} />
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setAdding("bank")}>
            <Banknote className="h-4 w-4" /> Add bank / IBAN
          </Button>
          <Button variant="outline" onClick={() => setAdding("paypal")}>
            <Wallet className="h-4 w-4" /> Add PayPal
          </Button>
          <Button variant="outline" onClick={() => setAdding("crypto")}>
            <Bitcoin className="h-4 w-4" /> Add crypto wallet
          </Button>
        </div>
      )}
    </div>
  );
}

function AddForm({ type, rail, onCancel, onDone }: { type: PayoutMethodType; rail: RailStatus; onCancel: () => void; onDone: () => void }) {
  const [label, setLabel] = React.useState(type === "bank" ? "Personal IBAN" : type === "paypal" ? "My PayPal" : "My wallet");
  const [currency, setCurrency] = React.useState<CurrencyCode>("ALL");
  const [holderName, setHolderName] = React.useState("Elira Hoxha");
  const [country, setCountry] = React.useState("AL");
  const [iban, setIban] = React.useState("AL47212110090000000235698741");
  const [bic, setBic] = React.useState("NCBAALTX");
  const [bankName, setBankName] = React.useState("BKT — Banka Kombëtare Tregtare");
  const [accountType, setAccountType] = React.useState<BankAccountType>("checking");
  const [email, setEmail] = React.useState("elira@example.com");
  const [network, setNetwork] = React.useState<CryptoNetwork>("ETH-Sepolia");
  const [asset, setAsset] = React.useState("USDC");
  const [address, setAddress] = React.useState("0x1111aAaa2222BbBb3333cCcc4444dDdd5555eEeE");
  const [confirmNetwork, setConfirmNetwork] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const assets = NETWORKS.find((n) => n.value === network)?.assets ?? ["USDC"];

  async function submit() {
    if (type === "crypto" && !confirmNetwork) {
      toast("Confirm the network", { kind: "info", description: "Funds sent to the wrong network are unrecoverable." });
      return;
    }
    setBusy(true);
    let body: Record<string, unknown> = { type, label, currency };
    if (type === "bank") body = { ...body, holderName, country, iban, bic, bankName, accountType };
    if (type === "paypal") body = { ...body, email };
    if (type === "crypto") body = { ...body, network, asset, address };
    const res = await fetch("/api/payout-methods", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => r.json());
    if (!res.ok) {
      toast("Couldn't add", { kind: "error", description: res.error });
      setBusy(false);
      return;
    }
    toast("Destination added", { kind: "success", description: "Now verify it to enable payouts." });
    onDone();
  }

  return (
    <div className="space-y-3 rounded-xl border border-border/70 bg-card p-4 shadow-soft">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">
          Add {type === "bank" ? "bank account" : type === "paypal" ? "PayPal" : "crypto wallet"}
        </p>
        <Badge variant={rail?.mode === "live" ? "success" : rail?.mode === "sandbox" ? "primary" : "warning"}>
          {rail?.provider} · {rail?.mode}
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Label"><Input value={label} onChange={(e) => setLabel(e.target.value)} /></Field>
        <Field label="Currency">
          <select aria-label="Currency" value={currency} onChange={(e) => setCurrency(e.target.value as CurrencyCode)} className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm">
            {(["ALL", "EUR", "USD"] as CurrencyCode[]).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>

        {type === "bank" && (
          <>
            <Field label="Legal account holder"><Input value={holderName} onChange={(e) => setHolderName(e.target.value)} /></Field>
            <Field label="Country (ISO-2)"><Input value={country} maxLength={2} onChange={(e) => setCountry(e.target.value.toUpperCase())} /></Field>
            <Field label="Bank name"><Input value={bankName} onChange={(e) => setBankName(e.target.value)} /></Field>
            <Field label="BIC / SWIFT"><Input value={bic} onChange={(e) => setBic(e.target.value.toUpperCase())} className="font-mono" /></Field>
            <Field label="Account type">
              <select aria-label="Account type" value={accountType} onChange={(e) => setAccountType(e.target.value as BankAccountType)} className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm">
                <option value="checking">Checking</option>
                <option value="savings">Savings</option>
              </select>
            </Field>
            <Field label="IBAN" full><Input value={iban} onChange={(e) => setIban(e.target.value.toUpperCase())} className="font-mono text-xs" /></Field>
          </>
        )}
        {type === "paypal" && (
          <Field label="PayPal email (verified recipient)" full><Input value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        )}
        {type === "crypto" && (
          <>
            <Field label="Network">
              <select aria-label="Network" value={network} onChange={(e) => { setNetwork(e.target.value as CryptoNetwork); setConfirmNetwork(false); }} className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm">
                {NETWORKS.map((n) => <option key={n.value} value={n.value}>{n.label}</option>)}
              </select>
            </Field>
            <Field label="Asset">
              <select aria-label="Asset" value={asset} onChange={(e) => setAsset(e.target.value)} className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm">
                {assets.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </Field>
            <Field label="Wallet address (testnet)" full><Input value={address} onChange={(e) => setAddress(e.target.value)} className="font-mono text-xs" /></Field>
          </>
        )}
      </div>

      {type === "crypto" && (
        <label className="flex items-start gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={confirmNetwork} onChange={(e) => setConfirmNetwork(e.target.checked)} className="mt-0.5" />
          I confirm <strong className="mx-1">{asset}</strong> on <strong className="mx-1">{network}</strong> is correct. Network/address lock once a payout is initiated and wrong-network sends are unrecoverable.
        </label>
      )}

      <div className="flex gap-2">
        <Button onClick={submit} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Add destination
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={busy}>Cancel</Button>
      </div>
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={full ? "block sm:col-span-2" : "block"}>
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
