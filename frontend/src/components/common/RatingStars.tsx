import clsx from 'clsx'
import { Star } from 'lucide-react'
import React from 'react'

interface RatingStarsProps {
  /** Current rating value (1-5). Can be 0 or undefined to mean no rating */
  value?: number
  /** Called when the user selects a rating. If omitted, the component is read-only */
  onChange?: (value: number) => void
  /** Custom tailwind classes */
  className?: string
}

const RatingStars: React.FC<RatingStarsProps> = ({ value = 0, onChange, className }) => {
  const stars = Array.from({ length: 5 }, (_, i) => i + 1)
  const baseClass = 'h-4 w-4'

  return (
    <div className={clsx('flex items-center gap-1', className)}>
      {stars.map((star) => {
        const filled = value >= star
        return (
          <button
            key={star}
            type="button"
            disabled={!onChange}
            onClick={() => onChange?.(star)}
            className={clsx('transition-colors', baseClass, !onChange && 'cursor-default')}
          >
            <Star
              className={clsx(baseClass, filled ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400')}
            />
          </button>
        )
      })}
    </div>
  )
}

export default RatingStars 