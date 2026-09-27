import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'ghost' | 'outline' | 'danger'

const styles: Record<Variant, string> = {
  primary: 'bg-tp text-white hover:brightness-110',
  ghost: 'bg-transparent text-txt-muted hover:text-txt-primary hover:bg-bg-elevated',
  outline: 'border border-border-subtle text-txt-primary hover:bg-bg-elevated',
  danger: 'bg-sl text-white hover:brightness-110',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' }) {
  const sz = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-4 py-2 text-sm'
  return (
    <button
      {...props}
      className={`rounded-btn font-medium transition-all duration-150 ease-out disabled:opacity-50 disabled:cursor-not-allowed ${sz} ${styles[variant]} ${className}`}
    />
  )
}
