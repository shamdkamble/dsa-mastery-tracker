/**
 * Subscription-tier visual theme — sky blue (trial), gold (premium)
 */

import { getSessionUser } from "./auth/session.js";
import { getRoadmapAccessHint, getTrialDaysRemaining, hasTrialAccess } from "./auth/access.js";

/**
 * @param {Object | null | undefined} [user]
 * @returns {"standard" | "trial" | "premium" | "tester"}
 */
export function getSubscriptionTier(user = getSessionUser()) {
  if (!user) return "standard";
  if (user.role === "tester") return "tester";
  if (user.role === "admin" || user.accessLevel === "premium") return "premium";
  if (user.accessLevel === "trial") return "trial";
  return "standard";
}

/**
 * Apply tier accent colors to the document root.
 * @param {Object | null | undefined} [user]
 */
export function applySubscriptionTheme(user = getSessionUser()) {
  const tier = getSubscriptionTier(user);
  const root = document.documentElement;
  if (tier === "standard") {
    root.removeAttribute("data-subscription");
  } else {
    root.setAttribute("data-subscription", tier);
  }
}

/**
 * @param {Object | null | undefined} [user]
 * @returns {string}
 */
export function renderSubscriptionBadge(user = getSessionUser()) {
  const tier = getSubscriptionTier(user);
  if (tier === "tester") {
    return `
      <span class="subscription-badge subscription-badge--tester">
        <span class="subscription-badge__glow" aria-hidden="true"></span>
        <span class="subscription-badge__shine" aria-hidden="true"></span>
        QA Tester
      </span>
    `;
  }
  if (tier === "trial") {
    return `<span class="subscription-badge subscription-badge--trial">Trial Active</span>`;
  }
  if (tier === "premium") {
    return `
      <span class="subscription-badge subscription-badge--premium">
        <span class="subscription-badge__glow" aria-hidden="true"></span>
        <span class="subscription-badge__shine" aria-hidden="true"></span>
        Premium
      </span>
    `;
  }
  return "";
}

/**
 * Refresh all badge placeholder hosts in the shell.
 */
export function refreshSubscriptionBadges() {
  const badge = renderSubscriptionBadge();
  document.querySelectorAll("[data-subscription-badge]").forEach((el) => {
    el.innerHTML = badge;
    el.hidden = !badge;
  });
}

/**
 * Subscription status card for Settings.
 * @param {Object | null | undefined} [user]
 * @returns {string}
 */
export function renderSubscriptionStatusCard(user = getSessionUser()) {
  if (!user) return "";

  const tier = getSubscriptionTier(user);
  const hint = getRoadmapAccessHint(user);

  if (tier === "tester") {
    return `
      <div class="subscription-status subscription-status--tester">
        <div class="subscription-status__glow subscription-status__glow--tester" aria-hidden="true"></div>
        <div class="subscription-status__head">
          ${renderSubscriptionBadge(user)}
          <span class="subscription-status__label">Quality assurance access</span>
        </div>
        <p class="subscription-status__text">You have exclusive access to the Testing Panel. Report issues, track fixes, and help shape DSAMantra before every release.</p>
        <ul class="subscription-status__perks">
          <li>QA Dashboard &amp; Issue Tracker</li>
          <li>Verify fixes &amp; confirm resolutions</li>
          <li>Priority in-app &amp; push notifications</li>
        </ul>
        <a href="#/testing-dashboard" class="btn btn--primary btn--sm subscription-status__cta">Open Testing Panel</a>
      </div>
    `;
  }

  if (tier === "premium") {
    return `
      <div class="subscription-status subscription-status--premium">
        <div class="subscription-status__glow" aria-hidden="true"></div>
        <div class="subscription-status__head">
          ${renderSubscriptionBadge(user)}
          <span class="subscription-status__label">Full access unlocked</span>
        </div>
        <p class="subscription-status__text">You have unlimited access to all phases, AI lessons, and problem helpers. Thank you for supporting DSAMantra.</p>
        <ul class="subscription-status__perks">
          <li>All 6 roadmap phases</li>
          <li>Unlimited AI lessons &amp; regeneration</li>
          <li>Pattern detection &amp; complexity analysis</li>
        </ul>
      </div>
    `;
  }

  if (tier === "trial") {
    const days = getTrialDaysRemaining(user);
    const daysLine = days != null && days > 0
      ? `<p class="subscription-status__meta">${days} day${days === 1 ? "" : "s"} remaining</p>`
      : "";
    return `
      <div class="subscription-status subscription-status--trial">
        <div class="subscription-status__head">
          ${renderSubscriptionBadge(user)}
          <span class="subscription-status__label">${hint}</span>
        </div>
        ${daysLine}
        <p class="subscription-status__text">Your trial includes all Phase 1 lessons. Upgrade to Premium for gold-tier access to every feature.</p>
        <a href="#/roadmap" class="btn btn--primary btn--sm subscription-status__cta">View roadmap &amp; upgrade</a>
      </div>
    `;
  }

  return `
    <div class="subscription-status subscription-status--standard">
      <div class="subscription-status__head">
        <span class="subscription-badge subscription-badge--standard">Free</span>
        <span class="subscription-status__label">${hint}</span>
      </div>
      <p class="subscription-status__text">Upgrade to unlock the full FAANG mastery roadmap and AI-powered study tools.</p>
      <a href="#/roadmap" class="btn btn--secondary btn--sm subscription-status__cta">Explore plans</a>
    </div>
  `;
}

/**
 * @param {Object | null | undefined} [user]
 * @returns {string}
 */
export function getTierBannerClass(user = getSessionUser()) {
  const tier = getSubscriptionTier(user);
  if (tier === "tester") return "roadmap-tier-banner--tester";
  if (tier === "trial") return "roadmap-tier-banner--trial";
  if (tier === "premium") return "roadmap-tier-banner--premium";
  return "roadmap-tier-banner--standard";
}

/**
 * Apply theme + refresh shell badges.
 * @param {Object | null | undefined} [user]
 */
export function syncSubscriptionPresentation(user = getSessionUser()) {
  applySubscriptionTheme(user);
  refreshSubscriptionBadges();
}