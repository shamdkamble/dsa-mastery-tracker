/**
 * Reusable page layout wrapper
 */

import { EmptyState } from "./ui/empty-state.js";

export function createPage({ title, description, iconName, children = "", hideHeader = false }) {
  const header = title && !hideHeader ? `
    <header class="page-header" data-tour="page-header">
      <h1 class="page-title">${title}</h1>
      ${description ? `<p class="page-description">${description}</p>` : ""}
    </header>
  ` : description && !hideHeader ? `
    <header class="page-header" data-tour="page-header">
      ${description ? `<p class="page-description">${description}</p>` : ""}
    </header>
  ` : "";

  return `
    <div class="content-inner" data-tour="page-main">
      ${header}
      ${children || createPlaceholder(title || "Page", iconName)}
    </div>
  `;
}

export function createPlaceholder(title, iconName = "grid") {
  return EmptyState({
    title: `${title} coming soon`,
    text: "This section is part of your DSAMantra workspace. Content will be built in upcoming tasks.",
    iconName,
  });
}