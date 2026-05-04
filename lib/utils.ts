import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function fmtDate(iso: string) {
  return new Date(iso).toLocaleString();
}

export function truncate(s: string, n = 40) {
  return s.length > n ? s.slice(0, n) + "…" : s;
}
