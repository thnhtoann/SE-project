// Shared VND formatter for every real (backend-sourced) money value in the
// app — DRF returns DecimalFields as strings, so this accepts either.
export const currency = (value: number | string): string => `₫${Math.round(Number(value)).toLocaleString('en-US')}`;
