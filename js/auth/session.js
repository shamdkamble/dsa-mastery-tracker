/**
 * Client-side auth session (localStorage — survives app restarts on mobile PWA)
 */

const TOKEN_KEY = "dsa-auth-token";
const USER_KEY = "dsa-auth-user";

/** @deprecated sessionStorage keys — migrated once on read */
const LEGACY_TOKEN_KEY = TOKEN_KEY;
const LEGACY_USER_KEY = USER_KEY;

function readStorage(store, key) {
  try {
    return store.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(store, key, value) {
  try {
    store.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function removeStorage(store, key) {
  try {
    store.removeItem(key);
  } catch {
    /* ignore */
  }
}

function migrateFromSessionStorage() {
  try {
    const legacyToken = readStorage(sessionStorage, LEGACY_TOKEN_KEY);
    const legacyUser = readStorage(sessionStorage, LEGACY_USER_KEY);
    if (!legacyToken && !legacyUser) return;

    if (legacyToken && !readStorage(localStorage, TOKEN_KEY)) {
      writeStorage(localStorage, TOKEN_KEY, legacyToken);
    }
    if (legacyUser && !readStorage(localStorage, USER_KEY)) {
      writeStorage(localStorage, USER_KEY, legacyUser);
    }

    removeStorage(sessionStorage, LEGACY_TOKEN_KEY);
    removeStorage(sessionStorage, LEGACY_USER_KEY);
  } catch {
    /* ignore */
  }
}

migrateFromSessionStorage();

export function getToken() {
  return readStorage(localStorage, TOKEN_KEY) || "";
}

export function getSessionUser() {
  try {
    const raw = readStorage(localStorage, USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSession({ token, user }) {
  writeStorage(localStorage, TOKEN_KEY, token);
  writeStorage(localStorage, USER_KEY, JSON.stringify(user));
  removeStorage(sessionStorage, LEGACY_TOKEN_KEY);
  removeStorage(sessionStorage, LEGACY_USER_KEY);
}

export function clearSession() {
  removeStorage(localStorage, TOKEN_KEY);
  removeStorage(localStorage, USER_KEY);
  removeStorage(sessionStorage, LEGACY_TOKEN_KEY);
  removeStorage(sessionStorage, LEGACY_USER_KEY);
}

export function isAuthenticated() {
  return Boolean(getToken());
}

export function isAdmin() {
  return getSessionUser()?.role === "admin";
}

export function isTester() {
  return getSessionUser()?.role === "tester";
}

export function isTesterOrAdmin() {
  const role = getSessionUser()?.role;
  return role === "tester" || role === "admin";
}