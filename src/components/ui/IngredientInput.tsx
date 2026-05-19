'use client'

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils/cn'
import { useIngredients } from '@/hooks/useIngredients'
import type { Ingredient } from '@/types'

interface IngredientInputProps {
  value:       string
  onChange:    (value: string, ingredient?: Ingredient | null) => void
  placeholder?: string
  className?:  string
  disabled?:   boolean
}

export function IngredientInput({
  value,
  onChange,
  placeholder = 'Ingredient name',
  className,
  disabled,
}: IngredientInputProps) {
  const { search } = useIngredients()
  const [suggestions, setSuggestions] = useState<Ingredient[]>([])
  const [open, setOpen]               = useState(false)
  const [highlighted, setHighlighted] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef  = useRef<HTMLUListElement>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value
    onChange(q, null)
    if (q.length >= 1) {
      setSuggestions(search(q))
      setOpen(true)
      setHighlighted(-1)
    } else {
      setOpen(false)
    }
  }

  function handleSelect(ing: Ingredient) {
    onChange(ing.name, ing)
    setOpen(false)
    setSuggestions([])
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted((h) => Math.min(h + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted((h) => Math.max(h - 1, -1))
    } else if (e.key === 'Enter' && highlighted >= 0) {
      e.preventDefault()
      handleSelect(suggestions[highlighted])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  // Close on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (
        !inputRef.current?.contains(e.target as Node) &&
        !listRef.current?.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  return (
    <div className={cn('relative', className)}>
      <input
        ref={inputRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => value.length >= 1 && setOpen(suggestions.length > 0)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        className={cn(
          'w-full rounded-lg px-3 py-2',
          'text-sm text-zinc-900 dark:text-zinc-100',
          'bg-white dark:bg-slate-850',
          'border border-parchment-200 dark:border-slate-700',
          'placeholder:text-zinc-400 dark:placeholder:text-zinc-500',
          'focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent',
          'transition-shadow',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      />
      {open && suggestions.length > 0 && (
        <ul
          ref={listRef}
          className={cn(
            'absolute z-50 left-0 right-0 mt-1',
            'max-h-52 overflow-y-auto',
            'rounded-xl border border-parchment-200 dark:border-slate-700',
            'bg-white dark:bg-slate-900',
            'shadow-card-lg',
            'py-1',
          )}
        >
          {suggestions.map((ing, idx) => (
            <li key={ing.id}>
              <button
                type="button"
                onMouseDown={() => handleSelect(ing)}
                className={cn(
                  'w-full text-left px-3.5 py-2 text-sm',
                  'flex items-center justify-between gap-2',
                  highlighted === idx
                    ? 'bg-parchment-100 dark:bg-slate-800 text-zinc-900 dark:text-zinc-100'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-parchment-50 dark:hover:bg-slate-800',
                )}
              >
                <span>{ing.name}</span>
                {ing.ingredient_category && (
                  <span className="text-xs text-zinc-400 dark:text-zinc-500 truncate">
                    {ing.ingredient_category.name}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
