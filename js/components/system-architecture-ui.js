/**
 * System architecture page — tree rendering, live badges, Mermaid diagrams
 */

import { icon } from "./icons.js";
import { ARCHITECTURE_DOMAINS } from "../data/system-architecture-tree.js";

const ACCENT_COLORS = {
  accent: "var(--color-accent)",
  info: "var(--color-info)",
  warning: "var(--color-warning)",
  success: "var(--color-success)",
  violet: "#a855f7",
  store: "var(--color-text-tertiary)",
};

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatLiveValue(value) {
  if (value == null) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function liveBadge(label, value, tone = "neutral") {
  const display = formatLiveValue(value);
  return `<span class="sysarch-live-badge sysarch-live-badge--${tone}" title="${escapeHtml(label)}"><span class="sysarch-live-badge__label">${escapeHtml(label)}</span><span class="sysarch-live-badge__value">${escapeHtml(display)}</span></span>`;
}

export function renderLiveStatusBar(live) {
  if (!live) {
    return `<div class="sysarch-live sysarch-live--empty text-tertiary">Press <strong>Render architecture</strong> to load live system snapshot.</div>`;
  }

  const ts = new Date(live.generatedAt).toLocaleString();
  const dbTone = live.database?.connected ? "ok" : "bad";
  const gemTone = live.providers?.gemini?.status === "configured" ? "ok" : "warn";
  const groqTone = live.providers?.groq?.status === "configured" ? "ok" : "warn";
  const pushTone = live.push?.vapidConfigured ? "ok" : "warn";

  return `
    <div class="sysarch-live" aria-live="polite">
      <div class="sysarch-live__head">
        <span class="sysarch-live__pulse" aria-hidden="true"></span>
        <span class="sysarch-live__title">Live snapshot</span>
        <time class="sysarch-live__time text-tertiary" datetime="${escapeHtml(live.generatedAt)}">${escapeHtml(ts)}</time>
      </div>
      <div class="sysarch-live__grid">
        ${liveBadge("MongoDB", live.database?.connected ? `connected · ${live.database.name}` : "disconnected", dbTone)}
        ${liveBadge("Gemini", `${live.providers?.gemini?.model} (${live.providers?.gemini?.status})`, gemTone)}
        ${liveBadge("Groq", `${live.providers?.groq?.model} (${live.providers?.groq?.status})`, groqTone)}
        ${liveBadge("PWA cache", live.platform?.cacheVersion, "neutral")}
        ${liveBadge("Web Push", live.push?.vapidConfigured ? "VAPID ready" : "not configured", pushTone)}
        ${liveBadge("Users", `${live.counts?.users?.approved} approved / ${live.counts?.users?.total} total`, "neutral")}
        ${liveBadge("Mantra Feed", `${live.counts?.mantraFeed?.coveragePct}% · ${live.counts?.mantraFeed?.totalHooks} hooks`, "neutral")}
        ${liveBadge("Lessons cached", live.counts?.lessonsCached, "neutral")}
        ${liveBadge("Push devices", live.counts?.pushSubscriptions, "neutral")}
      </div>
    </div>
  `;
}

function formatMetricNumber(value, { suffix = "" } = {}) {
  if (value == null || value === "—") {
    return `<span class="sysarch-metric-card__value-char">—</span>`;
  }
  const raw = String(value);
  return `<span class="sysarch-metric-card__value-num">${escapeHtml(raw)}</span>${suffix ? `<span class="sysarch-metric-card__value-suffix">${escapeHtml(suffix)}</span>` : ""}`;
}

export function renderLiveMetricsCards(live) {
  if (!live) return "";

  const u = live.counts?.users || {};
  const mf = live.counts?.mantraFeed || {};
  const dw = live.counts?.delivery30d?.dailyWisdom || {};

  return `
    <div class="sysarch-metrics">
      <article class="sysarch-metric-card sysarch-metric-card--users">
        <div class="sysarch-metric-card__glow" aria-hidden="true"></div>
        <div class="sysarch-metric-card__icon" aria-hidden="true">${icon("user")}</div>
        <div class="sysarch-metric-card__value">${formatMetricNumber(u.total ?? "—")}</div>
        <div class="sysarch-metric-card__label">Registered accounts</div>
        <div class="sysarch-metric-card__sub">${u.pending ?? 0} pending approval</div>
      </article>
      <article class="sysarch-metric-card sysarch-metric-card--mantra">
        <div class="sysarch-metric-card__glow" aria-hidden="true"></div>
        <div class="sysarch-metric-card__icon" aria-hidden="true">${icon("database")}</div>
        <div class="sysarch-metric-card__value">${formatMetricNumber(mf.coveragePct ?? 0, { suffix: "%" })}</div>
        <div class="sysarch-metric-card__label">Mantra Feed coverage</div>
        <div class="sysarch-metric-card__sub">${mf.topicsWithHooks ?? 0} of ${mf.totalTopics ?? 0} topics</div>
      </article>
      <article class="sysarch-metric-card sysarch-metric-card--lessons">
        <div class="sysarch-metric-card__glow" aria-hidden="true"></div>
        <div class="sysarch-metric-card__icon" aria-hidden="true">${icon("topics")}</div>
        <div class="sysarch-metric-card__value">${formatMetricNumber(live.counts?.lessonsCached ?? "—")}</div>
        <div class="sysarch-metric-card__label">Cached AI lessons</div>
        <div class="sysarch-metric-card__sub">Shared across all learners</div>
      </article>
      <article class="sysarch-metric-card sysarch-metric-card--wisdom">
        <div class="sysarch-metric-card__glow" aria-hidden="true"></div>
        <div class="sysarch-metric-card__icon" aria-hidden="true">${icon("flame")}</div>
        <div class="sysarch-metric-card__value">${formatMetricNumber(dw.sent ?? 0)}</div>
        <div class="sysarch-metric-card__label">Daily Wisdom pushes</div>
        <div class="sysarch-metric-card__sub">Last 30 days · ${dw.failed ?? 0} failed · ${dw.skipped ?? 0} skipped</div>
      </article>
    </div>
  `;
}

function renderFlowSteps(flow) {
  if (!flow?.length) return "";
  return `
    <ol class="sysarch-flow">
      ${flow.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}
    </ol>
  `;
}

function renderCollections(collections) {
  if (!collections?.length) return "";
  return `
    <div class="sysarch-collections">
      ${collections.map((c) => `
        <div class="sysarch-collection">
          <div class="sysarch-collection__name">${escapeHtml(c.name)}</div>
          <div class="sysarch-collection__desc">${escapeHtml(c.desc)}</div>
        </div>
      `).join("")}
    </div>
  `;
}

function renderDiagram(nodeId, diagram) {
  if (!diagram) return "";
  return `
    <div class="sysarch-diagram-wrap">
      <div class="sysarch-diagram__label">Flow diagram</div>
      <pre class="sysarch-mermaid" data-mermaid-id="${escapeHtml(nodeId)}">${diagram}</pre>
    </div>
  `;
}

function renderNode(node, { depth = 0, open = false } = {}) {
  const color = ACCENT_COLORS[node.accent] || ACCENT_COLORS.accent;
  const hasChildren = node.children?.length > 0;
  const openAttr = open && depth === 0 ? " open" : "";

  const childrenHtml = hasChildren
    ? `<div class="sysarch-tree__children">${node.children.map((child) => renderNode(child, { depth: depth + 1 })).join("")}</div>`
    : "";

  return `
    <details class="sysarch-node sysarch-node--depth-${depth}" data-arch-id="${escapeHtml(node.id)}"${openAttr}>
      <summary class="sysarch-node__summary">
        <span class="sysarch-node__chevron" aria-hidden="true">${icon("chevronDown")}</span>
        <span class="sysarch-node__icon" style="background: color-mix(in srgb, ${color} 16%, transparent); color: ${color}">${icon(node.icon)}</span>
        <span class="sysarch-node__text">
          <span class="sysarch-node__title">${escapeHtml(node.title)}</span>
          <span class="sysarch-node__summary-line text-tertiary">${escapeHtml(node.summary || "")}</span>
        </span>
        ${node.tag ? `<span class="sysarch-node__tag">${escapeHtml(node.tag)}</span>` : ""}
      </summary>
      <div class="sysarch-node__body">
        <p class="sysarch-node__desc">${escapeHtml(node.description || "")}</p>
        ${renderFlowSteps(node.flow)}
        ${renderDiagram(node.id, node.diagram)}
        ${renderCollections(node.collections)}
        ${childrenHtml}
      </div>
    </details>
  `;
}

export function renderArchitectureTree() {
  return `
    <div class="sysarch-tree" id="sysarch-tree">
      ${ARCHITECTURE_DOMAINS.map((domain, i) => renderNode(domain, { depth: 0, open: i === 0 })).join("")}
    </div>
  `;
}

let mermaidLoadPromise = null;

export function loadMermaidLibrary() {
  if (window.mermaid) return Promise.resolve(window.mermaid);
  if (mermaidLoadPromise) return mermaidLoadPromise;

  mermaidLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js";
    script.async = true;
    script.onload = () => {
      const theme = document.documentElement.getAttribute("data-theme") === "light" ? "neutral" : "dark";
      window.mermaid.initialize({
        startOnLoad: false,
        theme,
        securityLevel: "loose",
        flowchart: { curve: "basis", padding: 12 },
      });
      resolve(window.mermaid);
    };
    script.onerror = () => reject(new Error("Could not load Mermaid"));
    document.head.appendChild(script);
  });

  return mermaidLoadPromise;
}

