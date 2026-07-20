import { useEffect, useState, useCallback, useRef } from 'react'
import {
  Armchair,
  Receipt,
  Bell,
  X,
  ChevronLeft,
  ChevronRight,
  Move,
  LayoutGrid,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { useServerCalls } from '../../hooks/useServerCalls'
import { formatCurrency, timeAgo } from '../../lib/format'
import { Button, FullPageSpinner, EmptyState, Badge } from '../../components/ui'
import { ORDER_STATUSES } from '../../lib/constants'

// Active (unpaid) statuses = the table is occupied.
const OPEN = ['new', 'preparing', 'ready', 'served']

const STATE = {
  here: { bg: 'bg-emerald-50', ring: 'ring-2 ring-emerald-400', dot: 'bg-emerald-500', text: 'text-emerald-700', label: 'Someone’s here' },
  occupied: { bg: 'bg-amber-50', ring: 'ring-1 ring-amber-300', dot: 'bg-amber-500', text: 'text-amber-700', label: 'Occupied' },
  free: { bg: 'bg-white', ring: 'ring-1 ring-stone-200', dot: 'bg-stone-300', text: 'text-stone-400', label: 'Free' },
}

export default function Floor() {
  const { restaurant } = useAuth()
  const rid = restaurant.id
  const currency = restaurant.currency

  const [tables, setTables] = useState([])
  const [orders, setOrders] = useState([])
  const [present, setPresent] = useState(() => new Set())
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [arranging, setArranging] = useState(false)
  const reloadTimer = useRef(null)
  const { calls } = useServerCalls(rid)

  const loadTables = useCallback(async () => {
    const { data } = await supabase
      .from('tables')
      .select('*')
      .eq('restaurant_id', rid)
      .order('position')
      .order('created_at')
    setTables((data || []).filter((t) => t.kind !== 'counter')) // counters aren't seated tables
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

  useEffect(() => {
    Promise.all([loadTables(), loadOrders()]).then(() => setLoading(false))
    const ch = supabase
      .channel(`floor-orders-${rid}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${rid}` },
        () => {
          clearTimeout(reloadTimer.current)
          reloadTimer.current = setTimeout(loadOrders, 250)
        },
      )
      .subscribe()
    return () => {
      clearTimeout(reloadTimer.current)
      supabase.removeChannel(ch)
    }
  }, [rid, loadTables, loadOrders])

  // Live presence: which tables have a guest on the menu right now.
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

  const move = async (idx, dir) => {
    const j = idx + dir
    if (j < 0 || j >= tables.length) return
    const next = [...tables]
    ;[next[idx], next[j]] = [next[j], next[idx]]
    setTables(next)
    await Promise.all(next.map((t, i) => supabase.from('tables').update({ position: i }).eq('id', t.id)))
  }

  if (loading) return <FullPageSpinner label="Loading floor…" />

  const selectedTable = tables.find((t) => t.id === selected)

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold text-stone-900">Floor</h1>
          <p className="mt-1 text-sm text-stone-500">
            Live table status — tap a table to see its order.
          </p>
        </div>
        {tables.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => setArranging((a) => !a)}>
            <Move className="h-4 w-4" /> {arranging ? 'Done arranging' : 'Arrange'}
          </Button>
        )}
      </div>

      {tables.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title="No tables yet"
          description="Create tables (and their QR codes) in Tables & QR codes — they'll appear here."
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {tables.map((t, i) => {
            const os = byTable[t.id] || []
            const state = present.has(t.id) ? 'here' : os.length > 0 ? 'occupied' : 'free'
            return (
              <TableTile
                key={t.id}
                table={t}
                state={state}
                orders={os.length}
                total={os.reduce((s, o) => s + Number(o.total || 0), 0)}
                billReq={os.some((o) => o.bill_requested)}
                called={calledTables.has(t.id)}
                currency={currency}
                arranging={arranging}
                isFirst={i === 0}
                isLast={i === tables.length - 1}
                onOpen={() => setSelected(t.id)}
                onMove={(d) => move(i, d)}
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

function TableTile({ table, state, orders, total, billReq, called, currency, arranging, isFirst, isLast, onOpen, onMove }) {
  const s = STATE[state]
  return (
    <div className={`relative rounded-2xl p-4 shadow-sm transition ${s.bg} ${s.ring}`}>
      {called && (
        <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-orange-500 text-white">
          <Bell className="h-3.5 w-3.5 animate-bounce" />
        </span>
      )}
      <button
        onClick={arranging ? undefined : onOpen}
        disabled={arranging}
        className="block w-full text-left disabled:cursor-default"
      >
        <div className="flex items-center gap-2">
          <Armchair className={`h-5 w-5 ${state === 'free' ? 'text-stone-300' : s.text}`} />
          <span className="truncate font-bold text-stone-900">{table.label}</span>
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold">
          <span className="relative flex h-2 w-2">
            {state === 'here' && (
              <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${s.dot} opacity-75`} />
            )}
            <span className={`relative inline-flex h-2 w-2 rounded-full ${s.dot}`} />
          </span>
          <span className={s.text}>{s.label}</span>
        </div>
        {orders > 0 && (
          <p className="mt-1 text-xs text-stone-500">
            {orders} {orders === 1 ? 'order' : 'orders'} · {formatCurrency(total, currency)}
          </p>
        )}
        {billReq && (
          <Badge className="mt-2 bg-orange-100 text-orange-700">
            <Receipt className="h-3 w-3" /> Bill requested
          </Badge>
        )}
      </button>

      {arranging && (
        <div className="mt-3 flex justify-between">
          <button
            onClick={() => onMove(-1)}
            disabled={isFirst}
            className="rounded-lg bg-white p-1.5 text-stone-500 ring-1 ring-stone-200 disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => onMove(1)}
            disabled={isLast}
            className="rounded-lg bg-white p-1.5 text-stone-500 ring-1 ring-stone-200 disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
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
