// src/individual/finance/components/AccountsList.tsx
import { useState } from "react";
import { Landmark, Wallet, PiggyBank, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { formatAmount } from "@/shared/lib/format";
import { useAccounts, useDeleteAccount } from "@/individual/finance/hooks/useAccounts";
import { ACCOUNT_TYPE_LABELS } from "@/individual/finance/types";
import type { Account, AccountType } from "@/individual/finance/types";
import AccountFormModal from "@/individual/finance/components/AccountFormModal";

const ICONS: Record<AccountType, React.ElementType> = {
  savings: PiggyBank,
  current: Wallet,
  fixed_deposit: Landmark,
};

export default function AccountsList({ reportingCurrency }: { reportingCurrency: string }) {
  const { data: accounts, isLoading } = useAccounts();
  const { mutateAsync: deleteAccount, isPending: deleting } = useDeleteAccount();
  const [editing, setEditing] = useState<Account | null | "new">(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (account: Account) => {
    if (!confirm(`Remove ${account.institutionName}? This can't be undone.`)) return;
    setDeletingId(account.id);
    await deleteAccount(account.id);
    setDeletingId(null);
  };

  if (isLoading) {
    return <div className="py-10 grid place-items-center"><Loader2 size={24} className="text-ficium animate-spin" /></div>;
  }

  return (
    <div className="space-y-3">
      {(!accounts || accounts.length === 0) && (
        <div className="bg-white rounded-[22px] border border-dashed border-ink/15 p-8 text-center">
          <Wallet size={22} className="mx-auto text-muted mb-2" />
          <div className="text-[14px] font-semibold text-ink">No bank accounts yet</div>
          <div className="text-[13px] text-muted mt-1">Add your savings, current, or fixed deposit accounts — Maubank, AfrAsia, MCB, and more.</div>
        </div>
      )}

      {accounts?.map((a) => {
        const Icon = ICONS[a.accountType];
        return (
          <div key={a.id} className="bg-white rounded-[22px] border border-ink/6 shadow-xs px-5 py-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-ficium/10 grid place-items-center shrink-0">
              <Icon size={17} className="text-ficium" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-bold text-ink truncate">{a.institutionName}</div>
              <div className="text-[12px] text-muted">{ACCOUNT_TYPE_LABELS[a.accountType]} · {a.currency}</div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[14px] font-bold text-ink">{formatAmount(a.balance, a.currency)}</div>
              {a.currency !== reportingCurrency && (
                <div className="text-[11px] text-muted">≈ {formatAmount(a.balanceReporting, reportingCurrency)}</div>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => setEditing(a)} className="w-8 h-8 grid place-items-center rounded-full hover:bg-ink/5 text-muted">
                <Pencil size={14} />
              </button>
              <button onClick={() => handleDelete(a)} disabled={deleting && deletingId === a.id}
                className="w-8 h-8 grid place-items-center rounded-full hover:bg-red-50 text-muted hover:text-red-600">
                {deleting && deletingId === a.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              </button>
            </div>
          </div>
        );
      })}

      <button onClick={() => setEditing("new")}
        className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-ink/15 hover:border-ficium/40 text-ink/70 hover:text-ficium py-3.5 rounded-2xl text-[13px] font-semibold transition-colors">
        <Plus size={15} /> Add bank account
      </button>

      {editing && (
        <AccountFormModal
          account={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
