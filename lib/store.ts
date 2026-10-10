"use client";

import { useSyncExternalStore } from "react";
import { parseCase, type CaseFile } from "./case";

/**
 * Cases live in THIS BROWSER and nowhere else.
 *
 * That is a limitation and also the honest privacy story for a first version:
 * a migration letter is about as sensitive as paperwork gets, and until there
 * are accounts and encryption there is no server of ours it should sit on.
 * Export/import is how a case moves between devices or to a helper.
 */
const KEY = "causius.cases.v1";
const EMPTY: CaseFile[] = [];

let cachedRaw: string | null = null;
let cached: CaseFile[] = EMPTY;
const listeners = new Set<() => void>();

function read(): CaseFile[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return cached; // storage blocked (private mode): keep the in-memory copy
  }
  if (raw === cachedRaw) return cached;
  cachedRaw = raw;
  try {
    const list: unknown = raw ? JSON.parse(raw) : [];
    cached = Array.isArray(list) ? list.flatMap((c) => parseCase(c) ?? []) : EMPTY;
  } catch {
    cached = EMPTY;
  }
  return cached;
}

function write(next: CaseFile[]) {
  cached = next;
  try {
    cachedRaw = JSON.stringify(next);
    window.localStorage.setItem(KEY, cachedRaw);
  } catch {
    // Still usable for this visit; it just will not survive a reload.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function useCases(): CaseFile[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function saveCase(c: CaseFile) {
  const list = read();
  write(list.some((x) => x.id === c.id) ? list.map((x) => (x.id === c.id ? c : x)) : [c, ...list]);
}

export function deleteCase(id: string) {
  write(read().filter((x) => x.id !== id));
}

/** Today as YYYY-MM-DD on the client, null while server-rendering. */
export function useToday(): string | null {
  return useSyncExternalStore(
    () => () => {},
    () => new Date().toISOString().slice(0, 10),
    () => null,
  );
}

/** False during server render and hydration, true after — for storage-backed UI. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}
