import { icon } from "../components/icons.js";
import { Button, Field, Input } from "../components/ui/index.js";
import { BRAND } from "../constants/branding.js";

export default {
  title: "Create Account",
  public: true,
  render() {
    return `
      <div class="auth-page">
        <div class="auth-card animate-fade-in-up">
          <div class="auth-card__brand">
            <div class="auth-card__logo" aria-hidden="true">${icon("logo")}</div>
            <div>
              <h1 class="auth-card__title">Join ${BRAND.name}</h1>
              <p class="auth-card__subtitle">${BRAND.tagline}</p>
            </div>
          </div>

          <div id="register-alert"></div>

          <form class="auth-form" id="register-form" novalidate>
            ${Field({
              label: "Full name",
              children: Input({
                type: "text",
                placeholder: "Alex Chen",
                attrs: 'id="register-name" name="name" autocomplete="name" required',
              }),
            })}

            ${Field({
              label: "Email",
              children: Input({
                type: "email",
                placeholder: "you@email.com",
                attrs: 'id="register-email" name="email" autocomplete="email" required',
              }),
            })}

            ${Field({
              label: "Password",
              hint: "Minimum 6 characters",
              children: Input({
                type: "password",
                placeholder: "Create a password",
                attrs: 'id="register-password" name="password" autocomplete="new-password" required minlength="6"',
              }),
            })}

            ${Button({
              label: "Create account",
              variant: "primary",
              type: "submit",
              className: "auth-form__submit",
              attrs: 'id="register-submit"',
            })}
          </form>

          <p class="auth-card__footer">
            Already have an account?
            <a href="#/login" class="auth-link">Sign in</a>
          </p>
        </div>

        <p class="auth-page__credit">${BRAND.credit}</p>
        <div class="auth-page__glow" aria-hidden="true"></div>
      </div>
    `;
  },
};