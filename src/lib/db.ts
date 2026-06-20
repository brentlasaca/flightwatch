
import Dexie, { Table } from 'dexie';
import type { Tracker, PriceRecord } from '@/types';

class FlightwatchDB extends Dexie {
  trackers!: Table<Tracker, string>;
  priceHistory!: Table<PriceRecord, string>;

  constructor() {
    super('flightwatch');
    this.version(1).stores({
      trackers: 'id, status, createdAt, updatedAt',
      priceHistory: 'id, trackerId, fetchedAt, status',
    });
  }
}

let _db: FlightwatchDB | null = null;

export function getDB(): FlightwatchDB {
  if (!_db) _db = new FlightwatchDB();
  return _db;
}

export async function pruneOldHistory(): Promise<void> {
  const db = getDB();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const old = await db.priceHistory
    .where('fetchedAt').below(cutoff.toISOString()).primaryKeys();
  await db.priceHistory.bulkDelete(old);
}
