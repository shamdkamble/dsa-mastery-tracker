/**
 * Table component builder
 */

export function Table({
  columns = [],
  rows = [],
  interactive = false,
  className = "",
}) {
  const tableClass = ["table", interactive && "table--interactive", className].filter(Boolean).join(" ");

  const thead = columns.length
    ? `<thead><tr>${columns.map((c) => `<th>${c}</th>`).join("")}</tr></thead>`
    : "";

  const tbody = rows.length
    ? `<tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody>`
    : "";

  return `
    <div class="table-wrapper">
      <table class="${tableClass}">
        ${thead}
        ${tbody}
      </table>
    </div>
  `;
}