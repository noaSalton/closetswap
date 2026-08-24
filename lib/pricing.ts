// Inclusive of both the start and end day: booking the same day for pickup
// and return counts as a 1-day rental.
export function rentalDays(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  const diffDays = Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  return diffDays + 1;
}

export function rentalTotal(startDate: string, endDate: string, pricePerDay: number): number {
  return Math.round(rentalDays(startDate, endDate) * pricePerDay * 100) / 100;
}
