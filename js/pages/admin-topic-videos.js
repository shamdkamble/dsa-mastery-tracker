import { createPage } from "../components/page-shell.js";
import { icon } from "../components/icons.js";
import { Badge, EmptyState, SkeletonTable, Toast } from "../components/ui/index.js";
import { adminSubnav, adminHero, adminStatCard } from "../components/admin-shell.js";
import { showToast } from "../components/ui/interactions.js";
import { fetchAdminTopicVideos, saveAdminTopicVideo } from "../api/teachApi.js";
import { TeachApiError } from "../api/geminiApi.js";

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function topicRow(topic) {
  const hasVideo = Boolean(topic.video?.youtubeUrl);
  const urlValue = escapeHtml(topic.video?.youtubeUrl || "");
  const titleValue = escapeHtml(topic.video?.title || topic.name);

  return `
    <tr class="topic-videos__row" data-topic-id="${escapeHtml(topic.id)}">
      <td data-label="Phase">
        ${Badge({ label: `Phase ${topic.phase}`, variant: "outline", size: "sm" })}
      </td>
      <td class="topic-videos__name" data-label="Topic">
        <div class="topic-videos__topic-name">${escapeHtml(topic.name)}</div>
        <div class="topic-videos__topic-id text-tertiary">${escapeHtml(topic.id)}</div>
      </td>
      <td data-label="Status">
        ${hasVideo
          ? Badge({ label: "Live", variant: "success", size: "sm" })
          : Badge({ label: "Coming soon", variant: "warning", size: "sm" })}
      </td>
      <td data-label="YouTube URL">
        <input
          type="url"
          class="input input--sm topic-videos__url"
          data-field="youtubeUrl"
          placeholder="https://youtube.com/watch?v=…"
          value="${urlValue}"
          autocomplete="off"
        />
      </td>
      <td data-label="Title">
        <input
          type="text"
          class="input input--sm topic-videos__title"
          data-field="title"
          placeholder="Optional display title"
          value="${titleValue}"
          autocomplete="off"
        />
      </td>
      <td data-label="Actions">
        <div class="topic-videos__actions">
          <button type="button" class="btn btn--primary btn--sm" data-action="save-video" data-topic-id="${escapeHtml(topic.id)}">
            ${icon("check")}
            <span>Save</span>
          </button>
          ${hasVideo ? `
            <button type="button" class="btn btn--ghost btn--sm" data-action="clear-video" data-topic-id="${escapeHtml(topic.id)}">
              Clear
            </button>
          ` : ""}
        </div>
      </td>
    </tr>
  `;
}

function renderTable(topics) {
  if (!topics.length) {
    return EmptyState({
      iconName: "video",
      title: "No topics found",
      text: "Roadmap topics will appear here for YouTube link management.",
    });
  }

  return `
    <div class="topic-videos__table-wrap">
      <table class="table topic-videos__table">
        <thead>
          <tr>
            <th>Phase</th>
            <th>Topic</th>
            <th>Status</th>
            <th>YouTube URL</th>
            <th>Title</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${topics.map(topicRow).join("")}
        </tbody>
      </table>
      <p class="topic-videos__count text-tertiary">Showing ${topics.length} topics</p>
    </div>
  `;
}

