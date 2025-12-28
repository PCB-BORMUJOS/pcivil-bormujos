import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: number | string
  icon?: LucideIcon
  variant?: 'default' | 'warning' | 'danger' | 'success'
  className?: string
}

export default function StatCard({ 
  label, 
  value, 
  icon: Icon,
  variant = 'default',
  className 
}: StatCardProps) {
  const valueStyles = {
    default: 'text-gray-900',
    warning: 'text-pc-primary-500',
    danger: 'text-red-500',
    success: 'text-green-500',
  }

  return (
    <div className={cn('stat-card', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="stat-card-label">{label}</p>
          <p className={cn('stat-card-value', valueStyles[variant])}>
            {value}
          </p>
        </div>
        {Icon && (
          <div className={cn(
            'p-2 rounded-lg',
            variant === 'default' && 'bg-gray-100 text-gray-600',
            variant === 'warning' && 'bg-orange-100 text-orange-600',
            variant === 'danger' && 'bg-red-100 text-red-600',
            variant === 'success' && 'bg-green-100 text-green-600',
          )}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  )
}
