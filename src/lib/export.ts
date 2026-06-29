
import type { Tracker, PriceRecord } from '@/types';
import { getDB } from './db';
import { getDefaultsForExport, applyImportedDefaults } from './trackerDefaults';

export interface ExportData {
  version: '1.0';
  exportedAt: string;
  trackers: Tracker[];
  priceHistory: PriceRecord[];
  /** Tracker creation defaults (PRD v1.8 §4.11.6). */
  settings?: Record<string, string>;
}

export async function exportData(): Promise<void> {
  const db = getDB();
  const trackers = await db.trackers.toArray();
  const priceHistory = await db.priceHistory.toArray();
  const data: ExportData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    trackers,
    priceHistory,
    settings: getDefaultsForExport(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `flightwatch-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importData(
  file: File,
  mode: 'merge' | 'replace'
): Promise<{ trackers: number; records: number }> {
  const text = await file.text();
  const data = JSON.parse(text) as Partial<ExportData>;
  if (!data.version || !Array.isArray(data.trackers)) {
    throw new Error('Invalid Flightwatch backup file.');
  }
  const db = getDB();
  if (mode === 'replace') {
    await db.trackers.clear();
    await db.priceHistory.clear();
    // Apply imported defaults only on full replace (PRD §4.11.6)
    if (data.settings && typeof data.settings === 'object') {
      applyImportedDefaults(data.settings as Record<string, string>);
    }
    await db.trackers.bulkAdd(data.trackers);
    await db.priceHistory.bulkAdd(data.priceHistory || []);
    return { trackers: data.trackers.length, records: (data.priceHistory || []).length };
  } else {
    // Merge: existing locally-set defaults are preserved; imported defaults ignored (PRD §4.11.6)
    const existingIds = new Set(await db.trackers.toCollection().primaryKeys());
    const newTrackers = data.trackers.filter((t: Tracker) => !existingIds.has(t.id));
    await db.trackers.bulkAdd(newTrackers);
    const existingRecIds = new Set(await db.priceHistory.toCollection().primaryKeys());
    const newRecords = (data.priceHistory || []).filter((r: PriceRecord) => !existingRecIds.has(r.id));
    await db.priceHistory.bulkAdd(newRecords);
    return { trackers: newTrackers.length, records: newRecords.length };
  }
}