export async function renderMermaidDiagrams(root) {
  const scope = root || document;
  const blocks = [...scope.querySelectorAll(".sysarch-mermaid:not(.is-rendered)")];
  if (!blocks.length) return;

  const mermaid = await loadMermaidLibrary();
  const theme = document.documentElement.getAttribute("data-theme") === "light" ? "neutral" : "dark";
  mermaid.initialize({ startOnLoad: false, theme, securityLevel: "loose" });

  let index = 0;
  for (const block of blocks) {
    const src = block.textContent?.trim();
    if (!src) continue;
    const id = block.getAttribute("data-mermaid-id") || `arch-${index}`;
    const renderId = `mermaid-${id}-${index}`;
    index += 1;

    try {
      const sanitized = src
        .replace(/\r\n/g, "\n")
        .replace(/^\uFEFF/, "")
        .trim();
      block.setAttribute("data-mermaid-source", sanitized);
      const { svg } = await mermaid.render(renderId, sanitized);
      if (!svg?.trim()) throw new Error("Empty SVG");
      block.innerHTML = svg;
      block.classList.add("is-rendered");
    } catch (err) {
      block.innerHTML = `<div class="sysarch-mermaid-fallback text-tertiary">Diagram preview unavailable. Flow steps above describe the same path.</div>`;
      block.classList.add("is-rendered");
      console.warn("[sysarch] mermaid render failed", id, err);
    }
  }
}

export function bindDiagramRenderOnExpand(root) {
  root?.querySelectorAll(".sysarch-node").forEach((node) => {
    node.addEventListener("toggle", () => {
      if (!node.open) return;
      const pending = node.querySelectorAll(".sysarch-mermaid:not(.is-rendered)");
      if (pending.length) void renderMermaidDiagrams(node);
    });
  });
}