import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Conditional className join with Tailwind conflict resolution. */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default cn;
