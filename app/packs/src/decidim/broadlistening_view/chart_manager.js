// Chart Manager for Broadlistening visualization
// Orchestrates scatter and treemap charts with toolbar controls

import { ScatterChart } from "./scatter_chart.js";
import { TreemapChart } from "./treemap_chart.js";
import { CLUSTER_COLORS } from "./colors.js";
import { escapeHtml } from "src/decidim/utilities/text";
import icon from "src/decidim/icon";

// View mode constants
const VIEW_MODES = {
  SCATTER_ALL: "scatterAll",
  SCATTER_DENSITY: "scatterDensity",
  TREEMAP: "treemap"
};

export class ChartManager {
  constructor(container, data, options = {}) {
    this.container = container;
    this.data = data;
    this.options = {
      defaultChart: VIEW_MODES.SCATTER_ALL,
      showToolbar: true,
      ...options
    };

    this.arguments = data.arguments || [];
    this.clusters = data.clusters || [];

    // Build cluster indexes for O(1) lookups (shared with ScatterChart)
    this.clusterById = new Map(this.clusters.map(c => [c.id, c]));
    this.childrenByParent = new Map();
    this.clustersByLevel = new Map();
    for (const cluster of this.clusters) {
      const parentId = cluster.parent;
      if (parentId) {
        if (!this.childrenByParent.has(parentId)) {
          this.childrenByParent.set(parentId, []);
        }
        this.childrenByParent.get(parentId).push(cluster);
      }
      const level = cluster.level ?? 0;
      if (!this.clustersByLevel.has(level)) {
        this.clustersByLevel.set(level, []);
      }
      this.clustersByLevel.get(level).push(cluster);
    }
    // Sort children by value descending
    for (const children of this.childrenByParent.values()) {
      children.sort((a, b) => (b.value || 0) - (a.value || 0));
    }

    // Build argument index by cluster ID for O(1) lookups
    this.argumentsByClusterId = new Map();
    for (const arg of this.arguments) {
      for (const clusterId of (arg.cluster_ids || [])) {
        if (!this.argumentsByClusterId.has(clusterId)) {
          this.argumentsByClusterId.set(clusterId, []);
        }
        this.argumentsByClusterId.get(clusterId).push(arg);
      }
    }

    // Calculate max level
    this.maxLevel = Math.max(...this.clusters.map(c => c.level || 0), 0);

    // Check if density filter is available (clusters have density_rank_percentile)
    this.hasDensityData = this.clusters.some(c => typeof c.density_rank_percentile === "number");

    // State
    this.viewMode = VIEW_MODES.SCATTER_ALL;
    this.isFullscreen = false;
    this.selectedClusterId = null;
    this.treemapLevel = "0";

    // Density filter settings
    this.maxDensity = 0.2; // Top 20% by default
    this.minValue = 5;     // Minimum 5 opinions by default
    this.isDenseGroupEnabled = true;
    this.settingsDialogOpen = false;

    // Calculate initial dense group availability
    if (this.hasDensityData) {
      this.updateDenseGroupEnabled();
    }

    // Chart instances
    this.scatterChart = null;
    this.treemapChart = null;

    // DOM references
    this.toolbarContainer = null;
    this.breadcrumbContainer = null;
    this.chartContainer = null;
    this.fullscreenModal = null;
    this.clusterGridContainer = null;

    this.init();
  }

  init() {
    if (this.arguments.length === 0) {
      this.container.innerHTML = '<p class="text-gray text-center py-8">データがありません。</p>';
      return;
    }

    this.createLayout();
    this.renderChart();

    // Find and store reference to cluster grid and section
    this.clusterGridContainer = document.getElementById("cluster-grid");
    this.clusterOverviewSection = document.getElementById("cluster-overview-section");

    this.bindClusterCardEvents();
  }

