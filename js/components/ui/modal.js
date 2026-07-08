/**
 * Modal component builder
 */

import { icon } from "../icons.js";

export function Modal({
  id,
  title = "",
  body = "",
  footer = "",
  size = "",
  className = "",
}) {
  const modalClasses = ["modal", size && `modal--${size}`, className].filter(Boolean).join(" ");

  return `
    <div class="modal-overlay" id="${id}-overlay" data-modal="${id}" aria-hidden="true">
      <div class="${modalClasses}" role="dialog" aria-modal="true" aria-labelledby="${id}-title">
        <div class="modal__header">
          <h2 class="modal__title" id="${id}-title">${title}</h2>
          <button class="modal__close" type="button" data-modal-close aria-label="Close dialog">
            ${icon("close")}
          </button>
        </div>
        <div class="modal__body">${body}</div>
        ${footer ? `<div class="modal__footer">${footer}</div>` : ""}
      </div>
    </div>
  `;
}