// Decidim Broadlistening View entrypoint
import "../stylesheets/decidim/broadlistening_view/app.scss";

import { ChartManager } from "../src/decidim/broadlistening_view/chart_manager";
import { ScatterChart } from "../src/decidim/broadlistening_view/scatter_chart";
import { TreemapChart } from "../src/decidim/broadlistening_view/treemap_chart";
import { CLUSTER_COLORS, getClusterColor, getColorByIndex } from "../src/decidim/broadlistening_view/colors";

// Export for global access
window.DecidimBroadlisteningView = {
  ChartManager,
  ScatterChart,
  TreemapChart,
  CLUSTER_COLORS,
  getClusterColor,
  getColorByIndex,
};

// Auto-initialize charts on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  initializeCharts();
});

// Also handle turbo:load for Turbo Drive navigation
document.addEventListener("turbo:load", () => {
  initializeCharts();
});

function initializeCharts() {
  const managerElements = document.querySelectorAll("[data-broadlistening-view-manager]");

  managerElements.forEach((element) => {
    // Skip if already initialized
    if (element.dataset.initialized === "true") {
      return;
    }

    const dataSourceId = element.dataset.dataSource;
    const dataElement = document.getElementById(dataSourceId);

    if (dataElement) {
      try {
        const data = JSON.parse(dataElement.textContent);
        new ChartManager(element, data);
        element.dataset.initialized = "true";
      } catch (error) {
        console.error("Failed to initialize chart manager:", error);
        element.innerHTML = '<p class="callout alert">チャートの初期化に失敗しました。</p>';
      }
    }
  });
}
