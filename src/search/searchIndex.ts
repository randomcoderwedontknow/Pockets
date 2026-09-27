import type { Field, Item, ItemType, Pocket, Tag } from '@/domain/types';

/**
 * Lightweight in-memory search. Built from plaintext only: protected field
 * values are never indexed. Protected field *names* are indexed so a user can
 * still find "Bank -> Sort code" by the label.
 */

export interface SearchEntry {
  itemId: string;
  /** Lower-cased searchable text segments, in priority order. */
  title: string;
  pocketName: string;
  tags: string;
  description: string;
  fieldNames: string;
  /** Plaintext values of non-protected fields only. */
  fieldValues: string;
  /** For building "Pocket -> Item -> Field" breadcrumbs in results. */
  fieldPairs: { name: string; value: string }[];
}

export interface SearchFilters {
  pocketId?: string | null;
  type?: ItemType | null;
  favourite?: boolean;
  pinned?: boolean;
  protected?: boolean;
}

export interface SearchResult {
  item: Item;
  score: number;
  /** Which field matched, if the match came from a field value. Never a protected value. */
  matchedField?: { name: string; value: string };
}

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '');

export function buildIndex(items: Item[], fieldsByItem: Record<string, Field[]>, pockets: Pocket[], tags: Tag[]): SearchEntry[] {
  const pocketName = new Map(pockets.map((p) => [p.id, p.name]));
  const tagName = new Map(tags.map((t) => [t.id, t.name]));
  return items.map((item) => {
    const fields = fieldsByItem[item.id] ?? [];
    const pairs: { name: string; value: string }[] = [];
    for (const f of fields) {
      // Defence in depth: only ever read `value`, which is null for protected fields.
      if (f.protected || item.protected) continue;
      if (f.value) pairs.push({ name: f.name, value: f.value });
    }
    return {
      itemId: item.id,
      title: norm(item.title),
      pocketName: norm(pocketName.get(item.pocketId) ?? ''),
      tags: norm(item.tagIds.map((id) => tagName.get(id) ?? '').join(' ')),
      description: norm(item.description),
      fieldNames: norm(fields.map((f) => f.name).join(' ')),
      fieldValues: norm(pairs.map((p) => p.value).join(' ')),
      fieldPairs: pairs,
    };
  });
}

export function search(
  query: string,
  index: SearchEntry[],
  items: Item[],
  filters: SearchFilters = {},
  fieldsByItem: Record<string, Field[]> = {},
): SearchResult[] {
  const q = norm(query.trim());
  const terms = q.split(/\s+/).filter(Boolean);
  const byId = new Map(items.map((i) => [i.id, i]));
  const results: SearchResult[] = [];

  for (const entry of index) {
    const item = byId.get(entry.itemId);
    if (!item) continue;

    // Filters
    if (filters.pocketId && item.pocketId !== filters.pocketId) continue;
    if (filters.type && item.type !== filters.type) continue;
    if (filters.favourite && !item.favourite) continue;
    if (filters.pinned && !item.pinned) continue;
    if (filters.protected) {
      const anyProtected = item.protected || (fieldsByItem[item.id] ?? []).some((f) => f.protected);
      if (!anyProtected) continue;
    }

    if (terms.length === 0) {
      results.push({ item, score: 1 });
      continue;
    }

    let score = 0;
    let matchedField: SearchResult['matchedField'];
    let allTermsMatch = true;

    for (const t of terms) {
      let termScore = 0;
      if (entry.title.startsWith(t)) termScore = Math.max(termScore, 100);
      else if (entry.title.includes(t)) termScore = Math.max(termScore, 70);
      if (entry.tags.includes(t)) termScore = Math.max(termScore, 60);
      if (entry.pocketName.includes(t)) termScore = Math.max(termScore, 30);
      if (entry.fieldNames.includes(t)) termScore = Math.max(termScore, 35);
      if (entry.fieldValues.includes(t)) {
        termScore = Math.max(termScore, 50);
        if (!matchedField) {
          matchedField = entry.fieldPairs.find((p) => norm(p.value).includes(t));
        }
      }
      if (entry.description.includes(t)) termScore = Math.max(termScore, 25);
      if (termScore === 0) {
        allTermsMatch = false;
        break;
      }
      score += termScore;
    }

    if (!allTermsMatch) continue;
    if (item.pinned) score += 5;
    if (item.favourite) score += 3;
    results.push({ item, score, matchedField });
  }

  results.sort((a, b) => b.score - a.score || b.item.updatedAt.localeCompare(a.item.updatedAt));
  return results;
}
