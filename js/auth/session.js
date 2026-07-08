/**
 * Client-side auth session (sessionStorage)
 */

const TOKEN_KEY = "dsa-auth-token";
const USER_KEY = "dsa-auth-user";

export function getToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

export function getSessionUser() {
  try {
    const raw = sessionStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSession({ token, user }) {
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    /* sessionStorage unavailable */
  }
}

export function clearSession() {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
  } catch {
    /* sessionStorage unavailable */
  }
}

export function isAuthenticated() {
  return Boolean(getToken());
}

export function isAdmin() {
  return getSessionUser()?.role === "admin";
}