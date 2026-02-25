import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPercentage(value: number | null): string {
  if (value === null || value === undefined) {
    return '--';
  }
  return `${value.toFixed(1)}%`;
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export function formatHeroName(hero: string): string {
  return hero
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function calculateChange(start: number | null, end: number | null): number | null {
  if (start === null || end === null) {
    return null;
  }
  return end - start;
}

export function getChangeColor(change: number | null): string {
  if (change === null) {
    return 'text-gray-500';
  }
  if (change > 0.5) {
    return 'text-green-500';
  }
  if (change < -0.5) {
    return 'text-red-500';
  }
  return 'text-gray-500';
}
