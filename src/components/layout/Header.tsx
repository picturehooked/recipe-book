'use client'

import Link from 'next/link'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Sun, Moon, BookOpen, Plus, ListOrdered } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface HeaderProps {
  showAddButton?: boolean
}

export function Header({ showAddButton = true }: HeaderProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  return (
    <header className={cn(
      'sticky top-0 z-40 w-full',
      'bg-parchment-50/95 dark:bg-slate-900/95',
      'backdrop-blur-sm',
      'border-b border-parchment-200 dark:border-slate-800',
    )}>
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">

          {/* Wordmark */}
          <Link
            href="/"
            className="flex items-center gap-2.5 group"
          >
            <BookOpen
              className="h-5 w-5 text-amber-600 dark:text-amber-500 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors"
              strokeWidth={1.75}
            />
            <span className="font-serif text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Recipe Drawer
            </span>
          </Link>

          {/* Right controls */}
          <div className="flex items-center gap-1">
            {/* Ingredients */}
            <Link
              href="/ingredients"
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5',
                'text-sm font-medium',
                'text-zinc-600 dark:text-zinc-400',
                'hover:text-zinc-900 dark:hover:text-zinc-100',
                'hover:bg-parchment-100 dark:hover:bg-slate-800',
                'transition-colors',
              )}
            >
              <ListOrdered className="h-4 w-4" strokeWidth={1.75} />
              <span className="hidden sm:inline">Ingredients</span>
            </Link>

            {/* New recipe / Import */}
            {showAddButton && (
              <Link
                href="/import"
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5',
                  'text-sm font-medium',
                  'bg-amber-600 hover:bg-amber-700',
                  'dark:bg-amber-500 dark:hover:bg-amber-600',
                  'text-white',
                  'transition-colors',
                )}
              >
                <Plus className="h-4 w-4" strokeWidth={2} />
                <span className="hidden sm:inline">New recipe</span>
              </Link>
            )}

            {/* Theme toggle */}
            {mounted && (
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className={cn(
                  'ml-1 rounded-lg p-2',
                  'text-zinc-500 dark:text-zinc-400',
                  'hover:text-zinc-900 dark:hover:text-zinc-100',
                  'hover:bg-parchment-100 dark:hover:bg-slate-800',
                  'transition-colors',
                )}
                aria-label="Toggle theme"
              >
                {theme === 'dark'
                  ? <Sun className="h-4 w-4" strokeWidth={1.75} />
                  : <Moon className="h-4 w-4" strokeWidth={1.75} />
                }
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