export default {
  title: "Topic Videos",
  adminOnly: true,
  render() {
    return createPage({
      title: "Topic Videos",
      iconName: "video",
      hideHeader: true,
      children: `
        <div class="admin-page admin-page--modern topic-videos">
          ${adminHero({
            title: "Topic Videos",
            description: "Attach YouTube walkthroughs to roadmap topics. Learners see them as a secondary option in the Learn dialog.",
            badge: "Learn content",
          })}
          ${adminSubnav("topic-videos")}

          <div class="admin-stats topic-videos__stats" id="topic-videos-stats">
            ${adminStatCard({ iconName: "layers", value: "—", label: "Total topics" })}
            ${adminStatCard({ iconName: "video", value: "—", label: "With video", variant: "success" })}
            ${adminStatCard({ iconName: "clock", value: "—", label: "Coming soon", variant: "warning" })}
          </div>

          <section class="admin-section topic-videos__panel">
            <div class="topic-videos__toolbar">
              <div class="topic-videos__search">
                <span class="topic-videos__search-icon" aria-hidden="true">${icon("search")}</span>
                <input
                  type="search"
                  class="input topic-videos__search-input"
                  id="topic-videos-search"
                  placeholder="Search topic name or id…"
                  autocomplete="off"
                />
              </div>
              <label class="topic-videos__filter-label" for="topic-videos-phase">Phase</label>
              <select class="input input--sm" id="topic-videos-phase">
                <option value="all">All phases</option>
                <option value="1">Phase 1</option>
                <option value="2">Phase 2</option>
                <option value="3">Phase 3</option>
                <option value="4">Phase 4</option>
              </select>
              <button class="btn btn--ghost btn--sm" type="button" id="topic-videos-refresh">
                ${icon("repeat")}
                <span>Refresh</span>
              </button>
            </div>

            <div id="topic-videos-container" class="topic-videos__content">
              ${SkeletonTable({ rows: 10, cols: 6 })}
            </div>
          </section>
        </div>
      `,
    });
  },
  onMount(container) {
    const listEl = container.querySelector("#topic-videos-container");
    const statsEl = container.querySelector("#topic-videos-stats");
    const searchInput = container.querySelector("#topic-videos-search");
    const phaseFilter = container.querySelector("#topic-videos-phase");
    const refreshBtn = container.querySelector("#topic-videos-refresh");

    let allTopics = [];
    let search = "";
    let phase = "all";

    function updateStats(stats) {
      if (!statsEl || !stats) return;
      const cards = statsEl.querySelectorAll(".admin-stat-card__value");
      const comingSoon = Math.max(0, (stats.totalTopics ?? 0) - (stats.withVideo ?? 0));
      if (cards[0]) cards[0].textContent = String(stats.totalTopics ?? 0);
      if (cards[1]) cards[1].textContent = String(stats.withVideo ?? 0);
      if (cards[2]) cards[2].textContent = String(comingSoon);
    }

    function filteredTopics() {
      const q = search.trim().toLowerCase();
      return allTopics.filter((topic) => {
        const matchesPhase = phase === "all" || String(topic.phase) === phase;
        const matchesSearch = !q
          || topic.name.toLowerCase().includes(q)
          || topic.id.toLowerCase().includes(q);
        return matchesPhase && matchesSearch;
      });
    }

    function renderList() {
      if (!listEl) return;
      listEl.innerHTML = renderTable(filteredTopics());
    }

    async function loadTopics() {
      try {
        const data = await fetchAdminTopicVideos();
        allTopics = data.topics || [];
        updateStats(data.stats);
        renderList();
      } catch (err) {
        if (listEl) {
          listEl.innerHTML = EmptyState({
            iconName: "alertCircle",
            title: "Could not load topics",
            text: err instanceof TeachApiError ? err.message : "Failed to load topic videos.",
          });
        }
      }
    }

    async function handleSave(topicId, { clear = false } = {}) {
      const row = listEl?.querySelector(`tr[data-topic-id="${topicId}"]`);
      row?.classList.add("is-processing");

      const youtubeUrl = clear
        ? ""
        : row?.querySelector('[data-field="youtubeUrl"]')?.value?.trim() || "";
      const title = row?.querySelector('[data-field="title"]')?.value?.trim() || "";

      try {
        await saveAdminTopicVideo(topicId, { youtubeUrl, title });
        showToast(Toast({
          title: clear ? "Video cleared" : "Video saved",
          text: clear ? "Learners will see Coming soon for this topic." : "YouTube video is live in the Learn dialog.",
          variant: "success",
        }));
        await loadTopics();
      } catch (err) {
        showToast(Toast({
          title: "Save failed",
          text: err instanceof TeachApiError ? err.message : "Could not save video.",
          variant: "danger",
        }));
        row?.classList.remove("is-processing");
      }
    }

    searchInput?.addEventListener("input", (e) => {
      search = e.target.value;
      renderList();
    });

    phaseFilter?.addEventListener("change", (e) => {
      phase = e.target.value;
      renderList();
    });

    refreshBtn?.addEventListener("click", () => { void loadTopics(); });

    listEl?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;

      const topicId = btn.dataset.topicId;
      if (!topicId) return;

      if (btn.dataset.action === "save-video") {
        void handleSave(topicId);
      }

      if (btn.dataset.action === "clear-video") {
        if (!confirm("Remove the YouTube video for this topic?")) return;
        void handleSave(topicId, { clear: true });
      }
    });

    void loadTopics();
  },
};