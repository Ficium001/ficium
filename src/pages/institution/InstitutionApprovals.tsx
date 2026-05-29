// =============================================================
// Ficium 3 — Institution Approvals (Maker-Checker)
// Lists all pending actions. Checker approves or rejects.
// Four-eyes enforced: maker cannot approve own action.
// =============================================================
import { useState } from 'react'
import { Clock, CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { usePendingActions, useApproveAction, useRejectAction } from '../../hooks/useInstitution'
import { formatDistanceToNow } from '../../lib/utils'
import type { PendingAction } from '../../types/institution'

export default function InstitutionApprovals() {
  const { data: actions = [], isLoading } = usePendingActions()
  const approveAction = useApproveAction()
  const rejectAction  = useRejectAction()

  const [expanded, setExpanded]       = useState<string | null>(null)
  const [rejectNote, setRejectNote]   = useState('')
  const [rejectingId, setRejectingId] = useState<string | null>(null)

  const handleApprove = async (actionId: string) => {
    await approveAction.mutateAsync({ actionId })
  }

  const handleReject = async (actionId: string) => {
    if (!rejectNote.trim()) return
    await rejectAction.mutateAsync({ actionId, note: rejectNote })
    setRejectingId(null)
    setRejectNote('')
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-slate-100 tracking-wide">Approvals</h1>
          <p className="text-[11px] text-slate-600 mt-0.5 font-mono">
            Maker-checker queue · {actions.length} pending
          </p>
        </div>
        <span className="bg-[#0a1628] border border-[#1e3a5f] text-blue-400 text-[9px] font-bold px-3 py-1.5 rounded-full tracking-widest">
          FOUR-EYES ENFORCED
        </span>
      </div>

      {/* Explanation */}
      <div className="bg-[#0a1628] border border-[#1e3a5f] rounded-lg px-4 py-3 mb-5 text-[10px] text-slate-500">
        Every material action (bid submission, webhook creation, user invite, etc.) requires a second admin to approve.
        You cannot approve an action you initiated.
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty */}
      {!isLoading && actions.length === 0 && (
        <div className="text-center py-16">
          <CheckCircle className="w-10 h-10 text-green-800 mx-auto mb-3" />
          <p className="text-slate-600 text-sm">All clear — no pending approvals</p>
        </div>
      )}

      {/* Actions list */}
      <div className="space-y-3">
        {actions.map(action => {
          const isExpanded   = expanded === action.id
          const isRejecting  = rejectingId === action.id
          const expiresIn    = new Date(action.expires_at).getTime() - Date.now()
          const isUrgent     = expiresIn < 4 * 60 * 60 * 1000 && expiresIn > 0
          const isExpired    = expiresIn <= 0

          return (
            <div
              key={action.id}
              className={`bg-[#0b0f18] border rounded-xl overflow-hidden transition-colors ${
                isUrgent ? 'border-orange-900' : isExpired ? 'border-red-900' : 'border-[#141b27]'
              }`}
            >
              {/* Row */}
              <div className="px-5 py-4 flex items-center gap-4">
                {/* Category icon */}
                <div className="w-8 h-8 bg-[#0f1929] rounded-lg flex items-center justify-center flex-shrink-0">
                  <ActionIcon category={action.action_category} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <code className="text-[11px] text-slate-300 font-bold">{action.action_category}</code>
                    <span className="text-slate-700 text-[9px]">·</span>
                    <span className="text-[10px] text-slate-600">{action.resource_type}</span>
                  </div>
                  <div className="text-[10px] text-slate-600 font-mono">
                    Initiated by <span className="text-slate-500">{action.maker_role}</span>
                    {' · '}{formatDistanceToNow(action.initiated_at)} ago
                  </div>
                </div>

                {/* Expiry */}
                <div className={`text-right text-[10px] flex-shrink-0 ${isUrgent ? 'text-orange-400' : 'text-slate-600'}`}>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span className="font-mono">
                      {isExpired ? 'Expired' : `Expires ${formatDistanceToNow(action.expires_at)}`}
                    </span>
                  </div>
                  {isUrgent && !isExpired && (
                    <div className="text-[9px] text-orange-500 mt-0.5 flex items-center gap-1">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      Expiring soon
                    </div>
                  )}
                </div>

                {/* Expand toggle */}
                <button
                  onClick={() => setExpanded(isExpanded ? null : action.id)}
                  className="text-slate-600 hover:text-slate-300 transition-colors ml-2"
                >
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>

              {/* Expanded payload */}
              {isExpanded && (
                <div className="border-t border-[#141b27] px-5 py-4 space-y-3">
                  <div>
                    <div className="text-[9px] text-slate-600 uppercase tracking-widest mb-1.5">Payload</div>
                    <pre className="bg-[#070a0f] border border-[#1e2d3d] rounded-lg p-3 text-[10px] text-slate-400 overflow-auto max-h-40 font-mono">
                      {JSON.stringify(action.payload, null, 2)}
                    </pre>
                  </div>
                  {action.payload_before && (
                    <div>
                      <div className="text-[9px] text-slate-600 uppercase tracking-widest mb-1.5">Before</div>
                      <pre className="bg-[#070a0f] border border-[#1e2d3d] rounded-lg p-3 text-[10px] text-slate-600 overflow-auto max-h-32 font-mono">
                        {JSON.stringify(action.payload_before, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              {!isExpired && (
                <div className="border-t border-[#141b27] px-5 py-3 flex items-center gap-3">
                  {isRejecting ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        value={rejectNote}
                        onChange={e => setRejectNote(e.target.value)}
                        placeholder="Reason for rejection (required)"
                        className="flex-1 bg-[#070a0f] border border-[#1e2d3d] text-slate-200 rounded-lg px-3 py-1.5 text-[11px] font-mono focus:border-red-500 outline-none"
                      />
                      <button
                        onClick={() => handleReject(action.id)}
                        disabled={!rejectNote.trim() || rejectAction.isPending}
                        className="flex items-center gap-1.5 bg-[#3a1e1e] hover:bg-red-900 disabled:opacity-50 text-red-400 text-[10px] font-bold px-3 py-1.5 rounded-lg border border-red-900 transition-colors"
                      >
                        {rejectAction.isPending ? (
                          <div className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        Confirm reject
                      </button>
                      <button
                        onClick={() => { setRejectingId(null); setRejectNote('') }}
                        className="text-[10px] text-slate-600 hover:text-slate-300 px-2"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => handleApprove(action.id)}
                        disabled={approveAction.isPending}
                        className="flex items-center gap-1.5 bg-[#0d2e1a] hover:bg-green-900 disabled:opacity-50 text-green-400 text-[10px] font-bold px-4 py-1.5 rounded-lg border border-[#166534] transition-colors"
                      >
                        {approveAction.isPending ? (
                          <div className="w-3 h-3 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <CheckCircle className="w-3 h-3" />
                        )}
                        Approve
                      </button>
                      <button
                        onClick={() => setRejectingId(action.id)}
                        className="flex items-center gap-1.5 bg-[#1a0f0f] hover:bg-red-950 text-red-500 text-[10px] font-bold px-4 py-1.5 rounded-lg border border-red-950 transition-colors"
                      >
                        <XCircle className="w-3 h-3" />
                        Reject
                      </button>
                      <div className="ml-auto text-[9px] text-slate-700 font-mono">
                        ID: {action.id.slice(0, 8)}…
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Error */}
              {(approveAction.error || rejectAction.error) && (
                <div className="px-5 pb-3">
                  <p className="text-[10px] text-red-400 bg-[#1c0000] border border-red-900 rounded-lg px-3 py-2">
                    {(approveAction.error as Error)?.message || (rejectAction.error as Error)?.message}
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ActionIcon({ category }: { category: string }) {
  const map: Record<string, string> = {
    'bid.submit':              '⚡',
    'bid.withdraw':            '↩',
    'webhook.create':          '🔗',
    'webhook.delete':          '✂',
    'api_key.create':          '🔑',
    'api_key.revoke':          '🔒',
    'user.invite':             '👤',
    'user.role_change':        '🔄',
    'user.remove':             '✕',
    'institution.approve':     '✓',
    'institution.suspend':     '⊘',
    'institution.modules_update': '◈',
  }
  return (
    <span className="text-[13px]">{map[category] ?? '⬡'}</span>
  )
}
