// Temporary diagnostic: reports which billing env vars are present in the
// deployment (booleans only — never the values). Safe to delete once billing
// is confirmed working.
export default function handler(req, res) {
  res.status(200).json({
    STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: !!process.env.STRIPE_WEBHOOK_SECRET,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_URL_or_VITE: !!(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL),
  })
}
