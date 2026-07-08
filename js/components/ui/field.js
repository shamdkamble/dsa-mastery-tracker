/**
 * Form field component builders
 */

export function Field({
  label = "",
  hint = "",
  error = "",
  children = "",
  className = "",
}) {
  return `
    <div class="field ${className}">
      ${label ? `<label class="field__label">${label}</label>` : ""}
      ${children}
      ${hint ? `<span class="field__hint">${hint}</span>` : ""}
      ${error ? `<span class="field__error">${error}</span>` : ""}
    </div>
  `;
}

export function Input({ type = "text", placeholder = "", value = "", error = false, size = "", className = "", attrs = "" }) {
  const classes = ["input", size && `input--${size}`, error && "input--error", className].filter(Boolean).join(" ");
  return `<input type="${type}" class="${classes}" placeholder="${placeholder}" value="${value}" ${attrs}>`;
}

export function Textarea({ placeholder = "", rows = 4, error = false, className = "", attrs = "" }) {
  const classes = ["textarea", error && "textarea--error", className].filter(Boolean).join(" ");
  return `<textarea class="${classes}" placeholder="${placeholder}" rows="${rows}" ${attrs}></textarea>`;
}

export function Toggle({ label = "", checked = false, id = "", className = "", attrs = "" }) {
  return `
    <label class="toggle ${className}">
      <input type="checkbox" class="toggle__input" ${checked ? "checked" : ""} ${id ? `id="${id}"` : ""} ${attrs}>
      ${label ? `<span class="toggle__label">${label}</span>` : ""}
    </label>
  `;
}

export function Checkbox({ label, checked = false, className = "" }) {
  return `
    <label class="checkbox ${className}">
      <input type="checkbox" ${checked ? "checked" : ""}>
      <span>${label}</span>
    </label>
  `;
}