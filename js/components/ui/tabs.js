/**
 * Tabs component builder
 */

export function Tabs({
  id,
  items = [],
  variant = "",
  className = "",
}) {
  const listClasses = ["tabs__list", variant && `tabs__list--${variant}`].filter(Boolean).join(" ");

  const tabButtons = items.map((item, i) => `
    <button
      class="tab${i === 0 ? " is-active" : ""}"
      type="button"
      role="tab"
      data-tab="${item.id}"
      aria-selected="${i === 0}"
      aria-controls="${id}-panel-${item.id}"
    >
      ${item.icon ? `<span aria-hidden="true">${item.icon}</span>` : ""}
      <span>${item.label}</span>
      ${item.badge ? `<span class="tab__badge">${item.badge}</span>` : ""}
    </button>
  `).join("");

  const panels = items.map((item, i) => `
    <div
      class="tabs__panel${i === 0 ? " is-active" : ""}"
      id="${id}-panel-${item.id}"
      role="tabpanel"
      data-panel="${item.id}"
      ${i !== 0 ? 'hidden' : ""}
    >
      ${item.content}
    </div>
  `).join("");

  return `
    <div class="tabs ${className}" id="${id}" data-tabs>
      <div class="${listClasses}" role="tablist">
        ${tabButtons}
      </div>
      ${panels}
    </div>
  `;
}