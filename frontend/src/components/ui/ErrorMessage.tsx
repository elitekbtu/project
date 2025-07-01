import { Button } from "./button" 
import { cn } from "../../lib/utils"
type ErrorMessageProps = {
  message: string
  onRetry?: () => void
  className?: string
}

export const ErrorMessage = ({ 
  message, 
  onRetry, 
  className 
}: ErrorMessageProps) => {
  return (
    <div className={cn("max-w-md text-center", className)}>
      <div className="mb-4 text-red-600">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-12 w-12 mx-auto"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <p className="mt-2 font-medium">{message}</p>
      </div>
      
      {onRetry && (
        <Button
          onClick={onRetry}
          variant="outline"
          className="mt-4"
        >
          Попробовать снова
        </Button>
      )}
    </div>
  )
}