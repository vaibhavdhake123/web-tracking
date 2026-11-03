import { generateId } from "./visitorId.js";
import { getSessionStorage, readStorage, writeStorage } from "./storage.js";

const SESSION_KEY = "dream-mythic-tracking-session-id";
let memorySessionId: string | undefined;

export function getSessionId(): string {
  const storage = getSessionStorage();
  const existing = readStorage(storage, SESSION_KEY);
  if (existing) return existing;
  if (memorySessionId) return memorySessionId;
  const created = generateId();
  if (!writeStorage(storage, SESSION_KEY, created)) memorySessionId = created;
  return created;
}

export function clearSessionId(): void {
  memorySessionId = undefined;
  const storage = getSessionStorage();
  try {
    storage?.removeItem(SESSION_KEY);
  } catch {
    // Storage can be disabled by browser policy.
  }
}
