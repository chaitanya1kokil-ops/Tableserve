import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // Surfaced loudly in the console + UI so setup mistakes are obvious.
  console.error(
    'Missing Supabase env vars. Copy .env.example to .env and set ' +
      'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then restart the dev server.',
  )
}

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey)

// createClient throws if the URL/key are empty, which would crash the whole app
// to a blank screen before <SetupNotice /> can render. Fall back to a harmless
// placeholder when config is missing so the app boots and shows the setup screen.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
)

/**
 * Public URL for a file stored in the restaurant-images bucket.
 * @param {string} path e.g. "{restaurantId}/items/abc.jpg"
 */
export function imageUrl(path) {
  if (!path) return null
  if (path.startsWith('http')) return path
  return supabase.storage.from('restaurant-images').getPublicUrl(path).data.publicUrl
}

const BUCKET = 'restaurant-images'

function fileExt(file) {
  const fromName = file.name?.split('.').pop()
  if (fromName && fromName.length <= 5) return fromName.toLowerCase()
  return (file.type?.split('/')[1] || 'jpg').toLowerCase()
}

/**
 * Upload an image to the tenant bucket and return its storage path.
 * Storage RLS requires the first folder to equal the caller's restaurant_id,
 * so `dir` must start with the restaurant id (e.g. `${restaurantId}/items`).
 * `key` is a stable name (without extension) so re-uploads overwrite cleanly.
 */
export async function uploadImage(file, dir, key) {
  const path = `${dir}/${key}.${fileExt(file)}`
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, cacheControl: '3600' })
  if (error) throw error
  return path
}
