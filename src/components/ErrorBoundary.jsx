import { Component } from 'react'

// Catches render errors so a single broken screen shows a message + reload
// instead of blanking the whole app to white.
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // Surfaced in the console for debugging.
    console.error('App error:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="grid min-h-[100dvh] place-items-center bg-[#faf6ef] px-6 text-center">
          <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <h1 className="font-display text-xl font-semibold text-stone-900">Something went wrong</h1>
            <p className="mt-2 break-words text-sm text-stone-500">
              {String(this.state.error?.message || this.state.error)}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-5 rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white"
            >
              Reload
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
