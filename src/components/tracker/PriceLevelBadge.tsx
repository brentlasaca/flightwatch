'use client';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';

interface PriceLevelBadgeProps {
  level: string;
}

const CONFIG = {
  low:     { Icon: TrendingDown, label: 'Low',     cls: 'price-level-badge price-level-badge-low' },
  typical: { Icon: Minus,        label: 'Typical',  cls: 'price-level-badge price-level-badge-typical' },
  high:    { Icon: TrendingUp,   label: 'High',     cls: 'price-level-badge price-level-badge-high' },
};

/**
 * Price Level Badge — used in tracker cards and the Price Insights Panel.
 * Uses dedicated CSS tokens (--price-level-*) — not the generic status tokens.
 */
export function PriceLevelBadge({ level }: PriceLevelBadgeProps) {
  const key = level.toLowerCase() as keyof typeof CONFIG;
  const c = CONFIG[key];
  if (!c) return null;

  const { Icon, label, cls } = c;

  return (
    <span className={cls} aria-label={`Price level: ${label}`}>
      <Icon size={11} aria-hidden="true" />
      {label}
    </span>
  );
}
