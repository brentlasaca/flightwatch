
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  return await Notification.requestPermission();
}

export function getNotificationPermission(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';
  return Notification.permission;
}

export function showPriceAlert(opts: {
  trackerName: string;
  route: string;
  currentPrice: number;
  targetPrice: number;
  currency: string;
  direction: 'below' | 'above';
  /** Price level context from price_insights, per PRD §4.8.5 */
  priceLevel?: string;
  typicalRange?: [number, number];
}): void {
  if (typeof window === 'undefined' || Notification.permission !== 'granted') return;
  const dir = opts.direction === 'below' ? 'dropped below' : 'risen above';
  const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: opts.currency, minimumFractionDigits: 0 });
  const title = `✈ ${opts.route} — Price Alert`;

  let body = `Current fare: ${fmt.format(opts.currentPrice)}`;
  if (opts.priceLevel) {
    const levelLabel = opts.priceLevel.charAt(0).toUpperCase() + opts.priceLevel.slice(1);
    body += ` (${levelLabel})`;
  }
  body += ` · Your target: ${fmt.format(opts.targetPrice)}`;

  // Price level context line, per PRD §4.8.5 example:
  // "This price is below the typical range of $310–$480."
  if (opts.typicalRange && opts.typicalRange[0] > 0 && opts.typicalRange[1] > 0) {
    const [low, high] = opts.typicalRange;
    if (opts.currentPrice < low) {
      body += `\nThis price is below the typical range of ${fmt.format(low)}–${fmt.format(high)}.`;
    } else if (opts.currentPrice > high) {
      body += `\nThis price is above the typical range of ${fmt.format(low)}–${fmt.format(high)}.`;
    } else {
      body += `\nThis price is within the typical range of ${fmt.format(low)}–${fmt.format(high)}.`;
    }
  } else {
    body = `Fare ${dir} your target! ${body}`;
  }

  try {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SHOW_NOTIFICATION', title, body });
    } else {
      new Notification(title, { body, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png' });
    }
  } catch {
    new Notification(title, { body });
  }
}

export function showQuotaExhaustedNotification(): void {
  if (typeof window === 'undefined' || Notification.permission !== 'granted') return;
  try {
    new Notification('Flightwatch — tracking paused', {
      body: 'Your SerpAPI credits have been exhausted. Add credits to resume tracking.',
      icon: '/icons/icon-192.png',
    });
  } catch { /* ignore */ }
}
