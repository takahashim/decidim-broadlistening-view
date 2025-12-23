// Toolbar component for Broadlistening visualization
import icon from "src/decidim/icon";
import { escapeHtml } from "./utils";

// View mode constants (shared with chart_manager.js)
export const VIEW_MODES = {
  SCATTER_ALL: "scatterAll",
  SCATTER_DENSITY: "scatterDensity",
  TREEMAP: "treemap"
};

/**
 * Toolbar component for view mode switching and actions
 */
export default class Toolbar {
  /**
   * @param {Object} options
   * @param {string} options.viewMode - Current view mode
   * @param {boolean} options.hasDensityData - Whether density data is available
   * @param {boolean} options.isDenseGroupEnabled - Whether dense group is enabled
   * @param {boolean} options.showSettings - Whether to show settings button
   * @param {boolean} options.showFullscreen - Whether to show fullscreen button
   * @param {Function} options.onViewModeChange - Callback when view mode changes
   * @param {Function} options.onSettingsClick - Callback when settings button clicked
   * @param {Function} options.onFullscreenClick - Callback when fullscreen button clicked
   */
  constructor(options = {}) {
    this.options = {
      viewMode: VIEW_MODES.SCATTER_ALL,
      hasDensityData: false,
      isDenseGroupEnabled: true,
      showSettings: true,
      showFullscreen: true,
      onViewModeChange: null,
      onSettingsClick: null,
      onFullscreenClick: null,
      ...options
    };
  }

  /**
   * Render toolbar HTML
   * @returns {string} HTML string
   */
  render() {
    const { viewMode, hasDensityData, isDenseGroupEnabled, showSettings, showFullscreen } = this.options;

    const densityBtnDisabled = !hasDensityData || !isDenseGroupEnabled;
    const densityBtnTitle = densityBtnDisabled
      ? "この設定条件では抽出できませんでした"
      : "濃い意見";

    const activeClass = (mode) => viewMode === mode ? "blv-toolbar__segment-btn--active" : "";

    return `
      <div class="blv-toolbar__segment">
        <button class="blv-toolbar__segment-btn ${escapeHtml(activeClass(VIEW_MODES.SCATTER_ALL))}"
                data-view-mode="${escapeHtml(VIEW_MODES.SCATTER_ALL)}"
                title="全体">
          ${icon("bubble-chart-line")}
          <span>全体</span>
        </button>
        <button class="blv-toolbar__segment-btn ${escapeHtml(activeClass(VIEW_MODES.SCATTER_DENSITY))}"
                data-view-mode="${escapeHtml(VIEW_MODES.SCATTER_DENSITY)}"
                title="${escapeHtml(densityBtnTitle)}"
                ${densityBtnDisabled ? "disabled" : ""}>
          ${icon("focus-3-line")}
          <span>濃い意見</span>
        </button>
        <button class="blv-toolbar__segment-btn ${escapeHtml(activeClass(VIEW_MODES.TREEMAP))}"
                data-view-mode="${escapeHtml(VIEW_MODES.TREEMAP)}"
                title="ツリーマップ">
          ${icon("layout-grid-line")}
          <span>ツリー</span>
        </button>
      </div>
      <div class="blv-toolbar__actions">
        ${showSettings && hasDensityData ? `
        <button class="blv-toolbar__btn"
                data-action="settings"
                title="表示設定">
          ${icon("settings-3-line")}
          <span>設定</span>
        </button>
        ` : ""}
        ${showFullscreen ? `
        <button class="blv-toolbar__btn blv-toolbar__btn--icon"
                data-action="fullscreen"
                title="フルスクリーン">
          ${icon("fullscreen-line")}
        </button>
        ` : ""}
      </div>
    `;
  }

  /**
   * Bind event listeners to a container
   * @param {HTMLElement} container - Container element with toolbar
   */
  bindEvents(container) {
    const { onViewModeChange, onSettingsClick, onFullscreenClick } = this.options;

    // View mode buttons
    container.querySelectorAll("[data-view-mode]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        if (e.currentTarget.disabled) return;
        const mode = e.currentTarget.dataset.viewMode;
        if (onViewModeChange) {
          onViewModeChange(mode);
        }
      });
    });

    // Settings button
    const settingsBtn = container.querySelector("[data-action='settings']");
    if (settingsBtn && onSettingsClick) {
      settingsBtn.addEventListener("click", onSettingsClick);
    }

    // Fullscreen button
    const fullscreenBtn = container.querySelector("[data-action='fullscreen']");
    if (fullscreenBtn && onFullscreenClick) {
      fullscreenBtn.addEventListener("click", onFullscreenClick);
    }
  }

  /**
   * Update toolbar state
   * @param {HTMLElement} container - Container element with toolbar
   * @param {Object} state - New state
   * @param {string} state.viewMode - Current view mode
   * @param {boolean} state.hasDensityData - Whether density data is available
   * @param {boolean} state.isDenseGroupEnabled - Whether dense group is enabled
   */
  updateState(container, state) {
    const { viewMode, hasDensityData, isDenseGroupEnabled } = { ...this.options, ...state };

    container.querySelectorAll("[data-view-mode]").forEach(btn => {
      const isActive = btn.dataset.viewMode === viewMode;
      btn.classList.toggle("blv-toolbar__segment-btn--active", isActive);

      // Update density button disabled state
      if (btn.dataset.viewMode === VIEW_MODES.SCATTER_DENSITY) {
        const isDisabled = !hasDensityData || !isDenseGroupEnabled;
        btn.disabled = isDisabled;
        btn.title = isDisabled ? "この設定条件では抽出できませんでした" : "濃い意見";
      }
    });

    // Update options for future renders
    Object.assign(this.options, state);
  }
}
