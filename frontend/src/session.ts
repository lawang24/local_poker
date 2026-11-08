export const sessionKey = "larrypokernow:global";

export function migrateSessionKeys() {
  for (const storage of [sessionStorage, localStorage]) {
    for (const field of ["name", "token"]) {
      const oldKey = `headwins:global:${field}`;
      const saved = storage.getItem(oldKey);
      if (saved === null) continue;
      const newKey = `${sessionKey}:${field}`;
      if (storage.getItem(newKey) === null) storage.setItem(newKey, saved);
      storage.removeItem(oldKey);
    }
  }
}
