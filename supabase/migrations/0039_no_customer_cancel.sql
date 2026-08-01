-- ============================================================================
-- Remove customer-initiated cancellation
--
-- 0034 let a guest cancel their own order while it was still 'new' and unpaid.
-- The problem: a 'new' order has ALREADY been sent to the kitchen printer —
-- api/cloudprnt.js treats 'new', 'preparing' and 'ready' as printable — so the
-- ticket is on the pass, and possibly being cooked, before the guest taps
-- cancel. The kitchen has no idea the order was pulled.
--
-- The button is gone from the customer status screen. Taking the grant away too
-- means the capability is actually gone, not just hidden: the RPC could still
-- be called directly from a browser console against the public anon key.
--
-- Staff cancel from the orders board, where they can see the ticket and talk to
-- the line first.
--
-- The function itself is kept (not dropped) so this is a one-line revert if you
-- ever want guest cancellation back for a flow where nothing prints — pay-first
-- food trucks sit in 'awaiting_payment', which is NOT printable:
--   grant execute on function public.cancel_my_order(uuid) to anon, authenticated;
-- ============================================================================

-- Postgres grants EXECUTE to PUBLIC by default on new functions, and anon /
-- authenticated inherit it — revoking from those two roles alone leaves the
-- function fully callable. PUBLIC has to go first.
revoke execute on function public.cancel_my_order(uuid) from public;
revoke execute on function public.cancel_my_order(uuid) from anon, authenticated;

-- Staff and server-side code keep it: the orders board cancels through here.
grant execute on function public.cancel_my_order(uuid) to service_role;
