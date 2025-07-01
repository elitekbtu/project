import * as React from 'react'
import type { ToastProps } from '@radix-ui/react-toast'
import {
  Provider as ToastProvider,
  Root as ToastRoot,
  Title as ToastTitle,
  Description as ToastDescription,
  Viewport as ToastViewport,
} from '@radix-ui/react-toast'
import { cn } from '../../lib/utils'

type ToastOptions = {
  title?: string
  description?: string
  variant?: 'default' | 'destructive'
} & ToastProps

const ToastContext = React.createContext<{
  toast: (options: ToastOptions) => void
}>({
  toast: () => {},
})

export const ToastProviderWrapper: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = React.useState<ToastOptions[]>([])

  const toast = (options: ToastOptions) => {
    setToasts((prev) => [...prev, options])
  }

  const removeToast = (index: number) => {
    setToasts((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      <ToastProvider>
        {children}
        {toasts.map((toast, index) => (
          <Toast
            key={index}
            {...toast}
            onOpenChange={(open) => !open && removeToast(index)}
          />
        ))}
        <ToastViewport className="fixed bottom-4 right-4 z-50" />
      </ToastProvider>
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  return React.useContext(ToastContext)
}

const Toast: React.FC<ToastOptions> = ({
  title,
  description,
  variant = 'default',
  ...props
}) => {
  return (
    <ToastRoot
      className={cn(
        'pointer-events-auto relative flex w-[360px] max-w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-4 pr-6 shadow-lg transition-all',
        variant === 'destructive'
          ? 'border-red-500 bg-red-600 text-white'
          : 'border-zinc-200 bg-white text-black'
      )}
      {...props}
    >
      <div className="flex flex-col space-y-1">
        {title && <ToastTitle className="text-sm font-semibold">{title}</ToastTitle>}
        {description && (
          <ToastDescription className="text-sm opacity-90">
            {description}
          </ToastDescription>
        )}
      </div>
    </ToastRoot>
  )
}
