const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

/** Formats integer cents as a USD string, e.g. 4800 -> "$48.00". */
export function formatCents(cents: number): string {
  return usd.format(cents / 100);
}

export function centsFromDollars(dollars: number): number {
  return Math.round(dollars * 100);
}
