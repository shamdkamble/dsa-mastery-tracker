import { icon } from "../components/icons.js";
import { Button, Field, Input, Alert } from "../components/ui/index.js";
import { login, AuthApiError } from "../services/auth.js";
import { navigate } from "../router.js";
import { syncAuthState } from "../auth/guards.js";

export default {
  title: "Sign In",
  public: true,
  render() {
    return `
      <div class="auth-page">
        <div class="auth-card animate-fade-in-up">
          <div class="auth-card__brand">
            <div class="auth-card__logo" aria-hidden="true">${icon("logo")}</div>
            <div>
              <h1 class="auth-card__title">Welcome back</h1>
              <p class="auth-card__subtitle">Sign in to continue your FAANG mastery journey</p>
            </div>
          </div>

          <div id="login-alert"></div>

          <form class="auth-form" id="login-form" novalidate>
            ${Field({
              label: "Email or username",
              hint: "Users sign in with email. Admins use username <code>admin</code>.",
              children: Input({
                type: "text",
                placeholder: "you@email.com or admin",
                attrs: 'id="login-identifier" name="identifier" autocomplete="username" required',
              }),
            })}

            ${Field({
              label: "Password",
              children: Input({
                type: "password",
                placeholder: "Enter your password",
                attrs: 'id="login-password" name="password" autocomplete="current-password" required',
              }),
            })}

            ${Button({
              label: "Sign in",
              variant: "primary",
              className: "auth-form__submit",
              attrs: 'id="login-submit"',
            })}
          </form>

          <p class="auth-card__footer">
            Don't have an account?
            <a href="#/register" class="auth-link">Create one</a>
          </p>
        </div>

        <div class="auth-page__glow" aria-hidden="true"></div>
      </div>
    `;
  },
  onMount(container) {
    const form = container.querySelector("#login-form");
    const alertEl = container.querySelector("#login-alert");
    const submitBtn = container.querySelector("#login-submit");

    form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      alertEl.innerHTML = "";

      const identifier = container.querySelector("#login-identifier")?.value?.trim();
      const password = container.querySelector("#login-password")?.value;

      if (!identifier || !password) {
        alertEl.innerHTML = Alert({
          variant: "danger",
          title: "Missing fields",
          text: "Please enter your email/username and password.",
        });
        return;
      }

      submitBtn?.classList.add("is-loading");
      submitBtn?.setAttribute("disabled", "true");

      try {
        const result = await login({ identifier, password });
        syncAuthState(result.user);
        navigate(result.user.role === "admin" ? "admin" : "dashboard");
      } catch (err) {
        const message = err instanceof AuthApiError
          ? err.message
          : "Sign in failed. Please try again.";

        const variant = err instanceof AuthApiError && err.code === "PENDING_APPROVAL"
          ? "warning"
          : "danger";

        alertEl.innerHTML = Alert({ variant, title: "Couldn't sign in", text: message });
      } finally {
        submitBtn?.classList.remove("is-loading");
        submitBtn?.removeAttribute("disabled");
      }
    });
  },
};