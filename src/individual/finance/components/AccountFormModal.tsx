// src/individual/finance/components/AccountFormModal.tsx
import { useState } from "react";
import { Field, Input, Select, Button } from "@/shared/ui";
import Modal from "@/individual/finance/components/Modal";
import { CURRENCIES, ACCOUNT_TYPE_LABELS } from "@/individual/finance/types";
import type { Account, AccountInput, AccountType, Currency } from "@/individual/finance/types";
import { useCreateAccount, useUpdateAccount } from "@/individual/finance/hooks/useAccounts";

export default function AccountFormModal({
  account, onClose,
}: {
  account?: Account | null;
  onClose: () => void;
}) {
  const isEdit = !!account;
  const { mutateAsync: create, isPending: creating } = useCreateAccount();
  const { mutateAsync: update, isPending: updating } = useUpdateAccount();
  const isPending = creating || updating;

  const [form, setForm] = useState<AccountInput>({
    institutionName: account?.institutionName ?? "",
    accountType:     account?.accountType ?? "savings",
    currency:        (account?.currency as Currency) ?? "MUR",
    balance:         account?.balance ?? 0,
    notes:           account?.notes ?? "",
  });
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!form.institutionName.trim()) { setError("Enter a bank or institution name."); return; }
    if (form.balance < 0) { setError("Balance can't be negative."); return; }

    const result = isEdit
      ? await update({ id: account!.id, input: form })
      : await create(form);

    if (!result.ok) { setError(result.error ?? "Save failed."); return; }
    onClose();
  };

  return (
    <Modal title={isEdit ? "Edit account" : "Add bank account"} onClose={onClose}>
      <div className="space-y-4">
        <Field label="Bank / institution">
          <Input
            placeholder="e.g. MauBank, AfrAsia, MCB"
            value={form.institutionName}
            onChange={(e) => setForm(f => ({ ...f, institutionName: e.target.value }))}
          />
        </Field>

        <Field label="Account type">
          <Select
            value={form.accountType}
            onChange={(e) => setForm(f => ({ ...f, accountType: e.target.value as AccountType }))}
          >
            {(Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[]).map((t) => (
              <option key={t} value={t}>{ACCOUNT_TYPE_LABELS[t]}</option>
            ))}
          </Select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Balance">
            <Input
              type="number"
              value={form.balance}
              onChange={(e) => setForm(f => ({ ...f, balance: Number(e.target.value) || 0 }))}
            />
          </Field>
          <Field label="Currency">
            <Select
              value={form.currency}
              onChange={(e) => setForm(f => ({ ...f, currency: e.target.value as Currency }))}
            >
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
        </div>

        <Field label="Notes (optional)">
          <Input
            placeholder="e.g. Joint account, emergency fund"
            value={form.notes ?? ""}
            onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
          />
        </Field>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-[13px] text-red-600">{error}</div>
        )}

        <Button onClick={submit} disabled={isPending} loading={isPending} fullWidth>
          {isPending ? "Saving…" : isEdit ? "Save changes" : "Add account"}
        </Button>
      </div>
    </Modal>
  );
}
