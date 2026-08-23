import { supabase } from './supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

export type FinanceKind = 'upcoming' | 'wishlist';

export interface FinanceItem {
  id: string;
  kind: FinanceKind;
  name: string;
  link: string;
  currentCost: number | null;
  priceSelector: string | null;
  trackEnabled: boolean;
  lowestPrice: number | null;
  lastNotifiedPrice: number | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PricePoint {
  price: number;
  checkedAt: string;
}

export interface FinanceLoad {
  items: FinanceItem[] | null; // null only when the table is missing (needs setup)
  needsSetup: boolean;
}

// A new-item draft — the three core fields plus wishlist-only extras.
export interface NewFinanceItem {
  kind: FinanceKind;
  name: string;
  link: string;
  currentCost: number | null;
  priceSelector?: string | null;
  trackEnabled?: boolean;
}

// ── Row mapping (snake_case DB ↔ camelCase TS) ────────────────────────────────

interface FinanceRow {
  id: string;
  kind: FinanceKind;
  name: string;
  link: string;
  current_cost: number | null;
  price_selector: string | null;
  track_enabled: boolean;
  lowest_price: number | null;
  last_notified_price: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

function rowToItem(r: FinanceRow): FinanceItem {
  return {
    id: r.id,
    kind: r.kind,
    name: r.name,
    link: r.link ?? '',
    currentCost: r.current_cost,
    priceSelector: r.price_selector,
    trackEnabled: r.track_enabled,
    lowestPrice: r.lowest_price,
    lastNotifiedPrice: r.last_notified_price,
    sortOrder: r.sort_order,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// ── User id (mirrors storage.ts, kept local to avoid a private import) ────────

async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

function isMissingTable(error: { code?: string; message?: string }): boolean {
  return error.code === '42P01'          // Postgres: undefined_table
    || error.code === 'PGRST205'         // PostgREST: table not found in schema cache
    || /does not exist|schema cache|could not find/i.test(error.message ?? '');
}

// ── Items CRUD ────────────────────────────────────────────────────────────────

export async function loadFinanceItems(): Promise<FinanceLoad> {
  const userId = await getUserId();
  if (!userId) return { items: [], needsSetup: false };

  const { data, error } = await supabase
    .from('finance_items')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    if (isMissingTable(error)) return { items: null, needsSetup: true };
    throw error;
  }
  return { items: (data as FinanceRow[]).map(rowToItem), needsSetup: false };
}

export async function addFinanceItem(draft: NewFinanceItem): Promise<FinanceItem | null> {
  const userId = await getUserId();
  if (!userId) return null;

  const insert = {
    user_id: userId,
    kind: draft.kind,
    name: draft.name,
    link: draft.link ?? '',
    current_cost: draft.currentCost,
    price_selector: draft.priceSelector ?? null,
    track_enabled: draft.trackEnabled ?? true,
    // seed the low with the first known cost so tracking has a baseline
    lowest_price: draft.kind === 'wishlist' ? draft.currentCost : null,
    sort_order: Date.now(),
  };

  const { data, error } = await supabase
    .from('finance_items')
    .insert(insert)
    .select('*')
    .single();
  if (error) throw error;
  const item = rowToItem(data as FinanceRow);

  // Seed the chart with a first data point for tracked wishlist items.
  if (item.kind === 'wishlist' && item.currentCost !== null) {
    await recordPricePoint(item.id, item.currentCost);
  }
  return item;
}

export async function updateFinanceItem(
  id: string,
  patch: Partial<Pick<FinanceItem, 'name' | 'link' | 'currentCost' | 'priceSelector' | 'trackEnabled' | 'lowestPrice'>>,
): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.name !== undefined)          update.name = patch.name;
  if (patch.link !== undefined)          update.link = patch.link;
  if (patch.currentCost !== undefined)   update.current_cost = patch.currentCost;
  if (patch.priceSelector !== undefined) update.price_selector = patch.priceSelector;
  if (patch.trackEnabled !== undefined)  update.track_enabled = patch.trackEnabled;
  if (patch.lowestPrice !== undefined)   update.lowest_price = patch.lowestPrice;

  const { error } = await supabase
    .from('finance_items')
    .update(update)
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw error;
}

/**
 * Set a wishlist item's cost the way the tracker eventually will: append a
 * price-history point, refresh current_cost, and lower the all-time low if
 * beaten. Lets the chart fill in from manual edits before the cron exists.
 * Returns the (possibly updated) all-time low.
 */
export async function setWishlistCost(item: FinanceItem, newCost: number): Promise<number> {
  const newLow = item.lowestPrice === null ? newCost : Math.min(item.lowestPrice, newCost);
  await updateFinanceItem(item.id, { currentCost: newCost, lowestPrice: newLow });
  await recordPricePoint(item.id, newCost);
  return newLow;
}

export async function recordPricePoint(itemId: string, price: number): Promise<void> {
  const { error } = await supabase
    .from('price_history')
    .insert({ item_id: itemId, price });
  if (error && !isMissingTable(error)) throw error;
}

export async function deleteFinanceItem(id: string): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;
  const { error } = await supabase
    .from('finance_items')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw error;
}

// ── Price history ─────────────────────────────────────────────────────────────

export async function loadPriceHistory(itemIds: string[]): Promise<Record<string, PricePoint[]>> {
  const out: Record<string, PricePoint[]> = {};
  if (itemIds.length === 0) return out;

  const { data, error } = await supabase
    .from('price_history')
    .select('item_id, price, checked_at')
    .in('item_id', itemIds)
    .order('checked_at', { ascending: true });
  if (error) {
    if (isMissingTable(error)) return out;
    throw error;
  }

  for (const row of data as { item_id: string; price: number; checked_at: string }[]) {
    (out[row.item_id] ??= []).push({ price: row.price, checkedAt: row.checked_at });
  }
  return out;
}

// ── Formatting helpers ────────────────────────────────────────────────────────

export function formatMoney(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return '£' + n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Sum of current costs, ignoring rows with no price. */
export function totalCost(items: FinanceItem[]): number {
  return items.reduce((s, i) => s + (i.currentCost ?? 0), 0);
}
