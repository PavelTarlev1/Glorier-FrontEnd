// Thin fetch wrappers around the Navlo backend API.
import type { RatesData, Calculation, NewCalculationInput } from './types';

const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const body = await res.json();
      if (body?.error) msg = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  if (res.status === 204) return null as T;
  return res.json() as Promise<T>;
}

export const api = {
  getRates: () => request<RatesData>('/rates'),

  getCalculations: (q?: string) => request<Calculation[]>('/calculations' + (q ? `?q=${encodeURIComponent(q)}` : '')),
  createCalculation: (data: NewCalculationInput) => request<Calculation>('/calculations', { method: 'POST', body: JSON.stringify(data) }),
  deleteCalculation: (id: number) => request<null>(`/calculations/${id}`, { method: 'DELETE' }),

  geocode: (q: string) => request<{ lat: number; lon: number } | null>(`/geocode?q=${encodeURIComponent(q)}`),
};
