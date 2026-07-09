import { icon } from "../components/icons.js";
import { Button, Field, Input } from "../components/ui/index.js";
import { BRAND } from "../constants/branding.js";

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
              <p class="auth-card__subtitle">${BRAND.tagline}</p>
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
              type: "submit",
              className: "auth-form__submit",
              attrs: 'id="login-submit"',
            })}
          </form>

          <p class="auth-card__footer">
            Don't have an account?
            <a href="#/register" class="auth-link">Create one</a>
          </p>
        </div>

        <p class="auth-page__credit">${BRAND.credit}</p>
        <div class="auth-page__glow" aria-hidden="true"></div>
      </div>
    `;
  },
};