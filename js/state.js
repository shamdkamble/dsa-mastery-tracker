/**
 * Lightweight reactive app state (session-scoped)
 */

import { dispatch } from "./utils.js";

const STORAGE_KEY = "dsa-app-state";

const defaultState = {
  sidebarCollapsed: false,
  sidebarOpen: false,
  currentRoute: "dashboard",
  searchQuery: "",
  notifications: 0,
  user: {
    name: "Alex Chen",
    initials: "AC",
    role: "DSA Learner",
  },
};

let state = loadState();

function loadState() {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...defaultState, ...JSON.parse(stored) };
    }
  } catch (e) {
    /* sessionStorage unavailable */
  }
  return { ...defaultState };
}

function persistState() {
  try {
    const { sidebarCollapsed, sidebarOpen } = state;
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ sidebarCollapsed, sidebarOpen })
    );
  } catch (e) {
    /* sessionStorage unavailable */
  }
}

export function getState() {
  return { ...state };
}

export function getStateValue(key) {
  return state[key];
}

export function setState(updates) {
  const prev = { ...state };
  state = { ...state, ...updates };
  persistState();
  dispatch("state:change", { state, prev, updates });
}

export function subscribe(handler) {
  const listener = (e) => handler(e.detail);
  document.addEventListener("state:change", listener);
  return () => document.removeEventListener("state:change", listener);
}