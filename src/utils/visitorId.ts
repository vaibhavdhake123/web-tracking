import { getLocalStorage, readStorage, writeStorage } from "./storage.js";

const VISITOR_KEY = "dream-mythic-tracking-visitor-id";
let memoryVisitorId: string | undefined;

export function generateId(): string {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  } catch {
    // Fall through when the browser's crypto API is unavailable.
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    return (char === "x" ? random : (random & 0x3) | 0x8).toString(16);
  });
}

export function getVisitorId(): string {
  const storage = getLocalStorage();
  const existing = readStorage(storage, VISITOR_KEY);
  if (existing) return existing;
  if (memoryVisitorId) return memoryVisitorId;
  const created = generateId();
  if (!writeStorage(storage, VISITOR_KEY, created)) memoryVisitorId = created;
  return created;
}

export function clearVisitorId(): void {
  memoryVisitorId = undefined;
  const storage = getLocalStorage();
  try {
    storage?.removeItem(VISITOR_KEY);
  } catch {
    // Opt-out must still work when storage is unavailable.
  }
}
