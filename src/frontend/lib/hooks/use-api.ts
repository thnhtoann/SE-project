import useSWR, { SWRConfiguration } from 'swr';
import { apiFetch } from '@/lib/api-client';

// Thin wrapper around useSWR using apiFetch as the fetcher, so every screen
// shares one request cache instead of refetching on every mount/navigation.
// Pass `path: null` to skip fetching (e.g. while a dependency isn't ready
// yet) -- SWR's convention for a conditional request.
export const useApi = <T>(path: string | null, config?: SWRConfiguration) => useSWR<T>(path, (p: string) => apiFetch<T>(p), config);
