'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { BookOpen } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'

function LoginForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const next         = searchParams.get('next') ?? '/'

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)

  // If already authenticated, skip the login page
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace(next)
    })
  }, [next, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError('Incorrect email or password.')
      setLoading(false)
      return
    }

    router.push(next)
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-parchment-50 dark:bg-slate-900 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <BookOpen
            className="h-6 w-6 text-amber-600 dark:text-amber-500"
            strokeWidth={1.75}
          />
          <span className="font-serif text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Recipe Drawer
          </span>
        </div>

        {/* Card */}
        <div className={cn(
          'rounded-xl border border-parchment-200 dark:border-slate-700',
          'bg-white dark:bg-slate-800',
          'p-8 shadow-sm',
        )}>
          <h1 className="font-serif text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-6">
            Sign in
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={cn(
                  'w-full rounded-lg px-3 py-2 text-sm',
                  'border border-parchment-300 dark:border-slate-600',
                  'bg-white dark:bg-slate-700',
                  'text-zinc-900 dark:text-zinc-100',
                  'placeholder:text-zinc-400',
                  'focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent',
                  'transition-colors',
                )}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={cn(
                  'w-full rounded-lg px-3 py-2 text-sm',
                  'border border-parchment-300 dark:border-slate-600',
                  'bg-white dark:bg-slate-700',
                  'text-zinc-900 dark:text-zinc-100',
                  'placeholder:text-zinc-400',
                  'focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent',
                  'transition-colors',
                )}
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className={cn(
                'w-full rounded-lg px-4 py-2 text-sm font-medium',
                'bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600',
                'text-white',
                'transition-colors',
                'disabled:opacity-60 disabled:cursor-not-allowed',
                'mt-2',
              )}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
