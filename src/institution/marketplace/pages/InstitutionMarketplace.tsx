// =============================================================
// Ficium 3 — Institution Marketplace
// Browse open client requests, filter by product, place bids.
// Bid submission goes through maker-checker (pending_actions).
// =============================================================
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Zap, Filter, Clock, ChevronDown, X, AlertTriangle } from 'lucide-react'
import {
  useMarketplace, useProducts, useSubmitBid, useMyInstitution
} from '../../hooks/useInstitution'
import { formatDistanceToNow } from '../../lib/utils'
import type { MarketplaceRequest } from '../../types/institution'

// ── Bid form schema ────────────────────────────────────────────
const bidSchema = z.object({
  rate:           z.number().min(0.001).max(1),
  rate_type:      z.enum(['fixed', 'variable']),
  amount_offered: z.number().positive(),
  term_months:    z.number().int().positive(),
  notes:          z.string().optional(),
})
type BidForm = z.infer<typeof bidSchema>

export default function InstitutionMarketplace() {
  const { data: institution } = useMyInstitution()
  const { data: requests = [], isLoading, refetch } = useMarketplace()
  const { data: products = [] } = useProducts()
  const submitBid = useSubmitBid()

  const [productFilter, setProductFilter] = useState<string>('all')
  const [selectedRequest, setSelectedRequest] = useState<MarketplaceRequest | null>(null)
  const [bidSuccess, setBidSuccess] = useState<string | null>(null)

  // Filter
  const filtered = requests.filter(r =>
    productFilter === 'all' || r.product_type === productFilter
  )

  // Unique product types in current feed
  const productTypes = Array.from(new Set(requests.map(r => r.product_type)))

  const handleBidSubmit = async (data: BidForm) => {
    if (!selectedRequest) return
    try {
      const actionId = await submitBid.mutateAsync({
        request_id:     selectedRequest.id,
        rate:           data.rate,
        rate_type:      data.rate_type,
        amount_offered: data.amount_offered,
        term_months:    data.term_months,
        conditions:     data.notes ? { notes: data.notes } : undefined,
        submitted_via:  'portal',
      })
      setBidSuccess(actionId as string)
      setSelectedRequest(null)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="p-6">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-slate-100 tracking-wide">Marketplace</h1>
          <p className="text-[11px] text-slate-600 mt-0.5 font-mono">
            {filtered.length} open request{filtered.length !== 1 ? 's' : ''} · refreshes every 30s
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-[9px] text-green-500 font-mono">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            LIVE
          </span>
          <button
            onClick={() => refetch()}
            className="text-[10px] text-slate-500 hover:text-slate-300 border border-[#1e2d3d] px-3 py-1.5 rounded-lg transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* ── Maker-checker reminder ──────────────────────────── */}
      <div className="bg-[#0a1628] border border-[#1e3a5f] rounded-lg px-4 py-2.5 flex items-center gap-2.5 mb-5">
        <AlertTriangle className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
        <p className="text-[10px] text-slate-500">
          Bids require maker-checker approval before submission. A second admin must confirm in{' '}
          <span className="text-blue-400 font-semibold">Approvals</span>.
        </p>
      </div>

      {/* ── Product filter ──────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <Filter className="w-3.5 h-3.5 text-slate-600" />
        <button
          onClick={() => setProductFilter('all')}
          className={`text-[10px] font-bold px-3 py-1.5 rounded-full border transition-colors ${
            productFilter === 'all'
              ? 'bg-[#0f1929] border-blue-500 text-blue-400'
              : 'border-[#1e2d3d] text-slate-500 hover:text-slate-300'
          }`}
        >
          All products
        </button>
        {productTypes.map(pt => {
          const product = products.find(p => p.code === pt)
          return (
            <button
              key={pt}
              onClick={() => setProductFilter(pt)}
              className={`text-[10px] font-bold px-3 py-1.5 rounded-full border transition-colors ${
                productFilter === pt
                  ? 'bg-[#0f1929] border-blue-500 text-blue-400'
                  : 'border-[#1e2d3d] text-slate-500 hover:text-slate-300'
              }`}
            >
              {product?.label ?? pt}
            </button>
          )
        })}
      </div>

      {/* ── Bid success toast ───────────────────────────────── */}
      {bidSuccess && (
        <div className="bg-[#052e16] border border-[#166534] rounded-lg px-4 py-3 flex items-center justify-between mb-5">
          <p className="text-[11px] text-green-400">
            ✓ Bid submitted for approval. Action ID: <code className="text-green-300 text-[10px]">{bidSuccess.slice(0, 8)}…</code>
          </p>
          <button onClick={() => setBidSuccess(null)} className="text-green-700 hover:text-green-400">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── Request grid ────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Store className="w-10 h-10 text-slate-800 mx-auto mb-3" />
          <p className="text-slate-600 text-sm">No open requests right now</p>
          <p className="text-slate-700 text-[11px] mt-1">New requests will appear automatically</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(req => (
            <RequestCard
              key={req.id}
              request={req}
              onBid={() => setSelectedRequest(req)}
              canBid={!!institution?.modules.includes('marketplace')}
            />
          ))}
        </div>
      )}

      {/* ── Bid modal ───────────────────────────────────────── */}
      {selectedRequest && (
        <BidModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onSubmit={handleBidSubmit}
          isSubmitting={submitBid.isPending}
          error={submitBid.error?.message}
        />
      )}
    </div>
  )
}

