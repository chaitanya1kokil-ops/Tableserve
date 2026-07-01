import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Live count of orders still in the "new" state (placed but not yet started).
 * Realtime + a 15s polling fallback, so the Orders tab badge stays fresh
 * without a refresh. The count clears as staff advance orders out of "new".
 */
export function useNewOrderCount(restaurantId) {
  const [count, setCount] = useState(0)
  const debounce = useRef(null)

  const load = useCallback(async () => {
    if (!restaurantId) return
    const { count: c } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId)
      .eq('status', 'new')
    setCount(c || 0)
  }, [restaurantId])

  useEffect(() => {
    if (!restaurantId) return
    load()

    const channel = supabase
      .channel(`new-orders-${restaurantId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` },
        () => {
          clearTimeout(debounce.current)
          debounce.current = setTimeout(load, 200)
        },
      )
      .subscribe()

    const poll = setInterval(load, 15000)

    return () => {
      clearTimeout(debounce.current)
      clearInterval(poll)
      supabase.removeChannel(channel)
    }
  }, [restaurantId, load])

  return count
}
