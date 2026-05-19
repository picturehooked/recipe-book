import Link from 'next/link'
import { Button } from '@/components/ui/Button'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <p className="text-6xl mb-4">🍽️</p>
      <h1 className="font-serif text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
        Recipe not found
      </h1>
      <p className="text-zinc-500 dark:text-zinc-400 mb-6">
        This recipe may have been deleted or the link is incorrect.
      </p>
      <Link href="/">
        <Button>Back to recipes</Button>
      </Link>
    </div>
  )
}
