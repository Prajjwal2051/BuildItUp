// This file contains utility functions that are used throughout the application. The `cn` function is a common utility for combining class names, especially when using Tailwind CSS. It uses the `clsx` library to conditionally join class names and the `tailwind-merge` library to merge Tailwind CSS classes without conflicts.

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
