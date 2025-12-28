import { cn } from '@/lib/utils'
import { forwardRef, InputHTMLAttributes } from 'react'
import { Search } from 'lucide-react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftIcon?: React.ReactNode
  isSearch?: boolean
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, leftIcon, isSearch, type = 'text', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="label">
            {label}
          </label>
        )}
        <div className="relative">
          {(leftIcon || isSearch) && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {isSearch ? <Search className="w-4 h-4" /> : leftIcon}
            </div>
          )}
          <input
            ref={ref}
            type={type}
            className={cn(
              'input',
              (leftIcon || isSearch) && 'pl-10',
              error && 'border-red-500 focus:ring-red-500',
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="mt-1.5 text-sm text-red-500">{error}</p>
        )}
        {hint && !error && (
          <p className="mt-1.5 text-sm text-gray-500">{hint}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input