// ── Request Card ───────────────────────────────────────────────
function RequestCard({
  request, onBid, canBid
}: {
  request: MarketplaceRequest
  onBid: () => void
  canBid: boolean
}) {
  const timeLeft = formatDistanceToNow(request.bid_window_closes_at)
  const isUrgent = new Date(request.bid_window_closes_at).getTime() - Date.now() < 60 * 60 * 1000

  return (
    <div className="bg-[#0b0f18] border border-[#141b27] rounded-xl p-5 hover:border-[#1e2d3d] transition-all">
      {/* Top */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mb-1">
            {request.family_label ?? 'Financial product'}
          </div>
          <div className="text-[13px] font-bold text-slate-100">
            {request.product_label ?? request.product_type}
          </div>
        </div>
        <span className="bg-[#052e16] text-green-400 text-[9px] font-bold px-2 py-0.5 rounded-full border border-[#166534]">
          OPEN
        </span>
      </div>

      {/* Amount + term */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-[#070a0f] rounded-lg p-3">
          <div className="text-[9px] text-slate-600 uppercase tracking-widest mb-1">Amount</div>
          <div className="text-[13px] font-bold text-slate-200 font-mono">
            {request.currency} {Number(request.amount).toLocaleString()}
          </div>
        </div>
        {request.term_months && (
          <div className="bg-[#070a0f] rounded-lg p-3">
            <div className="text-[9px] text-slate-600 uppercase tracking-widest mb-1">Term</div>
            <div className="text-[13px] font-bold text-slate-200 font-mono">
              {request.term_months} months
            </div>
          </div>
        )}
      </div>

      {/* Purpose */}
      {request.purpose && (
        <p className="text-[10px] text-slate-600 mb-4 line-clamp-2">
          {request.purpose}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className={`flex items-center gap-1.5 text-[10px] ${isUrgent ? 'text-orange-400' : 'text-slate-600'}`}>
          <Clock className="w-3 h-3" />
          <span className="font-mono">{timeLeft}</span>
        </div>
        {canBid && (
          <button
            onClick={onBid}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition-colors"
          >
            <Zap className="w-3 h-3" />
            Place bid
          </button>
        )}
      </div>
    </div>
  )
}

// ── Bid Modal ──────────────────────────────────────────────────
function BidModal({
  request, onClose, onSubmit, isSubmitting, error
}: {
  request: MarketplaceRequest
  onClose: () => void
  onSubmit: (data: BidForm) => void
  isSubmitting: boolean
  error?: string
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<BidForm>({
    resolver: zodResolver(bidSchema),
    defaultValues: {
      rate_type:      'fixed',
      amount_offered: request.amount,
      term_months:    request.term_months ?? 12,
    },
  })

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#0b0f18] border border-[#1e2d3d] rounded-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-[#141b27]">
          <div>
            <h2 className="text-[13px] font-bold text-slate-100">Place bid</h2>
            <p className="text-[10px] text-slate-600 mt-0.5">
              {request.product_label ?? request.product_type} ·{' '}
              {request.currency} {Number(request.amount).toLocaleString()}
              {request.term_months ? ` · ${request.term_months}m` : ''}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          {/* Rate */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-slate-500 uppercase tracking-widest mb-1.5">Interest rate (%)</label>
              <input
                {...register('rate', { valueAsNumber: true, setValueAs: v => parseFloat(v) / 100 })}
                type="number"
                step="0.01"
                placeholder="8.75"
                className="w-full bg-[#070a0f] border border-[#1e2d3d] text-slate-200 rounded-lg px-3 py-2 text-[12px] font-mono focus:border-blue-500 outline-none"
              />
              {errors.rate && <p className="text-[9px] text-red-400 mt-1">{errors.rate.message}</p>}
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 uppercase tracking-widest mb-1.5">Rate type</label>
              <select
                {...register('rate_type')}
                className="w-full bg-[#070a0f] border border-[#1e2d3d] text-slate-200 rounded-lg px-3 py-2 text-[12px] font-mono focus:border-blue-500 outline-none"
              >
                <option value="fixed">Fixed</option>
                <option value="variable">Variable</option>
              </select>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-[10px] text-slate-500 uppercase tracking-widest mb-1.5">Amount offered (MUR)</label>
            <input
              {...register('amount_offered', { valueAsNumber: true })}
              type="number"
              className="w-full bg-[#070a0f] border border-[#1e2d3d] text-slate-200 rounded-lg px-3 py-2 text-[12px] font-mono focus:border-blue-500 outline-none"
            />
            {errors.amount_offered && <p className="text-[9px] text-red-400 mt-1">{errors.amount_offered.message}</p>}
          </div>

          {/* Term */}
          <div>
            <label className="block text-[10px] text-slate-500 uppercase tracking-widest mb-1.5">Term (months)</label>
            <input
              {...register('term_months', { valueAsNumber: true })}
              type="number"
              className="w-full bg-[#070a0f] border border-[#1e2d3d] text-slate-200 rounded-lg px-3 py-2 text-[12px] font-mono focus:border-blue-500 outline-none"
            />
            {errors.term_months && <p className="text-[9px] text-red-400 mt-1">{errors.term_months.message}</p>}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[10px] text-slate-500 uppercase tracking-widest mb-1.5">Conditions / notes (optional)</label>
            <textarea
              {...register('notes')}
              rows={2}
              className="w-full bg-[#070a0f] border border-[#1e2d3d] text-slate-200 rounded-lg px-3 py-2 text-[11px] font-mono focus:border-blue-500 outline-none resize-none"
              placeholder="Any special conditions or notes for the client..."
            />
          </div>

          {/* Maker-checker warning */}
          <div className="bg-[#0a1628] border border-[#1e3a5f] rounded-lg p-3 text-[10px] text-slate-500">
            ⚠ This bid will be queued for maker-checker approval. A second admin must confirm before it is submitted to the client.
          </div>

          {error && (
            <div className="bg-[#1c0000] border border-red-900 rounded-lg p-3 text-[10px] text-red-400">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-[11px] font-bold py-2.5 rounded-lg transition-colors"
            >
              {isSubmitting ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Zap className="w-3.5 h-3.5" />
              )}
              Submit for approval
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 text-[11px] text-slate-500 hover:text-slate-300 border border-[#1e2d3d] rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Placeholder import for Store icon used in empty state
function Store(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M3 9l1-5h16l1 5" /><path d="M3 9h18v11a1 1 0 01-1 1H4a1 1 0 01-1-1V9z" />
      <path d="M9 21V12h6v9" />
    </svg>
  )
}
