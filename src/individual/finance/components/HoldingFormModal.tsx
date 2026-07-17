// src/individual/finance/components/HoldingFormModal.tsx
import { useState } from "react";
import { Field, Input, Select, Button } from "@/shared/ui";
import Modal from "@/individual/finance/components/Modal";
import { ASSET_TYPE_LABELS } from "@/individual/finance/types";
import type { Holding, HoldingInput, AssetType } from "@/individual/finance/types";
import { useCreateHolding, useUpdateHolding } from "@/individual/finance/hooks/useHoldings";

const COMMON_CURRENCIES = ["USD", "EUR", "GBP", "MUR", "ZAR"];

export default function HoldingFormModal({
  holding, onClose,
}: {
  holding?: Holding | null;
  onClose: () => void;
}) {
  const isEdit = !!holding;
  const { mutateAsync: create, isPending: creating } = useCreateHolding();
  const { mutateAsync: update, isPending: updating } = useUpdateHolding();
  const isPending = creating || updating;

  const [form, setForm] = useState<HoldingInput>({
    assetType: holding?.assetType ?? "stock",
    symbol:    holding?.symbol ?? "",
    exchange:  holding?.exchange ?? "",
    quantity:  holding?.quantity ?? 0,
    currency:  holding?.currency ?? "USD",
    costBasis: holding?.costBasis ?? undefined,
    notes:     holding?.notes ?? "",
  });
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!form.symbol.trim()) { setError("Enter a ticker symbol, e.g. AAPL."); return; }
    if (form.quantity <= 0) { setError("Quantity must be greater than zero."); return; }

    const result = isEdit
      ? await update({ id: holding!.id, input: form })
      : await create(form);

    if (!result.ok) { setError(result.error ?? "Save failed."); return; }
    onClose();
  };

  return (
    <Modal title={isEdit ? "Edit holding" : "Add investment"} onClose={onClose}>
      <div className="space-y-4">
        <Field label="Asset type">
          <Select
            value={form.assetType}
            onChange={(e) => setForm(f => ({ ...f, assetType: e.target.value as AssetType }))}
          >
            {(Object.keys(ASSET_TYPE_LABELS) as AssetType[]).map((t) => (
              <option key={t} value={t}>{ASSET_TYPE_LABELS[t]}</option>
            ))}
          </Select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Symbol" hint="e.g. AAPL, BTC, VOO">
            <Input
              placeholder="AAPL"
              value={form.symbol}
              onChange={(e) => setForm(f => ({ ...f, symbol: e.target.value.toUpperCase() }))}
            />
          </Field>
          <Field label="Exchange (optional)" hint="e.g. NASDAQ">
            <Input
              placeholder="NASDAQ"
              value={form.exchange ?? ""}
              onChange={(e) => setForm(f => ({ ...f, exchange: e.target.value.toUpperCase() }))}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Quantity">
            <Input
              type="number"
              step="any"
              value={form.quantity}
              onChange={(e) => setForm(f => ({ ...f, quantity: Number(e.target.value) || 0 }))}
            />
          </Field>
          <Field label="Currency">
            <Select
              value={form.currency}
              onChange={(e) => setForm(f => ({ ...f, currency: e.target.value }))}
            >
              {COMMON_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
        </div>

        <Field label="Cost basis (optional)" hint="Total amount you paid, in the currency above — used to show gain/loss">
          <Input
            type="number"
            placeholder="0.00"
            value={form.costBasis ?? ""}
            onChange={(e) => setForm(f => ({ ...f, costBasis: e.target.value === "" ? undefined : Number(e.target.value) }))}
          />
        </Field>

        <Field label="Notes (optional)">
          <Input
            placeholder="e.g. Retirement portfolio"
            value={form.notes ?? ""}
            onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
          />
        </Field>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-[13px] text-red-600">{error}</div>
        )}

        <Button onClick={submit} disabled={isPending} loading={isPending} fullWidth>
          {isEdit ? "Save changes" : "Add holding"}
        </Button>

        <p className="text-[11px] text-muted text-center leading-relaxed">
          Live prices update automatically every ~30 minutes once available for this symbol.
          Until then, market value shows as unpriced.
        </p>
      </div>
    </Modal>
  );
}
