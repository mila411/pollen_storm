import { PollenData } from '@/types';

export type Level = PollenData['pollenLevel'];

type PollenLevelMeta = {
  label: string;
  color: string;
};

export const FRONTEND_THRESHOLD_LOW = 1;
export const FRONTEND_THRESHOLD_MODERATE = 11;
export const FRONTEND_THRESHOLD_HIGH = 31;
export const FRONTEND_THRESHOLD_VERY_HIGH = 101;
export const POLLEN_DENSITY_UNIT = '個/m³';

const LEVEL_META: Record<Level, PollenLevelMeta> = {
  low: {
    label: '低い',
    color: '#4ade80'
  },
  moderate: {
    label: '普通',
    color: '#fbbf24'
  },
  high: {
    label: '多い',
    color: '#fb923c'
  },
  very_high: {
    label: '非常に多い',
    color: '#ef4444'
  }
};

export function getFrontendLevelFromCount(count: number): Level {
  const value = Number.isFinite(count) ? Math.max(0, count) : 0;
  if (value >= FRONTEND_THRESHOLD_VERY_HIGH) {
    return 'very_high';
  }
  if (value >= FRONTEND_THRESHOLD_HIGH) {
    return 'high';
  }
  if (value >= FRONTEND_THRESHOLD_MODERATE) {
    return 'moderate';
  }
  return 'low';
}

export function getPollenLevelMeta(level: Level): PollenLevelMeta {
  return LEVEL_META[level] ?? {
    label: '不明',
    color: '#9ca3af'
  };
}

export function getPollenLabel(level: Level): string {
  return getPollenLevelMeta(level).label;
}

export function getPollenColor(level: Level): string {
  return getPollenLevelMeta(level).color;
}
