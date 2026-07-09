/**
 * Profile avatar rendering — initials or uploaded photo
 */

import { getInitials } from "../storage/helpers.js";

/**
 * @param {{ name?: string, profilePhoto?: string }} profile
 * @param {{ initials?: string, name?: string }} [stateUser]
 * @param {string} [className]
 */
export function renderProfileAvatar(profile = {}, stateUser = {}, className = "") {
  const initials = stateUser.initials || getInitials(profile.name || stateUser.name || "Learner");
  const cls = className || "profile-avatar";

  if (profile.profilePhoto) {
    return `<img src="${profile.profilePhoto}" alt="" class="${cls} ${cls}--photo" loading="lazy">`;
  }

  return `<span class="${cls} ${cls}--initials" aria-hidden="true">${initials}</span>`;
}