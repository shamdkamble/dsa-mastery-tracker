import { createPage } from "../components/page-shell.js";
import { icon } from "../components/icons.js";
import { adminSubnav, adminHero } from "../components/admin-shell.js";
import {
  renderArchitectureTree,
  renderLiveStatusBar,
  renderLiveMetricsCards,
  renderMermaidDiagrams,
  bindDiagramRenderOnExpand,
} from "../components/system-architecture-ui.js";
import { getSystemArchitectureLive } from "../services/auth.js";
import { showToast } from "../components/ui/interactions.js";
import { Toast } from "../components/ui/index.js";

function renderPageShell(live = null) {
  return createPage({
    title: "System Architecture",
    iconName: "layers",
    hideHeader: true,
    children: `
      <div class="admin-page admin-page--modern sysarch-page">
        ${adminHero({
          title: "System Architecture",
          description: "Expand each domain for flow diagrams and how the platform works today — refresh anytime for live metrics.",
          badge: "Admin reference",
        })}
        ${adminSubnav("notifications")}

        <div class="sysarch-toolbar">
          <button type="button" class="btn btn--primary" id="sysarch-render-btn">
            ${icon("repeat")}
            <span>Render architecture</span>
          </button>
          <button type="button" class="btn btn--ghost btn--sm" id="sysarch-expand-all">Expand all</button>
          <button type="button" class="btn btn--ghost btn--sm" id="sysarch-collapse-all">Collapse all</button>
          <span class="sysarch-toolbar__hint text-tertiary" id="sysarch-render-status" aria-live="polite"></span>
        </div>

        <div id="sysarch-live-bar">${renderLiveStatusBar(live)}</div>
        <div id="sysarch-metrics">${renderLiveMetricsCards(live)}</div>

        <section class="sysarch-legend" aria-label="Architecture legend">
          <span class="sysarch-legend__item"><span class="sysarch-legend__dot sysarch-legend__dot--platform"></span>Platform</span>
          <span class="sysarch-legend__item"><span class="sysarch-legend__dot sysarch-legend__dot--client"></span>Client</span>
          <span class="sysarch-legend__item"><span class="sysarch-legend__dot sysarch-legend__dot--auth"></span>Identity</span>
          <span class="sysarch-legend__item"><span class="sysarch-legend__dot sysarch-legend__dot--learning"></span>Learning</span>
          <span class="sysarch-legend__item"><span class="sysarch-legend__dot sysarch-legend__dot--ai"></span>AI</span>
          <span class="sysarch-legend__item"><span class="sysarch-legend__dot sysarch-legend__dot--notify"></span>Notifications</span>
          <span class="sysarch-legend__item"><span class="sysarch-legend__dot sysarch-legend__dot--data"></span>Data</span>
        </section>

        ${renderArchitectureTree()}
      </div>
    `,
  });
}

export default {
  title: "System Architecture",
  adminOnly: true,
  render() {
    return renderPageShell(null);
  },
  onMount(container) {
    const renderBtn = container.querySelector("#sysarch-render-btn");
    const statusEl = container.querySelector("#sysarch-render-status");
    const liveBar = container.querySelector("#sysarch-live-bar");
    const metricsEl = container.querySelector("#sysarch-metrics");
    const expandAllBtn = container.querySelector("#sysarch-expand-all");
    const collapseAllBtn = container.querySelector("#sysarch-collapse-all");
    const tree = container.querySelector("#sysarch-tree");

    bindDiagramRenderOnExpand(tree);

    async function runRender({ silent = false } = {}) {
      if (renderBtn) renderBtn.disabled = true;
      if (statusEl) statusEl.textContent = "Fetching live snapshot…";

      try {
        const live = await getSystemArchitectureLive();
        if (liveBar) liveBar.innerHTML = renderLiveStatusBar(live);
        if (metricsEl) metricsEl.innerHTML = renderLiveMetricsCards(live);
        if (statusEl) {
          statusEl.textContent = `Updated ${new Date(live.generatedAt).toLocaleTimeString()}`;
        }

        const openNodes = [...tree.querySelectorAll(".sysarch-node[open]")];
        await renderMermaidDiagrams(tree);
        for (const node of openNodes) {
          if (!node.open) node.open = true;
        }

        if (!silent) {
          showToast(Toast({
            title: "Architecture rendered",
            text: "Live metrics and diagrams are up to date.",
            variant: "success",
          }));
        }
      } catch (err) {
        if (statusEl) statusEl.textContent = "Render failed — check server connection.";
        showToast(Toast({
          title: "Could not render",
          text: err?.message || "Failed to load live architecture snapshot.",
          variant: "danger",
        }));
      } finally {
        if (renderBtn) renderBtn.disabled = false;
      }
    }

    renderBtn?.addEventListener("click", () => { void runRender(); });

    expandAllBtn?.addEventListener("click", async () => {
      tree?.querySelectorAll(".sysarch-node").forEach((n) => { n.open = true; });
      await renderMermaidDiagrams(tree);
    });

    collapseAllBtn?.addEventListener("click", () => {
      tree?.querySelectorAll(".sysarch-node").forEach((n) => { n.open = false; });
    });

    tree?.querySelectorAll(".sysarch-node[open]").forEach((node) => {
      void renderMermaidDiagrams(node);
    });

    void runRender({ silent: true });
  },
};