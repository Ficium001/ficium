import { useState }       from "react";
import { useAdminPendingApprovals } from "@/admin/hooks/useAdminData";
import KycSection         from "@/admin/kyc/KycSection";
import KycSettings        from "@/admin/kyc/KycSettings";
import { InstitutionsSection } from "@/admin/components/InstitutionsSection";
import { ProductsSection }     from "@/admin/components/ProductsSection";
import { AuditSection }        from "@/admin/components/AuditSection";
import { FLogo, NAV }          from "@/admin/components/AdminHelpers";

// ─────────────────────────────────────────────────────────────────────────────
// FiciumAdminPanel — thin orchestrator.
// Nav, sidebar, topbar live here. Section content in admin/components/.
// ─────────────────────────────────────────────────────────────────────────────

const TITLES: Record<string, string> = {
  institutions: "Institution management",
  kyc:          "KYC review",
  products:     "Product catalogue",
  audit:        "Audit log",
  kyc_settings: "KYC settings",
};

export default function FiciumAdminPanel() {
  const [section, setSection]  = useState("institutions");
  const { data: pending = [] } = useAdminPendingApprovals();

  return (
    <div className="flex h-screen bg-cream font-body overflow-hidden">

      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-ink/[0.07] flex flex-col flex-shrink-0">
        <div className="px-5 py-5 border-b border-ink/[0.07]">
          <div className="flex items-center gap-2.5">
            <FLogo size={24} className="text-ficium" />
            <div>
              <div className="font-display font-bold text-[15px] text-ink">Ficium</div>
              <div className="text-[10px] text-muted">Admin console</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-3">
          {NAV.map((n) => (
            <button key={n.key} onClick={() => setSection(n.key)}
              style={{ width: "calc(100% - 24px)", marginLeft: 12 }}
              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all text-left ${
                section === n.key
                  ? "bg-ficium/10 text-ficium font-semibold"
                  : "text-ink/50 hover:text-ink hover:bg-ink/[0.04]"
              }`}>
              <span className="text-[15px]">{n.icon}</span>
              {n.label}
            </button>
          ))}
        </nav>

        <div className="border-t border-ink/[0.07] p-4">
          <div className="text-[11px] text-muted mb-1">Signed in as</div>
          <div className="text-[12px] font-semibold text-ink">Ficium Admin</div>
          <div className="text-[10px] text-muted mt-0.5">ficium_admin · service_role</div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 bg-white border-b border-ink/[0.07] flex items-center justify-between px-6 flex-shrink-0">
          <span className="font-display font-bold text-[16px] text-ink">{TITLES[section]}</span>
          <div className="flex items-center gap-2">
            {pending.length > 0 && (
              <span className="bg-amber-50 border border-amber-200 text-amber-700 text-[12px] font-semibold px-3 py-1 rounded-full">
                {pending.length} pending approval{pending.length > 1 ? "s" : ""}
              </span>
            )}
            <span className="bg-ficium/8 text-ficium text-[11px] font-bold px-3 py-1 rounded-full">MAKER-CHECKER ON</span>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6 lg:p-8">
          {section === "institutions" && <InstitutionsSection />}
          {section === "kyc"          && <KycSection />}
          {section === "products"     && <ProductsSection />}
          {section === "audit"        && <AuditSection />}
          {section === "kyc_settings" && <KycSettings />}
        </main>
      </div>
    </div>
  );
}
