import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Receipt, Bell, X, Move, LayoutGrid, Check, Wallet, User } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { formatCurrency, timeAgo } from '../../lib/format'
import { Button, FullPageSpinner, EmptyState, Badge } from '../../components/ui'
import { ORDER_STATUSES } from '../../lib/constants'

const ACTIVE = ['new', 'preparing', 'ready'] // still being worked on
const OPEN = [...ACTIVE, 'served'] // occupied (unpaid); served = done, awaiting payment

const STYLE = {
  active: 'bg-emerald-100 text-emerald-900 ring-1 ring-emerald-400', // subtle green — has an active order
  served: 'bg-amber-100 text-amber-900 ring-1 ring-amber-400', // subtle amber — served, awaiting payment
  free: 'bg-white text-stone-600 ring-1 ring-stone-200',
}

export default function Floor() {
  const { restaurant } = useAuth()
  const navigate = useNavigate()
  const rid = restaurant.id
  const currency = restaurant.currency

  const [tables, setTables] = useState([])
  const [orders, setOrders] = useState([])
  const [calls, setCalls] = useState([])
  const [present, setPresent] = useState(() => new Set())
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [arranging, setArranging] = useState(false)
  const reloadTimer = useRef(null)
  const canvasRef = useRef(null)
  const drag = useRef(null) // id being dragged
  const moved = useRef(false)

  const loadTables = useCallback(async () => {
    const { data } = await supabase
      .from('tables')
      .select('*')
      .eq('restaurant_id', rid)
      .order('position')
      .order('created_at')
    setTables((data || []).filter((t) => t.kind !== 'counter'))
  }, [rid])

  const loadOrders = useCallback(async () => {
    const { data } = await supabase
      .from('orders')
      .select('*, items:order_items(*)')
      .eq('restaurant_id', rid)
      .in('status', OPEN)
      .is('paid_at', null)
      .order('created_at')
    setOrders(data || [])
  }, [rid])

  const loadCalls = useCallback(async () => {
    const { data } = await supabase
      .from('server_calls')
      .select('*')
      .eq('restaurant_id', rid)
      .eq('status', 'pending')
    setCalls(data || [])
  }, [rid])

  useEffect(() => {
    Promise.all([loadTables(), loadOrders(), loadCalls()]).then(() => setLoading(false))
    const ch = supabase
      .channel(`floor-${rid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${rid}` }, () => {
        clearTimeout(reloadTimer.current)
        reloadTimer.current = setTimeout(loadOrders, 250)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'server_calls', filter: `restaurant_id=eq.${rid}` }, loadCalls)
      .subscribe()
    return () => {
      clearTimeout(reloadTimer.current)
      supabase.removeChannel(ch)
    }
  }, [rid, loadTables, loadOrders, loadCalls])

  // Live presence: tables with a guest on the menu right now.
  useEffect(() => {
    const ch = supabase.channel(`floor:${rid}`)
    ch.on('presence', { event: 'sync' }, () => {
      const ids = new Set()
      Object.values(ch.presenceState())
        .flat()
        .forEach((p) => p.table_id && ids.add(p.table_id))
      setPresent(ids)
    }).subscribe()
    return () => supabase.removeChannel(ch)
  }, [rid])

  const byTable = {}
  for (const o of orders) (byTable[o.table_id] ||= []).push(o)
  const calledTables = new Set(calls.map((c) => c.table_id))

  const resolveCall = async (tableId) => {
    const c = calls.find((x) => x.table_id === tableId)
    if (!c) return
    setCalls((cs) => cs.filter((x) => x.id !== c.id))
    await supabase.from('server_calls').update({ status: 'resolved', resolved_at: new Date().toISOString() }).eq('id', c.id)
  }

  // Live summary of the room.
  const nActive = tables.filter((t) => (byTable[t.id] || []).some((o) => ACTIVE.includes(o.status))).length
  const nServed = tables.filter((t) => {
    const os = byTable[t.id] || []
    return os.length > 0 && !os.some((o) => ACTIVE.includes(o.status))
  }).length
  const nFree = tables.length - nActive - nServed
  const nBills = tables.filter((t) => (byTable[t.id] || []).some((o) => o.bill_requested)).length

  // --- drag to reposition (pointer events → works on touch + mouse) ---
  const pointFromEvent = (e) => {
    const r = canvasRef.current.getBoundingClientRect()
    return {
      x: Math.min(96, Math.max(4, ((e.clientX - r.left) / r.width) * 100)),
      y: Math.min(94, Math.max(6, ((e.clientY - r.top) / r.height) * 100)),
    }
  }
  const onDown = (e, t) => {
    if (!arranging) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = t.id
    moved.current = false
  }
  const onMove = (e) => {
    if (!drag.current) return
    moved.current = true
    const { x, y } = pointFromEvent(e)
    setTables((ts) => ts.map((t) => (t.id === drag.current ? { ...t, pos_x: x, pos_y: y } : t)))
  }
  const onUp = async () => {
    const id = drag.current
    drag.current = null
    if (!id || !moved.current) return
    const t = tables.find((x) => x.id === id)
    if (t) await supabase.from('tables').update({ pos_x: t.pos_x, pos_y: t.pos_y }).eq('id', id)
  }

  if (loading) return <FullPageSpinner label="Loading floor…" />

  const selectedTable = tables.find((t) => t.id === selected)

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold text-stone-900">Floor plan</h1>
          <p className="mt-1 text-sm text-stone-500">
            {arranging
              ? 'Drag tables to match your real layout.'
              : tables.length > 0
                ? `${nActive} active · ${nServed} served · ${nFree} free${nBills ? ` · ${nBills} bill${nBills > 1 ? 's' : ''}` : ''}`
                : 'Live table status — tap a table to see its order.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Legend />
          {tables.length > 0 && (
            <Button variant={arranging ? undefined : 'outline'} size="sm" onClick={() => setArranging((a) => !a)}>
              {arranging ? <Check className="h-4 w-4" /> : <Move className="h-4 w-4" />}
              {arranging ? 'Done' : 'Arrange'}
            </Button>
          )}
        </div>
      </div>

      {tables.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title="No tables yet"
          description="Create tables (and their QR codes) in Tables & QR codes — they'll appear here."
        />
      ) : (
        <div
          ref={canvasRef}
          className={`relative min-h-[70vh] w-full overflow-hidden rounded-3xl shadow-[inset_0_2px_36px_rgba(80,60,30,0.14)] ring-1 transition ${
            arranging ? 'ring-2 ring-brand/50' : 'ring-stone-200'
          }`}
          style={{
            backgroundColor: '#f3ecdf',
            backgroundImage: [
              // soft light from the top + warm shadow pooling at the bottom
              'radial-gradient(120% 85% at 50% -10%, rgba(255,255,255,0.75), rgba(255,255,255,0) 55%)',
              'radial-gradient(150% 120% at 50% 125%, rgba(120,90,50,0.14), rgba(120,90,50,0) 55%)',
              // major architectural grid
              'linear-gradient(0deg, rgba(120,90,50,0.08) 1px, transparent 1px)',
              'linear-gradient(90deg, rgba(120,90,50,0.08) 1px, transparent 1px)',
              // fine minor grid
              'linear-gradient(0deg, rgba(120,90,50,0.04) 1px, transparent 1px)',
              'linear-gradient(90deg, rgba(120,90,50,0.04) 1px, transparent 1px)',
            ].join(','),
            backgroundSize: '100% 100%, 100% 100%, 120px 120px, 120px 120px, 24px 24px, 24px 24px',
          }}
        >
          {tables.map((t, i) => {
            const os = byTable[t.id] || []
            const activeCount = os.filter((o) => ACTIVE.includes(o.status)).length
            // green while there's active work, orange once everything's served
            const state = activeCount > 0 ? 'active' : os.length > 0 ? 'served' : 'free'
            const x = t.pos_x ?? 10 + (i % 5) * 19
            const y = t.pos_y ?? 12 + Math.floor(i / 5) * 20
            return (
              <TableDot
                key={t.id}
                table={t}
                x={x}
                y={y}
                state={state}
                count={activeCount}
                here={present.has(t.id)}
                billReq={os.some((o) => o.bill_requested)}
                called={calledTables.has(t.id)}
                arranging={arranging}
                onOpen={() => !moved.current && setSelected(t.id)}
                onPointerDown={(e) => onDown(e, t)}
                onPointerMove={onMove}
                onPointerUp={onUp}
              />
            )
          })}
        </div>
      )}

      {selectedTable && (
        <TableSheet
          table={selectedTable}
          orders={byTable[selectedTable.id] || []}
          currency={currency}
          present={present.has(selectedTable.id)}
          called={calledTables.has(selectedTable.id)}
          onResolve={() => resolveCall(selectedTable.id)}
          onCheckout={() => navigate('/dashboard/checkout')}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}

function Legend() {
  const items = [
    ['bg-emerald-500', 'Active'],
    ['bg-amber-400', 'Served'],
    ['bg-white ring-1 ring-stone-300', 'Free'],
  ]
  return (
    <div className="hidden items-center gap-3 sm:flex">
      {items.map(([c, l]) => (
        <span key={l} className="flex items-center gap-1.5 text-xs font-medium text-stone-500">
          <span className={`h-2.5 w-2.5 rounded-full ${c}`} /> {l}
        </span>
      ))}
    </div>
  )
}

function TableDot({ table, x, y, state, count, here, billReq, called, arranging, onOpen, onPointerDown, onPointerMove, onPointerUp }) {
  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 select-none"
      style={{ left: `${x}%`, top: `${y}%`, touchAction: arranging ? 'none' : 'auto' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <button
        onClick={arranging ? undefined : onOpen}
        className={`relative grid h-[58px] w-[58px] place-items-center rounded-xl shadow-sm transition ${STYLE[state]} ${
          arranging ? 'cursor-grab active:cursor-grabbing' : 'hover:-translate-y-0.5 hover:shadow-md'
        }`}
      >
        <span className="w-full truncate px-1 text-center text-[13px] font-bold leading-tight">{table.label}</span>

        {/* small static flags, tucked in the top-right */}
        {(here || called || billReq) && (
          <span className="absolute -right-1 -top-1 flex items-center gap-0.5">
            {here && (
              <span className="grid h-[15px] w-[15px] place-items-center rounded-full bg-sky-500 text-white ring-2 ring-white" title="Guest at the table">
                <User className="h-2 w-2" />
              </span>
            )}
            {called && (
              <span className="grid h-[15px] w-[15px] place-items-center rounded-full bg-orange-500 text-white ring-2 ring-white" title="Server called">
                <Bell className="h-2 w-2" />
              </span>
            )}
            {billReq && (
              <span className="grid h-[15px] w-[15px] place-items-center rounded-full bg-white text-orange-600 ring-1 ring-orange-200" title="Bill requested">
                <Receipt className="h-2 w-2" />
              </span>
            )}
          </span>
        )}
      </button>
    </div>
  )
}

function TableSheet({ table, orders, currency, present, called, onResolve, onCheckout, onClose }) {
  const total = orders.reduce((s, o) => s + Number(o.total || 0), 0)
  const rounds = [...orders].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-3xl bg-white sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h3 className="font-display text-xl font-semibold text-stone-900">{table.label}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {present && (
            <p className="mb-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
              A guest is at this table right now.
            </p>
          )}
          {called && (
            <p className="mb-3 rounded-xl bg-orange-50 px-3 py-2 text-sm font-medium text-orange-700">
              This table called for a server.
            </p>
          )}

          {rounds.length === 0 ? (
            <p className="py-8 text-center text-sm text-stone-400">No open orders at this table.</p>
          ) : (
            <div className="space-y-3">
              {rounds.map((o, i) => {
                const st = ORDER_STATUSES[o.status] || ORDER_STATUSES.new
                return (
                  <div key={o.id} className="border-t border-gray-100 pt-3 first:border-0 first:pt-0">
                    <div className="mb-1.5 flex items-center justify-between text-xs text-gray-400">
                      <span>
                        {rounds.length > 1 && <>Round {i + 1} · </>}
                        {timeAgo(o.created_at)}
                      </span>
                      <Badge className={st.color}>{st.label}</Badge>
                    </div>
                    <div className="space-y-1">
                      {(o.items || []).map((it) => (
                        <div key={it.id} className="flex justify-between gap-3 text-sm">
                          <span className="text-stone-700">
                            <span className="font-semibold">{it.quantity}×</span> {it.name_snapshot}
                          </span>
                          <span className="whitespace-nowrap text-stone-500">
                            {formatCurrency(it.line_total, currency)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="space-y-3 border-t border-gray-100 px-5 py-4">
          {rounds.length > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-stone-500">Table total</span>
              <span className="font-display text-lg font-semibold text-stone-900">
                {formatCurrency(total, currency)}
              </span>
            </div>
          )}
          <div className="flex gap-2">
            {called && (
              <Button variant="outline" className="flex-1" onClick={onResolve}>
                <Check className="h-4 w-4" /> Resolve call
              </Button>
            )}
            {rounds.length > 0 && (
              <Button className="flex-1" onClick={onCheckout}>
                <Wallet className="h-4 w-4" /> Take payment
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
