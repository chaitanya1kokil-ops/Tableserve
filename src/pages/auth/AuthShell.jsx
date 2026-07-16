import { Link } from 'react-router-dom'
import Logo from '../../components/Logo'

export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-gray-50">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-10">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2 font-extrabold text-gray-900">
          <Logo className="h-9 w-9" />
          TableServe
        </Link>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>

        {footer && <div className="mt-6 text-center text-sm text-gray-500">{footer}</div>}
      </div>
    </div>
  )
}
