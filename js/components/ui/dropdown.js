/**
 * Dropdown component builder
 */

export function Dropdown({
  trigger,
  items = [],
  className = "",
}) {
  const menuItems = items.map((item) => {
    if (item === "divider") return `<div class="dropdown__divider"></div>`;
    if (item.label && !item.text) {
      return `<div class="dropdown__label">${item.label}</div>`;
    }
    const itemClass = [
      "dropdown__item",
      item.active && "is-active",
      item.danger && "dropdown__item--danger",
    ].filter(Boolean).join(" ");

    const Tag = item.href ? "a" : "button";
    const hrefAttr = item.href ? `href="${item.href}"` : 'type="button"';

    return `
      <${Tag} class="${itemClass}" ${hrefAttr}>
        ${item.icon || ""}
        <span>${item.text}</span>
      </${Tag}>
    `;
  }).join("");

  return `
    <div class="dropdown ${className}">
      <div class="dropdown__trigger">${trigger}</div>
      <div class="dropdown__menu" role="menu">
        ${menuItems}
      </div>
    </div>
  `;
}