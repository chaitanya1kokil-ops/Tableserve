import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  TrendingUp,
  ShoppingBag,
  Clock,
  Flame,
  ArrowRight,
  CircleDollarSign,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { formatCurrency, timeAgo } from '../../lib/format'
import { ORDER_STATUSES } from '../../lib/constants'
import { Card, Badge, FullPageSpinner, EmptyState } from '../../components/ui'

const ACTIVE = ['new', 'preparing', 'ready', 'served']

export default function Overview() {
  const { restaurant, profile } = useAuth()
  const rid = restaurant.id
  const currency = restaurant.currency

  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState([])

  const load = useCallback(async () => {
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const { data } = await supabase
      .from('orders')
      .select('*, table:tables(label), items:order_items(name_snapshot, quantity, line_total)')
      .eq('restaurant_id', rid)
      .gte('created_at', weekAgo.toISOString())
      .order('created_at', { ascending: false })
    setOrders(data || [])
    setLoading(false)
  }, [rid])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <FullPageSpinner label="Crunching numbers…" />

  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  const today = orders.filter((o) => new Date(o.created_at) >= startOfToday)
  const todayPaid = today.filter((o) => o.status !== 'cancelled')
  const revenue = todayPaid.reduce((sum, o) => sum + Number(o.total || 0), 0)
  const avg = todayPaid.length ? revenue / todayPaid.length : 0
  const activeCount = orders.filter((o) => ACTIVE.includes(o.status)).length

  // Popular items this week.
  const tally = {}
  for (const o of orders) {
    if (o.status === 'cancelled') continue
    for (const it of o.items || []) {
      tally[it.name_snapshot] = (tally[it.name_snapshot] || 0) + (it.quantity || 0)
    }
  }
  const popular = Object.entries(tally)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
  const maxQty = popular[0]?.[1] || 1

  const recent = orders.slice(0, 6)

  const stats = [
    { label: "Today's orders", value: today.length, icon: ShoppingBag, tint: 'bg-blue-50 text-blue-600' },
    { label: "Today's revenue", value: formatCurrency(revenue, currency), icon: TrendingUp, tint: 'bg-emerald-50 text-emerald-600' },
    { label: 'Avg. order', value: formatCurrency(avg, currency), icon: CircleDollarSign, tint: 'bg-violet-50 text-violet-600' },
    { label: 'Active now', value: activeCount, icon: Clock, tint: 'bg-amber-50 text-amber-600' },
  ]

  const firstName = (profile?.full_name || '').split(' ')[0]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {firstName ? `Hi ${firstName} 👋` : 'Overview'}
        </h1>
        <p className="text-sm text-gray-500">Here’s how {restaurant.name} is doing today.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <div className={`mb-2 inline-flex rounded-xl p-2 ${s.tint}`}>
              <s.icon className="h-5 w-5" />
            </div>
            <p className="text-2xl font-extrabold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        {/* Popular items */}
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            <h2 className="font-bold text-gray-900">Popular this week</h2>
          </div>
          {popular.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">No sales yet this week.</p>
          ) : (
            <div className="space-y-3">
              {popular.map(([name, qty], i) => (
                <div key={name} className="flex items-center gap-3">
                  <span className="w-4 text-sm font-bold text-gray-400">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between text-sm">
                      <span className="truncate font-medium text-gray-800">{name}</span>
                      <span className="text-gray-500">{qty} sold</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-brand"
                        style={{ width: `${(qty / maxQty) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent activity */}
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold text-gray-900">Recent orders</h2>
            <Link to="/dashboard/orders" className="flex items-center gap-1 text-sm font-semibold text-brand">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {recent.length === 0 ? (
            <EmptyState icon={ShoppingBag} title="No orders yet" description="Share your table QR codes to get started." />
          ) : (
            <div className="divide-y divide-gray-100">
              {recent.map((o) => {
                const st = ORDER_STATUSES[o.status] || ORDER_STATUSES.new
                return (
                  <div key={o.id} className="flex items-center justify-between py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800">
                        {o.table?.label || 'No table'} ·{' '}
                        <span className="text-gray-500">
                          {(o.items || []).length} {(o.items || []).length === 1 ? 'item' : 'items'}
                        </span>
                      </p>
                      <p className="text-xs text-gray-400">{timeAgo(o.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={st.color}>{st.label}</Badge>
                      <span className="text-sm font-bold text-gray-900">
                        {formatCurrency(o.total, currency)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
