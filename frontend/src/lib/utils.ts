import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  // merges tailwind classes with precedence
  return twMerge(clsx(inputs))
} 