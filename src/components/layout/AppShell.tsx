import { JSX, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface AppShellProps {
  children: React.ReactNode
  className?: string
}

export default function AppShell({ children, className }: AppShellProps): JSX.Element {
  useEffect(() => {
    document.documentElement.classList.add('dark')
    document.body.style.backgroundColor = '#000000'
  }, [])

  return (
    <div
      className={cn(
        'dark min-h-screen w-full bg-[#000000] text-white antialiased',
        'flex flex-col overflow-hidden',
        className,
      )}
    >
      {children}
    </div>
  )
}
