// Chart Manager for Broadlistening visualization
// Orchestrates scatter and treemap charts with toolbar controls

import { ScatterChart } from "./scatter_chart.js";
import { TreemapChart } from "./treemap_chart.js";
import { CLUSTER_COLORS, getColorByIndex } from "./colors.js";

// Chart type constants
const CHART_TYPES = {
  SCATTER: "scatter",
  TREEMAP: "treemap"
};

// SVG Icons
const ICONS = {
  scatter: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="7.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/><circle cx="6.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="7.5" r="2.5"/><circle cx="12" cy="12" r="2.5"/></svg>`,
  treemap: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>`,
  fullscreen: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>`,
  close: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`,
  chevronRight: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`
};

export class ChartManager {
  constructor(container, data, options = {}) {
    this.container = container;
    this.data = data;
    this.options = {
      defaultChart: CHART_TYPES.SCATTER,
      showToolbar: true,
      ...options
    };

    this.arguments = data.arguments || [];
    this.clusters = data.clusters || [];
    this.comments = data.comments || {};

    // State
    this.chartType = this.options.defaultChart;
    this.isFullscreen = false;
    this.selectedClusterId = null;
    this.treemapLevel = "0";

    // Calculate max level
    this.maxLevel = Math.max(...this.clusters.map(c => c.level || 0), 0);

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
    this.toolbarContainer.innerHTML = `
      <div class="blv-toolbar__buttons">
        <button class="blv-toolbar__btn ${this.chartType === CHART_TYPES.SCATTER ? 'blv-toolbar__btn--active' : ''}"
                data-chart-type="${CHART_TYPES.SCATTER}"
                title="散布図">
          ${ICONS.scatter}
          <span>散布図</span>
        </button>
        <button class="blv-toolbar__btn ${this.chartType === CHART_TYPES.TREEMAP ? 'blv-toolbar__btn--active' : ''}"
                data-chart-type="${CHART_TYPES.TREEMAP}"
                title="ツリーマップ">
          ${ICONS.treemap}
          <span>ツリー</span>
        </button>
      </div>
      <div class="blv-toolbar__actions">
        <button class="blv-toolbar__btn blv-toolbar__btn--icon"
                data-action="fullscreen"
                title="フルスクリーン">
          ${ICONS.fullscreen}
        </button>
      </div>
    `;

    // Add event listeners
    this.toolbarContainer.querySelectorAll("[data-chart-type]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const type = e.currentTarget.dataset.chartType;
        this.switchChart(type);
      });
    });

    this.toolbarContainer.querySelector("[data-action='fullscreen']").addEventListener("click", () => {
      this.toggleFullscreen();
    });
  }

  renderBreadcrumb() {
    if (!this.selectedClusterId || this.chartType !== CHART_TYPES.SCATTER) {
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
            <span class="blv-breadcrumb__separator">${ICONS.chevronRight}</span>
            ${index === path.length - 1
              ? `<span class="blv-breadcrumb__item blv-breadcrumb__item--current">${cluster.label}</span>`
              : `<button class="blv-breadcrumb__item blv-breadcrumb__item--link" data-cluster-id="${cluster.id}">${cluster.label}</button>`
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
      const cluster = this.clusters.find(c => c.id === currentId);
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
    this.toolbarContainer.querySelectorAll("[data-chart-type]").forEach(btn => {
      const isActive = btn.dataset.chartType === this.chartType;
      btn.classList.toggle("blv-toolbar__btn--active", isActive);
    });
  }

  switchChart(type) {
    if (this.chartType === type) return;

    this.chartType = type;
    // Reset cluster selection when switching chart types
    if (type === CHART_TYPES.TREEMAP) {
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
            <span class="font-semibold text-sm line-clamp-2">${cluster.label || ""}</span>
          </div>
          <div class="flex items-center gap-2 mb-2">
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style="background-color: ${color}20; color: ${color};">
              ${cluster.value || 0}件の意見
            </span>
          </div>
          ${cluster.takeaway ? `<p class="text-gray-2 text-sm line-clamp-3">${cluster.takeaway}</p>` : ""}
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
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          全てのクラスターに戻る
        </button>
        <span class="blv-cluster-breadcrumb__current">
          ${path.map(c => c.label).join(" > ")}
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

    // Render the appropriate chart
    if (this.chartType === CHART_TYPES.SCATTER) {
      this.scatterChart = new ScatterChart(plotContainer, this.data, {
        selectedClusterId: this.selectedClusterId,
        targetLevel: 1
      });
      this.scatterChart.render();
    } else if (this.chartType === CHART_TYPES.TREEMAP) {
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

    // Create fullscreen modal
    this.fullscreenModal = document.createElement("div");
    this.fullscreenModal.className = "blv-fullscreen-modal";
    this.fullscreenModal.innerHTML = `
      <div class="blv-fullscreen-modal__header">
        <div class="blv-toolbar__buttons">
          <button class="blv-toolbar__btn ${this.chartType === CHART_TYPES.SCATTER ? 'blv-toolbar__btn--active' : ''}"
                  data-chart-type="${CHART_TYPES.SCATTER}"
                  title="散布図">
            ${ICONS.scatter}
            <span>散布図</span>
          </button>
          <button class="blv-toolbar__btn ${this.chartType === CHART_TYPES.TREEMAP ? 'blv-toolbar__btn--active' : ''}"
                  data-chart-type="${CHART_TYPES.TREEMAP}"
                  title="ツリーマップ">
            ${ICONS.treemap}
            <span>ツリー</span>
          </button>
        </div>
        <button class="blv-fullscreen-modal__close" data-action="close" title="閉じる">
          ${ICONS.close}
        </button>
      </div>
      <div class="blv-fullscreen-modal__breadcrumb"></div>
      <div class="blv-fullscreen-modal__content">
        <div class="blv-chart-plot blv-chart-plot--fullscreen"></div>
      </div>
    `;

    document.body.appendChild(this.fullscreenModal);
    document.body.style.overflow = "hidden";

    // Add event listeners
    this.fullscreenModal.querySelectorAll("[data-chart-type]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const type = e.currentTarget.dataset.chartType;
        this.chartType = type;
        if (type === CHART_TYPES.TREEMAP) {
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

    this.fullscreenModal.querySelectorAll("[data-chart-type]").forEach(btn => {
      const isActive = btn.dataset.chartType === this.chartType;
      btn.classList.toggle("blv-toolbar__btn--active", isActive);
    });
  }

  renderFullscreenBreadcrumb() {
    if (!this.fullscreenModal) return;

    const breadcrumbContainer = this.fullscreenModal.querySelector(".blv-fullscreen-modal__breadcrumb");

    if (!this.selectedClusterId || this.chartType !== CHART_TYPES.SCATTER) {
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
            <span class="blv-breadcrumb__separator">${ICONS.chevronRight}</span>
            ${index === path.length - 1
              ? `<span class="blv-breadcrumb__item blv-breadcrumb__item--current">${cluster.label}</span>`
              : `<button class="blv-breadcrumb__item blv-breadcrumb__item--link" data-cluster-id="${cluster.id}">${cluster.label}</button>`
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

    if (this.chartType === CHART_TYPES.SCATTER) {
      const chart = new ScatterChart(plotContainer, this.data, {
        selectedClusterId: this.selectedClusterId,
        targetLevel: 1
      });
      chart.render();
    } else if (this.chartType === CHART_TYPES.TREEMAP) {
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
   * Bind click events to cluster cards on the page
   */
  bindClusterCardEvents() {
    // Find cluster cards in the page and bind click events
    const clusterCards = document.querySelectorAll("[data-cluster-id]");
    clusterCards.forEach(card => {
      const clusterId = card.dataset.clusterId;
      const hasChildren = this.getChildClusters(clusterId).length > 0;

      if (hasChildren) {
        card.style.cursor = "pointer";
        card.addEventListener("click", (e) => {
          e.preventDefault();
          if (clusterId) {
            this.handleClusterCardClick(clusterId);
          }
        });
      } else {
        card.style.cursor = "default";
      }
    });
  }

  /**
   * Handle cluster card click
   * @param {string} clusterId - Cluster ID that was clicked
   */
  handleClusterCardClick(clusterId) {
    // Check if this cluster has children
    const children = this.getChildClusters(clusterId);

    if (children.length > 0) {
      // Switch to scatter if not already
      if (this.chartType !== CHART_TYPES.SCATTER) {
        this.chartType = CHART_TYPES.SCATTER;
        this.updateToolbarState();
      }
      this.navigateToCluster(clusterId);
    }
  }

  /**
   * Get child clusters of a parent
   * @param {string} parentId - Parent cluster ID
   * @returns {Array} Child clusters sorted by value
   */
  getChildClusters(parentId) {
    return this.clusters
      .filter(c => c.parent === parentId)
      .sort((a, b) => (b.value || 0) - (a.value || 0));
  }

  /**
   * Update visual state of cluster cards based on selection
   */
  updateClusterCardHighlights() {
    const clusterCards = document.querySelectorAll("[data-cluster-id]");
    clusterCards.forEach(card => {
      const clusterId = card.dataset.clusterId;
      const isSelected = clusterId === this.selectedClusterId;
      const isInPath = this.selectedClusterId && this.buildClusterPath(this.selectedClusterId).some(c => c.id === clusterId);

      card.classList.toggle("blv-cluster-card--selected", isSelected);
      card.classList.toggle("blv-cluster-card--in-path", isInPath && !isSelected);
    });
  }

  /**
   * Get top-level clusters for display
   * @returns {Array} Level 1 clusters sorted by value
   */
  getTopLevelClusters() {
    return this.clusters
      .filter(c => c.level === 1)
      .sort((a, b) => (b.value || 0) - (a.value || 0));
  }

  /**
   * Public method to select a cluster programmatically
   * @param {string|null} clusterId - Cluster ID to select, or null to clear
   */
  selectCluster(clusterId) {
    this.navigateToCluster(clusterId);
  }
}
