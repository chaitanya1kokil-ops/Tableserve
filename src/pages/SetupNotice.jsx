import { Database } from 'lucide-react'

export default function SetupNotice() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-gray-50 px-5">
      <div className="w-full max-w-lg rounded-2xl border border-gray-100 bg-white p-7 shadow-sm">
        <div className="mb-4 inline-flex rounded-2xl bg-red-50 p-3 text-brand">
          <Database className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">Connect Supabase to continue</h1>
        <p className="mt-2 text-sm text-gray-600">
          TableServe needs your Supabase project credentials. Create a{' '}
          <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">.env</code> file in the
          project root:
        </p>
        <pre className="mt-4 overflow-x-auto rounded-xl bg-gray-900 p-4 text-xs leading-relaxed text-gray-100">
{`VITE_SUPABASE_URL=https://YOUR-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key`}
        </pre>
        <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-sm text-gray-600">
          <li>Run the SQL in <code className="rounded bg-gray-100 px-1 text-xs">supabase/migrations</code>.</li>
          <li>Enable <strong>Anonymous sign-ins</strong> in Auth → Settings.</li>
          <li>Copy your URL + anon key from Project Settings → API.</li>
          <li>Restart the dev server (<code className="rounded bg-gray-100 px-1 text-xs">npm run dev</code>).</li>
        </ol>
        <p className="mt-4 text-xs text-gray-400">See README.md for full setup details.</p>
      </div>
    </div>
  )
}
