import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge Tailwind class names, resolving conflicts so the last class wins.
 *
 * Required by shadcn/ui components. `clsx` handles conditional/array/object
 * inputs; `twMerge` then de-duplicates conflicting Tailwind utilities
 * (e.g. `px-2 px-4` collapses to `px-4`), which plain string concatenation
 * cannot do.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
