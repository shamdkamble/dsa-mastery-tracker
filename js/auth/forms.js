/**
 * Auth form handlers — document-level delegation so clicks always work
 */

import { Alert } from "../components/ui/index.js";
import { login, register, AuthApiError } from "../services/auth.js";
import { navigate } from "../router.js";
import { syncAuthState } from "./guards.js";

let bound = false;
const processing = new WeakSet();

async function handleLogin(form) {
  if (processing.has(form)) return;
  processing.add(form);
  const root = form.closest(".auth-page") || form.parentElement;
  const alertEl = root?.querySelector("#login-alert");
  const submitBtn = form.querySelector("#login-submit");

  if (alertEl) alertEl.innerHTML = "";

  const identifier = form.querySelector("#login-identifier")?.value?.trim();
  const password = form.querySelector("#login-password")?.value;

  if (!identifier || !password) {
    if (alertEl) {
      alertEl.innerHTML = Alert({
        variant: "danger",
        title: "Missing fields",
        text: "Please enter your email/username and password.",
      });
    }
    return;
  }

  submitBtn?.classList.add("is-loading");
  submitBtn?.setAttribute("disabled", "true");

  try {
    const result = await login({ identifier, password });
    await syncAuthState(result.user);
    navigate(result.user.role === "admin" ? "admin" : "dashboard");
  } catch (err) {
    const message = err instanceof AuthApiError
      ? err.message
      : "Sign in failed. Please try again.";

    const variant = err instanceof AuthApiError && err.code === "PENDING_APPROVAL"
      ? "warning"
      : "danger";

    if (alertEl) {
      alertEl.innerHTML = Alert({ variant, title: "Couldn't sign in", text: message });
    }
  } finally {
    submitBtn?.classList.remove("is-loading");
    submitBtn?.removeAttribute("disabled");
    processing.delete(form);
  }
}

async function handleRegister(form) {
  if (processing.has(form)) return;
  processing.add(form);
  const root = form.closest(".auth-page") || form.parentElement;
  const alertEl = root?.querySelector("#register-alert");
  const submitBtn = form.querySelector("#register-submit");

  if (alertEl) alertEl.innerHTML = "";

  const name = form.querySelector("#register-name")?.value?.trim();
  const email = form.querySelector("#register-email")?.value?.trim();
  const password = form.querySelector("#register-password")?.value;

  if (!name || !email || !password) {
    if (alertEl) {
      alertEl.innerHTML = Alert({
        variant: "danger",
        title: "Missing fields",
        text: "Please fill in all fields.",
      });
    }
    return;
  }

  submitBtn?.classList.add("is-loading");
  submitBtn?.setAttribute("disabled", "true");

  try {
    const result = await register({ name, email, password });
    await syncAuthState(result.user);
    navigate("dashboard");
  } catch (err) {
    const message = err instanceof AuthApiError
      ? err.message
      : "Registration failed. Please try again.";

    if (alertEl) {
      alertEl.innerHTML = Alert({ variant: "danger", title: "Couldn't register", text: message });
    }
  } finally {
    submitBtn?.classList.remove("is-loading");
    submitBtn?.removeAttribute("disabled");
    processing.delete(form);
  }
}

export function initAuthForms() {
  if (bound) return;
  bound = true;

  document.addEventListener("submit", (e) => {
    if (!(e.target instanceof HTMLFormElement)) return;

    if (e.target.id === "login-form") {
      e.preventDefault();
      handleLogin(e.target);
      return;
    }

    if (e.target.id === "register-form") {
      e.preventDefault();
      handleRegister(e.target);
    }
  });
}