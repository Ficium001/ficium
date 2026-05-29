// =============================================================
// Ficium 3 — Institution Portal Shell
// Sidebar nav + top bar + content outlet.
// Module-gated nav items — unlicensed modules not shown.
// =============================================================
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Store,
  FileText,
  Clock,
  Webhook,
  Package,
  ScrollText,
  Settings,
  LogOut,
  ChevronRight,
  Bell,
  Building2,
} from 'lucide-react'
import { useMyInstitution, useMyRole, usePendingActions } from '../../hooks/useInstitution'
import institutionSupabase from '../../lib/institutionSupabase'
import type { PortalSection } from '../../types/institution'

interface NavItem {
  section: PortalSection
  label: string
  path: string
  icon: React.ElementType
  module?: string  // required module licence — undefined means always show
  badge?: number
}

export default function InstitutionPortalShell() {
  const navigate = useNavigate()
  const { data: institution } = useMyInstitution()
  const { data: role } = useMyRole()
  const { data: pendingActions } = usePendingActions()

  const modules: string[] = institution?.modules ?? []
  const hasModule = (m: string) => modules.includes(m)
  const pendingCount = pendingActions?.length ?? 0

  const NAV_ITEMS: NavItem[] = [
    { section: 'dashboard',       label: 'Dashboard',         path: '/institution',                  icon: LayoutDashboard },
    { section: 'marketplace',     label: 'Marketplace',       path: '/institution/marketplace',       icon: Store,          module: 'marketplace' },
    { section: 'my-bids',         label: 'My bids',           path: '/institution/bids',              icon: FileText,       module: 'marketplace' },
    { section: 'pending-actions', label: 'Approvals',         path: '/institution/approvals',         icon: Clock,          badge: pendingCount },
    { section: 'products',        label: 'Products',          path: '/institution/products',          icon: Package },
    { section: 'webhooks',        label: 'Webhooks',          path: '/institution/webhooks',          icon: Webhook },
    { section: 'audit',           label: 'Audit log',         path: '/institution/audit',             icon: ScrollText },
    { section: 'settings',        label: 'Settings',          path: '/institution/settings',          icon: Settings },
  ]

  // Filter nav by module licences
  const visibleNav = NAV_ITEMS.filter(item =>
    !item.module || hasModule(item.module)
  )

  const handleSignOut = async () => {
    await institutionSupabase.auth.signOut()
    navigate('/institution/login')
  }

  const deployLabel = {
    saas:    'SaaS',
    paas:    'PaaS',
    on_prem: 'On-Prem',
  }[institution?.deployment_model ?? 'saas']

  return (
    <div className="flex h-screen bg-[#070a0f] text-slate-300 font-mono overflow-hidden">

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className="w-56 bg-[#0b0f18] border-r border-[#141b27] flex flex-col flex-shrink-0">

        {/* Logo */}
        <div className="px-5 py-6 border-b border-[#141b27]">
          <div className="flex items-center gap-2.5">
            <Building2 className="w-5 h-5 text-blue-400" />
            <div>
              <div className="text-[13px] font-bold text-slate-100 tracking-wide">
                {institution?.name ?? 'Institution'}
              </div>
              <div className="text-[9px] text-slate-600 tracking-widest uppercase mt-0.5">
                {deployLabel} · Portal
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 overflow-y-auto">
          {visibleNav.map(item => (
            <NavLink
              key={item.section}
              to={item.path}
              end={item.path === '/institution'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-5 py-2.5 text-[11px] font-medium tracking-wide transition-all border-l-2 ${
                  isActive
                    ? 'text-blue-400 bg-[#0f1929] border-blue-500'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-[#0d1420] border-transparent'
                }`
              }
            >
              <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.badge && item.badge > 0 ? (
                <span className="bg-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {item.badge}
                </span>
              ) : null}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="border-t border-[#141b27] p-4">
          <div className="text-[9px] text-slate-700 uppercase tracking-widest mb-1.5">Signed in as</div>
          <div className="text-[11px] text-slate-500 truncate">{institution?.primary_contact_email}</div>
          <div className="text-[9px] text-slate-700 mt-0.5 capitalize">{role?.role}</div>
          <button
            onClick={handleSignOut}
            className="mt-3 flex items-center gap-2 text-[10px] text-slate-600 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-3 h-3" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <header className="h-12 bg-[#0b0f18] border-b border-[#141b27] flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="text-slate-700">ficium</span>
            <ChevronRight className="w-3 h-3 text-slate-700" />
            <span className="text-slate-300">{institution?.name}</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Status badges */}
            {institution?.approved && (
              <span className="bg-[#052e16] border border-[#166534] text-green-400 text-[9px] font-bold px-2 py-0.5 rounded-full tracking-widest">
                APPROVED
              </span>
            )}
            <span className="bg-[#0f1929] border border-[#1e3a5f] text-blue-400 text-[9px] font-bold px-2 py-0.5 rounded-full tracking-widest">
              MAKER-CHECKER
            </span>
            {/* Notification bell */}
            <button className="relative text-slate-600 hover:text-slate-300 transition-colors">
              <Bell className="w-4 h-4" />
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[8px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto bg-[#070a0f]">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
