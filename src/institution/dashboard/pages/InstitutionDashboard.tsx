// =============================================================
// Ficium 3 — Institution Dashboard
// =============================================================
import { Link } from 'react-router-dom'
import {
  TrendingUp, Clock, CheckCircle,
  ArrowRight, AlertTriangle, Zap,
} from 'lucide-react'
import { useMyInstitution, useMyBids, usePendingActions, useMarketplace } from '../../hooks/useInstitution'
import { formatDistanceToNow } from '../../lib/utils'

function StoreIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M3 9l1-5h16l1 5"/><path d="M3 9h18v11a1 1 0 01-1 1H4a1 1 0 01-1-1V9z"/>
      <path d="M9 21V12h6v9"/>
    </svg>
  )
}

export default function InstitutionDashboard() {
  const { data: institution } = useMyInstitution()
  const { data: bids = [],        isLoading: bidsLoading   } = useMyBids()
  const { data: pending = [],     isLoading: pendingLoading } = usePendingActions()
  const { data: marketplace = [], isLoading: mktLoading    } = useMarketplace()

  const modules      = institution?.modules ?? []
  const activeBids   = bids.filter(b => b.status === 'submitted').length
  const acceptedBids = bids.filter(b => b.status === 'accepted').length
  const pendingCount = pending.length
  const openRequests = marketplace.length
  const expiringBids = pending.filter(p => {
    const diff = new Date(p.expires_at).getTime() - Date.now()
    return diff < 4 * 60 * 60 * 1000 && diff > 0
  }).length

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-100 tracking-wide">
            {institution?.name ?? 'Dashboard'}
          </h1>
          <p className="text-[11px] text-slate-600 mt-0.5 font-mono">
            {institution?.institution_type} · {institution?.deployment_model?.toUpperCase()} ·{' '}
            <span className="text-green-500">approved</span>
          </p>
        </div>
        {modules.includes('marketplace') && (
          <Link
            to="/institution/marketplace"
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors"
          >
            <StoreIcon className="w-3 h-3" />
            Browse marketplace
          </Link>
        )}
      </div>

      {expiringBids > 0 && (
        <div className="bg-[#1c0f00] border border-orange-900 rounded-lg p-3 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0" />
          <p className="text-[11px] text-orange-300">
            <strong>{expiringBids}</strong> pending action{expiringBids > 1 ? 's' : ''} expiring in less than 4 hours.
          </p>
          <Link to="/institution/approvals" className="ml-auto text-orange-400 hover:text-orange-300 text-[11px] font-bold flex items-center gap-1">
            Review <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Open requests"     value={mktLoading     ? '—' : openRequests} icon={StoreIcon}    color="blue"   sub="in marketplace"       href="/institution/marketplace" />
        <StatCard label="Active bids"       value={bidsLoading    ? '—' : activeBids}   icon={TrendingUp}  color="purple" sub="awaiting client"        href="/institution/bids" />
        <StatCard label="Pending approvals" value={pendingLoading ? '—' : pendingCount} icon={Clock}       color="amber"  sub="maker-checker queue"   href="/institution/approvals" alert={pendingCount > 0} />
        <StatCard label="Accepted bids"     value={bidsLoading    ? '—' : acceptedBids} icon={CheckCircle} color="green"  sub="all time" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#0b0f18] border border-[#141b27] rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#141b27] flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-widest">Recent bids</span>
            <Link to="/institution/bids" className="text-[10px] text-blue-500 hover:text-blue-400 flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {bidsLoading ? (
            <div className="p-6 flex justify-center"><div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : bids.length === 0 ? (
            <div className="p-8 text-center text-[11px] text-slate-600">No bids yet</div>
          ) : (
            <div className="divide-y divide-[#0d1420]">
              {bids.slice(0, 5).map(bid => (
                <div key={bid.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-slate-300 font-medium">{bid.product_label ?? bid.product_type}</div>
                    <div className="text-[10px] text-slate-600 mt-0.5 font-mono">
                      MUR {Number(bid.amount_offered).toLocaleString()} · {(bid.rate * 100).toFixed(2)}% · {bid.term_months}m
                    </div>
                  </div>
                  <BidStatusBadge status={bid.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[#0b0f18] border border-[#141b27] rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#141b27] flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-widest">Live marketplace</span>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              <span className="text-[9px] text-green-500 font-mono">LIVE</span>
            </div>
          </div>
          {mktLoading ? (
            <div className="p-6 flex justify-center"><div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : marketplace.length === 0 ? (
            <div className="p-8 text-center text-[11px] text-slate-600">No open requests right now</div>
          ) : (
            <div className="divide-y divide-[#0d1420]">
              {marketplace.slice(0, 5).map(req => (
                <div key={req.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-slate-300 font-medium">{req.product_label ?? req.product_type}</div>
                    <div className="text-[10px] text-slate-600 mt-0.5 font-mono">
                      {req.currency} {Number(req.amount).toLocaleString()}
                      {req.term_months ? ` · ${req.term_months}m` : ''}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[9px] text-slate-600 font-mono">
                      closes {formatDistanceToNow(req.bid_window_closes_at)}
                    </div>
                    {modules.includes('marketplace') && (
                      <Link to="/institution/marketplace" className="text-[9px] text-blue-500 hover:text-blue-400 flex items-center gap-0.5 justify-end mt-0.5">
                        Bid <Zap className="w-2.5 h-2.5" />
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-[#0b0f18] border border-[#141b27] rounded-xl p-5">
        <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-3">Licensed modules</div>
        <div className="flex flex-wrap gap-2">
          {['marketplace','credit','ai_advisory','analytics'].map(m => (
            <span key={m} className={`px-3 py-1 rounded-full text-[10px] font-bold ${
              modules.includes(m)
                ? 'bg-[#052e16] text-green-400 border border-[#166534]'
                : 'bg-[#111] text-slate-700 border border-[#222]'
            }`}>
              {modules.includes(m) ? '✓ ' : ''}{m}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon: Icon, color, sub, href, alert }: {
  label: string; value: number | string; icon: React.ElementType
  color: 'blue' | 'purple' | 'green' | 'amber' | 'red'
  sub?: string; href?: string; alert?: boolean
}) {
  const colorMap = {
    blue:   { val: 'text-blue-400',   bg: 'bg-[#0c1a2e]' },
    purple: { val: 'text-purple-400', bg: 'bg-[#120c2e]' },
    green:  { val: 'text-green-400',  bg: 'bg-[#052e16]' },
    amber:  { val: 'text-amber-400',  bg: 'bg-[#1c1208]' },
    red:    { val: 'text-red-400',    bg: 'bg-[#1c0000]' },
  }
  const { val, bg } = colorMap[color]
  const inner = (
    <div className={`${bg} border border-[#141b27] rounded-xl p-5 ${href ? 'hover:border-[#1e2d3d] transition-colors cursor-pointer' : ''} ${alert ? 'border-orange-900' : ''}`}>
      <div className="flex items-start justify-between mb-2">
        <Icon className={`w-4 h-4 ${val}`} />
        {alert && <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />}
      </div>
      <div className={`text-3xl font-bold ${val} tracking-tight mb-1`}>{value}</div>
      <div className="text-[10px] text-slate-600 uppercase tracking-widest">{label}</div>
      {sub && <div className="text-[9px] text-slate-700 mt-0.5">{sub}</div>}
    </div>
  )
  return href ? <Link to={href}>{inner}</Link> : inner
}

function BidStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    submitted: 'bg-[#0c1a2e] text-blue-400',
    accepted:  'bg-[#052e16] text-green-400',
    rejected:  'bg-[#1c0000] text-red-400',
    expired:   'bg-[#1c1208] text-amber-400',
    withdrawn: 'bg-[#111] text-slate-500',
  }
  return (
    <span className={`${map[status] ?? 'bg-[#111] text-slate-500'} px-2 py-0.5 rounded-full text-[9px] font-bold uppercase`}>
      {status}
    </span>
  )
}
