import { cn } from '@/lib/utils/cn'

type BadgeVariant = 'category' | 'tag' | 'neutral' | 'amber'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
  onClick?: () => void
  active?: boolean
}

const variantStyles: Record<BadgeVariant, { base: string; active: string; inactive: string }> = {
  category: {
    base:     'font-medium',
    active:   'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 ring-1 ring-amber-300 dark:ring-amber-700',
    inactive: 'bg-parchment-100 text-zinc-600 dark:bg-slate-800 dark:text-zinc-400 hover:bg-parchment-200 dark:hover:bg-slate-700',
  },
  tag: {
    base:     '',
    active:   'bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900',
    inactive: 'bg-parchment-100 text-zinc-500 dark:bg-slate-800 dark:text-zinc-400 hover:bg-parchment-200 dark:hover:bg-slate-700',
  },
  neutral: {
    base:     '',
    active:   'bg-zinc-200 text-zinc-700 dark:bg-slate-700 dark:text-zinc-300',
    inactive: 'bg-parchment-100 text-zinc-500 dark:bg-slate-800 dark:text-zinc-400',
  },
  amber: {
    base:     '',
    active:   'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    inactive: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  },
}

export function Badge({
  children,
  variant = 'neutral',
  className,
  onClick,
  active = true,
}: BadgeProps) {
  const v = variantStyles[variant]
  const isInteractive = !!onClick

  const Comp = isInteractive ? 'button' : 'span'

  return (
    <Comp
      onClick={onClick}
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs',
        v.base,
        active ? v.active : v.inactive,
        isInteractive && 'cursor-pointer transition-colors',
        className,
      )}
    >
      {children}
    </Comp>
  )
}
