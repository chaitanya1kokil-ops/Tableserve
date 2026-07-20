import { useEffect, useState, useCallback, useRef } from 'react'
import { Receipt, Bell, X, Move, LayoutGrid, Check } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { formatCurrency, timeAgo } from '../../lib/format'
import { Button, FullPageSpinner, EmptyState, Badge } from '../../components/ui'
import { ORDER_STATUSES } from '../../lib/constants'

const OPEN = ['new', 'preparing', 'ready', 'served'] // active (unpaid) = occupied

const STYLE = {
  here: 'bg-emerald-500 text-white ring-4 ring-emerald-200',
  occupied: 'bg-amber-400 text-white ring-4 ring-amber-100',
  free: 'bg-white text-stone-500 ring-1 ring-stone-200 shadow-sm',
}

export default function Floor() {
  const { restaurant } = useAuth()
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
          <h1 className="font-display text-3xl font-semibold text-stone-900">Floor</h1>
          <p className="mt-1 text-sm text-stone-500">
            {arranging ? 'Drag tables to match your real layout.' : 'Live table status — tap a table to see its order.'}
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
          className={`relative min-h-[62vh] w-full overflow-hidden rounded-3xl border ${
            arranging ? 'border-brand/40 bg-[repeating-linear-gradient(45deg,#00000005_0,#00000005_1px,transparent_0,transparent_14px)]' : 'border-stone-200'
          } bg-stone-50`}
        >
          {tables.map((t, i) => {
            const os = byTable[t.id] || []
            const state = present.has(t.id) ? 'here' : os.length > 0 ? 'occupied' : 'free'
            const x = t.pos_x ?? 10 + (i % 5) * 19
            const y = t.pos_y ?? 12 + Math.floor(i / 5) * 20
            return (
              <TableDot
                key={t.id}
                table={t}
                x={x}
                y={y}
                state={state}
                orders={os.length}
                total={os.reduce((s, o) => s + Number(o.total || 0), 0)}
                billReq={os.some((o) => o.bill_requested)}
                called={calledTables.has(t.id)}
                currency={currency}
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
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}

function Legend() {
  const items = [
    ['bg-emerald-500', 'Here'],
    ['bg-amber-400', 'Occupied'],
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

function TableDot({ table, x, y, state, orders, total, billReq, called, currency, arranging, onOpen, onPointerDown, onPointerMove, onPointerUp }) {
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
        className={`relative grid h-[68px] w-[68px] place-items-center rounded-2xl transition ${STYLE[state]} ${
          arranging ? 'cursor-grab active:cursor-grabbing' : 'hover:-translate-y-0.5'
        }`}
      >
        {state === 'here' && (
          <span className="absolute inset-0 animate-ping rounded-2xl bg-emerald-400 opacity-30" />
        )}
        <span className="relative px-1 text-center text-sm font-bold leading-tight">{table.label}</span>
        {orders > 0 && (
          <span className="relative mt-0.5 text-[10px] font-semibold opacity-90">
            {formatCurrency(total, currency)}
          </span>
        )}

        {/* corner indicators */}
        {orders > 0 && (
          <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-[1.25rem] place-items-center rounded-full bg-stone-900 px-1 text-[10px] font-bold text-white ring-2 ring-stone-50">
            {orders}
          </span>
        )}
        {called && (
          <span className="absolute -left-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-orange-500 text-white ring-2 ring-stone-50">
            <Bell className="h-3 w-3 animate-bounce" />
          </span>
        )}
        {billReq && (
          <span className="absolute -bottom-1.5 -right-1.5 grid h-5 w-5 place-items-center rounded-full bg-orange-100 text-orange-600 ring-2 ring-stone-50">
            <Receipt className="h-3 w-3" />
          </span>
        )}
      </button>
    </div>
  )
}

function TableSheet({ table, orders, currency, present, called, onClose }) {
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

        {rounds.length > 0 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-5 py-4">
            <span className="text-sm text-stone-500">Table total</span>
            <span className="font-display text-lg font-semibold text-stone-900">
              {formatCurrency(total, currency)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