  createLayout() {
    this.container.innerHTML = `
      <div class="blv-chart-wrapper">
        <div class="blv-toolbar"></div>
        <div class="blv-breadcrumb"></div>
        <div class="blv-chart-container"></div>
      </div>
    `;

    this.toolbarContainer = this.container.querySelector(".blv-toolbar");
    this.breadcrumbContainer = this.container.querySelector(".blv-breadcrumb");
    this.chartContainer = this.container.querySelector(".blv-chart-container");

    if (this.options.showToolbar) {
      this.renderToolbar();
    }
  }

  renderToolbar() {
    const densityBtnDisabled = !this.hasDensityData || !this.isDenseGroupEnabled;
    const densityBtnTitle = densityBtnDisabled
      ? "この設定条件では抽出できませんでした"
      : "濃い意見";

    this.toolbarContainer.innerHTML = `
      <div class="blv-toolbar__segment">
        <button class="blv-toolbar__segment-btn ${this.viewMode === VIEW_MODES.SCATTER_ALL ? 'blv-toolbar__segment-btn--active' : ''}"
                data-view-mode="${VIEW_MODES.SCATTER_ALL}"
                title="全体">
          ${icon("bubble-chart-line")}
          <span>全体</span>
        </button>
        <button class="blv-toolbar__segment-btn ${this.viewMode === VIEW_MODES.SCATTER_DENSITY ? 'blv-toolbar__segment-btn--active' : ''}"
                data-view-mode="${VIEW_MODES.SCATTER_DENSITY}"
                title="${densityBtnTitle}"
                ${densityBtnDisabled ? 'disabled' : ''}>
          ${icon("focus-3-line")}
          <span>濃い意見</span>
        </button>
        <button class="blv-toolbar__segment-btn ${this.viewMode === VIEW_MODES.TREEMAP ? 'blv-toolbar__segment-btn--active' : ''}"
                data-view-mode="${VIEW_MODES.TREEMAP}"
                title="ツリーマップ">
          ${icon("layout-grid-line")}
          <span>ツリー</span>
        </button>
      </div>
      <div class="blv-toolbar__actions">
        ${this.hasDensityData ? `
        <button class="blv-toolbar__btn"
                data-action="settings"
                title="表示設定">
          ${icon("settings-3-line")}
          <span>設定</span>
        </button>
        ` : ''}
        <button class="blv-toolbar__btn blv-toolbar__btn--icon"
                data-action="fullscreen"
                title="フルスクリーン">
          ${icon("fullscreen-line")}
        </button>
      </div>
    `;

    // Add event listeners for view mode buttons
    this.toolbarContainer.querySelectorAll("[data-view-mode]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        if (e.currentTarget.disabled) return;
        const mode = e.currentTarget.dataset.viewMode;
        this.switchViewMode(mode);
      });
    });

    // Add event listener for settings button
    const settingsBtn = this.toolbarContainer.querySelector("[data-action='settings']");
    if (settingsBtn) {
      settingsBtn.addEventListener("click", () => {
        this.openSettingsDialog();
      });
    }

    this.toolbarContainer.querySelector("[data-action='fullscreen']").addEventListener("click", () => {
      this.toggleFullscreen();
    });
  }

  renderBreadcrumb() {
    const isScatterMode = this.viewMode === VIEW_MODES.SCATTER_ALL || this.viewMode === VIEW_MODES.SCATTER_DENSITY;
    if (!this.selectedClusterId || !isScatterMode) {
      this.breadcrumbContainer.innerHTML = "";
      this.breadcrumbContainer.style.display = "none";
      return;
    }

    const path = this.buildClusterPath(this.selectedClusterId);
    if (path.length === 0) {
      this.breadcrumbContainer.innerHTML = "";
      this.breadcrumbContainer.style.display = "none";
      return;
    }

    this.breadcrumbContainer.style.display = "block";
    this.breadcrumbContainer.innerHTML = `
      <div class="blv-breadcrumb__content">
        <span class="blv-breadcrumb__label">表示中:</span>
        <nav class="blv-breadcrumb__nav">
          <button class="blv-breadcrumb__item blv-breadcrumb__item--link" data-cluster-id="">
            全て
          </button>
          ${path.map((cluster, index) => `
            <span class="blv-breadcrumb__separator">${icon("arrow-right-s-line")}</span>
            ${index === path.length - 1
              ? `<span class="blv-breadcrumb__item blv-breadcrumb__item--current">${escapeHtml(cluster.label)}</span>`
              : `<button class="blv-breadcrumb__item blv-breadcrumb__item--link" data-cluster-id="${cluster.id}">${escapeHtml(cluster.label)}</button>`
            }
          `).join("")}
        </nav>
      </div>
    `;

    // Add click handlers for breadcrumb navigation
    this.breadcrumbContainer.querySelectorAll("[data-cluster-id]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const clusterId = e.currentTarget.dataset.clusterId;
        this.navigateToCluster(clusterId || null);
      });
    });
  }

  buildClusterPath(clusterId) {
    const path = [];
    let currentId = clusterId;

    while (currentId && currentId !== "0") {
      const cluster = this.clusterById.get(currentId);
      if (cluster) {
        path.unshift(cluster);
        currentId = cluster.parent;
      } else {
        break;
      }
    }

    return path;
  }

  updateToolbarState() {
    this.toolbarContainer.querySelectorAll("[data-view-mode]").forEach(btn => {
      const isActive = btn.dataset.viewMode === this.viewMode;
      btn.classList.toggle("blv-toolbar__segment-btn--active", isActive);

      // Update density button disabled state
      if (btn.dataset.viewMode === VIEW_MODES.SCATTER_DENSITY) {
        const isDisabled = !this.hasDensityData || !this.isDenseGroupEnabled;
        btn.disabled = isDisabled;
        btn.title = isDisabled ? "この設定条件では抽出できませんでした" : "濃い意見";
      }
    });
  }

  switchViewMode(mode) {
    if (this.viewMode === mode) return;

    this.viewMode = mode;
    // Reset cluster selection when switching to treemap
    if (mode === VIEW_MODES.TREEMAP) {
      this.selectedClusterId = null;
      this.renderClusterGrid(); // Reset to top level
    }
    this.updateToolbarState();
    this.renderBreadcrumb();
    this.renderChart();
  }

  navigateToCluster(clusterId) {
    this.selectedClusterId = clusterId;
    this.renderBreadcrumb();
    this.renderChart();
    this.renderClusterGrid();
  }

  /**
   * Render cluster grid based on current selection
   */
  renderClusterGrid() {
    if (!this.clusterGridContainer) return;

    // Get clusters to display
    let clustersToShow;
    if (this.selectedClusterId) {
      clustersToShow = this.getChildClusters(this.selectedClusterId);
    } else {
      clustersToShow = this.getTopLevelClusters();
    }

    // Render cluster cards
    this.clusterGridContainer.innerHTML = clustersToShow.map((cluster, index) => {
      const color = CLUSTER_COLORS[index % CLUSTER_COLORS.length];
      const hasChildren = this.getChildClusters(cluster.id).length > 0;
      const cursorClass = hasChildren ? "cursor-pointer" : "";
      const title = hasChildren ? 'title="クリックしてサブクラスターを表示"' : "";

      return `
        <div class="card p-4 hover:shadow-md transition-shadow ${cursorClass}"
             style="border-left: 4px solid ${color};"
             data-cluster-id="${cluster.id}"
             ${title}>
          <div class="flex items-center gap-3 mb-2">
            <span class="inline-block w-3 h-3 rounded-full flex-shrink-0" style="background-color: ${color};"></span>
            <span class="font-semibold text-sm line-clamp-2">${escapeHtml(cluster.label)}</span>
          </div>
          <div class="flex items-center gap-2 mb-2">
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style="background-color: ${color}20; color: ${color};">
              ${cluster.value || 0}件の意見
            </span>
          </div>
          ${cluster.takeaway ? `<p class="text-gray-2 text-sm line-clamp-3">${escapeHtml(cluster.takeaway)}</p>` : ""}
        </div>
      `;
    }).join("");

    // Render cluster grid breadcrumb
    this.renderClusterGridBreadcrumb();

    // Rebind click events
    this.bindClusterCardEvents();
  }

  /**
   * Render breadcrumb navigation for cluster grid section
   */
  renderClusterGridBreadcrumb() {
    if (!this.clusterOverviewSection) return;

    // Remove existing breadcrumb if any
    const existingBreadcrumb = this.clusterOverviewSection.querySelector(".blv-cluster-breadcrumb");
    if (existingBreadcrumb) {
      existingBreadcrumb.remove();
    }

    // Don't show breadcrumb if at top level
    if (!this.selectedClusterId) return;

    const path = this.buildClusterPath(this.selectedClusterId);
    if (path.length === 0) return;

    // Create breadcrumb element
    const breadcrumbEl = document.createElement("div");
    breadcrumbEl.className = "blv-cluster-breadcrumb";
    breadcrumbEl.innerHTML = `
      <nav class="blv-cluster-breadcrumb__nav">
        <button class="blv-cluster-breadcrumb__btn" data-navigate-cluster="">
          ${icon("arrow-left-s-line")}
          全てのクラスターに戻る
        </button>
        <span class="blv-cluster-breadcrumb__current">
          ${path.map(c => escapeHtml(c.label)).join(" > ")}
        </span>
      </nav>
    `;

    // Insert before the grid
    this.clusterGridContainer.parentNode.insertBefore(breadcrumbEl, this.clusterGridContainer);

    // Bind click event
    breadcrumbEl.querySelector("[data-navigate-cluster]").addEventListener("click", (e) => {
      e.preventDefault();
      this.navigateToCluster(null);
      // Also update the chart breadcrumb
      this.renderBreadcrumb();
    });
  }

  renderChart() {
    // Destroy existing chart
    if (this.scatterChart) {
      this.scatterChart.destroy();
      this.scatterChart = null;
    }
    if (this.treemapChart) {
      this.treemapChart.destroy();
      this.treemapChart = null;
    }

    // Clear container
    this.chartContainer.innerHTML = '<div class="blv-chart-plot"></div>';
    const plotContainer = this.chartContainer.querySelector(".blv-chart-plot");

    // Render the appropriate chart based on view mode
    if (this.viewMode === VIEW_MODES.SCATTER_ALL) {
      this.scatterChart = new ScatterChart(plotContainer, this.data, {
        selectedClusterId: this.selectedClusterId,
        targetLevel: 1,
        // Share pre-built indexes
        clusterById: this.clusterById,
        childrenByParent: this.childrenByParent,
        clustersByLevel: this.clustersByLevel,
        argumentsByClusterId: this.argumentsByClusterId
      });
      this.scatterChart.render();
    } else if (this.viewMode === VIEW_MODES.SCATTER_DENSITY) {
      // Get density-filtered clusters
      const { filteredClusterIds } = this.getDenseClusters();

      this.scatterChart = new ScatterChart(plotContainer, this.data, {
        selectedClusterId: null, // No subcluster navigation in density view
        targetLevel: this.maxLevel,
        filteredClusterIds: filteredClusterIds,
        maxLevel: this.maxLevel,
        // Share pre-built indexes
        clusterById: this.clusterById,
        childrenByParent: this.childrenByParent,
        clustersByLevel: this.clustersByLevel,
        argumentsByClusterId: this.argumentsByClusterId
      });
      this.scatterChart.render();
    } else if (this.viewMode === VIEW_MODES.TREEMAP) {
      this.treemapChart = new TreemapChart(plotContainer, this.data, {
        level: this.treemapLevel,
        onLevelChange: (level) => {
          this.treemapLevel = level;
        }
      });
      this.treemapChart.render();
    }
  }

  toggleFullscreen() {
    if (this.isFullscreen) {
      this.exitFullscreen();
    } else {
      this.enterFullscreen();
    }
  }

  enterFullscreen() {
    this.isFullscreen = true;

    const densityBtnDisabled = !this.hasDensityData || !this.isDenseGroupEnabled;
    const densityBtnTitle = densityBtnDisabled
      ? "この設定条件では抽出できませんでした"
      : "濃い意見";

    // Create fullscreen modal
    this.fullscreenModal = document.createElement("div");
    this.fullscreenModal.className = "blv-fullscreen-modal";
    this.fullscreenModal.innerHTML = `
      <div class="blv-fullscreen-modal__header">
        <div class="blv-toolbar__segment">
          <button class="blv-toolbar__segment-btn ${this.viewMode === VIEW_MODES.SCATTER_ALL ? 'blv-toolbar__segment-btn--active' : ''}"
                  data-view-mode="${VIEW_MODES.SCATTER_ALL}"
                  title="全体">
            ${icon("bubble-chart-line")}
            <span>全体</span>
          </button>
          <button class="blv-toolbar__segment-btn ${this.viewMode === VIEW_MODES.SCATTER_DENSITY ? 'blv-toolbar__segment-btn--active' : ''}"
                  data-view-mode="${VIEW_MODES.SCATTER_DENSITY}"
                  title="${densityBtnTitle}"
                  ${densityBtnDisabled ? 'disabled' : ''}>
            ${icon("focus-3-line")}
            <span>濃い意見</span>
          </button>
          <button class="blv-toolbar__segment-btn ${this.viewMode === VIEW_MODES.TREEMAP ? 'blv-toolbar__segment-btn--active' : ''}"
                  data-view-mode="${VIEW_MODES.TREEMAP}"
                  title="ツリーマップ">
            ${icon("layout-grid-line")}
            <span>ツリー</span>
          </button>
        </div>
        <button class="blv-fullscreen-modal__close" data-action="close" title="閉じる">
          ${icon("close-line")}
        </button>
      </div>
      <div class="blv-fullscreen-modal__breadcrumb"></div>
      <div class="blv-fullscreen-modal__content">
        <div class="blv-chart-plot blv-chart-plot--fullscreen"></div>
      </div>
    `;

    document.body.appendChild(this.fullscreenModal);
    document.body.style.overflow = "hidden";

    // Add event listeners for view mode buttons
    this.fullscreenModal.querySelectorAll("[data-view-mode]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        if (e.currentTarget.disabled) return;
        const mode = e.currentTarget.dataset.viewMode;
        this.viewMode = mode;
        if (mode === VIEW_MODES.TREEMAP) {
          this.selectedClusterId = null;
        }
        this.updateFullscreenToolbar();
        this.renderFullscreenBreadcrumb();
        this.renderFullscreenChart();
      });
    });

    this.fullscreenModal.querySelector("[data-action='close']").addEventListener("click", () => {
      this.exitFullscreen();
    });

    // Handle escape key
    this.escapeHandler = (e) => {
      if (e.key === "Escape") {
        this.exitFullscreen();
      }
    };
    document.addEventListener("keydown", this.escapeHandler);

    // Render chart in fullscreen
    this.renderFullscreenBreadcrumb();
    this.renderFullscreenChart();
  }

  updateFullscreenToolbar() {
    if (!this.fullscreenModal) return;

    this.fullscreenModal.querySelectorAll("[data-view-mode]").forEach(btn => {
      const isActive = btn.dataset.viewMode === this.viewMode;
      btn.classList.toggle("blv-toolbar__segment-btn--active", isActive);

      // Update density button disabled state
      if (btn.dataset.viewMode === VIEW_MODES.SCATTER_DENSITY) {
        const isDisabled = !this.hasDensityData || !this.isDenseGroupEnabled;
        btn.disabled = isDisabled;
        btn.title = isDisabled ? "この設定条件では抽出できませんでした" : "濃い意見";
      }
    });
  }

  renderFullscreenBreadcrumb() {
    if (!this.fullscreenModal) return;

    const breadcrumbContainer = this.fullscreenModal.querySelector(".blv-fullscreen-modal__breadcrumb");
    const isScatterAllMode = this.viewMode === VIEW_MODES.SCATTER_ALL;

    if (!this.selectedClusterId || !isScatterAllMode) {
      breadcrumbContainer.innerHTML = "";
      return;
    }

    const path = this.buildClusterPath(this.selectedClusterId);
    if (path.length === 0) {
      breadcrumbContainer.innerHTML = "";
      return;
    }

    breadcrumbContainer.innerHTML = `
      <div class="blv-breadcrumb__content">
        <span class="blv-breadcrumb__label">表示中:</span>
        <nav class="blv-breadcrumb__nav">
          <button class="blv-breadcrumb__item blv-breadcrumb__item--link" data-cluster-id="">
            全て
          </button>
          ${path.map((cluster, index) => `
            <span class="blv-breadcrumb__separator">${icon("arrow-right-s-line")}</span>
            ${index === path.length - 1
              ? `<span class="blv-breadcrumb__item blv-breadcrumb__item--current">${escapeHtml(cluster.label)}</span>`
              : `<button class="blv-breadcrumb__item blv-breadcrumb__item--link" data-cluster-id="${cluster.id}">${escapeHtml(cluster.label)}</button>`
            }
          `).join("")}
        </nav>
      </div>
    `;

    // Add click handlers
    breadcrumbContainer.querySelectorAll("[data-cluster-id]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const clusterId = e.currentTarget.dataset.clusterId;
        this.selectedClusterId = clusterId || null;
        this.renderFullscreenBreadcrumb();
        this.renderFullscreenChart();
        this.renderClusterGrid(); // Also update main page cluster grid
      });
    });
  }

  renderFullscreenChart() {
    if (!this.fullscreenModal) return;

    const plotContainer = this.fullscreenModal.querySelector(".blv-chart-plot");
    plotContainer.innerHTML = "";

    if (this.viewMode === VIEW_MODES.SCATTER_ALL) {
      const chart = new ScatterChart(plotContainer, this.data, {
        selectedClusterId: this.selectedClusterId,
        targetLevel: 1,
        // Share pre-built indexes
        clusterById: this.clusterById,
        childrenByParent: this.childrenByParent,
        clustersByLevel: this.clustersByLevel,
        argumentsByClusterId: this.argumentsByClusterId
      });
      chart.render();
    } else if (this.viewMode === VIEW_MODES.SCATTER_DENSITY) {
      const { filteredClusterIds } = this.getDenseClusters();
      const chart = new ScatterChart(plotContainer, this.data, {
        selectedClusterId: null,
        targetLevel: this.maxLevel,
        filteredClusterIds: filteredClusterIds,
        maxLevel: this.maxLevel,
        // Share pre-built indexes
        clusterById: this.clusterById,
        childrenByParent: this.childrenByParent,
        clustersByLevel: this.clustersByLevel,
        argumentsByClusterId: this.argumentsByClusterId
      });
      chart.render();
    } else if (this.viewMode === VIEW_MODES.TREEMAP) {
      const chart = new TreemapChart(plotContainer, this.data, {
        level: this.treemapLevel,
        onLevelChange: (level) => {
          this.treemapLevel = level;
        }
      });
      chart.render();
    }
  }

  exitFullscreen() {
    this.isFullscreen = false;

    if (this.fullscreenModal) {
      document.body.removeChild(this.fullscreenModal);
      this.fullscreenModal = null;
    }

    document.body.style.overflow = "";

    if (this.escapeHandler) {
      document.removeEventListener("keydown", this.escapeHandler);
      this.escapeHandler = null;
    }

    // Update main toolbar and re-render chart
    this.updateToolbarState();
    this.renderBreadcrumb();
    this.renderChart();
    this.renderClusterGrid();
  }

  /**
   * Bind click events to cluster cards using event delegation
   */
  bindClusterCardEvents() {
    if (!this.clusterGridContainer) return;

    // Remove old handler if exists
    if (this._clusterGridClickHandler) {
      this.clusterGridContainer.removeEventListener("click", this._clusterGridClickHandler);
    }

    // Create handler with event delegation
    this._clusterGridClickHandler = (e) => {
      const card = e.target.closest("[data-cluster-id]");
      if (!card) return;

      const clusterId = card.dataset.clusterId;
      if (clusterId && this.getChildClusters(clusterId).length > 0) {
        e.preventDefault();
        this.handleClusterCardClick(clusterId);
      }
    };

    this.clusterGridContainer.addEventListener("click", this._clusterGridClickHandler);
  }

  /**
   * Handle cluster card click
   * @param {string} clusterId - Cluster ID that was clicked
   */
  handleClusterCardClick(clusterId) {
    // Check if this cluster has children
    const children = this.getChildClusters(clusterId);

    if (children.length > 0) {
      // Switch to scatter all mode if not already in a scatter mode
      if (this.viewMode === VIEW_MODES.TREEMAP) {
        this.viewMode = VIEW_MODES.SCATTER_ALL;
        this.updateToolbarState();
      }
      this.navigateToCluster(clusterId);
    }
  }

  /**
   * Get child clusters of a parent
   * @param {string} parentId - Parent cluster ID
   * @returns {Array} Child clusters sorted by value (already sorted)
   */
  getChildClusters(parentId) {
    return this.childrenByParent.get(parentId) || [];
  }

  /**
   * Get top-level clusters for display
   * @returns {Array} Level 1 clusters sorted by value
   */
  getTopLevelClusters() {
    // Root cluster "0" has level 1 children
    return this.childrenByParent.get("0") || [];
  }

  /**
   * Get density-filtered clusters
   * @returns {Object} { filtered: Cluster[], filteredClusterIds: Set, isEmpty: boolean }
   */
  getDenseClusters() {
    if (!this.hasDensityData) {
      return { filtered: [], filteredClusterIds: new Set(), isEmpty: true };
    }

    const deepestLevelClusters = this.clustersByLevel.get(this.maxLevel) || [];
    const filteredDeepestLevelClusters = deepestLevelClusters
      .filter(c => c.density_rank_percentile <= this.maxDensity)
      .filter(c => (c.value || 0) >= this.minValue);

    const filteredClusterIds = new Set(filteredDeepestLevelClusters.map(c => c.id));

    // Include non-deepest level clusters
    const filtered = [
      ...this.clusters.filter(c => c.level !== this.maxLevel),
      ...filteredDeepestLevelClusters
    ];

    return {
      filtered,
      filteredClusterIds,
      isEmpty: filteredDeepestLevelClusters.length === 0
    };
  }

  /**
   * Update whether density group button should be enabled
   */
  updateDenseGroupEnabled() {
    const { isEmpty } = this.getDenseClusters();
    this.isDenseGroupEnabled = !isEmpty;

    // If currently in density mode but no clusters available, switch to all mode
    if (this.viewMode === VIEW_MODES.SCATTER_DENSITY && isEmpty) {
      this.viewMode = VIEW_MODES.SCATTER_ALL;
    }
  }

  /**
   * Open settings dialog
   */
  openSettingsDialog() {
    if (this.settingsDialogOpen) return;
    this.settingsDialogOpen = true;

    // Create settings dialog
    this.settingsDialog = document.createElement("div");
    this.settingsDialog.className = "blv-settings-dialog";
    this.settingsDialog.innerHTML = `
      <div class="blv-settings-dialog__overlay"></div>
      <div class="blv-settings-dialog__content">
        <div class="blv-settings-dialog__header">
          <h3>表示設定</h3>
          <button class="blv-settings-dialog__close" data-action="close">
            ${icon("close-line")}
          </button>
        </div>
        <div class="blv-settings-dialog__body">
          <div class="blv-settings-dialog__field">
            <label>上位何%の意見グループを表示するか</label>
            <div class="blv-slider">
              <input type="range" min="0.1" max="1" step="0.1" value="${this.maxDensity}"
                     data-setting="maxDensity" />
              <div class="blv-slider__labels">
                <span>10%</span>
                <span class="blv-slider__value">${Math.round(this.maxDensity * 100)}%</span>
                <span>100%</span>
              </div>
            </div>
          </div>
          <div class="blv-settings-dialog__field">
            <label>意見グループのサンプル数の最小数</label>
            <div class="blv-slider">
              <input type="range" min="0" max="10" step="1" value="${this.minValue}"
                     data-setting="minValue" />
              <div class="blv-slider__labels">
                <span>0</span>
                <span class="blv-slider__value">${this.minValue}件</span>
                <span>10</span>
              </div>
            </div>
          </div>
        </div>
        <div class="blv-settings-dialog__footer">
          <button class="button button__sm" data-action="apply">適用</button>
        </div>
      </div>
    `;

    document.body.appendChild(this.settingsDialog);

    // Bind event listeners
    this.settingsDialog.querySelector("[data-action='close']").addEventListener("click", () => {
      this.closeSettingsDialog();
    });

    this.settingsDialog.querySelector(".blv-settings-dialog__overlay").addEventListener("click", () => {
      this.closeSettingsDialog();
    });

    // Update value display on slider change
    this.settingsDialog.querySelectorAll("input[type='range']").forEach(input => {
      input.addEventListener("input", (e) => {
        const value = parseFloat(e.target.value);
        const valueDisplay = e.target.parentElement.querySelector(".blv-slider__value");
        if (e.target.dataset.setting === "maxDensity") {
          valueDisplay.textContent = `${Math.round(value * 100)}%`;
        } else {
          valueDisplay.textContent = `${value}件`;
        }
      });
    });

    // Apply button
    this.settingsDialog.querySelector("[data-action='apply']").addEventListener("click", () => {
      const maxDensityInput = this.settingsDialog.querySelector("[data-setting='maxDensity']");
      const minValueInput = this.settingsDialog.querySelector("[data-setting='minValue']");

      this.maxDensity = parseFloat(maxDensityInput.value);
      this.minValue = parseInt(minValueInput.value, 10);

      this.updateDenseGroupEnabled();
      this.updateToolbarState();
      if (this.isFullscreen) {
        this.updateFullscreenToolbar();
      }

      // Re-render if in density mode
      if (this.viewMode === VIEW_MODES.SCATTER_DENSITY) {
        this.renderChart();
        if (this.isFullscreen) {
          this.renderFullscreenChart();
        }
      }

      this.closeSettingsDialog();
    });

    // Handle escape key
    this._settingsEscapeHandler = (e) => {
      if (e.key === "Escape") {
        this.closeSettingsDialog();
      }
    };
    document.addEventListener("keydown", this._settingsEscapeHandler);
  }

  /**
   * Close settings dialog
   */
  closeSettingsDialog() {
    if (!this.settingsDialogOpen) return;
    this.settingsDialogOpen = false;

    if (this.settingsDialog) {
      document.body.removeChild(this.settingsDialog);
      this.settingsDialog = null;
    }

    if (this._settingsEscapeHandler) {
      document.removeEventListener("keydown", this._settingsEscapeHandler);
      this._settingsEscapeHandler = null;
    }
  }
}
