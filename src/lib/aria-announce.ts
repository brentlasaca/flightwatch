/**
 * aria-announce.ts — PRD v1.6 / Design Specs v1.4 §9.3
 *
 * Flightwatch no longer sends system notifications (OQ-8). When a price check
 * crosses the alert threshold during an active session the only proactive signal
 * available is the in-app visual treatment (amber card, pulse ring — §6.2) and
 * an assertive aria-live announcement for screen-reader users.
 *
 * Usage: call announceAlert(text) after detecting a false→true targetMet
 * transition. The text is injected into the #fw-aria-live region that
 * page.tsx mounts in the DOM. Screen readers pick it up via aria-live="assertive".
 */
export function announceAlert(text: string): void {
  if (typeof document === 'undefined') return;
  const el = document.getElementById('fw-aria-live');
  if (!el) return;
  // Clear first so re-announcing the same text still fires
  el.textContent = '';
  requestAnimationFrame(() => { el.textContent = text; });
}
