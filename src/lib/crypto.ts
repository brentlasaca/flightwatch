
const KEY_STORE = 'fw_api_key';

export function saveApiKey(key: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY_STORE, btoa(unescape(encodeURIComponent(key))));
}

export function getApiKey(): string | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(KEY_STORE);
  if (!stored) return null;
  try { return decodeURIComponent(escape(atob(stored))); }
  catch { return null; }
}

export function clearApiKey(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(KEY_STORE);
}

export function hasApiKey(): boolean {
  return !!getApiKey();
}
